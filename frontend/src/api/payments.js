import { apiRequest } from './client';

// Sends the M-Pesa PIN prompt for an order to `phoneNumber` (2547XXXXXXXX).
export function startMpesaPayment(orderId, phoneNumber) {
  return apiRequest(`/api/customer/orders/${orderId}/pay/mpesa`, {
    method: 'POST',
    body: { phone_number: phoneNumber },
  });
}

// Latest payment attempt for an order. Throws a 404 ApiError if none exists.
export function getPaymentStatus(orderId) {
  return apiRequest(`/api/customer/orders/${orderId}/payment`);
}

// Changes an unpaid M-Pesa order to cash on delivery. Returns the order.
export function switchToCash(orderId) {
  return apiRequest(`/api/customer/orders/${orderId}/pay/cash`, {
    method: 'POST',
  });
}
