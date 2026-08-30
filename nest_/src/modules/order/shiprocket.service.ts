import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShiprocketService {
  private readonly logger = new Logger(ShiprocketService.name);
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private baseUrl = 'https://apiv2.shiprocket.in/v1/external';

  private async login(): Promise<string> {
    const email = process.env.SHIPROCKET_EMAIL || 'heetlimbasiya10@gmail.com';
    const password = process.env.SHIPROCKET_PASSWORD || '7Pm8K^%ThcQ5YNeHsH7l8ssuK1^q6ctf';

    try {
      this.logger.log(`Authenticating with Shiprocket API for ${email}...`);
      const response = await axios.post(`${this.baseUrl}/auth/login`, {
        email,
        password,
      });
      this.token = response.data.token;
      // Shiprocket tokens last ~10 days; we set local expiry for 7 days
      this.tokenExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
      this.logger.log('Shiprocket authentication successful');
      return this.token;
    } catch (error) {
      this.logger.error('Shiprocket login failed:', error.response?.data || error.message);
      throw new InternalServerErrorException(
        error.response?.data?.message || 'Shiprocket authentication failed. Please check credentials.'
      );
    }
  }

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }
    return this.login();
  }

  /**
   * Wrapper for making authenticated requests to Shiprocket with auto 401 retry
   */
  private async apiRequest(method: 'get' | 'post', url: string, data?: any, params?: any): Promise<any> {
    let token = await this.getToken();
    try {
      const config: any = {
        headers: { Authorization: `Bearer ${token}` },
        params,
      };
      const res = method === 'post' 
        ? await axios.post(`${this.baseUrl}${url}`, data, config)
        : await axios.get(`${this.baseUrl}${url}`, config);
      return res.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.logger.warn('Shiprocket token expired (401). Refreshing token and retrying...');
        this.token = null;
        token = await this.login();
        const retryConfig: any = {
          headers: { Authorization: `Bearer ${token}` },
          params,
        };
        const retryRes = method === 'post'
          ? await axios.post(`${this.baseUrl}${url}`, data, retryConfig)
          : await axios.get(`${this.baseUrl}${url}`, retryConfig);
        return retryRes.data;
      }
      throw error;
    }
  }

  async getTracking(trackingId: string) {
    try {
      return await this.apiRequest('get', `/courier/track/awb/${trackingId}`);
    } catch (error: any) {
      this.logger.error(`Shiprocket tracking failed for ${trackingId}:`, error.response?.data || error.message);
      return null;
    }
  }

  async getTrackingByOrderId(orderId: string | number) {
    try {
      return await this.apiRequest('get', `/courier/track`, null, { order_id: orderId.toString() });
    } catch (error: any) {
      this.logger.error(`Shiprocket tracking by order failed for ${orderId}:`, error.response?.data || error.message);
      return null;
    }
  }

  async createOrder(orderData: any) {
    try {
      this.logger.log(`Dispatching adhoc order to Shiprocket: ${orderData.order_id}`);
      return await this.apiRequest('post', `/orders/create/adhoc`, orderData);
    } catch (error: any) {
      const errDetail = error.response?.data || error.message;
      this.logger.error('Shiprocket order creation failed:', errDetail);
      throw new InternalServerErrorException(
        typeof errDetail === 'object' ? (errDetail.message || JSON.stringify(errDetail)) : errDetail
      );
    }
  }

  async generateAwb(shipmentId: number | string, courierId?: number) {
    try {
      const payload: any = { shipment_id: Number(shipmentId) };
      if (courierId) payload.courier_id = courierId;
      return await this.apiRequest('post', `/courier/assign/awb`, payload);
    } catch (error: any) {
      this.logger.error(`Shiprocket AWB generation failed for shipment ${shipmentId}:`, error.response?.data || error.message);
      return null;
    }
  }

  async generateLabel(shipmentId: number | string) {
    try {
      return await this.apiRequest('post', `/courier/generate/label`, {
        shipment_id: [Number(shipmentId)],
      });
    } catch (error: any) {
      this.logger.error(`Shiprocket Label generation failed for shipment ${shipmentId}:`, error.response?.data || error.message);
      return null;
    }
  }

  async getPrimaryPickupLocation(): Promise<string> {
    if (process.env.SHIPROCKET_PICKUP_LOCATION) {
      return process.env.SHIPROCKET_PICKUP_LOCATION;
    }
    try {
      const res = await this.apiRequest('get', `/settings/company/pickup`);
      const addrs = res?.data?.shipping_address || [];
      if (addrs.length > 0 && addrs[0]?.pickup_location) {
        return addrs[0].pickup_location;
      }
    } catch (e: any) {
      this.logger.warn(`Could not query Shiprocket pickup locations: ${e.message}`);
    }
    return 'work';
  }

  async createOrderFromFylexOrder(order: any, shippingAddr?: any) {
    const pickupLocation = await this.getPrimaryPickupLocation();
    const dateStr = new Date(order.createdAt || Date.now())
      .toISOString()
      .replace('T', ' ')
      .slice(0, 16);

    const addr = shippingAddr || order.addresses?.find((a: any) => a.type === 'shipping') || order.addresses?.[0] || order.shipping_address || order.shippingAddress;

    const items = (order.items || []).map((item: any) => ({
      name: (item.productName || item.productVariant?.product?.name || item.name || 'FYLEX Luxury Timepiece').slice(0, 100),
      sku: item.sku || item.productVariant?.sku || `FYL-${item.id || 'WATCH'}`,
      units: Number(item.quantity || item.qty || 1),
      selling_price: Math.round(Number(item.unitPrice || item.subtotal || item.price || 0)),
      discount: Math.round(Number(item.discountAmount || 0)),
    }));

    const isCod = (order.paymentMethod || '').toLowerCase() === 'cod';

    // Parse names cleanly
    let firstName = (addr?.firstName || addr?.first_name || order.customerFirstName || '').trim();
    let lastName = (addr?.lastName || addr?.last_name || order.customerLastName || '').trim();

    if (!firstName) {
      const rawFullName = (addr?.name || addr?.full_name || order.customer?.name || 'Customer').trim();
      const parts = rawFullName.split(' ');
      firstName = parts[0] || 'Customer';
      lastName = parts.slice(1).join(' ') || 'Fylex';
    }
    if (!lastName) lastName = 'Fylex';

    const rawPhone = addr?.phone || addr?.mobile || order.customerMobile || order.customer?.mobile || '9876543210';
    const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10) || '9876543210';

    const rawPincode = addr?.postcode || addr?.pincode || addr?.zip || process.env.SHIPROCKET_PICKUP_PINCODE || '380001';
    const cleanPincode = String(rawPincode).replace(/\D/g, '').slice(0, 6) || '380001';

    const payload = {
      order_id: String(order.orderNumber || `ORD-${order.id}`),
      order_date: dateStr,
      pickup_location: pickupLocation,
      channel_id: '',
      comment: 'FYLEX Bespoke Luxury Watch Order',
      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: addr?.address1 || addr?.address || addr?.line1 || 'FYLEX Atelier, Ground Floor',
      billing_address_2: addr?.address2 || addr?.line2 || '',
      billing_city: addr?.city || 'Ahmedabad',
      billing_pincode: cleanPincode,
      billing_state: addr?.state || 'Gujarat',
      billing_country: addr?.country || 'India',
      billing_email: addr?.email || order.customer?.email || 'concierge@fylex.com',
      billing_phone: cleanPhone,
      shipping_is_billing: true,
      order_items: items.length > 0 ? items : [{
        name: 'FYLEX Luxury Timepiece',
        sku: 'FYLEX-TIMEPIECE',
        units: 1,
        selling_price: Math.round(Number(order.grandTotal || 10000)),
        discount: 0,
      }],
      payment_method: isCod ? 'COD' : 'Prepaid',
      sub_total: Math.round(Number(order.subtotal || order.grandTotal || 0)),
      length: 15,
      breadth: 15,
      height: 10,
      weight: 0.5,
    };

    this.logger.log(`Prepared Shiprocket Payload for order ${order.orderNumber || order.id}:\n` + JSON.stringify(payload, null, 2));
    return this.createOrder(payload);
  }

  private cache = new Map<string, { data: any, timestamp: number }>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  async checkServiceability(pickupPostcode: string, deliveryPostcode: string, weight: number) {
    const cleanPickup = String(pickupPostcode || process.env.SHIPROCKET_PICKUP_PINCODE || '380001').replace(/\D/g, '').slice(0, 6);
    const cleanDelivery = String(deliveryPostcode || '').replace(/\D/g, '').slice(0, 6);
    
    if (cleanDelivery.length !== 6) {
      return {
        serviceable: false,
        codAvailable: false,
        rate: null,
        message: 'Invalid 6-digit delivery pincode'
      };
    }

    const cacheKey = `${cleanPickup}_${cleanDelivery}_${weight}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.data;
    }

    try {
      const [prepaidData, codData] = await Promise.all([
        this.apiRequest('get', `/courier/serviceability/`, null, {
          pickup_postcode: cleanPickup,
          delivery_postcode: cleanDelivery,
          weight: weight || 0.5,
          cod: 0,
        }).catch(() => null),
        this.apiRequest('get', `/courier/serviceability/`, null, {
          pickup_postcode: cleanPickup,
          delivery_postcode: cleanDelivery,
          weight: weight || 0.5,
          cod: 1,
        }).catch(() => null),
      ]);

      const prepaidCouriers = prepaidData?.data?.available_courier_companies || [];
      const codCouriers = codData?.data?.available_courier_companies || [];

      const isServiceable = prepaidCouriers.length > 0 || codCouriers.length > 0;
      const isCodAvailable = codCouriers.length > 0;

      if (!isServiceable) {
        const result = {
          serviceable: false,
          codAvailable: false,
          rate: null,
          message: 'Delivery not available for this pincode',
        };
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

      let reliableCouriers = prepaidCouriers.filter((c: any) => c.rating >= 4);
      if (reliableCouriers.length === 0) reliableCouriers = prepaidCouriers;

      const bestCourier = reliableCouriers.sort((a: any, b: any) => parseFloat(a.rate) - parseFloat(b.rate))[0] || codCouriers[0];

      const result = {
        serviceable: true,
        codAvailable: isCodAvailable,
        rate: parseFloat(bestCourier?.rate || '0'),
        courier_name: bestCourier?.courier_name || 'Standard Luxury Courier',
        etd: bestCourier?.etd || '3-5 Business Days',
        message: 'Success',
      };
      
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error: any) {
      this.logger.error('Shiprocket serviceability check error:', error.response?.data || error.message);
      return {
        serviceable: true, 
        codAvailable: true,
        rate: 0,
        courier_name: 'Standard Luxury Courier',
        message: 'Shipping calculated (Fallback mode)',
      };
    }
  }
}



