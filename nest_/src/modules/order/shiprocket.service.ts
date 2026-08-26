import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShiprocketService {
  private token: string | null = null;
  private baseUrl = 'https://apiv2.shiprocket.in/v1/external';

  private async login() {
    try {
      const response = await axios.post(`${this.baseUrl}/auth/login`, {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      });
      this.token = response.data.token;
      return this.token;
    } catch (error) {
      console.error('Shiprocket login failed:', error.response?.data || error.message);
      throw new InternalServerErrorException('Shiprocket authentication failed');
    }
  }

  private async getToken() {
    if (this.token) return this.token;
    return this.login();
  }

  async getTracking(trackingId: string) {
    const token = await this.getToken();
    try {
      const response = await axios.get(`${this.baseUrl}/courier/track/awb/${trackingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('Shiprocket tracking failed:', error.response?.data || error.message);
      return null;
    }
  }

  async createOrder(orderData: any) {
    const token = await this.getToken();
    try {
      const response = await axios.post(`${this.baseUrl}/orders/create/adhoc`, orderData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('Shiprocket order creation failed:', error.response?.data || error.message);
      throw new InternalServerErrorException('Shiprocket order creation failed');
    }
  }

  async createOrderFromFylexOrder(order: any, shippingAddr?: any) {
    const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary';
    const dateStr = new Date(order.createdAt || Date.now())
      .toISOString()
      .replace('T', ' ')
      .slice(0, 16);

    const items = (order.items || []).map((item: any) => ({
      name: item.productName || item.productVariant?.product?.name || 'Fylex Timepiece',
      sku: item.sku || item.productVariant?.sku || 'FYLEX-ITEM',
      units: item.quantity || 1,
      selling_price: Number(item.unitPrice || item.subtotal || 0),
      discount: Number(item.discountAmount || 0),
    }));

    const isCod = order.paymentMethod === 'cod';

    const payload = {
      order_id: order.orderNumber || `ORD-${order.id}`,
      order_date: dateStr,
      pickup_location: pickupLocation,
      channel_id: '',
      comment: 'Fylex Luxury Watch Order',
      billing_customer_name: order.customerFirstName || shippingAddr?.firstName || 'Customer',
      billing_last_name: order.customerLastName || shippingAddr?.lastName || 'Name',
      billing_address: shippingAddr?.address1 || shippingAddr?.address || '6/11, Radhika Times',
      billing_city: shippingAddr?.city || 'Rajkot',
      billing_pincode: shippingAddr?.postcode || shippingAddr?.pincode || '360002',
      billing_state: shippingAddr?.state || 'Gujarat',
      billing_country: shippingAddr?.country || 'India',
      billing_email: shippingAddr?.email || order.customer?.email || 'customer@fylex.com',
      billing_phone: shippingAddr?.phone || shippingAddr?.mobile || order.customerMobile || '7069211020',
      shipping_is_billing: true,
      order_items: items,
      payment_method: isCod ? 'COD' : 'Prepaid',
      sub_total: Number(order.subtotal || order.grandTotal || 0),
      length: 15,
      breadth: 15,
      height: 10,
      weight: 0.5,
    };

    return this.createOrder(payload);
  }

  private cache = new Map<string, { data: any, timestamp: number }>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  async checkServiceability(pickupPostcode: string, deliveryPostcode: string, weight: number) {
    const cacheKey = `${pickupPostcode}_${deliveryPostcode}_${weight}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.data;
    }

    const token = await this.getToken();
    try {
      // Check both Prepaid and COD in parallel
      const [prepaidRes, codRes] = await Promise.allSettled([
        axios.get(`${this.baseUrl}/courier/serviceability/`, {
          params: {
            pickup_postcode: pickupPostcode,
            delivery_postcode: deliveryPostcode,
            weight: weight,
            cod: 0,
          },
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${this.baseUrl}/courier/serviceability/`, {
          params: {
            pickup_postcode: pickupPostcode,
            delivery_postcode: deliveryPostcode,
            weight: weight,
            cod: 1,
          },
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      const prepaidData = prepaidRes.status === 'fulfilled' ? prepaidRes.value.data : null;
      const codData = codRes.status === 'fulfilled' ? codRes.value.data : null;

      const prepaidCouriers = prepaidData?.data?.available_courier_companies || [];
      const codCouriers = codData?.data?.available_courier_companies || [];

      const isServiceable = prepaidCouriers.length > 0 || codCouriers.length > 0;
      const isCodAvailable = codCouriers.length > 0;

      if (!isServiceable) {
        const result = {
          serviceable: false,
          codAvailable: false,
          rate: null,
          message: "Delivery not available for this pincode"
        };
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

      // Filter for reliable couriers (Rating >= 4)
      let reliableCouriers = prepaidCouriers.filter(c => c.rating >= 4);
      if (reliableCouriers.length === 0) reliableCouriers = prepaidCouriers; // Fallback to all if none are >= 4

      // Get best courier (cheapest among reliable ones)
      const bestCourier = reliableCouriers.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0] || codCouriers[0];

      const result = {
        serviceable: true,
        codAvailable: isCodAvailable,
        rate: parseFloat(bestCourier.rate),
        courier_name: bestCourier.courier_name,
        etd: bestCourier.etd,
        message: "Success"
      };
      
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('Shiprocket serviceability check failed:', error.response?.data || error.message);
      // Technical failure -> Allow ONLY Prepaid for safety
      return {
        serviceable: null, 
        codAvailable: true, // Force true to allow COD on API error
        rate: 500,
        message: "Technical issue: COD enabled, shipping estimated"
      };
    }
  }
}


