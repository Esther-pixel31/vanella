import { apiRequest } from './client';

// Not yet delivered (default), or delivered today.
export function getMyDeliveries(done = false) {
  return apiRequest(`/api/driver/deliveries${done ? '?done=true' : ''}`);
}

export function getMyDelivery(orderId) {
  return apiRequest(`/api/driver/deliveries/${orderId}`);
}

// Finishes a delivery with the customer's 4-digit code.
export function deliverWithCode(orderId, code) {
  return apiRequest(`/api/driver/deliveries/${orderId}/deliver`, {
    method: 'POST',
    body: { code },
  });
}

export function sendDriverLocation(latitude, longitude) {
  return apiRequest('/api/driver/deliveries/location', {
    method: 'POST',
    body: { latitude, longitude },
  });
}
