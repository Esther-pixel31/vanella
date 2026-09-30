import { apiRequest } from './client';

export function getBranches() {
  return apiRequest('/api/customer/home/branches', { auth: false });
}
