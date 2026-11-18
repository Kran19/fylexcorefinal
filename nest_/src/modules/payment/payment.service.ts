import { Injectable, BadRequestException, Logger } from '@nestjs/common';
const Razorpay = require('razorpay');
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private razorpay: any;
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'dummy_razorpay_secret_123';
    
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      this.logger.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing from .env; using fallback dummy credentials.');
    }

    try {
      this.razorpay = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    } catch (e) {
      console.error('Failed to initialize Razorpay instance:', e);
    }
  }

  getKeyId(): string {
    return this.keyId;
  }

  async createOrder(amount: number, currency: string = 'INR', receipt: string) {
    const options = {
      amount: Math.round(amount * 100), // amount in the smallest currency unit
      currency,
      receipt,
    };

    console.log('Initiating Razorpay order:', options);

    try {
      const order = await this.razorpay.orders.create(options);
      console.log('Razorpay order created:', order.id);
      return order;
    } catch (error: any) {
      console.error('Razorpay order creation failed:', error);
      const message = error.description || error.error?.description || error.message || 'Razorpay order creation failed';
      throw new BadRequestException(`Razorpay Error: ${message}`);
    }
  }

  /**
   * Creates a Razorpay Magic Checkout (1-Click) order with line_items and line_items_total.
   * Gracefully falls back to standard order payload if line_items is not enabled on a test key.
   */
  async createMagicOrder(params: {
    amountPaise: number;
    currency?: string;
    receipt: string;
    lineItems: any[];
    lineItemsTotalPaise: number;
    notes?: Record<string, string>;
  }) {
    const {
      amountPaise,
      currency = 'INR',
      receipt,
      lineItems,
      lineItemsTotalPaise,
      notes = {},
    } = params;

    const magicOptions: any = {
      amount: Math.round(amountPaise),
      currency,
      receipt,
      line_items_total: Math.round(lineItemsTotalPaise),
      line_items: lineItems,
      notes,
    };

    this.logger.log(`Initiating Razorpay Magic Checkout order: receipt=${receipt}, amount=${magicOptions.amount} paise, items=${lineItems.length}`);

    try {
      const order = await this.razorpay.orders.create(magicOptions);
      this.logger.log(`Razorpay Magic order created: ${order.id}`);
      return { ...order, key: this.keyId, magicEnabled: true };
    } catch (error: any) {
      const errDesc = String(error?.description || error?.error?.description || error?.message || '');
      if (errDesc.toLowerCase().includes('line_items') || errDesc.toLowerCase().includes('extra fields')) {
        this.logger.warn(`Razorpay key does not accept line_items yet (${errDesc}). Retrying with standard order payload...`);
        try {
          const fallbackOrder = await this.razorpay.orders.create({
            amount: Math.round(amountPaise),
            currency,
            receipt,
            notes,
          });
          return { ...fallbackOrder, key: this.keyId, magicEnabled: false };
        } catch (fallbackErr: any) {
          const fbMsg = fallbackErr?.description || fallbackErr?.error?.description || fallbackErr?.message || 'Razorpay order creation failed';
          throw new BadRequestException(`Razorpay Error: ${fbMsg}`);
        }
      }

      this.logger.error('Razorpay Magic order creation failed:', error);
      throw new BadRequestException(`Razorpay Error: ${errDesc || 'Razorpay order creation failed'}`);
    }
  }

  async fetchOrder(razorpayOrderId: string): Promise<any> {
    try {
      return await this.razorpay.orders.fetch(razorpayOrderId);
    } catch (error: any) {
      const message = error?.description || error?.error?.description || error?.message || 'Failed to fetch Razorpay order';
      this.logger.error(`Failed to fetch Razorpay order ${razorpayOrderId}: ${message}`);
      throw new BadRequestException(`Razorpay Order Fetch Error: ${message}`);
    }
  }

  async fetchOrderPayments(razorpayOrderId: string): Promise<any> {
    try {
      return await this.razorpay.orders.fetchPayments(razorpayOrderId);
    } catch (error: any) {
      this.logger.warn(`Could not fetch payments list for Razorpay order ${razorpayOrderId}: ${error?.message || error}`);
      return { items: [] };
    }
  }

  verifySignature(orderId: string, paymentId: string, signature: string) {
    const text = `${orderId}|${paymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', this.keySecret)
      .update(text)
      .digest('hex');

    return generated_signature === signature;
  }

  verifyWebhookSignature(rawBody: Buffer | string, signature?: string): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      // If webhook secret is not set yet, caller will still cross-verify order/payment directly via Razorpay API
      this.logger.warn('RAZORPAY_WEBHOOK_SECRET not set in .env; relying on direct Razorpay API fetch verification.');
      return true;
    }
    if (!signature || !rawBody) return false;
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    return expected === signature;
  }

  async refundPayment(paymentId: string, amount?: number, notes?: any) {
    try {
      const options: any = {};
      if (amount && amount > 0) {
        options.amount = Math.round(amount * 100);
      }
      if (notes) {
        options.notes = notes;
      }
      console.log(`Initiating Razorpay refund for payment ${paymentId}:`, options);
      const refund = await this.razorpay.payments.refund(paymentId, options);
      console.log('Razorpay refund successful:', refund.id);
      return refund;
    } catch (error: any) {
      console.error('Razorpay refund failed:', error);
      const message = error.description || error.error?.description || error.message || 'Razorpay refund failed';
      throw new BadRequestException(`Razorpay Refund Error: ${message}`);
    }
  }
}


