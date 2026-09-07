import api from './api';

export const getOrders = (params?: any) => api.get('/orders', { params });
export const getOrderById = (id: string | number) => api.get(`/orders/${id}`);
export const updateOrderStatus = (id: string | number, status: string, notes?: string) => 
  api.put(`/orders/${id}/status`, { status, notes });
export const updateOrderPaymentStatus = (id: string | number, status: string, notes?: string) => 
  api.put(`/orders/${id}/payment-status`, { payment_status: status, notes });
export const updateOrderTracking = (id: string | number, data: any) => 
  api.post(`/orders/${id}/tracking`, data);
export const processOrderRefund = (id: string | number, data: any) => 
  api.post(`/orders/${id}/refund`, data);
export const downloadInvoice = async (id: string | number, download = false) => {
  try {
    const response: any = await api.get(`/orders/${id}/invoice?download=${download}`, {
      responseType: 'blob'
    });
    
    if (response && response.success === false) {
      throw new Error(response.error || 'Failed to download invoice');
    }

    const rawBlob = response?.data instanceof Blob ? response.data : (response instanceof Blob ? response : null);
    if (!rawBlob || rawBlob.size === 0) {
      throw new Error('Invoice file is empty or unavailable');
    }

    const blob = new Blob([rawBlob], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    
    if (download) {
      const link = document.createElement('a');
      link.href = url;
      const cleanId = String(id).startsWith('ORD-') ? id : `ORD-${id}`;
      link.setAttribute('download', `Invoice-${cleanId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } else {
      window.open(url, '_blank');
    }
    
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return { success: true };
  } catch (err: any) {
    console.error('Invoice download error:', err);
    return { success: false, error: err.message || 'Failed to download invoice' };
  }
};

export const sendToShiprocket = (id: string | number) =>
  api.post(`/orders/${id}/send-to-shiprocket`, {});

export const syncShiprocket = (id: string | number) =>
  api.get(`/orders/${id}/shiprocket-sync`);

const orderService = {
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderPaymentStatus,
  updateOrderTracking,
  processOrderRefund,
  downloadInvoice,
  sendToShiprocket,
  syncShiprocket,
};

export default orderService;

