import { apiRequest } from './client';

export function getProducts() {
  return apiRequest('/api/customer/products', { auth: false });
}
