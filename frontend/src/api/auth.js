import { apiRequest } from './client';

export function requestOtp(phoneNumber) {
  return apiRequest('/api/auth/request-otp', {
    method: 'POST',
    auth: false,
    body: { phone_number: phoneNumber },
  });
}

export function verifyOtp({ phoneNumber, code, fullName, physicalAddress }) {
  return apiRequest('/api/auth/verify-otp', {
    method: 'POST',
    auth: false,
    body: {
      phone_number: phoneNumber,
      code,
      full_name: fullName,
      physical_address: physicalAddress,
    },
  });
}