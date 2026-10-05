import { apiRequest } from './client';

// Admins have no branch of their own, so they pass one; staff never do.
const branchQuery = (branchId, prefix = '?') =>
  branchId ? `${prefix}branch_id=${branchId}` : '';

export function getStaffSummary(branchId) {
  return apiRequest(`/api/staff/summary${branchQuery(branchId)}`);
}

// view: "new", "ready", "on_the_way", "delivered" or "awaiting_payment"
export function getStaffOrders(view, branchId) {
  return apiRequest(`/api/staff/orders?view=${view}${branchQuery(branchId, '&')}`);
}

export function getStaffOrder(orderId) {
  return apiRequest(`/api/staff/orders/${orderId}`);
}

export function markOrderReady(orderId) {
  return apiRequest(`/api/staff/orders/${orderId}/ready`, { method: 'POST' });
}

export function assignOrderDriver(orderId, driverId) {
  return apiRequest(`/api/staff/orders/${orderId}/assign-driver`, {
    method: 'POST',
    body: { driver_id: driverId },
  });
}

// Override for when the customer's code cannot be used.
export function staffMarkDelivered(orderId) {
  return apiRequest(`/api/staff/orders/${orderId}/deliver`, { method: 'POST' });
}

export function confirmOrderCash(orderId) {
  return apiRequest(`/api/staff/orders/${orderId}/confirm-cash`, { method: 'POST' });
}

export function getBranchDrivers(branchId) {
  return apiRequest(`/api/staff/drivers${branchQuery(branchId)}`);
}
