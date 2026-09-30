import { apiRequest } from './client';

export function getHomeSummary() {
  return apiRequest('/api/customer/home/summary');
}
