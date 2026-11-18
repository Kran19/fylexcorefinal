import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { OrderService } from '../order/order.service';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    @Inject(forwardRef(() => OrderService)) private readonly orderService: OrderService
  ) {}

  // ─── Existing Classic Endpoints (Preserved 100% for Backward Compatibility) ───

  @Post('create-order')
  async createOrder(@Body() body: { customerId: string; pincode?: string; receipt: string; couponCode?: string; useCredits?: boolean }) {
    if (!body.customerId) throw new BadRequestException('customerId is required');
    
    // SECURITY: Calculate total on server, do NOT trust frontend amount
    const totals = await this.orderService.calculateOrderTotal(body.customerId, body.pincode, body.couponCode, body.useCredits !== false);
    if (totals.total <= 0) throw new BadRequestException('Invalid order total');
    
    const order = await this.paymentService.createOrder(totals.total, 'INR', body.receipt);
    return { ...order, key: this.paymentService.getKeyId() };
  }

  @Post('verify')
  async verifyPayment(
    @Body() body: { orderId: string; paymentId: string; signature: string },
  ) {
    const isValid = this.paymentService.verifySignature(
      body.orderId,
      body.paymentId,
      body.signature,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid signature');
    }
    return { success: true };
  }

  // ─── 1-Click Razorpay Magic Checkout Endpoints ────────────────────────────────

  @Post('magic/create-order')
  async createMagicOrder(@Req() req: any, @Body() body: any) {
    const userId = body?.userId || body?.customerId;
    if (!userId) throw new BadRequestException('Cart userId or guestId is required');

    const proto = (req?.headers?.['x-forwarded-proto'] || req?.protocol || 'https').toString().split(',')[0].trim();
    const host = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').toString().split(',')[0].trim();
    const publicOrigin = host ? `${proto}://${host}` : undefined;

    return this.orderService.prepareMagicCheckoutOrder({
      userId: String(userId),
      couponCode: body?.couponCode,
      useCredits: body?.useCredits !== false,
      receipt: body?.receipt,
      publicOrigin,
    });
  }

  @Get('magic/shipping-info')
  @HttpCode(HttpStatus.OK)
  async pingMagicShippingInfo() {
    return { addresses: [] };
  }

  @Post('magic/shipping-info')
  @HttpCode(HttpStatus.OK)
  async handleMagicShippingInfo(@Body() body: any) {
    return this.orderService.handleMagicShippingInfo(body);
  }

  @Get('magic/promotions')
  @HttpCode(HttpStatus.OK)
  async pingMagicPromotions() {
    return { promotions: [] };
  }

  @Post('magic/promotions')
  @HttpCode(HttpStatus.OK)
  async handleMagicGetPromotions(@Body() body: any) {
    return this.orderService.handleMagicGetPromotions(body);
  }

  @Post('magic/apply-promotion')
  @HttpCode(HttpStatus.OK)
  async handleMagicApplyPromotion(@Body() body: any) {
    return this.orderService.handleMagicApplyPromotion(body);
  }

  @Post('magic/complete')
  async completeMagicOrder(@Body() body: any) {
    const razorpayOrderId = body?.razorpayOrderId || body?.orderId || body?.razorpay_order_id;
    const razorpayPaymentId = body?.razorpayPaymentId || body?.paymentId || body?.razorpay_payment_id;
    const razorpaySignature = body?.razorpaySignature || body?.signature || body?.razorpay_signature;
    const userId = body?.userId || body?.customerId;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new BadRequestException('Missing Razorpay payment verification parameters');
    }

    return this.orderService.completeMagicCheckoutOrder({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      userId: userId ? String(userId) : undefined,
      issueSession: true,
      fallbackCustomerInput: body?.fallbackCustomer,
    });
  }

  @Post('magic/check-order')
  async checkMagicOrder(@Body() body: any) {
    const razorpayOrderId = body?.razorpayOrderId || body?.orderId;
    const callerUserId = body?.userId || body?.customerId;
    if (!razorpayOrderId) throw new BadRequestException('razorpayOrderId is required');

    // Verify caller owns the initiating cart/session before issuing an auto-login token
    const rzpOrder = await this.paymentService.fetchOrder(razorpayOrderId);
    const ownerMatches = Boolean(
      callerUserId &&
      rzpOrder?.notes?.userId &&
      String(rzpOrder.notes.userId) === String(callerUserId)
    );

    return this.orderService.completeMagicCheckoutOrder({
      razorpayOrderId,
      userId: callerUserId ? String(callerUserId) : undefined,
      issueSession: ownerMatches,
      webhookOrderEntity: rzpOrder,
    });
  }

  @Post('magic/complete-free')
  async completeFreeMagicOrder(@Body() body: any) {
    return this.orderService.completeFreeMagicOrder({
      userId: String(body?.userId || body?.customerId || ''),
      couponCode: body?.couponCode,
      useCredits: body?.useCredits !== false,
      name: body?.name,
      mobile: body?.mobile,
      email: body?.email,
      pincode: body?.pincode,
      city: body?.city,
      state: body?.state,
      address: body?.address,
    });
  }

  @Post('magic/webhook')
  @HttpCode(HttpStatus.OK)
  async handleMagicWebhook(
    @Req() req: any,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Body() body: any,
  ) {
    const rawBody = req?.rawBody || JSON.stringify(body || {});
    return this.orderService.handleRazorpayMagicWebhook(rawBody, signature, body);
  }
}


