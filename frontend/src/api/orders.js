import { apiRequest } from './client';

export function getOrders() {
  return apiRequest('/api/customer/orders');
}

export function getOrder(orderId) {
  return apiRequest(`/api/customer/orders/${orderId}`);
}

// Only product ids and quantities are sent; the backend works out prices.
export function createOrder({
  branchId,
  addressId,
  note,
  items,
  rewardId = null,
  paymentMethod = 'cash',
}) {
  return apiRequest('/api/customer/orders', {
    method: 'POST',
    body: {
      branch_id: branchId,
      address_id: addressId,
      customer_note: note || null,
      items: items.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
      reward_id: rewardId,
      payment_method: paymentMethod,
    },
  });
}
