import api from './api';

export interface DashboardQueryParams {
  startDate?: string;
  endDate?: string;
  preset?: string;
}

export const getDashboard = (params?: DashboardQueryParams) =>
  api.get('/dashboard', { params });

export const getCartCheckoutFunnel = (params?: DashboardQueryParams) =>
  api.get('/dashboard/cart-checkout-funnel', { params });

const dashboardService = {
  getDashboard,
  getCartCheckoutFunnel,
};

export default dashboardService;
