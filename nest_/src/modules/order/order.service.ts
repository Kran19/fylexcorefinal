import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutDto } from './dto/order.dto';
import { Prisma } from '@prisma/client';
import { MarketingService } from '../marketing/marketing.service';
import { LoyaltyService } from '../marketing/loyalty.service';
import { OrderStatusHistoryService } from './order-status-history.service';
import { ShiprocketService } from './shiprocket.service';
import { PaymentService } from '../payment/payment.service';
import { WhatsappService } from '../auth/whatsapp.service';
import { AuthService } from '../auth/auth.service';
import { isEarlyBirdMobile } from '../marketing/early-bird-mobiles';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly inFlightMagicOrders = new Map<string, Promise<any>>();

  constructor(
    private prisma: PrismaService,
    private marketingService: MarketingService,
    private loyaltyService: LoyaltyService,
    private historyService: OrderStatusHistoryService,
    private shiprocketService: ShiprocketService,
    @Inject(forwardRef(() => PaymentService)) private paymentService: PaymentService,
    private whatsappService: WhatsappService,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,
  ) { }

  // Create order from cart (Checkout)
  async checkout(customerId: string, dto: CheckoutDto) {
    const customerIdStr = customerId?.toString() || '';
    const isNumeric = !isNaN(Number(customerIdStr)) && !customerIdStr.includes('usr_') && customerIdStr !== '';
    const cId = isNumeric ? Number(customerIdStr) : null;

    // 1. Get active cart
    const cart = await this.prisma.cart.findFirst({
      where: cId ? { customerId: cId, status: 'active' } : { sessionId: customerIdStr, status: 'active' },
      include: {
        items: {
          include: {
            productVariant: { include: { product: { include: { categories: true } } } },
            Product: { include: { categories: true } },
            belt: true
          }
        },
        customer: true,
        offer: { include: { categories: true } },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // 2. Validate Coupon
    let appliedOffer: any = null;
    if (dto.couponCode && dto.couponCode.trim()) {
      appliedOffer = await this.marketingService.validateCoupon(customerId, dto.couponCode.trim(), Number(cart.subtotal), cart.items);
    } else if (cart.offer && cart.offer.code) {
      try {
        appliedOffer = await this.marketingService.validateCoupon(customerId, cart.offer.code, Number(cart.subtotal), cart.items);
      } catch (e) {
        this.logger.warn(`Attached cart offer not valid for checkout: ${e.message}`);
        appliedOffer = null;
      }
    }

    // 3. Handle Loyalty Points Redemption
    let pointDiscount = 0;
    if (dto.redeemPoints && dto.redeemPoints > 0) {
      const balance = await this.loyaltyService.getLoyaltyBalance(customerId);
      if (Number(balance.availablePoints) < dto.redeemPoints) {
        throw new BadRequestException('Insufficient loyalty points');
      }
      pointDiscount = Number(dto.redeemPoints); // 1 FYLEX Credit = Re 1
    }

    // 4. Validate Addresses
    const shippingAddr = await this.prisma.customerAddress.findUnique({
      where: { id: Number(dto.shippingAddressId) },
    });
    if (!shippingAddr || shippingAddr.customerId !== cId) {
      throw new BadRequestException('Invalid shipping address');
    }

    // 5. Pre-flight Stock Validation
    for (const item of cart.items) {
      const variant = item.productVariant;
      if (variant && variant.manageStock) {
        if (!variant.inStock || variant.qty < item.quantity) {
          throw new BadRequestException(`Item "${variant.product?.name || variant.sku}" is out of stock or requested quantity exceeds available stock.`);
        }
      }
    }

    // 6. Pre-calculate totals and weights before entering DB transaction
    const subtotal = Number(cart.subtotal);
    const discountAmount = appliedOffer ? await this.marketingService.calculateDiscount(appliedOffer, subtotal, cart.items) : 0;
    const totalDiscount = discountAmount + pointDiscount;
    const grandTotal = Math.max(0, subtotal - totalDiscount);
    const pointsEarned = Math.floor(grandTotal);

    let totalWeight = 0;
    for (const item of cart.items) {
      let itemWeight = 0.4;
      if (item.productVariant) {
        itemWeight = item.productVariant.weight ? Number(item.productVariant.weight) : 0.4;
      }
      totalWeight += itemWeight * item.quantity;
    }

    const isCod = dto.paymentMethod === 'cod';
    const isOnline = dto.paymentMethod === 'online' || grandTotal === 0;

    // 7. Create Order via Transaction
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customer: cId ? { connect: { id: cId } } : undefined,
          offer: appliedOffer ? { connect: { id: appliedOffer.id } } : undefined,
          status: 'pending',
          paymentStatus: isOnline ? 'paid' : 'pending',
          shippingStatus: 'pending',
          paymentMethod: dto.paymentMethod || 'cod',
          subtotal: Number(subtotal),
          shippingTotal: 0,
          taxTotal: Number(0),
          discountTotal: Number(totalDiscount),
          grandTotal: Number(grandTotal),
          customerNote: dto.notes,
          customerFirstName: cart.customer?.name?.split(' ')[0] || 'Customer',
          customerLastName: cart.customer?.name?.split(' ')?.slice(1)?.join(' ') || 'Name',
          customerMobile: cart.customer?.mobile || '',
          customerDob: dto.dob ? new Date(dto.dob) : (cart.customer?.dob || null),
          orderNumber: `ORD-${Date.now()}`,
          loyaltyPointsUsed: Number(dto.redeemPoints || 0),
          loyaltyPointsEarned: Number(pointsEarned),
          createdAt: new Date(),
        },
      });

      // a1. Update Customer Profile with DOB if provided
      if (dto.dob) {
        await tx.customer.update({
          where: { id: cId },
          data: { dob: new Date(dto.dob) },
        });
      }

      // a2. Create Payment record if online
      if (isOnline && dto.paymentId) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            paymentMethod: 'online',
            paymentGateway: 'razorpay',
            transactionId: dto.paymentId,
            amount: order.grandTotal,
            status: 'paid',
            paidAt: new Date(),
          }
        });
      }

      // b. Log History
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'pending',
          notes: 'Order placed by customer',
        }
      });

      // c. Snapshot Addresses
      await tx.orderAddress.create({
        data: {
          order: { connect: { id: order.id } },
          type: 'shipping',
          firstName: shippingAddr.name?.split(' ')[0] || 'Customer',
          lastName: shippingAddr.name?.split(' ')?.slice(1)?.join(' ') || 'Name',
          email: cart.customer?.email || '',
          phone: shippingAddr.mobile,
          address1: shippingAddr.address,
          city: shippingAddr.city,
          state: shippingAddr.state,
          postcode: shippingAddr.pincode,
          country: shippingAddr.country,
        },
      });

      // d. Create Items and Deduct Stock
      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            order: { connect: { id: order.id } },
            ...(item.productVariantId ? {
              product: { connect: { id: item.productVariant?.productId } },
              productVariant: { connect: { id: item.productVariantId } },
              productName: item.productVariant?.product?.name || 'Product',
              sku: item.productVariant?.sku || 'SKU',
            } : item.beltId ? {
              belt: { connect: { id: item.beltId } },
              productName: item.belt?.name || 'Belt',
              sku: 'BELT-' + item.beltId,
            } : {
              productName: 'Unknown Item',
              sku: 'UNKNOWN',
            }),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.total,
            total: item.total,
            discountAmount: Number(0),
            attributes: item.attributes as any,
          },
        });

        // Deduct inventory & increment sold count
        const variant = item.productVariant;
        if (variant) {
          const updateData: any = {
            fakeSoldCount: { increment: item.quantity }
          };
          if (variant.manageStock) {
            const newQty = Math.max(0, variant.qty - item.quantity);
            const newInStock = newQty > 0;
            updateData.qty = newQty;
            updateData.inStock = newInStock;
            updateData.stockStatus = newInStock ? 'instock' : 'outofstock';
          }
          await tx.productVariant.update({
            where: { id: variant.id },
            data: updateData
          });
        }
      }

      // e. Track Marketing Usage
      if (appliedOffer && cId) {
        await tx.offerUsage.create({
          data: {
            offerId: appliedOffer.id,
            customerId: cId,
            orderId: order.id,
            discountAmount: Number(discountAmount),
          }
        });
        await tx.offer.update({
          where: { id: appliedOffer.id },
          data: { usedCount: { increment: 1 } }
        });
      }

      // f. Spend Points
      if (dto.redeemPoints && dto.redeemPoints > 0 && cId) {
        const loyalty = await tx.customerLoyalty.findFirst({ where: { customerId: cId } });
        if (loyalty) {
          await tx.loyaltyTransaction.create({
            data: {
              customerLoyaltyId: loyalty.id,
              customerId: cId,
              type: 'redemption',
              points: -dto.redeemPoints,
              balance: Number(loyalty.availablePoints) - dto.redeemPoints,
              referenceType: 'order',
              referenceId: order.id,
              notes: 'Spend on checkout',
            }
          });
          await tx.customerLoyalty.update({
            where: { id: loyalty.id },
            data: {
              availablePoints: { decrement: dto.redeemPoints },
              usedPoints: { increment: dto.redeemPoints },
            }
          });
        }
      }

      // g. Clear Cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          status: 'completed',
          subtotal: 0,
          grandTotal: 0,
          offerId: null,
        },
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          addresses: true,
          items: {
            include: {
              product: true,
              productVariant: {
                include: {
                  variantImages: {
                    include: {
                      media: true
                    }
                  },
                  variantAttributes: {
                    include: {
                      attributeValue: {
                        include: {
                          attribute: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    }, { timeout: 30000, maxWait: 10000 });

    // 7. Dispatch WhatsApp Order Received confirmation & Owner Notifications
    try {
      if (createdOrder) {
        const recipientMobile = createdOrder.customerMobile || (createdOrder as any)?.addresses?.[0]?.phone;
        if (recipientMobile) {
          this.whatsappService.sendOrderReceived(recipientMobile, createdOrder.orderNumber || `ORD-${createdOrder.id}`)
            .catch(err => this.logger.error(`Failed to dispatch Order Received WhatsApp: ${err.message}`));
        }

        // Notify 2 Owners / Admins via Zaple WhatsApp API
        this.notifyAdminsNewOrder(createdOrder)
          .catch(err => this.logger.error(`Failed to dispatch Owner Order WhatsApp notification: ${err.message}`));
      }
    } catch (e: any) {
      this.logger.error(`Error initiating Order Received WhatsApp: ${e.message}`);
    }

    return createdOrder;
  }

  private async notifyAdminsNewOrder(order: any) {
    if (!order) return;

    try {
      const orderNumber = order.orderNumber || `ORD-${order.id}`;

      // Customer Name & Phone
      const shippingAddr = (order.addresses && Array.isArray(order.addresses))
        ? (order.addresses.find((a: any) => a.type === 'shipping') || order.addresses[0])
        : null;

      const firstName = order.customerFirstName || shippingAddr?.firstName || '';
      const lastName = order.customerLastName || shippingAddr?.lastName || '';
      const customerName = `${firstName} ${lastName}`.trim() || 'Valued Customer';
      const customerPhone = order.customerMobile || shippingAddr?.phone || 'N/A';

      // Items summary & quantity
      const itemsList: string[] = [];
      let totalQty = 0;

      if (Array.isArray(order.items) && order.items.length > 0) {
        order.items.forEach((item: any) => {
          const qty = Number(item.quantity || 1);
          totalQty += qty;
          const name = item.productName || item.productVariant?.product?.name || item.product?.name || 'Fylex Item';
          itemsList.push(`${qty}x ${name}`);
        });
      }

      const productSummary = itemsList.length > 0 ? itemsList.join(', ') : 'Fylex Timepiece';

      // Formatted Address
      let formattedAddress = 'N/A';
      if (shippingAddr) {
        const parts = [
          shippingAddr.address1 || shippingAddr.address,
          shippingAddr.city,
          shippingAddr.state,
          shippingAddr.postcode || shippingAddr.pincode
        ].filter(Boolean);
        formattedAddress = parts.join(', ');
      }

      const orderValue = Math.round(Number(order.grandTotal || 0));

      this.logger.log(`Dispatching Owner WhatsApp notification for ${orderNumber} to owners...`);

      await this.whatsappService.sendAdminOrderNotification({
        orderNumber,
        customerName,
        customerPhone,
        productSummary,
        totalQuantity: totalQty || 1,
        orderValue,
        address: formattedAddress,
      });
    } catch (err: any) {
      this.logger.error(`Error in notifyAdminsNewOrder: ${err.message}`);
    }
  }

  /**
   * Pushes confirmed order to Shiprocket merchant portal.
   * By default, autoAssignAwb is false so it only creates the order in Shiprocket without auto-selecting courier or debiting wallet.
   */
  async sendToShiprocket(orderId: string | number, adminId?: string, autoAssignAwb: boolean = false) {
    const oId = Number(orderId);
    const order = await this.prisma.order.findUnique({
      where: { id: oId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true }
            }
          }
        },
        addresses: true,
        customer: true,
        shipments: true,
      }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    try {
      this.logger.log(`Dispatching order #${order.orderNumber || order.id} to Shiprocket...`);
      const srResponse = await this.shiprocketService.createOrderFromFylexOrder(order);
      this.logger.log(`Shiprocket API response for order #${order.id}: ${JSON.stringify(srResponse)}`);

      const srOrderId = srResponse?.order_id || srResponse?.data?.order_id;
      const srShipmentId = srResponse?.shipment_id || srResponse?.data?.shipment_id;
      const srAwb = srResponse?.awb_code || srResponse?.data?.awb_code || null;
      const srCourier = srResponse?.courier_name || srResponse?.data?.courier_name || null;

      // Only attempt AWB generation if explicitly requested via autoAssignAwb flag
      let finalAwb = srAwb;
      if (autoAssignAwb && !finalAwb && srShipmentId) {
        try {
          const awbRes = await this.shiprocketService.generateAwb(srShipmentId);
          finalAwb = awbRes?.response?.data?.awb_code || awbRes?.awb_code || null;
        } catch (awbErr: any) {
          this.logger.warn(`AWB assignment pending: ${awbErr.message}`);
        }
      }

      // Upsert OrderShipment record
      const cleanCarrier = (srCourier && srCourier !== 'Standard Luxury Courier') ? srCourier : null;
      const existingShipment = order.shipments?.[0];
      if (existingShipment) {
        await this.prisma.orderShipment.update({
          where: { id: existingShipment.id },
          data: {
            carrier: cleanCarrier,
            trackingNumber: finalAwb || null,
            status: 'processing',
            trackingUrl: finalAwb ? `https://shiprocket.co/tracking/${finalAwb}` : null,
          }
        });
      } else {
        await this.prisma.orderShipment.create({
          data: {
            orderId: order.id,
            carrier: cleanCarrier,
            carrierService: 'Standard Delivery',
            trackingNumber: finalAwb || null,
            status: 'processing',
            trackingUrl: finalAwb ? `https://shiprocket.co/tracking/${finalAwb}` : null,
          }
        });
      }

      // Update Order Status to Processing
      const now = new Date();
      const updatedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'processing',
          shippingStatus: 'processing',
          processingAt: now,
          confirmedAt: order.confirmedAt || now,
          updatedAt: now,
        },
        include: {
          shipments: true,
          items: true,
          addresses: true,
          statusHistory: true,
        }
      });

      // Log status history
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'processing',
          notes: `Dispatched to Shiprocket (Shipment ID: ${srShipmentId || 'N/A'}, AWB: ${finalAwb || 'Pending'})`,
          adminId: adminId ? Number(adminId) : null,
          createdAt: new Date(),
        }
      });

      return {
        success: true,
        message: 'Order successfully sent to Shiprocket!',
        data: {
          order: updatedOrder,
          shiprocket: {
            order_id: srOrderId,
            shipment_id: srShipmentId,
            awb_code: finalAwb,
            courier_name: srCourier,
          }
        }
      };
    } catch (error: any) {
      this.logger.error(`Failed to push order #${order.id} to Shiprocket: ${error.message}`);
      throw new InternalServerErrorException(`Shiprocket Fulfillment Error: ${error.message}`);
    }
  }

  async syncShiprocketTracking(orderId: string | number) {
    const oId = Number(orderId);
    const order = await this.prisma.order.findUnique({
      where: { id: oId },
      include: { shipments: true, addresses: true }
    });

    if (!order) throw new NotFoundException('Order not found');

    const awb = order.shipments?.[0]?.trackingNumber;
    const isNumericAwb = awb && /^\d{8,12}$/.test(awb.trim());
    let trackingData: any = null;

    if (awb && !isNumericAwb && !awb.startsWith('ORD-') && !awb.startsWith('SHP-') && awb.length >= 8) {
      trackingData = await this.shiprocketService.getTracking(awb);
    }
    
    if (!trackingData || !trackingData.tracking_data) {
      trackingData = await this.shiprocketService.getTrackingByOrderId(order.orderNumber || order.id);
    }

    if ((!trackingData || !trackingData.tracking_data) && isNumericAwb) {
      trackingData = await this.shiprocketService.getTrackingByShipmentId(awb.trim());
    }

    if (order.status === 'cancelled' || order.status === 'refunded') {
      return {
        success: true,
        message: `Order is already ${order.status}; sync skipped status mutation.`,
        data: trackingData
      };
    }

    const rawCourier = trackingData?.courier_name || trackingData?.tracking_data?.courier_name || trackingData?.data?.courier_name || trackingData?.tracking_data?.shipment_track?.[0]?.courier_name || null;
    const srCourier = (rawCourier && rawCourier !== 'Standard Luxury Courier') ? String(rawCourier).trim() : null;

    const rawAwb = trackingData?.awb_code || trackingData?.tracking_data?.awb_code || trackingData?.data?.awb_code || trackingData?.tracking_data?.shipment_track?.[0]?.awb_code || null;
    const awbStr = rawAwb ? String(rawAwb).trim() : null;
    const isInvalidSrAwb = !awbStr || awbStr.startsWith('ORD-') || awbStr.startsWith('SHP-') || ['pending', 'null', 'n/a'].includes(awbStr.toLowerCase());
    const srAwb = !isInvalidSrAwb ? awbStr : null;

    if (trackingData?.tracking_data?.track_status) {
      const statusStr = (trackingData.tracking_data.track_status || '').toUpperCase();
      let newOrderStatus = order.status;
      let newShippingStatus = order.shippingStatus;

      if (statusStr.includes('DELIVERED')) {
        newOrderStatus = 'delivered';
        newShippingStatus = 'delivered';
        if (order.shippingStatus !== 'delivered') {
          const recipientMobile = (order as any).customerMobile || (order as any).addresses?.[0]?.phone;
          if (recipientMobile) {
            this.whatsappService.sendDelivered(recipientMobile)
              .catch(err => this.logger.error(`Failed to dispatch Delivered WhatsApp: ${err.message}`));
          }
        }
      } else if (statusStr.includes('OUT FOR DELIVERY')) {
        newOrderStatus = 'shipped';
        newShippingStatus = 'out_for_delivery';
        if (order.shippingStatus !== 'out_for_delivery') {
          const recipientMobile = (order as any).customerMobile || (order as any).addresses?.[0]?.phone;
          if (recipientMobile) {
            this.whatsappService.sendOutForDelivery(recipientMobile)
              .catch(err => this.logger.error(`Failed to dispatch Out For Delivery WhatsApp: ${err.message}`));
          }
        }
      } else if (statusStr.includes('IN TRANSIT') || statusStr.includes('SHIPPED') || statusStr.includes('PICKED UP') || statusStr.includes('DISPATCHED')) {
        newOrderStatus = 'shipped';
        newShippingStatus = 'shipped';
        if (order.shippingStatus !== 'shipped') {
          const recipientMobile = (order as any).customerMobile || (order as any).addresses?.[0]?.phone;
          const awbNumber = srAwb || (order as any).shipments?.[0]?.trackingNumber || order.orderNumber || `ORD-${order.id}`;
          if (recipientMobile) {
            this.whatsappService.sendOrderShipped(recipientMobile, awbNumber)
              .catch(err => this.logger.error(`Failed to dispatch Order Shipped WhatsApp: ${err.message}`));
          }
        }
      }

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: newOrderStatus,
          shippingStatus: newShippingStatus,
          updatedAt: new Date(),
        }
      });
    }

    const existingShipment = order.shipments?.[0];
    if (existingShipment) {
      const existingAwb = existingShipment.trackingNumber?.trim();
      const isExistingInvalid = !existingAwb || existingAwb.startsWith('ORD-') || existingAwb.startsWith('SHP-') || ['pending', 'null', 'n/a'].includes(existingAwb.toLowerCase());
      const cleanAwb = srAwb || (!isExistingInvalid ? existingAwb : null);
      const cleanCarrier = srCourier || (existingShipment.carrier === 'Standard Luxury Courier' ? null : existingShipment.carrier);

      await this.prisma.orderShipment.update({
        where: { id: existingShipment.id },
        data: {
          trackingNumber: cleanAwb,
          carrier: cleanCarrier,
          trackingUrl: cleanAwb ? `https://shiprocket.co/tracking/${cleanAwb}` : null,
        }
      });
    }

    return {
      success: true,
      message: 'Tracking synchronized with Shiprocket',
      data: trackingData || { message: 'No live tracking data available yet from courier.' }
    };
  }

  async handleShiprocketWebhook(payload: any) {
    this.logger.log(`Shiprocket Webhook received: ${JSON.stringify(payload)}`);
    if (!payload || Object.keys(payload).length === 0) {
      return { success: true, message: 'Shiprocket Webhook test ping successful' };
    }

    const orderNumber = payload.order_id || payload.channel_order_id;
    if (!orderNumber) {
      return { success: true, message: 'Webhook endpoint active (Test Ping Received)' };
    }

    const numSrId = Number(orderNumber);
    const isValidSrInt32Id = !isNaN(numSrId) && numSrId > 0 && numSrId <= 2147483647;

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: orderNumber.toString() },
          { id: isValidSrInt32Id ? numSrId : -1 }
        ]
      },
      include: { shipments: true, addresses: true }
    });

    if (!order) {
      this.logger.warn(`Shiprocket Webhook: Order not found for order_id ${orderNumber}`);
      return { success: true, message: `Webhook test acknowledged; order ${orderNumber} not in DB` };
    }

    // Never allow a webhook to resurrect a cancelled or refunded order
    if (order.status === 'cancelled' || order.status === 'refunded') {
      this.logger.log(`Order #${order.id} is already ${order.status}. Ignoring tracking webhook.`);
      return { success: true, message: `Order #${order.id} is already ${order.status}` };
    }

    const shiprocketStatus = (payload.current_status || payload.status || '').toUpperCase();
    const awb = payload.awb || payload.awb_code || null;
    const courier = payload.courier_name || null;
    const now = new Date();

    let newShippingStatus = order.shippingStatus;
    let newOrderStatus = order.status;
    const updateData: any = { updatedAt: now };

    if (shiprocketStatus.includes('PICKUP SCHEDULED') || shiprocketStatus.includes('PICKUP QUEUED') || shiprocketStatus.includes('MANIFEST GENERATED')) {
      newShippingStatus = 'processing';
      newOrderStatus = 'processing';
      if (!order.processingAt) updateData.processingAt = now;
    } else if (shiprocketStatus.includes('IN TRANSIT') || shiprocketStatus.includes('SHIPPED') || shiprocketStatus.includes('DISPATCHED') || shiprocketStatus.includes('PICKED UP')) {
      newShippingStatus = 'shipped';
      newOrderStatus = 'shipped';
      if (!order.shippedAt) updateData.shippedAt = now;
      if (order.shippingStatus !== 'shipped') {
        const recipientMobile = order.customerMobile || order.addresses?.[0]?.phone;
        const awbNumber = awb || order.shipments?.[0]?.trackingNumber || order.orderNumber || `ORD-${order.id}`;
        if (recipientMobile) {
          this.whatsappService.sendOrderShipped(recipientMobile, awbNumber)
            .catch(err => this.logger.error(`Failed to dispatch Order Shipped WhatsApp: ${err.message}`));
        }
      }
    } else if (shiprocketStatus.includes('OUT FOR DELIVERY')) {
      newShippingStatus = 'out_for_delivery';
      newOrderStatus = 'shipped';
      if (order.shippingStatus !== 'out_for_delivery') {
        const recipientMobile = order.customerMobile || order.addresses?.[0]?.phone;
        if (recipientMobile) {
          this.whatsappService.sendOutForDelivery(recipientMobile)
            .catch(err => this.logger.error(`Failed to dispatch Out For Delivery WhatsApp: ${err.message}`));
        }
      }
    } else if (shiprocketStatus.includes('DELIVERED')) {
      newShippingStatus = 'delivered';
      newOrderStatus = 'delivered';
      if (!order.deliveredAt) {
        updateData.deliveredAt = now;
        const recipientMobile = order.customerMobile || order.addresses?.[0]?.phone;
        if (recipientMobile) {
          this.whatsappService.sendDelivered(recipientMobile)
            .catch(err => this.logger.error(`Failed to dispatch Delivered WhatsApp: ${err.message}`));
        }
      }
    } else if (shiprocketStatus.includes('CANCELLED') || shiprocketStatus.includes('CANCELED')) {
      newShippingStatus = 'cancelled';
      newOrderStatus = 'cancelled';
      if (!order.cancelledAt) updateData.cancelledAt = now;
    } else if (shiprocketStatus.includes('RTO')) {
      newShippingStatus = 'rto';
    }

    updateData.shippingStatus = newShippingStatus;
    updateData.status = newOrderStatus;

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });

    // Update shipment AWB and tracking if available in webhook
    if (awb || courier) {
      const existingShipment = order.shipments?.[0];
      if (existingShipment) {
        await this.prisma.orderShipment.update({
          where: { id: existingShipment.id },
          data: {
            trackingNumber: awb || existingShipment.trackingNumber,
            carrier: courier || existingShipment.carrier,
            status: newShippingStatus,
            trackingUrl: awb ? `https://shiprocket.co/tracking/${awb}` : existingShipment.trackingUrl,
            shippedAt: newShippingStatus === 'shipped' ? now : existingShipment.shippedAt,
            deliveredAt: newShippingStatus === 'delivered' ? now : existingShipment.deliveredAt,
          }
        });
      }
    }

    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: newOrderStatus,
        notes: `Shiprocket Webhook: ${shiprocketStatus}${awb ? ` (AWB: ${awb}, Courier: ${courier || 'N/A'})` : ''}`,
      }
    });

    return { success: true, orderId: order.id, status: newOrderStatus, shippingStatus: newShippingStatus };
  }

  async trackOrder(orderId: string, mobile: string) {
    if (!orderId || !mobile) {
      return {
        success: false,
        message: 'No order found',
        data: null
      };
    }

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const cleanOrderId = orderId.trim();
    const strippedOrderId = cleanOrderId.replace(/^#+/, '').replace(/^ORD-?/i, '').trim();

    if (!cleanMobile || cleanMobile.length !== 10) {
      return {
        success: false,
        message: 'No order found',
        data: null
      };
    }

    const numOrderId = Number(strippedOrderId);
    const isValidInt32Id = !isNaN(numOrderId) && numOrderId > 0 && numOrderId <= 2147483647;

    const order = await this.prisma.order.findFirst({
      where: {
        AND: [
          {
            OR: [
              { orderNumber: cleanOrderId },
              { orderNumber: strippedOrderId },
              { orderNumber: `ORD-${strippedOrderId}` },
              { orderNumber: `#${strippedOrderId}` },
              { orderNumber: `#ORD-${strippedOrderId}` },
              { orderNumber: { contains: strippedOrderId } },
              { id: isValidInt32Id ? numOrderId : -1 }
            ]
          },
          {
            OR: [
              { customerMobile: { contains: cleanMobile } },
              { addresses: { some: { phone: { contains: cleanMobile } } } },
              { customer: { mobile: { contains: cleanMobile } } }
            ]
          }
        ]
      },
      include: {
        items: true,
        addresses: true,
        shipments: true,
        statusHistory: true
      }
    });

    if (!order) {
      return {
        success: false,
        message: 'No order found',
        data: null
      };
    }

    const rawStatus = String(order.shippingStatus || order.status || 'Processing');
    const formattedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

    const createdDate = order.createdAt ? new Date(order.createdAt) : new Date();
    const deliveryDate = new Date(createdDate.getTime() + 4 * 24 * 60 * 60 * 1000);
    const expectedDeliveryStr = deliveryDate.toISOString().split('T')[0];

    const latestHistoryWithAwb = Array.isArray((order as any).statusHistory)
      ? ((order as any).statusHistory).find((h: any) => h && h.notes && String(h.notes).includes('AWB:'))
      : null;

    let awbCode: string | null = null;
    if (latestHistoryWithAwb && latestHistoryWithAwb.notes) {
      const match = String(latestHistoryWithAwb.notes).match(/AWB:\s*([^\s)]+)/);
      if (match && match[1] && match[1] !== 'N/A') {
        awbCode = match[1];
      }
    }

    const shipmentsArr = (order as any).shipments || [];
    const realShipment = (shipmentsArr && shipmentsArr.length > 0) ? shipmentsArr[0] : null;
    if (realShipment?.trackingNumber) {
      awbCode = realShipment.trackingNumber;
    }

    return {
      success: true,
      message: 'Order found',
      data: {
        order_number: order.orderNumber || `ORD-${order.id}`,
        status: formattedStatus,
        courier: realShipment?.carrier || null,
        expected_delivery: expectedDeliveryStr,
        tracking_number: awbCode,
        grand_total: Number(order.grandTotal || 0),
        items: Array.isArray(order.items) ? order.items.map((i: any) => i.productName || 'Watch') : []
      }
    };
  }

  async getOrdersByMobile(mobile: string, type?: string) {
    if (!mobile) {
      throw new NotFoundException({
        success: false,
        message: 'No order found for this mobile number',
        data: []
      });
    }

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);

    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          { customerMobile: { contains: cleanMobile } },
          { addresses: { some: { phone: { contains: cleanMobile } } } },
          { customer: { mobile: { contains: cleanMobile } } }
        ]
      },
      include: {
        items: true,
        addresses: true,
        shipments: true,
        statusHistory: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!orders || orders.length === 0) {
      throw new NotFoundException({
        success: false,
        message: 'No order found for this mobile number',
        data: []
      });
    }

    let filtered = orders;
    if (type === 'active') {
      filtered = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled' && o.shippingStatus !== 'delivered');
    }

    const data = filtered.map((order: any) => {
      const rawStatus = order.shippingStatus || order.status || 'Processing';
      const formattedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
      const createdDate = order.createdAt ? new Date(order.createdAt) : new Date();
      const deliveryDate = new Date(createdDate.getTime() + 4 * 24 * 60 * 60 * 1000);
      const realShipment = (order.shipments && order.shipments.length > 0) ? order.shipments[0] : null;

      return {
        order_number: order.orderNumber || `ORD-${order.id}`,
        status: formattedStatus,
        courier: realShipment?.carrier || null,
        expected_delivery: deliveryDate.toISOString().split('T')[0],
        tracking_number: realShipment?.trackingNumber || null,
        grand_total: Number(order.grandTotal),
        items: order.items ? order.items.map((i: any) => i.productName || 'Watch') : [],
        created_at: createdDate.toISOString().split('T')[0]
      };
    });

    return {
      success: true,
      message: 'Orders retrieved successfully',
      count: data.length,
      data
    };
  }

  // Update Status (Admin)
  async updateStatus(orderId: string, status: string, notes?: string, adminId?: string) {
    const oId = Number(orderId);
    const order = await this.prisma.order.findUnique({ 
      where: { id: oId },
      include: {
        addresses: true,
        items: { include: { productVariant: true } },
        shipments: true,
        customer: true,
      }
    });
    if (!order) throw new NotFoundException('Order not found');

    const cleanStatus = status.toLowerCase();
    const now = new Date();
    const updateData: any = { 
      status: cleanStatus,
      updatedAt: now,
    };

    const isBecomingCancelled = cleanStatus === 'cancelled' && order.status !== 'cancelled';

    if (cleanStatus === 'confirmed' && !order.confirmedAt) {
      updateData.confirmedAt = now;
    } else if (cleanStatus === 'processing') {
      if (!order.processingAt) updateData.processingAt = now;
      if (!order.confirmedAt) updateData.confirmedAt = now;
    } else if (cleanStatus === 'shipped') {
      if (!order.shippedAt) updateData.shippedAt = now;
      updateData.shippingStatus = 'shipped';
      if (order.shippingStatus !== 'shipped') {
        const recipientMobile = order.customerMobile || order.addresses?.[0]?.phone;
        const awbNumber = order.shipments?.[0]?.trackingNumber || order.orderNumber || `ORD-${order.id}`;
        if (recipientMobile) {
          this.whatsappService.sendOrderShipped(recipientMobile, awbNumber)
            .catch(err => this.logger.error(`Failed to dispatch Order Shipped WhatsApp: ${err.message}`));
        }
      }
    } else if (cleanStatus === 'out_for_delivery') {
      if (order.shippingStatus !== 'out_for_delivery') {
        const recipientMobile = order.customerMobile || order.addresses?.[0]?.phone;
        if (recipientMobile) {
          this.whatsappService.sendOutForDelivery(recipientMobile)
            .catch(err => this.logger.error(`Failed to dispatch Out For Delivery WhatsApp: ${err.message}`));
        }
      }
      updateData.shippingStatus = 'out_for_delivery';
    } else if (cleanStatus === 'delivered') {
      if (!order.deliveredAt) {
        updateData.deliveredAt = now;
        const recipientMobile = order.customerMobile || order.addresses?.[0]?.phone;
        if (recipientMobile) {
          this.whatsappService.sendDelivered(recipientMobile)
            .catch(err => this.logger.error(`Failed to dispatch Delivered WhatsApp: ${err.message}`));
        }
      }
      updateData.shippingStatus = 'delivered';
    } else if (cleanStatus === 'cancelled') {
      if (!order.cancelledAt) updateData.cancelledAt = now;
      updateData.shippingStatus = 'cancelled';
      if (!order.cancellationReason && notes) updateData.cancellationReason = notes;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: oId },
        data: updateData,
      });

      await tx.orderStatusHistory.create({
        data: { orderId: oId, status: cleanStatus, notes, adminId: adminId ? Number(adminId) : null },
      });

      // If cancelling an active order, restock inventory & restore loyalty points
      if (isBecomingCancelled) {
        for (const item of (order.items || [])) {
          const variant = item.productVariant;
          if (variant) {
            const restockData: any = {};
            if (variant.manageStock) {
              const restoredQty = (variant.qty || 0) + item.quantity;
              restockData.qty = restoredQty;
              restockData.inStock = true;
              restockData.stockStatus = 'instock';
            }
            if (typeof variant.fakeSoldCount === 'number' && variant.fakeSoldCount >= item.quantity) {
              restockData.fakeSoldCount = { decrement: item.quantity };
            }
            await tx.productVariant.update({
              where: { id: variant.id },
              data: restockData
            });
          }
        }

        if (order.loyaltyPointsUsed && order.loyaltyPointsUsed > 0 && order.customerId) {
          const points = order.loyaltyPointsUsed;
          const loyalty = await tx.customerLoyalty.findFirst({ where: { customerId: order.customerId } });
          if (loyalty) {
            await tx.loyaltyTransaction.create({
              data: {
                customerLoyaltyId: loyalty.id,
                customerId: order.customerId,
                type: 'refund',
                points: points,
                balance: Number(loyalty.availablePoints) + points,
                referenceType: 'order',
                referenceId: oId,
                notes: 'Points refunded due to admin cancellation',
              }
            });
            await tx.customerLoyalty.update({
              where: { id: loyalty.id },
              data: {
                availablePoints: { increment: points },
                usedPoints: { decrement: points },
              }
            });
          }
        }

        const shipment = order.shipments?.[0];
        if (shipment) {
          await tx.orderShipment.update({
            where: { id: shipment.id },
            data: { status: 'cancelled' }
          });
        }
      }

      return updatedOrder;
    });

    if (isBecomingCancelled) {
      this.shiprocketService.cancelOrder(order.orderNumber || order.id).catch(e => {
        this.logger.warn(`Shiprocket cancellation notice skipped: ${e.message}`);
      });
    }

    return { success: true, data: updated };
  }

  // Update Payment Status (Admin)
  async updatePaymentStatus(orderId: string, paymentStatus: string, notes?: string) {
    const oId = Number(orderId);
    const order = await this.prisma.order.findUnique({ where: { id: oId } });
    if (!order) throw new NotFoundException('Order not found');

    const updatedOrder = await this.prisma.order.update({
      where: { id: oId },
      data: { paymentStatus },
    });

    return { success: true, data: updatedOrder };
  }

  // Cancel Order (Customer)
  async cancelOrder(customerId: string, orderId: string, reason: string) {
    const cId = Number(customerId);
    const oId = Number(orderId);

    const order = await this.prisma.order.findUnique({
      where: { id: oId },
      include: {
        customer: true,
        items: { include: { productVariant: true } },
        payments: true,
        shipments: true,
      }
    });

    if (!order || order.customerId !== cId) throw new NotFoundException('Order not found');
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled in its current state');
    }

    let razorpayRefundResult: any = null;
    const paidPayment = order.payments?.find(p => p.status === 'success' || p.status === 'paid') || order.payments?.[0];
    const razorpayPaymentId = paidPayment?.transactionId || (order as any).paymentId;
    const isOnlinePaid = order.paymentStatus === 'paid' && razorpayPaymentId?.startsWith('pay_');

    if (isOnlinePaid) {
      try {
        const refundAmt = Number(order.grandTotal || 0);
        razorpayRefundResult = await this.paymentService.refundPayment(razorpayPaymentId, refundAmt, { reason });
        this.logger.log(`Razorpay refund triggered for cancelled order #${oId}: ${razorpayRefundResult?.id}`);
      } catch (err: any) {
        this.logger.warn(`Razorpay refund failed on cancellation for order #${oId}: ${err.message}`);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const updatedOrder = await tx.order.update({
        where: { id: oId },
        data: {
          status: 'cancelled',
          shippingStatus: 'cancelled',
          paymentStatus: isOnlinePaid ? 'refunded' : order.paymentStatus,
          cancellationReason: reason,
          cancelledAt: now,
          updatedAt: now,
        }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: oId,
          status: 'cancelled',
          notes: `Cancelled by customer: ${reason}${razorpayRefundResult ? ` (Refund ID: ${razorpayRefundResult.id})` : ''}`
        },
      });

      // Restock inventory
      for (const item of (order.items || [])) {
        const variant = item.productVariant;
        if (variant) {
          const restockData: any = {};
          if (variant.manageStock) {
            const restoredQty = (variant.qty || 0) + item.quantity;
            restockData.qty = restoredQty;
            restockData.inStock = true;
            restockData.stockStatus = 'instock';
          }
          if (typeof variant.fakeSoldCount === 'number' && variant.fakeSoldCount >= item.quantity) {
            restockData.fakeSoldCount = { decrement: item.quantity };
          }
          await tx.productVariant.update({
            where: { id: variant.id },
            data: restockData
          });
        }
      }

      // Refund Loyalty Points if used
      if (order.loyaltyPointsUsed && order.loyaltyPointsUsed > 0) {
        const points = order.loyaltyPointsUsed;
        const loyalty = await tx.customerLoyalty.findFirst({ where: { customerId: cId } });
        if (loyalty) {
          await tx.loyaltyTransaction.create({
            data: {
              customerLoyaltyId: loyalty.id,
              customerId: cId,
              type: 'refund',
              points: points,
              balance: Number(loyalty.availablePoints) + points,
              referenceType: 'order',
              referenceId: oId,
              notes: 'Points refunded due to cancellation',
            }
          });
          await tx.customerLoyalty.update({
            where: { id: loyalty.id },
            data: {
              availablePoints: { increment: points },
              usedPoints: { decrement: points },
            }
          });
        }
      }

      const shipment = order.shipments?.[0];
      if (shipment) {
        await tx.orderShipment.update({
          where: { id: shipment.id },
          data: { status: 'cancelled' }
        });
      }

      return updatedOrder;
    });

    this.shiprocketService.cancelOrder(order.orderNumber || order.id).catch(e => {
      this.logger.warn(`Shiprocket cancellation notice skipped: ${e.message}`);
    });

    if (isOnlinePaid) {
      try {
        const ordAny = order as any;
        const customerMobile = ordAny.customer?.mobile || ordAny.addresses?.find((a: any) => a.mobile)?.mobile || ordAny.shipping_address?.mobile || ordAny.shippingAddress?.mobile;
        const customerName = ordAny.customer?.name || ordAny.addresses?.find((a: any) => a.name)?.name || 'Valued Customer';
        const orderNum = order.orderNumber || `ORD-${order.id}`;
        const refundAmt = Number(order.grandTotal || 0);

        if (customerMobile) {
          this.whatsappService.sendRefundInitiated(customerMobile, customerName, orderNum, refundAmt).catch(err => {
            this.logger.error(`Failed to send Refund Initiated WhatsApp notification for cancelled order #${order.id}:`, err?.message || err);
          });
        }
      } catch (wsErr: any) {
        this.logger.warn(`Could not prepare Refund Initiated WhatsApp notification on cancellation: ${wsErr.message}`);
      }
    }

    return updated;
  }

  // Delete Order (Admin)
  async deleteOrder(orderId: string) {
    const oId = Number(orderId);
    const order = await this.prisma.order.findUnique({ where: { id: oId } });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.$transaction(async (tx) => {
      // Clean up dependencies
      await tx.orderItem.deleteMany({ where: { orderId: oId } });
      await tx.orderAddress.deleteMany({ where: { orderId: oId } });
      await tx.orderStatusHistory.deleteMany({ where: { orderId: oId } });
      await tx.payment.deleteMany({ where: { orderId: oId } });
      
      const deletedOrder = await tx.order.delete({ where: { id: oId } });
      return { success: true, data: deletedOrder };
    });
  }

  // Get all orders (Admin)
  async getAllOrders() {
    const orders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: {
          select: { name: true, email: true }
        },
        shipments: true,
        returns: true,
        statusHistory: { orderBy: { createdAt: 'desc' } }
      },
    });
    return { success: true, data: orders };
  }

  // Get orders for a specific customer
  async getOrders(customerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { customerId: Number(customerId) },
      orderBy: { createdAt: 'desc' },
      include: {
        shipments: {
          orderBy: { id: 'desc' },
        },
        items: {
          include: {
            product: true,
            productVariant: {
              include: {
                variantImages: {
                  include: {
                    media: true
                  }
                },
                variantAttributes: {
                  include: {
                    attributeValue: {
                      include: {
                        attribute: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
    });
    return { success: true, data: orders };
  }

  async getOrderById(customerId: string, orderId: string) {
    const orderIdStr = orderId?.toString() || '';
    const isNumeric = !isNaN(Number(orderIdStr)) && !orderIdStr.startsWith('ORD-') && orderIdStr !== '';
    const oId = isNumeric ? Number(orderIdStr) : null;

    const order = await this.prisma.order.findFirst({
      where: oId 
        ? { id: oId } 
        : { 
            OR: [
              { orderNumber: orderIdStr },
              { orderNumber: `ORD-${orderIdStr}` }
            ] 
          },
      include: {
        items: {
          include: {
            product: true,
            productVariant: {
              include: {
                variantImages: {
                  include: {
                    media: true
                  }
                },
                variantAttributes: {
                  include: {
                    attributeValue: {
                      include: {
                        attribute: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        addresses: true,
        customer: { select: { id: true, name: true, email: true, mobile: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        shipments: true,
        returns: true
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Security check: If customerId is provided, verify ownership
    if (customerId) {
      const customerIdStr = customerId.toString();
      const isNumeric = !isNaN(Number(customerIdStr)) && !customerIdStr.includes('usr_') && customerIdStr !== '';
      const cId = isNumeric ? Number(customerIdStr) : null;

      if (cId && order.customerId !== cId) {
        throw new NotFoundException('Order not found');
      }
    }

    return { success: true, data: order };
  }

  async calculateOrderTotal(customerId: string, pincode?: string, couponCode?: string, useCredits: boolean = true) {
    const customerIdStr = customerId?.toString() || '';
    const isNumeric = !isNaN(Number(customerIdStr)) && !customerIdStr.includes('usr_') && !customerIdStr.includes('gst_') && customerIdStr !== '';
    const cId = isNumeric ? Number(customerIdStr) : null;

    // Prefer active cart that actually has items
    let cart = await this.prisma.cart.findFirst({
      where: {
        OR: [
          ...(cId ? [{ customerId: cId }] : []),
          { sessionId: customerIdStr }
        ],
        status: 'active',
        items: { some: {} }
      },
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'desc' }
      ],
      include: { 
        items: { 
          include: { 
            productVariant: { include: { product: { include: { categories: true } } } },
            Product: { include: { categories: true } },
            belt: true
          } 
        }, 
        offer: { include: { categories: true } } 
      }
    });

    if (!cart) {
      cart = await this.prisma.cart.findFirst({
        where: {
          OR: [
            ...(cId ? [{ customerId: cId }] : []),
            { sessionId: customerIdStr }
          ],
          status: 'active'
        },
        orderBy: [
          { updatedAt: 'desc' },
          { id: 'desc' }
        ],
        include: { 
          items: { 
            include: { 
              productVariant: { include: { product: { include: { categories: true } } } },
              Product: { include: { categories: true } },
              belt: true
            } 
          }, 
          offer: { include: { categories: true } } 
        }
      });
    }

    if (!cart || cart.items.length === 0) {
      return { subtotal: 0, shipping: 0, tax: 0, discount: 0, couponDiscount: 0, creditDiscount: 0, availableCredits: 0, appliedCredits: 0, total: 0 };
    }

    // Always compute subtotal directly from cart items
    const subtotal = cart.items.reduce((sum, item) => sum + (Number(item.total) || (Number(item.unitPrice) * Number(item.quantity)) || 0), 0);
    let shippingTotal = 0; // FREE SHIPPING ALL OVER INDIA
    let message = 'Free Shipping All Over India';

    if (pincode && pincode.length === 6) {
      try {
        const rateData = await this.calculateShipping(customerId, pincode);
        message = rateData.message || 'Free Shipping All Over India';
      } catch (e) {
        this.logger.warn(`Error calculating shipping in total: ${e.message}`);
      }
    }

    let couponDiscount = 0;
    let appliedOffer: any = null;
    let couponError = null;

    // Only apply coupon if explicitly passed by customer, or marked as auto-apply
    if (couponCode && couponCode.trim()) {
      try {
        appliedOffer = await this.marketingService.validateCoupon(customerId, couponCode.trim(), subtotal, cart.items);
      } catch (e) {
        this.logger.warn(`Invalid coupon: ${e.message}`);
        appliedOffer = null;
        couponError = e.message;
      }
    } else if (cart.offer && cart.offer.code) {
      try {
        appliedOffer = await this.marketingService.validateCoupon(customerId, cart.offer.code, subtotal, cart.items);
      } catch (e) {
        this.logger.warn(`Attached cart offer not valid for calculateTotal: ${e.message}`);
        appliedOffer = null;
      }
    }

    if (appliedOffer) {
      couponDiscount = await this.marketingService.calculateDiscount(appliedOffer, subtotal, cart.items);
    }

    // Check Customer FYLEX Loyalty Credits Balance
    let availableCredits = 0;
    let appliedCredits = 0;
    let creditDiscount = 0;

    if (cId) {
      const loyalty = await this.prisma.customerLoyalty.findFirst({
        where: { customerId: cId }
      });
      if (loyalty) {
        availableCredits = Number(loyalty.availablePoints || 0);
      }
    }

    if (useCredits !== false && availableCredits > 0) {
      const netSubtotalAfterCoupon = Math.max(0, subtotal - couponDiscount);
      appliedCredits = Math.min(availableCredits, netSubtotalAfterCoupon);
      creditDiscount = appliedCredits;
    }

    const totalDiscount = couponDiscount + creditDiscount;
    const finalTotal = Math.max(0, subtotal - totalDiscount);

    return {
      subtotal,
      shipping: 0,
      tax: 0,
      discount: totalDiscount,
      couponDiscount,
      creditDiscount,
      availableCredits,
      appliedCredits,
      total: finalTotal,
      message: 'Free Shipping All Over India',
      couponError,
      offerDescription: appliedOffer?.description || appliedOffer?.name || ''
    };
  }

  async calculateShipping(customerId: string, pincode: string) {
    const customerIdStr = customerId?.toString() || '';
    const isNumeric = !isNaN(Number(customerIdStr)) && !isNaN(Number(customerIdStr)) && !customerIdStr.includes('usr_') && customerIdStr !== '';
    const cId = isNumeric ? Number(customerIdStr) : null;

    const cart = await this.prisma.cart.findFirst({
      where: cId ? { customerId: cId, status: 'active' } : { sessionId: customerIdStr, status: 'active' },
      include: { items: { include: { productVariant: true } } }
    });

    if (!cart || cart.items.length === 0) return { serviceable: false, rate: 0, message: "Cart is empty" };

    let totalWeight = 0;
    for (const item of cart.items) {
      let itemWeight = 0.4;
      if (item.productVariant) {
        itemWeight = item.productVariant.weight ? Number(item.productVariant.weight) : 0.4;
      }
      totalWeight += itemWeight * item.quantity;
    }

    const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE || '360002';
    const rateData = await this.shiprocketService.checkServiceability(
      pickupPincode,
      pincode,
      totalWeight
    );

    return {
      ...rateData,
      rate: 0,
      shippingCharge: 0,
    };
  }

  // Update Tracking (Admin)
  async updateTracking(orderId: string, trackingData: any) {
    const oId = Number(orderId);
    const order = await this.prisma.order.findUnique({ where: { id: oId }, include: { shipments: true } });
    if (!order) throw new NotFoundException('Order not found');

    const { carrier, trackingNumber, trackingUrl } = trackingData;

    return this.prisma.$transaction(async (tx) => {
      let shipment;
      if (order.shipments && order.shipments.length > 0) {
        shipment = await tx.orderShipment.update({
          where: { id: order.shipments[0].id },
          data: { carrier, trackingNumber, trackingUrl }
        });
      } else {
        shipment = await tx.orderShipment.create({
          data: {
            orderId: oId,
            carrier,
            trackingNumber,
            trackingUrl,
            status: 'shipped'
          }
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: oId,
          status: order.status,
          notes: `Tracking updated: ${carrier || ''} ${trackingNumber || ''}`
        }
      });

      return { success: true, data: shipment };
    });
  }

  // Process Refund (Admin)
  async processRefund(orderId: string, refundData: any) {
    const oId = Number(orderId);
    const order = await this.prisma.order.findUnique({
      where: { id: oId },
      include: {
        payments: true,
        items: { include: { productVariant: true } },
        shipments: true,
        customer: true,
        returns: true,
      }
    });
    if (!order) throw new NotFoundException('Order not found');

    const { amount, reason } = refundData;
    const refundAmt = Number(amount);

    if (isNaN(refundAmt) || refundAmt <= 0) {
      throw new BadRequestException('Invalid refund amount');
    }

    let razorpayRefundResult: any = null;

    // Check if order was paid online via Razorpay payment ID
    const paidPayment = order.payments?.find(p => p.status === 'success' || p.status === 'paid') || order.payments?.[0];
    const razorpayPaymentId = paidPayment?.transactionId || (order as any).paymentId;

    if (razorpayPaymentId && razorpayPaymentId.startsWith('pay_')) {
      try {
        razorpayRefundResult = await this.paymentService.refundPayment(razorpayPaymentId, refundAmt, { reason });
        this.logger.log(`Razorpay refund triggered for order #${oId}: ${razorpayRefundResult?.id}`);
      } catch (err: any) {
        this.logger.warn(`Razorpay automated refund call failed/skipped for order #${oId}: ${err.message}`);
      }
    }

    const previousRefundTotal = (order.returns || [])
      .filter(r => r.type === 'refund' && r.status === 'processed')
      .reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

    const totalRefunded = previousRefundTotal + refundAmt;
    const grandTotal = Number(order.grandTotal || 0);
    const isFullRefund = totalRefunded >= grandTotal;

    const isDelivered = (order.status || '').toLowerCase() === 'delivered' || (order.shippingStatus || '').toLowerCase() === 'delivered';

    const result = await this.prisma.$transaction(async (tx) => {
      const orderReturn = await tx.orderReturn.create({
        data: {
          returnNumber: `RET-${Date.now()}`,
          orderId: oId,
          status: 'processed',
          type: 'refund',
          refundAmount: refundAmt,
          reason: reason || 'Manual Admin Refund'
        }
      });

      const now = new Date();
      let newPaymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';
      let newOrderStatus = order.status;
      let newShippingStatus = order.shippingStatus;
      const orderUpdateData: any = {
        paymentStatus: newPaymentStatus,
        updatedAt: now,
      };

      if (isFullRefund) {
        if (!isDelivered) {
          // Pre-delivery full refund: order is CANCELLED and voided
          newOrderStatus = 'cancelled';
          newShippingStatus = 'cancelled';
          orderUpdateData.status = 'cancelled';
          orderUpdateData.shippingStatus = 'cancelled';
          if (!order.cancelledAt) orderUpdateData.cancelledAt = now;
          if (!order.cancellationReason) orderUpdateData.cancellationReason = reason || 'Full Refund Processed';

          // 1. Restock Inventory
          for (const item of (order.items || [])) {
            const variant = item.productVariant;
            if (variant) {
              const restockData: any = {};
              if (variant.manageStock) {
                const restoredQty = (variant.qty || 0) + item.quantity;
                restockData.qty = restoredQty;
                restockData.inStock = true;
                restockData.stockStatus = 'instock';
              }
              if (typeof variant.fakeSoldCount === 'number' && variant.fakeSoldCount >= item.quantity) {
                restockData.fakeSoldCount = { decrement: item.quantity };
              }
              await tx.productVariant.update({
                where: { id: variant.id },
                data: restockData
              });
            }
          }

          // 2. Restore Redeemed Loyalty Points
          if (order.loyaltyPointsUsed && order.loyaltyPointsUsed > 0 && order.customerId) {
            const points = order.loyaltyPointsUsed;
            const loyalty = await tx.customerLoyalty.findFirst({ where: { customerId: order.customerId } });
            if (loyalty) {
              await tx.loyaltyTransaction.create({
                data: {
                  customerLoyaltyId: loyalty.id,
                  customerId: order.customerId,
                  type: 'refund',
                  points: points,
                  balance: Number(loyalty.availablePoints) + points,
                  referenceType: 'order',
                  referenceId: oId,
                  notes: 'Points refunded due to order cancellation & full refund',
                }
              });
              await tx.customerLoyalty.update({
                where: { id: loyalty.id },
                data: {
                  availablePoints: { increment: points },
                  usedPoints: { decrement: points },
                }
              });
            }
          }

          // 3. Mark shipment cancelled
          const shipment = order.shipments?.[0];
          if (shipment) {
            await tx.orderShipment.update({
              where: { id: shipment.id },
              data: { status: 'cancelled' }
            });
          }
        } else {
          // Post-delivery full refund: order was received, now refunded/returned
          newOrderStatus = 'refunded';
          newShippingStatus = 'returned';
          orderUpdateData.status = 'refunded';
          orderUpdateData.shippingStatus = 'returned';

          // Clawback Loyalty Points Earned
          if (order.loyaltyPointsEarned && order.loyaltyPointsEarned > 0 && order.customerId) {
            const points = order.loyaltyPointsEarned;
            const loyalty = await tx.customerLoyalty.findFirst({ where: { customerId: order.customerId } });
            if (loyalty) {
              await tx.loyaltyTransaction.create({
                data: {
                  customerLoyaltyId: loyalty.id,
                  customerId: order.customerId,
                  type: 'adjustment',
                  points: -points,
                  balance: Math.max(0, Number(loyalty.availablePoints) - points),
                  referenceType: 'order',
                  referenceId: oId,
                  notes: 'Earned loyalty points clawback due to order refund',
                }
              });
              await tx.customerLoyalty.update({
                where: { id: loyalty.id },
                data: {
                  availablePoints: { decrement: points },
                  totalPoints: { decrement: points },
                }
              });
            }
          }
        }
      } else {
        // Partial refund: payment status updated, physical shipping remains active
        orderUpdateData.paymentStatus = 'partially_refunded';
      }

      const updatedOrder = await tx.order.update({
        where: { id: oId },
        data: orderUpdateData
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: oId,
          status: newOrderStatus,
          notes: `${isFullRefund ? 'Full' : 'Partial'} refund processed: ₹${refundAmt}. Reason: ${reason || 'N/A'}${razorpayRefundResult ? ` (Razorpay Refund ID: ${razorpayRefundResult.id})` : ''}`
        }
      });

      return {
        success: true,
        message: `${isFullRefund ? 'Full' : 'Partial'} refund of ₹${refundAmt} processed successfully!`,
        data: {
          orderReturn,
          order: updatedOrder,
          razorpayRefund: razorpayRefundResult
        }
      };
    });

    if (isFullRefund && !isDelivered) {
      this.shiprocketService.cancelOrder(order.orderNumber || order.id).catch(e => {
        this.logger.warn(`Shiprocket cancellation notice skipped: ${e.message}`);
      });
    }

    // Dispatch WhatsApp "Refund Initiated" template message (Template ID: 259509717888702541912126)
    try {
      const ordAny = order as any;
      const customerMobile = ordAny.customer?.mobile || ordAny.addresses?.find((a: any) => a.mobile)?.mobile || ordAny.shipping_address?.mobile || ordAny.shippingAddress?.mobile;
      const customerName = ordAny.customer?.name || ordAny.addresses?.find((a: any) => a.name)?.name || 'Valued Customer';
      const orderNum = order.orderNumber || `ORD-${order.id}`;

      if (customerMobile) {
        this.whatsappService.sendRefundInitiated(customerMobile, customerName, orderNum, refundAmt).catch(err => {
          this.logger.error(`Failed to send Refund Initiated WhatsApp notification for order #${order.id}:`, err?.message || err);
        });
      }
    } catch (wsErr: any) {
      this.logger.warn(`Could not prepare Refund Initiated WhatsApp notification: ${wsErr.message}`);
    }

    return result;
  }

  // ============================================================================
  // ⚡ RAZORPAY 1-CLICK MAGIC CHECKOUT ENGINE (ZERO-FRICTION + SILENT ACCOUNT)
  // ============================================================================

  /**
   * Resolves active cart by either logged-in customerId or guest sessionId ('gst_...').
   */
  private async findActiveCartWithDetails(userOrSessionId: string, explicitCartId?: number | null) {
    const idStr = (userOrSessionId || '').toString().trim();
    const isNumeric = idStr !== '' && !isNaN(Number(idStr)) && !idStr.includes('gst_') && !idStr.includes('usr_');
    const cId = isNumeric ? Number(idStr) : null;

    const cartInclude = {
      items: {
        include: {
          productVariant: {
            include: {
              product: { include: { categories: true, productMedia: { include: { media: true } } } },
              variantImages: { include: { media: true } },
              variantAttributes: { include: { attributeValue: { include: { attribute: true } } } },
            },
          },
          Product: { include: { categories: true } },
          belt: { include: { image: true } },
        },
        orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
      },
      customer: true,
      offer: { include: { categories: true } },
    };

    if (explicitCartId && !isNaN(Number(explicitCartId))) {
      const byId = await this.prisma.cart.findUnique({
        where: { id: Number(explicitCartId) },
        include: cartInclude,
      });
      if (byId && byId.items.length > 0) return byId;
    }

    if (!idStr) return null;

    const withItems = await this.prisma.cart.findFirst({
      where: {
        OR: [
          ...(cId ? [{ customerId: cId }] : []),
          { sessionId: idStr },
        ],
        status: 'active',
        items: { some: {} },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      include: cartInclude,
    });

    if (withItems) return withItems;

    return this.prisma.cart.findFirst({
      where: {
        OR: [
          ...(cId ? [{ customerId: cId }] : []),
          { sessionId: idStr },
        ],
        status: 'active',
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      include: cartInclude,
    });
  }

  private resolvePublicImageUrl(rawPath?: string | null, publicOrigin?: string): string | undefined {
    if (!rawPath || typeof rawPath !== 'string') return undefined;
    const trimmed = rawPath.trim();
    if (!trimmed) return undefined;

    if (trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('http://') && !trimmed.includes('localhost') && !trimmed.includes('127.0.0.1')) {
      return trimmed;
    }

    const base = (publicOrigin || process.env.PUBLIC_SITE_URL || 'https://fylexwatches.com').replace(/\/+$/, '');
    if (base.includes('localhost') || base.includes('127.0.0.1')) {
      return undefined; // Razorpay line_items validator requires public domain URLs
    }

    let cleanRel = trimmed;
    if (cleanRel.includes('/uploads/')) {
      cleanRel = '/api/uploads/' + cleanRel.slice(cleanRel.indexOf('/uploads/') + 9);
    } else if (!cleanRel.startsWith('/')) {
      cleanRel = '/api/uploads/' + cleanRel;
    }
    return `${base}${cleanRel}`;
  }

  /**
   * Step 1: Creates a Razorpay Magic Checkout order directly from Cart (Guest or Logged-in).
   * Supports pre-applied coupons & FYLEX Credits, or returns { freeOrder: true } when total === 0.
   */
  async prepareMagicCheckoutOrder(params: {
    userId: string;
    couponCode?: string;
    useCredits?: boolean;
    receipt?: string;
    publicOrigin?: string;
  }) {
    const { userId, couponCode, useCredits = true, receipt, publicOrigin } = params;
    if (!userId) throw new BadRequestException('Cart session or userId is required');

    const cart = await this.findActiveCartWithDetails(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    // Pre-flight stock validation before opening payment modal
    for (const item of cart.items) {
      const variant = item.productVariant;
      if (variant && variant.manageStock) {
        if (!variant.inStock || variant.qty < item.quantity) {
          throw new BadRequestException(
            `Item "${variant.product?.name || variant.sku}" is out of stock or exceeds available quantity.`,
          );
        }
      } else if (item.beltId && item.belt) {
        if (typeof item.belt.stock === 'number' && item.belt.stock < item.quantity) {
          throw new BadRequestException(`Strap "${item.belt.name}" is out of stock.`);
        }
      }
    }

    const cleanCoupon = couponCode?.trim() || '';
    const totals: any = await this.calculateOrderTotal(userId, undefined, cleanCoupon || undefined, useCredits);

    if (cleanCoupon && totals.couponError) {
      throw new BadRequestException(totals.couponError);
    }

    // Handle 100% Free Coupon / Full Credit Order (Razorpay requires payable >= ₹1)
    if (totals.total <= 0) {
      return {
        freeOrder: true,
        amount: 0,
        currency: 'INR',
        cartId: cart.id,
        totals,
      };
    }

    const totalDiscountPaise = Math.max(0, Math.round(Number(totals.discount || 0) * 100));
    const rawItemsPaise = cart.items.map((item) => {
      const unitPaise = Math.round(Number(item.unitPrice || 0) * 100);
      const qty = Math.max(1, Number(item.quantity || 1));
      return { item, unitPaise, qty, lineSubtotalPaise: unitPaise * qty };
    });

    const subtotalPaise = rawItemsPaise.reduce((s, r) => s + r.lineSubtotalPaise, 0);
    const targetPayablePaise = Math.max(100, subtotalPaise - totalDiscountPaise);

    // Distribute any pre-applied discount cleanly across line_items so sum(offer_price * quantity) === amount
    let remainingDiscountPaise = Math.min(totalDiscountPaise, Math.max(0, subtotalPaise - 100));
    const lineItems: any[] = [];

    rawItemsPaise.forEach((entry, idx) => {
      const { item, unitPaise, qty, lineSubtotalPaise } = entry;
      const isLast = idx === rawItemsPaise.length - 1;
      let itemDiscountPaise = 0;

      if (remainingDiscountPaise > 0 && subtotalPaise > 0) {
        itemDiscountPaise = isLast
          ? remainingDiscountPaise
          : Math.min(remainingDiscountPaise, Math.round((lineSubtotalPaise / subtotalPaise) * totalDiscountPaise));
        itemDiscountPaise = Math.min(itemDiscountPaise, lineSubtotalPaise);
        remainingDiscountPaise -= itemDiscountPaise;
      }

      const variant = item.productVariant;
      const product = variant?.product;
      const belt = item.belt;

      const sku = (variant?.sku || (belt ? `BELT-${belt.id}` : `FYL-${item.id}`)).slice(0, 64);
      const variantIdStr = String(item.productVariantId || (belt ? `belt-${belt.id}` : item.id));
      const itemName = (product?.name || belt?.name || 'FYLEX Luxury Timepiece').slice(0, 120);

      const attrLabels = (variant?.variantAttributes || [])
        .map((va: any) => va.attributeValue?.label || va.attributeValue?.value)
        .filter(Boolean)
        .join(' • ');
      const itemDesc = (attrLabels || (belt ? 'Compatible Watch Strap' : product?.subtitle || 'Handcrafted Timepiece')).slice(0, 200);

      const rawImg =
        variant?.variantImages?.[0]?.media?.filePath ||
        variant?.variantImages?.[0]?.media?.fileName ||
        product?.productMedia?.[0]?.media?.filePath ||
        product?.heroImage ||
        belt?.image?.filePath ||
        belt?.image?.fileName ||
        null;
      const imageUrl = this.resolvePublicImageUrl(rawImg, publicOrigin);
      const weightGrams = Math.max(50, Math.round(Number(variant?.weight || 0.4) * 1000));

      const baseUnitDiscount = Math.floor(itemDiscountPaise / qty);
      const remainderDiscount = itemDiscountPaise - baseUnitDiscount * qty;

      const buildLine = (lineQty: number, offerUnitPaise: number, suffix = '') => {
        const line: any = {
          sku: suffix ? `${sku}-${suffix}`.slice(0, 64) : sku,
          variant_id: variantIdStr,
          price: unitPaise,
          offer_price: Math.max(0, offerUnitPaise),
          tax_amount: 0,
          quantity: lineQty,
          name: itemName,
          description: itemDesc,
          weight: weightGrams,
        };
        if (imageUrl) line.image_url = imageUrl;
        return line;
      };

      if (remainderDiscount > 0 && qty > 1) {
        lineItems.push(buildLine(qty - 1, unitPaise - baseUnitDiscount));
        lineItems.push(buildLine(1, unitPaise - baseUnitDiscount - remainderDiscount, 'D'));
      } else {
        lineItems.push(buildLine(qty, unitPaise - baseUnitDiscount - remainderDiscount));
      }
    });

    const computedLineTotalPaise = lineItems.reduce((sum, li) => sum + li.offer_price * li.quantity, 0);
    const finalAmountPaise = computedLineTotalPaise > 0 ? computedLineTotalPaise : targetPayablePaise;

    const appliedCouponCode = (!totals.couponError && cleanCoupon && Number(totals.couponDiscount) > 0)
      ? cleanCoupon
      : (cart.offer?.code && Number(totals.couponDiscount) > 0 ? cart.offer.code : '');
    const appliedCredits = Number(totals.appliedCredits || totals.creditDiscount || 0);

    const rzpOrder = await this.paymentService.createMagicOrder({
      amountPaise: finalAmountPaise,
      currency: 'INR',
      receipt: receipt || `fyl_${cart.id}_${Date.now()}`,
      lineItems,
      lineItemsTotalPaise: finalAmountPaise,
      notes: {
        source: 'fylex_magic_checkout',
        cartId: String(cart.id),
        userId: String(userId),
        preAppliedCoupon: appliedCouponCode,
        redeemPoints: String(appliedCredits),
      },
    });

    return {
      ...rzpOrder,
      freeOrder: false,
      cartId: cart.id,
      totals,
      prefill: cart.customer
        ? {
            name: cart.customer.name || '',
            email: cart.customer.email || '',
            contact: cart.customer.mobile || '',
          }
        : undefined,
    };
  }

  /**
   * Step 2a: Razorpay Magic Checkout Server Callback — Real-time Shipping & COD Serviceability.
   * Returns raw JSON (ResponseInterceptor is bypassed for this route).
   */
  async handleMagicShippingInfo(payload: any) {
    const addresses = Array.isArray(payload?.addresses) ? payload.addresses : [];
    const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE || '360002';

    const results = await Promise.all(
      addresses.map(async (addr: any) => {
        const zipcode = String(addr?.zipcode || addr?.pincode || addr?.postal_code || '').trim();
        const rateData = await this.shiprocketService.checkServiceability(pickupPincode, zipcode, 0.5);
        const isServiceable = rateData.serviceable !== false;
        const isCodAllowed = isServiceable && rateData.codAvailable !== false;
        const etdSummary = rateData.etd ? `Delivered within ${rateData.etd}` : 'Delivered within 3-5 business days';

        return {
          ...(addr?.id !== undefined ? { id: addr.id } : {}),
          zipcode,
          state: addr?.state || '',
          ...(addr?.state_code ? { state_code: addr.state_code } : {}),
          country: addr?.country || 'IN',
          serviceable: isServiceable,
          cod: isCodAllowed,
          cod_fee: 0,
          cod_amount: 0,
          shipping_methods: isServiceable
            ? [
                {
                  id: 'fylex_free_insured',
                  name: 'Free Insured Express Delivery',
                  description: etdSummary,
                  summary: etdSummary,
                  serviceability: true,
                  cod: isCodAllowed,
                  cod_fee: 0,
                  shipping_fee: 0,
                  charge: 0,
                },
              ]
            : [],
        };
      }),
    );

    return { addresses: results };
  }

  /**
   * Step 2b: Razorpay Magic Checkout Server Callback — List Available Coupons Inside Modal.
   */
  async handleMagicGetPromotions(payload: any) {
    try {
      const rzpOrderId = payload?.order_id || payload?.razorpay_order_id;
      const contact = payload?.contact || payload?.customer_details?.contact || '';
      let cart: any = null;
      let userId = '';

      if (rzpOrderId) {
        const rzpOrder = await this.paymentService.fetchOrder(rzpOrderId).catch(() => null);
        const notes = rzpOrder?.notes || {};
        if (notes.preAppliedCoupon) {
          // A coupon was already applied on /cart before launching Magic Checkout; prevent double-stacking
          return { promotions: [] };
        }
        userId = notes.userId || '';
        cart = await this.findActiveCartWithDetails(userId, notes.cartId ? Number(notes.cartId) : null);
      }

      const cartSubtotal = cart
        ? cart.items.reduce((s: number, i: any) => s + (Number(i.total) || Number(i.unitPrice) * Number(i.quantity) || 0), 0)
        : 0;

      const promotions = await this.marketingService.getPublicMagicPromotions(
        userId,
        cartSubtotal,
        cart?.items || [],
        contact,
      );

      return { promotions };
    } catch (err: any) {
      this.logger.warn(`handleMagicGetPromotions error: ${err.message}`);
      return { promotions: [] };
    }
  }

  /**
   * Step 2c: Razorpay Magic Checkout Server Callback — Validate & Apply Coupon Inside Modal.
   */
  async handleMagicApplyPromotion(payload: any) {
    const rzpOrderId = payload?.order_id || payload?.razorpay_order_id;
    const rawCode = String(payload?.code || '').trim();
    const contact = payload?.contact || payload?.customer_details?.contact || '';

    if (!rawCode) {
      throw new BadRequestException({
        failure_reason: 'Please enter a valid coupon code',
        failure_code: 'INVALID_COUPON',
      });
    }

    let cart: any = null;
    let userId = '';

    if (rzpOrderId) {
      const rzpOrder = await this.paymentService.fetchOrder(rzpOrderId).catch(() => null);
      const notes = rzpOrder?.notes || {};
      if (notes.preAppliedCoupon) {
        throw new BadRequestException({
          failure_reason: `Coupon ${notes.preAppliedCoupon} is already applied to your cart`,
          failure_code: 'COUPON_ALREADY_APPLIED',
        });
      }
      userId = notes.userId || '';
      cart = await this.findActiveCartWithDetails(userId, notes.cartId ? Number(notes.cartId) : null);
    }

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException({
        failure_reason: 'Cart is empty or expired',
        failure_code: 'CART_EMPTY',
      });
    }

    const subtotal = cart.items.reduce(
      (s: number, i: any) => s + (Number(i.total) || Number(i.unitPrice) * Number(i.quantity) || 0),
      0,
    );

    try {
      const offer = await this.marketingService.validateCoupon(userId, rawCode, subtotal, cart.items, contact);
      const discountRupees = Number(offer.discountAmount || 0);

      if (discountRupees >= subtotal) {
        throw new BadRequestException(
          '100% free watch coupons must be applied directly in your Shopping Cart before checkout.',
        );
      }

      // Attach offer to cart so final order completion records OfferUsage accurately
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { offerId: offer.id },
      }).catch(() => {});

      return {
        promotion: {
          reference_id: `offer_${offer.id}`,
          code: offer.code || rawCode.toUpperCase(),
          type: 'coupon',
          value: Math.round(discountRupees * 100),
          value_type: 'fixed_amount',
          description: offer.description || `Saved ₹${Math.round(discountRupees)} with ${offer.code}`,
        },
      };
    } catch (err: any) {
      const msg = err?.response?.failure_reason || err?.message || 'Invalid or ineligible coupon code';
      throw new BadRequestException({
        failure_reason: msg,
        failure_code: 'PROMOTION_INVALID',
      });
    }
  }

  /**
   * Silent Account Resolution: Finds existing Customer by ID / 10-digit mobile / email,
   * or seamlessly creates a verified Customer + CustomerAddress without breaking any FK constraint.
   */
  private async resolveOrCreateMagicCustomer(params: {
    hintUserId?: string;
    name: string;
    mobile: string;
    email?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  }): Promise<{ customer: any; customerAddress: any; isNewlyCreated: boolean }> {
    const {
      hintUserId,
      name,
      mobile,
      email,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      country,
    } = params;

    const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = (name || '').trim() || 'FYLEX Patron';
    const combinedAddress = [addressLine1, addressLine2].filter(Boolean).join(', ').trim() || 'India';
    const cleanCity = (city || '').trim() || 'India';
    const cleanState = (state || '').trim() || 'India';
    const cleanPincode = String(pincode || '').replace(/\D/g, '').slice(0, 6) || '000000';
    const cleanCountry = !country || country.toUpperCase() === 'IN' ? 'India' : country;

    let customer: any = null;
    let isNewlyCreated = false;

    // 1. Try explicit logged-in customerId if numeric
    const rawHint = (hintUserId || '').toString().trim();
    if (rawHint && !isNaN(Number(rawHint)) && !rawHint.includes('gst_') && !rawHint.includes('usr_')) {
      customer = await this.prisma.customer.findUnique({ where: { id: Number(rawHint) } });
    }

    // 2. Match by 10-digit mobile number (Primary identity in Magic Checkout)
    if (!customer && cleanMobile.length === 10) {
      customer = await this.prisma.customer.findUnique({ where: { mobile: cleanMobile } });
    }

    // 3. Match by email if still not found
    if (!customer && cleanEmail && cleanEmail.includes('@')) {
      customer = await this.prisma.customer.findUnique({ where: { email: cleanEmail } });
    }

    // 4. Auto-create silent Customer account if brand new shopper
    if (!customer) {
      let safeEmail: string | null = null;
      if (cleanEmail && cleanEmail.includes('@')) {
        const emailTaken = await this.prisma.customer.findUnique({ where: { email: cleanEmail }, select: { id: true } });
        if (!emailTaken) safeEmail = cleanEmail;
      }

      let safeMobile: string | null = cleanMobile.length === 10 ? cleanMobile : null;
      if (safeMobile) {
        const mobileTaken = await this.prisma.customer.findUnique({ where: { mobile: safeMobile }, select: { id: true } });
        if (mobileTaken) {
          customer = await this.prisma.customer.findUnique({ where: { id: mobileTaken.id } });
        }
      }

      if (!customer) {
        const randomPwd = await bcrypt.hash(`MAGIC_${Date.now()}_${Math.random().toString(36).slice(2)}`, 10);
        customer = await this.prisma.customer.create({
          data: {
            name: cleanName,
            mobile: safeMobile,
            email: safeEmail,
            password: randomPwd,
            city: cleanCity,
            address: `${combinedAddress}, ${cleanCity}, ${cleanState} - ${cleanPincode}`,
            status: 1,
            mobileVerifiedAt: safeMobile ? new Date() : null,
          },
        });
        isNewlyCreated = true;

        // Trigger Welcome WhatsApp + Early Bird 500 Credits check asynchronously
        if (customer.mobile) {
          this.whatsappService.sendWelcomeMessage(customer.mobile, customer.name).catch((err) => {
            this.logger.warn(`Welcome WhatsApp skipped for Magic customer ${customer.mobile}: ${err?.message}`);
          });

          if (isEarlyBirdMobile(customer.mobile)) {
            this.prisma.loyaltyProgram.findFirst({ where: { status: 1 } }).then(async (program) => {
              if (!program) return;
              const loyalty = await this.prisma.customerLoyalty.create({
                data: {
                  customerId: customer.id,
                  loyaltyProgramId: program.id,
                  availablePoints: 500,
                  totalPoints: 500,
                  usedPoints: 0,
                },
              });
              await this.prisma.loyaltyTransaction.create({
                data: {
                  customerLoyaltyId: loyalty.id,
                  customerId: customer.id,
                  type: 'earning',
                  points: 500,
                  balance: 500,
                  notes: 'Early Bird Welcome Bonus - 500 Free Fylex Credits',
                },
              });
            }).catch(() => {});
          }
        }
      }
    } else {
      // Backfill missing profile fields on existing customer gently without overwriting custom names
      const patchData: any = {};
      if (!customer.address && combinedAddress) {
        patchData.address = `${combinedAddress}, ${cleanCity}, ${cleanState} - ${cleanPincode}`;
      }
      if (!customer.city && cleanCity) {
        patchData.city = cleanCity;
      }
      if (!customer.mobile && cleanMobile.length === 10) {
        const taken = await this.prisma.customer.findUnique({ where: { mobile: cleanMobile }, select: { id: true } });
        if (!taken) patchData.mobile = cleanMobile;
      }
      if (Object.keys(patchData).length > 0) {
        customer = await this.prisma.customer.update({
          where: { id: customer.id },
          data: patchData,
        }).catch(() => customer);
      }
    }

    // 5. Create or reuse matching CustomerAddress for clean profile & checkout history
    const addrPhone = cleanMobile || customer.mobile || '9999999999';
    let customerAddress = await this.prisma.customerAddress.findFirst({
      where: {
        customerId: customer.id,
        pincode: cleanPincode,
        address: combinedAddress,
      },
    });

    if (!customerAddress) {
      customerAddress = await this.prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          type: 'shipping',
          name: cleanName,
          mobile: addrPhone,
          address: combinedAddress,
          city: cleanCity,
          state: cleanState,
          country: cleanCountry,
          pincode: cleanPincode,
          isDefault: true,
        },
      });
    }

    return { customer, customerAddress, isNewlyCreated };
  }

  /**
   * Step 3: Completes a Razorpay Magic Checkout order (Prepaid OR Magic COD).
   * Concurrency-safe and idempotent across simultaneous frontend callback + Razorpay webhook.
   */
  async completeMagicCheckoutOrder(params: {
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    userId?: string;
    issueSession?: boolean;
    webhookPaymentEntity?: any;
    webhookOrderEntity?: any;
    fallbackCustomerInput?: {
      name?: string;
      mobile?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
  }) {
    const { razorpayOrderId } = params;
    if (!razorpayOrderId) throw new BadRequestException('razorpayOrderId is required');

    // In-memory lock prevents duplicate order creation if webhook & frontend callback arrive simultaneously
    const existingLock = this.inFlightMagicOrders.get(razorpayOrderId);
    if (existingLock) {
      await existingLock.catch(() => {});
    }

    const executionPromise = this._executeMagicOrderCompletion(params);
    this.inFlightMagicOrders.set(razorpayOrderId, executionPromise);

    try {
      return await executionPromise;
    } finally {
      this.inFlightMagicOrders.delete(razorpayOrderId);
    }
  }

  private async _executeMagicOrderCompletion(params: {
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    userId?: string;
    issueSession?: boolean;
    webhookPaymentEntity?: any;
    webhookOrderEntity?: any;
    fallbackCustomerInput?: {
      name?: string;
      mobile?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
  }) {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      userId,
      issueSession = false,
      webhookPaymentEntity,
      webhookOrderEntity,
      fallbackCustomerInput,
    } = params;

    // 1. Verify cryptographic signature if called from frontend with signature
    if (razorpayPaymentId && razorpaySignature) {
      const sigOk = this.paymentService.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (!sigOk) {
        throw new BadRequestException('Invalid Razorpay payment signature');
      }
    }

    // 2. Database Idempotency Check: Has this Razorpay Order or Payment already been converted into a FYLEX Order?
    const existingAttempt = await this.prisma.paymentAttempt.findFirst({
      where: { attemptId: razorpayOrderId },
      include: {
        order: {
          include: {
            customer: true,
            addresses: true,
            shipments: true,
            items: {
              include: {
                product: true,
                productVariant: {
                  include: {
                    variantImages: { include: { media: true } },
                    variantAttributes: { include: { attributeValue: { include: { attribute: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (existingAttempt?.order) {
      const session = issueSession && existingAttempt.order.customer
        ? await this.authService.issueSessionForCustomer(existingAttempt.order.customer)
        : null;
      return {
        completed: true,
        alreadyProcessed: true,
        order: existingAttempt.order,
        ...(session ? { access_token: session.access_token, user: session.user } : {}),
      };
    }

    if (razorpayPaymentId) {
      const existingPayment = await this.prisma.payment.findFirst({
        where: { transactionId: razorpayPaymentId },
        include: { order: { include: { customer: true, addresses: true, items: true } } },
      });
      if (existingPayment?.order) {
        const session = issueSession && existingPayment.order.customer
          ? await this.authService.issueSessionForCustomer(existingPayment.order.customer)
          : null;
        return {
          completed: true,
          alreadyProcessed: true,
          order: existingPayment.order,
          ...(session ? { access_token: session.access_token, user: session.user } : {}),
        };
      }
    }

    // 3. Fetch authoritative Order & Payment details directly from Razorpay API
    const rzpOrder = webhookOrderEntity?.customer_details
      ? webhookOrderEntity
      : await this.paymentService.fetchOrder(razorpayOrderId);

    const paymentsListRes = webhookPaymentEntity
      ? { items: [webhookPaymentEntity] }
      : await this.paymentService.fetchOrderPayments(razorpayOrderId);
    const paymentsList: any[] = Array.isArray(paymentsListRes?.items) ? paymentsListRes.items : [];

    // Locate winning payment: explicit paymentId, captured/authorized prepaid, or Magic COD pending payment
    let winningPayment = razorpayPaymentId
      ? paymentsList.find((p) => p.id === razorpayPaymentId)
      : null;

    if (!winningPayment) {
      winningPayment =
        paymentsList.find((p) => p.status === 'captured' || p.status === 'authorized') ||
        paymentsList.find((p) => (p.method || '').toLowerCase() === 'cod' && p.status !== 'failed') ||
        null;
    }

    // If frontend verified signature with razorpayPaymentId before fetchPayments indexed it, synthesize safely
    if (!winningPayment && razorpayPaymentId && razorpaySignature) {
      winningPayment = {
        id: razorpayPaymentId,
        status: 'captured',
        method: 'online',
        amount: rzpOrder?.amount_paid || rzpOrder?.amount || 0,
      };
    }

    if (!winningPayment) {
      return {
        completed: false,
        message: 'Payment has not been completed yet.',
      };
    }

    const isCod = (winningPayment.method || '').toLowerCase() === 'cod';
    const isPaidPrepaid =
      !isCod &&
      (winningPayment.status === 'captured' ||
        winningPayment.status === 'authorized' ||
        rzpOrder?.status === 'paid' ||
        Boolean(razorpaySignature));

    if (!isCod && !isPaidPrepaid) {
      return {
        completed: false,
        message: `Payment is in ${winningPayment.status || 'incomplete'} state.`,
      };
    }

    // 4. Extract Verified Customer & Address from Razorpay Magic Checkout's customer_details
    const notes = rzpOrder?.notes || {};
    const effectiveUserId = userId || notes.userId || '';
    const cd = rzpOrder?.customer_details || {};
    const ship =
      cd.shipping_address ||
      rzpOrder?.shipping_address ||
      cd.billing_address ||
      {};

    // Fallback to saved customer address ONLY if testing with a non-Magic Razorpay key where shipping_address is empty
    let fallbackSavedAddr: any = null;
    if (!ship?.line1 && !ship?.zipcode && effectiveUserId && !isNaN(Number(effectiveUserId))) {
      fallbackSavedAddr = await this.prisma.customerAddress.findFirst({
        where: { customerId: Number(effectiveUserId) },
        orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
      });
    }

    const rawPhone =
      ship.contact ||
      cd.contact ||
      winningPayment.contact ||
      fallbackCustomerInput?.mobile ||
      fallbackSavedAddr?.mobile ||
      '';
    const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10);

    const rawEmail =
      cd.email ||
      ship.email ||
      winningPayment.email ||
      fallbackCustomerInput?.email ||
      '';

    const resolvedName =
      ship.name ||
      [ship.first_name, ship.last_name].filter(Boolean).join(' ') ||
      cd.name ||
      fallbackCustomerInput?.name ||
      fallbackSavedAddr?.name ||
      'FYLEX Patron';

    const line1 =
      ship.line1 ||
      fallbackCustomerInput?.address ||
      fallbackSavedAddr?.address ||
      'Address captured via Razorpay Checkout';
    const line2 = [ship.line2, ship.landmark].filter(Boolean).join(', ');
    const city = ship.city || fallbackCustomerInput?.city || fallbackSavedAddr?.city || 'India';
    const state = ship.state || fallbackCustomerInput?.state || fallbackSavedAddr?.state || 'India';
    const pincode =
      String(ship.zipcode || ship.pincode || ship.postal_code || fallbackCustomerInput?.pincode || fallbackSavedAddr?.pincode || '')
        .replace(/\D/g, '')
        .slice(0, 6) || '360002';
    const country = !ship.country || ship.country.toUpperCase() === 'IN' ? 'India' : ship.country;

    const { customer, customerAddress } = await this.resolveOrCreateMagicCustomer({
      hintUserId: effectiveUserId,
      name: resolvedName,
      mobile: cleanPhone,
      email: rawEmail,
      addressLine1: line1,
      addressLine2: line2,
      city,
      state,
      pincode,
      country,
    });

    // 5. Locate Cart & Calculate Final Order Totals
    const cart = await this.findActiveCartWithDetails(
      effectiveUserId || String(customer.id),
      notes.cartId ? Number(notes.cartId) : null,
    );

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart items were already processed or cart is empty.');
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + (Number(item.total) || Number(item.unitPrice) * Number(item.quantity) || 0),
      0,
    );

    // Resolve applied coupon (either pre-applied on /cart or applied inside Razorpay Magic modal)
    const rzpPromoCode =
      notes.preAppliedCoupon ||
      rzpOrder?.promotions?.[0]?.code ||
      cart.offer?.code ||
      '';

    let appliedOffer: any = null;
    if (rzpPromoCode) {
      appliedOffer = await this.marketingService
        .validateCoupon(String(customer.id), rzpPromoCode, subtotal, cart.items, cleanPhone)
        .catch(() => cart.offer || null);
    }

    let redeemPoints = Math.max(0, Number(notes.redeemPoints || 0));
    if (redeemPoints > 0) {
      const loyalty = await this.prisma.customerLoyalty.findFirst({ where: { customerId: customer.id } });
      const avail = Number(loyalty?.availablePoints || 0);
      redeemPoints = Math.min(redeemPoints, avail);
    }

    // Trust Razorpay's final payable amount (in paise -> rupees) so in-modal Magic promotions are respected
    const rzpPayablePaise = Number(winningPayment.amount || rzpOrder?.amount_due || rzpOrder?.amount || 0);
    const rzpFeePaise = Number(rzpOrder?.shipping_fee || 0) + Number(rzpOrder?.cod_fee || 0);
    const grandTotal = rzpPayablePaise > 0
      ? Math.max(0, Math.round((rzpPayablePaise - rzpFeePaise) / 100))
      : Math.max(0, subtotal - (appliedOffer ? await this.marketingService.calculateDiscount(appliedOffer, subtotal, cart.items) : 0) - redeemPoints);

    const totalDiscount = Math.max(0, subtotal - grandTotal);
    const couponDiscountAmount = Math.max(0, totalDiscount - redeemPoints);
    const pointsEarned = Math.floor(grandTotal);

    const nameParts = resolvedName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || 'Fylex';

    // 6. Atomic Order Creation Transaction (Identical Relational Integrity to Standard Checkout)
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customer: { connect: { id: customer.id } },
          offer: appliedOffer ? { connect: { id: appliedOffer.id } } : undefined,
          status: 'pending',
          paymentStatus: isCod ? 'pending' : 'paid',
          shippingStatus: 'pending',
          paymentMethod: isCod ? 'cod' : 'online',
          subtotal: Number(subtotal),
          shippingTotal: 0,
          taxTotal: 0,
          discountTotal: Number(totalDiscount),
          grandTotal: Number(grandTotal),
          couponCode: appliedOffer?.code || (rzpPromoCode || null),
          customerFirstName: firstName,
          customerLastName: lastName,
          customerMobile: cleanPhone || customer.mobile || '',
          orderNumber: `ORD-${Date.now()}`,
          loyaltyPointsUsed: Number(redeemPoints),
          loyaltyPointsEarned: Number(pointsEarned),
          createdAt: new Date(),
        },
      });

      // Idempotency anchor for razorpayOrderId
      await tx.paymentAttempt.create({
        data: {
          orderId: order.id,
          paymentMethod: isCod ? 'cod' : 'online',
          attemptId: razorpayOrderId,
          amount: Number(grandTotal),
          status: isCod ? 'cod_confirmed' : 'captured',
          gatewayResponse: JSON.stringify({
            razorpayOrderId,
            razorpayPaymentId: winningPayment.id,
            method: winningPayment.method,
          }),
          createdAt: new Date(),
        },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          paymentMethod: isCod ? 'cod' : 'online',
          paymentGateway: 'razorpay',
          transactionId: winningPayment.id || razorpayOrderId,
          amount: Number(grandTotal),
          status: isCod ? 'pending' : 'paid',
          paidAt: isCod ? null : new Date(),
          createdAt: new Date(),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'pending',
          notes: `Order placed via 1-Click Magic Checkout (${isCod ? 'Magic COD' : 'Prepaid'})`,
        },
      });

      await tx.orderAddress.create({
        data: {
          order: { connect: { id: order.id } },
          type: 'shipping',
          firstName,
          lastName,
          email: rawEmail || customer.email || 'concierge@fylexwatches.com',
          phone: cleanPhone || customer.mobile || customerAddress.mobile,
          address1: line1,
          address2: line2 || null,
          city,
          state,
          postcode: pincode,
          country,
        },
      });

      // Create OrderItems & deduct stock
      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            order: { connect: { id: order.id } },
            ...(item.productVariantId
              ? {
                  product: { connect: { id: item.productVariant?.productId } },
                  productVariant: { connect: { id: item.productVariantId } },
                  productName: item.productVariant?.product?.name || 'Product',
                  sku: item.productVariant?.sku || 'SKU',
                }
              : item.beltId
              ? {
                  belt: { connect: { id: item.beltId } },
                  productName: item.belt?.name || 'Belt',
                  sku: 'BELT-' + item.beltId,
                }
              : {
                  productName: 'FYLEX Timepiece',
                  sku: 'FYLEX-ITEM',
                }),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.total,
            total: item.total,
            discountAmount: 0,
            attributes: item.attributes as any,
          },
        });

        const variant = item.productVariant;
        if (variant) {
          const updateData: any = {
            fakeSoldCount: { increment: item.quantity },
          };
          if (variant.manageStock) {
            const newQty = Math.max(0, variant.qty - item.quantity);
            updateData.qty = newQty;
            updateData.inStock = newQty > 0;
            updateData.stockStatus = newQty > 0 ? 'instock' : 'outofstock';
          }
          await tx.productVariant.update({
            where: { id: variant.id },
            data: updateData,
          });
        } else if (item.beltId && item.belt) {
          const newBeltStock = Math.max(0, Number(item.belt.stock || 0) - item.quantity);
          await tx.belt.update({
            where: { id: item.beltId },
            data: { stock: newBeltStock },
          }).catch(() => {});
        }
      }

      // Track Coupon Usage
      if (appliedOffer) {
        await tx.offerUsage.create({
          data: {
            offerId: appliedOffer.id,
            customerId: customer.id,
            orderId: order.id,
            discountAmount: Number(couponDiscountAmount),
          },
        });
        await tx.offer.update({
          where: { id: appliedOffer.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Deduct Redeemed FYLEX Credits
      if (redeemPoints > 0) {
        const loyalty = await tx.customerLoyalty.findFirst({ where: { customerId: customer.id } });
        if (loyalty) {
          await tx.loyaltyTransaction.create({
            data: {
              customerLoyaltyId: loyalty.id,
              customerId: customer.id,
              type: 'redemption',
              points: -redeemPoints,
              balance: Math.max(0, Number(loyalty.availablePoints) - redeemPoints),
              referenceType: 'order',
              referenceId: order.id,
              notes: 'Spent on 1-Click Magic Checkout',
            },
          });
          await tx.customerLoyalty.update({
            where: { id: loyalty.id },
            data: {
              availablePoints: { decrement: redeemPoints },
              usedPoints: { increment: redeemPoints },
            },
          });
        }
      }

      // Clear active cart (and any leftover guest session cart for this user)
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: { status: 'completed', subtotal: 0, grandTotal: 0, offerId: null },
      });

      if (effectiveUserId && effectiveUserId.startsWith('gst_')) {
        const guestCarts = await tx.cart.findMany({
          where: { sessionId: effectiveUserId, status: 'active' },
          select: { id: true },
        });
        for (const gc of guestCarts) {
          await tx.cartItem.deleteMany({ where: { cartId: gc.id } });
          await tx.cart.update({
            where: { id: gc.id },
            data: { status: 'completed', subtotal: 0, grandTotal: 0, offerId: null },
          });
        }
      }

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          addresses: true,
          items: {
            include: {
              product: true,
              productVariant: {
                include: {
                  variantImages: { include: { media: true } },
                  variantAttributes: { include: { attributeValue: { include: { attribute: true } } } },
                },
              },
            },
          },
        },
      });
    }, { timeout: 30000, maxWait: 10000 });

    // 7. Dispatch Customer & Owner WhatsApp Notifications asynchronously
    try {
      if (createdOrder) {
        const recipientMobile = createdOrder.customerMobile || (createdOrder as any)?.addresses?.[0]?.phone;
        if (recipientMobile) {
          this.whatsappService
            .sendOrderReceived(recipientMobile, createdOrder.orderNumber || `ORD-${createdOrder.id}`)
            .catch((err) => this.logger.error(`Failed to dispatch Order Received WhatsApp: ${err.message}`));
        }
        this.notifyAdminsNewOrder(createdOrder).catch((err) =>
          this.logger.error(`Failed to dispatch Owner Order WhatsApp notification: ${err.message}`),
        );
      }
    } catch (e: any) {
      this.logger.error(`Error initiating Magic Checkout WhatsApp alerts: ${e.message}`);
    }

    const session = issueSession ? await this.authService.issueSessionForCustomer(customer) : null;

    return {
      completed: true,
      order: createdOrder,
      ...(session ? { access_token: session.access_token, user: session.user } : {}),
    };
  }

  /**
   * Handles Razorpay Server Webhooks (`order.paid`, `payment.captured`, and `payment.pending` with `method === 'cod'`).
   * Ensures orders are never lost even if customer closes mobile browser after UPI app switch or Magic COD.
   */
  async handleRazorpayMagicWebhook(rawBody: Buffer | string, signature: string | undefined, payload: any) {
    if (!payload || Object.keys(payload).length === 0) {
      return { status: 'ok', message: 'Razorpay Magic Webhook active' };
    }

    const validSig = this.paymentService.verifyWebhookSignature(rawBody, signature);
    if (!validSig) {
      this.logger.warn('Rejected Razorpay webhook due to invalid X-Razorpay-Signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = String(payload.event || '');
    const paymentEntity = payload?.payload?.payment?.entity;
    const orderEntity = payload?.payload?.order?.entity;
    const razorpayOrderId = orderEntity?.id || paymentEntity?.order_id;

    this.logger.log(`Razorpay Webhook event=${event}, order_id=${razorpayOrderId || 'N/A'}`);

    if (!razorpayOrderId) {
      return { status: 'ignored', reason: 'No order_id in webhook payload' };
    }

    const isPrepaidSuccess = event === 'order.paid' || event === 'payment.captured';
    const isMagicCodPlaced =
      event === 'payment.pending' && (paymentEntity?.method || '').toLowerCase() === 'cod';

    if (!isPrepaidSuccess && !isMagicCodPlaced) {
      return { status: 'ignored', event };
    }

    try {
      const result: any = await this.completeMagicCheckoutOrder({
        razorpayOrderId,
        razorpayPaymentId: paymentEntity?.id,
        issueSession: false,
        webhookPaymentEntity: paymentEntity,
        webhookOrderEntity: orderEntity,
      });
      return { status: 'processed', completed: result.completed, orderNumber: result.order?.orderNumber };
    } catch (err: any) {
      this.logger.warn(`Webhook order completion skipped/handled for ${razorpayOrderId}: ${err.message}`);
      return { status: 'acknowledged', detail: err.message };
    }
  }

  /**
   * Completes a 100% Free Coupon / Credit order (grandTotal === ₹0) in 1 step for Guest or Logged-in shoppers,
   * using Silent Account Resolution + Auto-Login without requiring /login or /signup.
   */
  async completeFreeMagicOrder(params: {
    userId: string;
    couponCode?: string;
    useCredits?: boolean;
    name: string;
    mobile: string;
    email?: string;
    pincode: string;
    city: string;
    state?: string;
    address: string;
  }) {
    const { userId, couponCode, useCredits = true, name, mobile, email, pincode, city, state, address } = params;
    if (!userId) throw new BadRequestException('userId is required');

    const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      throw new BadRequestException('Please enter a valid 10-digit mobile number');
    }
    if (!name?.trim() || !address?.trim() || String(pincode || '').replace(/\D/g, '').length !== 6) {
      throw new BadRequestException('Please enter your name, 6-digit PIN code, and delivery address');
    }

    // Server-side verification that total is genuinely ₹0
    const totals: any = await this.calculateOrderTotal(userId, pincode, couponCode, useCredits);
    if (totals.couponError) {
      throw new BadRequestException(totals.couponError);
    }
    if (totals.total > 0) {
      throw new BadRequestException('Order has a payable balance and must be completed via payment gateway.');
    }

    const cart = await this.findActiveCartWithDetails(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const { customer, customerAddress } = await this.resolveOrCreateMagicCustomer({
      hintUserId: userId,
      name,
      mobile: cleanMobile,
      email,
      addressLine1: address,
      city,
      state: state || 'India',
      pincode,
      country: 'India',
    });

    // If cart belonged to guest session, bind it to resolved customer so standard checkout() runs cleanly
    if (!cart.customerId || cart.customerId !== customer.id) {
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { customerId: customer.id },
      });
    }

    const order = await this.checkout(String(customer.id), {
      customerId: String(customer.id),
      shippingAddressId: String(customerAddress.id),
      billingAddressId: String(customerAddress.id),
      paymentMethod: 'online',
      paymentId: `free_coupon_${Date.now()}`,
      couponCode: couponCode?.trim() || '',
      redeemPoints: Number(totals.appliedCredits || totals.creditDiscount || 0),
    } as any);

    const session = await this.authService.issueSessionForCustomer(customer);

    return {
      completed: true,
      order,
      ...(session ? { access_token: session.access_token, user: session.user } : {}),
    };
  }
}


