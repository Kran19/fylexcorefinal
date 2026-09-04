import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { FYLEX_LOGO_BASE64 } from './whatsapp.constants';

interface OtpEntry {
  otp: string;
  expiresAt: number;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private otpStore = new Map<string, OtpEntry>();

  private readonly apiKey = process.env.ZAPLE_API_KEY || 'zaple_451798231PSElqa6NorYoKqpjcnPHN3Z64MNd';
  private readonly apiSecret = process.env.ZAPLE_API_SECRET || 'zaple3374684YtFxWsh8liPqptWEjevVJ20XuiEeBr';

  // Approved Zaple Template IDs
  private readonly otpTemplateId = process.env.ZAPLE_OTP_TEMPLATE_ID || process.env.ZAPLE_TEMPLATE_ID || '424883717876429003545862';
  private readonly welcomeTemplateId = process.env.ZAPLE_WELCOME_TEMPLATE_ID || '398859617877513932611736';
  private readonly orderReceivedTemplateId = process.env.ZAPLE_ORDER_RECEIVED_TEMPLATE_ID || '360563217879352591067015';
  private readonly outForDeliveryTemplateId = process.env.ZAPLE_OUT_FOR_DELIVERY_TEMPLATE_ID || '136925717879433254081719';
  private readonly deliveredTemplateId = process.env.ZAPLE_DELIVERED_TEMPLATE_ID || '292200417879435134514663';

  /**
   * Generates a 6-digit OTP, stores it with 10-minute validity, and sends it via Zaple.ai WhatsApp API.
   */
  async sendOtp(mobile: string): Promise<{ success: boolean; message: string }> {
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      throw new BadRequestException('Invalid mobile number');
    }

    // Generate random 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.otpStore.set(cleanMobile, { otp: generatedOtp, expiresAt });
    this.logger.log(`Generated OTP for mobile ${cleanMobile}: ${generatedOtp}`);

    // Dispatch via Zaple.ai WhatsApp API
    try {
      const apiResult = await this.dispatchZapleTemplate(cleanMobile, this.otpTemplateId, [generatedOtp]);
      this.logger.log(`Zaple WhatsApp OTP API response for ${cleanMobile}: ${JSON.stringify(apiResult)}`);
      return { success: true, message: 'OTP sent successfully via WhatsApp' };
    } catch (error) {
      this.logger.error(`Zaple WhatsApp OTP API error for ${cleanMobile}: ${error.message}`);
      return { success: true, message: 'OTP generated and dispatched' };
    }
  }

  /**
   * Resolves Option B: Fylex Gold Logo base64 for the Welcome Template image header.
   */
  private getWelcomeLogoBase64(): string {
    try {
      // 1. Check local nest_ assets directory
      const localAsset = path.join(__dirname, '..', '..', 'assets', 'fylex_logo.png');
      if (fs.existsSync(localAsset)) {
        const buf = fs.readFileSync(localAsset);
        return `data:image/png;base64,${buf.toString('base64')}`;
      }
      // 2. Check next_ public directory if running in local monorepo
      const nextPublic = path.join(process.cwd(), '..', 'next_', 'public', 'fylex_logo.png');
      if (fs.existsSync(nextPublic)) {
        const buf = fs.readFileSync(nextPublic);
        return `data:image/png;base64,${buf.toString('base64')}`;
      }
    } catch (e) {
      this.logger.warn(`Could not read fylex_logo.png from filesystem, using compiled constant: ${e.message}`);
    }
    return FYLEX_LOGO_BASE64;
  }

  /**
   * Sends Welcome / Account Created WhatsApp template message to newly registered customers.
   * Template ID: 398859617877513932611736
   * Header: Option B - Fylex Gold Logo (media_url_type: base64)
   * Variable 1 (template_argument1): Customer Name
   */
  async sendWelcomeMessage(mobile: string, name: string): Promise<{ success: boolean; message: string }> {
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      this.logger.warn(`Cannot send welcome WhatsApp message: invalid mobile ${mobile}`);
      return { success: false, message: 'Invalid mobile number' };
    }

    const customerName = (name || 'Valued Customer').trim();
    this.logger.log(`Sending Welcome WhatsApp Template [${this.welcomeTemplateId}] to ${cleanMobile} (Name: ${customerName})`);

    try {
      const logoBase64 = this.getWelcomeLogoBase64();
      const apiResult = await this.dispatchZapleTemplate(
        cleanMobile,
        this.welcomeTemplateId,
        [customerName],
        { mediaUrlType: 'base64', base64: logoBase64 }
      );
      this.logger.log(`Zaple Welcome WhatsApp API response for ${cleanMobile}: ${JSON.stringify(apiResult)}`);
      return { success: true, message: 'Welcome message sent successfully via WhatsApp' };
    } catch (error) {
      this.logger.error(`Zaple Welcome WhatsApp API error for ${cleanMobile}: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Sends "Order Received" WhatsApp confirmation template upon successful checkout.
   * Template ID: 360563217879352591067015
   * Variable 1 (template_argument1): Order Number (e.g. ORD-1787835086413)
   */
  async sendOrderReceived(mobile: string, orderNumber: string): Promise<{ success: boolean; message: string }> {
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      this.logger.warn(`Cannot send Order Received WhatsApp message: invalid mobile ${mobile}`);
      return { success: false, message: 'Invalid mobile number' };
    }

    const cleanOrderNumber = (orderNumber || 'ORD-NEW').replace(/^#+/, '');
    this.logger.log(`Sending Order Received WhatsApp [${this.orderReceivedTemplateId}] to ${cleanMobile} (Order: ${cleanOrderNumber})`);

    try {
      const apiResult = await this.dispatchZapleTemplate(cleanMobile, this.orderReceivedTemplateId, [cleanOrderNumber]);
      this.logger.log(`Zaple Order Received WhatsApp response for ${cleanMobile}: ${JSON.stringify(apiResult)}`);
      return { success: true, message: 'Order Received notification sent successfully via WhatsApp' };
    } catch (error) {
      this.logger.error(`Zaple Order Received WhatsApp error for ${cleanMobile}: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Sends "Out For Delivery" WhatsApp template when courier is delivering parcel today.
   * Template ID: 136925717879433254081719
   * Static template (No variables)
   */
  async sendOutForDelivery(mobile: string): Promise<{ success: boolean; message: string }> {
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      this.logger.warn(`Cannot send Out For Delivery WhatsApp message: invalid mobile ${mobile}`);
      return { success: false, message: 'Invalid mobile number' };
    }

    this.logger.log(`Sending Out For Delivery WhatsApp [${this.outForDeliveryTemplateId}] to ${cleanMobile}`);

    try {
      const apiResult = await this.dispatchZapleTemplate(cleanMobile, this.outForDeliveryTemplateId, []);
      this.logger.log(`Zaple Out For Delivery WhatsApp response for ${cleanMobile}: ${JSON.stringify(apiResult)}`);
      return { success: true, message: 'Out For Delivery notification sent successfully via WhatsApp' };
    } catch (error) {
      this.logger.error(`Zaple Out For Delivery WhatsApp error for ${cleanMobile}: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Sends "Delivered" WhatsApp template when parcel is successfully delivered.
   * Template ID: 292200417879435134514663
   * Static template (No variables)
   */
  async sendDelivered(mobile: string): Promise<{ success: boolean; message: string }> {
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      this.logger.warn(`Cannot send Delivered WhatsApp message: invalid mobile ${mobile}`);
      return { success: false, message: 'Invalid mobile number' };
    }

    this.logger.log(`Sending Delivered WhatsApp [${this.deliveredTemplateId}] to ${cleanMobile}`);

    try {
      const apiResult = await this.dispatchZapleTemplate(cleanMobile, this.deliveredTemplateId, []);
      this.logger.log(`Zaple Delivered WhatsApp response for ${cleanMobile}: ${JSON.stringify(apiResult)}`);
      return { success: true, message: 'Delivered notification sent successfully via WhatsApp' };
    } catch (error) {
      this.logger.error(`Zaple Delivered WhatsApp error for ${cleanMobile}: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Verifies submitted OTP against stored value.
   */
  verifyOtp(mobile: string, inputOtp: string): boolean {
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const entry = this.otpStore.get(cleanMobile);

    if (!entry) {
      this.logger.warn(`No OTP found for mobile ${cleanMobile}`);
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.logger.warn(`OTP expired for mobile ${cleanMobile}`);
      this.otpStore.delete(cleanMobile);
      return false;
    }

    if (entry.otp !== inputOtp.trim()) {
      this.logger.warn(`Invalid OTP input for mobile ${cleanMobile}: expected ${entry.otp}, got ${inputOtp}`);
      return false;
    }

    // Clear after successful validation
    this.otpStore.delete(cleanMobile);
    return true;
  }

  /**
   * Generic multipart/form-data dispatcher to Zaple.ai API
   */
  private dispatchZapleTemplate(
    mobile: string,
    templateId: string,
    args: string[] = [],
    media?: { mediaUrlType?: string; base64?: string }
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const fullMobile = mobile.length === 10 ? `91${mobile}` : mobile;
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      
      let body = 
        `--${boundary}\r\nContent-Disposition: form-data; name="send_to"\r\n\r\n${fullMobile}\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="country_code"\r\n\r\n91\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="template_id"\r\n\r\n${templateId}\r\n`;

      if (media?.mediaUrlType && media?.base64) {
        body += `--${boundary}\r\nContent-Disposition: form-data; name="media_url_type"\r\n\r\n${media.mediaUrlType}\r\n`;
        body += `--${boundary}\r\nContent-Disposition: form-data; name="base64"\r\n\r\n${media.base64}\r\n`;
      }

      args.forEach((arg, index) => {
        body += `--${boundary}\r\nContent-Disposition: form-data; name="template_argument${index + 1}"\r\n\r\n${arg}\r\n`;
      });

      body += `--${boundary}--\r\n`;

      const req = https.request('https://app.zaple.ai/api/v2/send-template-message', {
        method: 'POST',
        headers: {
          'Zaple-Api-Key': this.apiKey,
          'Zaple-Api-Secret': this.apiSecret,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.write(body);
      req.end();
    });
  }
}
