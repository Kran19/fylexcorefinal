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

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  constructor(
    private prisma: PrismaService,
    private marketingService: MarketingService,
    private loyaltyService: LoyaltyService,
    private historyService: OrderStatusHistoryService,
    private shiprocketService: ShiprocketService,
    @Inject(forwardRef(() => PaymentService)) private paymentService: PaymentService,
    private whatsappService: WhatsappService,
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
            productVariant: { include: { product: true } },
            belt: true
          }
        },
        customer: true,
        offer: true,
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // 2. Validate Coupon
    let appliedOffer = cart.offer;
    if (dto.couponCode) {
      appliedOffer = await this.marketingService.validateCoupon(customerId, dto.couponCode, Number(cart.subtotal));
    }

    // 3. Handle Loyalty Points Redemption
    let pointDiscount = 0;
    if (dto.redeemPoints && dto.redeemPoints > 0) {
      const balance = await this.loyaltyService.getLoyaltyBalance(customerId);
      if (Number(balance.availablePoints) < dto.redeemPoints) {
        throw new BadRequestException('Insufficient loyalty points');
      }
      pointDiscount = dto.redeemPoints / 100;
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

    // 6. Create Order via Transaction
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const subtotal = Number(cart.subtotal);
      const discountAmount = appliedOffer ? this.marketingService.calculateDiscount(appliedOffer, subtotal, cart.items) : 0;
      const totalDiscount = discountAmount + pointDiscount;
      const grandTotal = Math.max(0, subtotal - totalDiscount);
      const pointsEarned = Math.floor(grandTotal);

      // a. Create the Order
      // Calculate Total Weight (Default to 0.5kg per watch if not specified)
      let totalWeight = 0;
      for (const item of cart.items) {
        let itemWeight = 0.4;
        if (item.productVariant) {
          itemWeight = item.productVariant.weight ? Number(item.productVariant.weight) : 0.4;
        }
        totalWeight += itemWeight * item.quantity;
      }

      const isCod = dto.paymentMethod === 'cod';
      let shippingTotal = 0; // FREE SHIPPING ALL OVER INDIA

      try {
        const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE || '360002';
        const rateData = await this.shiprocketService.checkServiceability(
          pickupPincode,
          shippingAddr.pincode,
          totalWeight
        );

        if (rateData.serviceable === false) {
          this.logger.warn(`Unserviceable pincode: ${shippingAddr.pincode} for customer ${customerId}`);
          throw new BadRequestException('Delivery is not available for this location');
        }

        if (isCod && rateData.codAvailable === false) {
          this.logger.warn(`COD Unavailable for pincode: ${shippingAddr.pincode} for customer ${customerId}`);
          throw new BadRequestException('Cash on Delivery is not available for this location');
        }

        if (rateData.serviceable === null) {
          this.logger.error(`Technical failure in shipping API for pincode: ${shippingAddr.pincode}`);
        }
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
        this.logger.error(`Shiprocket rate calculation failed: ${e.message}`);
      }

      const isOnline = dto.paymentMethod === 'online';

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
          grandTotal: Number(Math.max(0, subtotal - totalDiscount)),
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
    });

    // 7. Dispatch WhatsApp Order Received confirmation
    try {
      const recipientMobile = createdOrder?.customerMobile || (createdOrder as any)?.addresses?.[0]?.phone;
      if (recipientMobile) {
        this.whatsappService.sendOrderReceived(recipientMobile, createdOrder.orderNumber || `ORD-${createdOrder.id}`)
          .catch(err => this.logger.error(`Failed to dispatch Order Received WhatsApp: ${err.message}`));
      }
    } catch (e) {
      this.logger.error(`Error initiating Order Received WhatsApp: ${e.message}`);
    }

    return createdOrder;
  }

  /**
   * Pushes confirmed order to Shiprocket, creates shipment, and assigns AWB.
   */
  async sendToShiprocket(orderId: string | number, adminId?: string) {
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
      const srCourier = srResponse?.courier_name || srResponse?.data?.courier_name || 'Standard Luxury Courier';

      // Auto-attempt AWB generation if shipment ID exists
      let finalAwb = srAwb;
      if (!finalAwb && srShipmentId) {
        try {
          const awbRes = await this.shiprocketService.generateAwb(srShipmentId);
          finalAwb = awbRes?.response?.data?.awb_code || awbRes?.awb_code || null;
        } catch (awbErr: any) {
          this.logger.warn(`AWB assignment pending: ${awbErr.message}`);
        }
      }

      // Upsert OrderShipment record
      const existingShipment = order.shipments?.[0];
      if (existingShipment) {
        await this.prisma.orderShipment.update({
          where: { id: existingShipment.id },
          data: {
            carrier: srCourier,
            trackingNumber: finalAwb || String(srShipmentId || srOrderId),
            status: 'processing',
            trackingUrl: finalAwb ? `https://shiprocket.co/tracking/${finalAwb}` : null,
          }
        });
      } else {
        await this.prisma.orderShipment.create({
          data: {
            orderId: order.id,
            carrier: srCourier,
            carrierService: 'Standard Delivery',
            trackingNumber: finalAwb || String(srShipmentId || srOrderId),
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
    let trackingData: any = null;
    if (awb && !awb.startsWith('ORD-') && !awb.startsWith('SHP-') && awb.length >= 8) {
      trackingData = await this.shiprocketService.getTracking(awb);
    } else {
      trackingData = await this.shiprocketService.getTrackingByOrderId(order.orderNumber || order.id);
    }

    if (order.status === 'cancelled' || order.status === 'refunded') {
      return {
        success: true,
        message: `Order is already ${order.status}; sync skipped status mutation.`,
        data: trackingData
      };
    }

    if (trackingData?.tracking_data?.track_status) {
      const statusStr = (trackingData.tracking_data.track_status || '').toUpperCase();
      let newOrderStatus = order.status;
      let newShippingStatus = order.shippingStatus;

      if (statusStr.includes('DELIVERED')) {
        newOrderStatus = 'delivered';
        newShippingStatus = 'delivered';
        if (order.shippingStatus !== 'delivered') {
          const recipientMobile = order.customerMobile || order.addresses?.[0]?.phone;
          if (recipientMobile) {
            this.whatsappService.sendDelivered(recipientMobile)
              .catch(err => this.logger.error(`Failed to dispatch Delivered WhatsApp: ${err.message}`));
          }
        }
      } else if (statusStr.includes('OUT FOR DELIVERY')) {
        newOrderStatus = 'shipped';
        newShippingStatus = 'out_for_delivery';
        if (order.shippingStatus !== 'out_for_delivery') {
          const recipientMobile = order.customerMobile || order.addresses?.[0]?.phone;
          if (recipientMobile) {
            this.whatsappService.sendOutForDelivery(recipientMobile)
              .catch(err => this.logger.error(`Failed to dispatch Out For Delivery WhatsApp: ${err.message}`));
          }
        }
      } else if (statusStr.includes('IN TRANSIT') || statusStr.includes('SHIPPED')) {
        newOrderStatus = 'shipped';
        newShippingStatus = 'shipped';
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

    return {
      success: true,
      message: 'Tracking synchronized with Shiprocket',
      data: trackingData || { message: 'No live tracking data available yet from courier.' }
    };
  }

  async handleShiprocketWebhook(payload: any) {
    this.logger.log(`Shiprocket Webhook received: ${JSON.stringify(payload)}`);
    if (!payload) return { success: false, message: 'Empty payload' };

    const orderNumber = payload.order_id || payload.channel_order_id;
    if (!orderNumber) {
      return { success: false, message: 'Order ID missing' };
    }

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: orderNumber.toString() },
          { id: !isNaN(Number(orderNumber)) ? Number(orderNumber) : -1 }
        ]
      },
      include: { shipments: true, addresses: true }
    });

    if (!order) {
      this.logger.warn(`Shiprocket Webhook: Order not found for order_id ${orderNumber}`);
      return { success: false, message: 'Order not found' };
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
    } else if (shiprocketStatus.includes('IN TRANSIT') || shiprocketStatus.includes('SHIPPED') || shiprocketStatus.includes('DISPATCHED')) {
      newShippingStatus = 'shipped';
      newOrderStatus = 'shipped';
      if (!order.shippedAt) updateData.shippedAt = now;
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
      throw new NotFoundException({
        success: false,
        message: 'No order found',
        data: null
      });
    }

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const cleanOrderId = orderId.trim();

    if (!cleanMobile || cleanMobile.length !== 10) {
      throw new NotFoundException({
        success: false,
        message: 'No order found',
        data: null
      });
    }

    const order = await this.prisma.order.findFirst({
      where: {
        AND: [
          {
            OR: [
              { orderNumber: cleanOrderId },
              { orderNumber: `ORD-${cleanOrderId}` },
              { id: !isNaN(Number(cleanOrderId)) ? Number(cleanOrderId) : -1 }
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
        statusHistory: true
      }
    });

    if (!order) {
      throw new NotFoundException({
        success: false,
        message: 'No order found',
        data: null
      });
    }

    const rawStatus = order.shippingStatus || order.status || 'Processing';
    const formattedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

    const createdDate = order.createdAt ? new Date(order.createdAt) : new Date();
    const deliveryDate = new Date(createdDate.getTime() + 4 * 24 * 60 * 60 * 1000);
    const expectedDeliveryStr = deliveryDate.toISOString().split('T')[0];

    const latestHistoryWithAwb = ((order as any).statusHistory || []).find((h: any) => h.notes && h.notes.includes('AWB:'));
    let awbCode = `FYL${order.id}${cleanMobile.slice(-4)}`;
    if (latestHistoryWithAwb && latestHistoryWithAwb.notes) {
      const match = latestHistoryWithAwb.notes.match(/AWB:\s*([^\s)]+)/);
      if (match && match[1] && match[1] !== 'N/A') {
        awbCode = match[1];
      }
    }

    return {
      success: true,
      message: 'Order found',
      data: {
        order_number: order.orderNumber || `ORD-${order.id}`,
        status: formattedStatus,
        courier: 'Delhivery',
        expected_delivery: expectedDeliveryStr,
        tracking_number: awbCode
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

      return {
        order_number: order.orderNumber || `ORD-${order.id}`,
        status: formattedStatus,
        courier: 'Delhivery',
        expected_delivery: deliveryDate.toISOString().split('T')[0],
        tracking_number: `FYL${order.id}${cleanMobile.slice(-4)}`,
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
    const oId = Number(orderId);
    const order = await this.prisma.order.findUnique({
      where: { id: oId },
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

  async calculateOrderTotal(customerId: string, pincode?: string, couponCode?: string) {
    const customerIdStr = customerId?.toString() || '';
    const isNumeric = !isNaN(Number(customerIdStr)) && !customerIdStr.includes('usr_') && customerIdStr !== '';
    const cId = isNumeric ? Number(customerIdStr) : null;

    const cart = await this.prisma.cart.findFirst({
      where: cId ? { customerId: cId, status: 'active' } : { sessionId: customerIdStr, status: 'active' },
      include: { items: { include: { productVariant: true } }, offer: true }
    });

    if (!cart || cart.items.length === 0) {
      return { subtotal: 0, shipping: 0, tax: 0, discount: 0, total: 0 };
    }

    const subtotal = cart.subtotal ? Number(cart.subtotal) : 0;
    let shippingTotal = 0; // FREE SHIPPING ALL OVER INDIA
    let message = 'Free Shipping All Over India';

    if (pincode && pincode.length === 6) {
      try {
        const rateData = await this.calculateShipping(customerId, pincode);
        message = rateData.message || 'Free Shipping All Over India';
      } catch (e) {
        this.logger.error(`Error calculating shipping in total: ${e.message}`);
      }
    }

    let discount = 0;
    let appliedOffer = cart.offer;

    let couponError = null;

    if (couponCode) {
      try {
        appliedOffer = await this.marketingService.validateCoupon(customerId, couponCode, subtotal);
      } catch (e) {
        this.logger.error(`Invalid coupon: ${e.message}`);
        appliedOffer = null; // Ignore invalid coupon
        couponError = e.message;
      }
    }

    if (appliedOffer) {
      discount = this.marketingService.calculateDiscount(appliedOffer, subtotal, cart.items);
    }

    return {
      subtotal,
      shipping: 0,
      tax: 0,
      discount,
      total: Math.max(0, subtotal - discount),
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

    return result;
  }
}


