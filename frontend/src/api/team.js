import { apiRequest } from './client';

// Login for admins, staff and drivers. Each returns
// { access_token, refresh_token, role, user }.
export function teamPasswordLogin(username, password) {
  return apiRequest('/api/auth/team/login', {
    method: 'POST',
    auth: false,
    body: { username, password },
  });
}

// Only sends a code if the number belongs to an active team account,
// but always replies the same way.
export function teamRequestOtp(phoneNumber) {
  return apiRequest('/api/auth/team/request-otp', {
    method: 'POST',
    auth: false,
    body: { phone_number: phoneNumber },
  });
}

export function teamVerifyOtp(phoneNumber, code) {
  return apiRequest('/api/auth/team/verify-otp', {
    method: 'POST',
    auth: false,
    body: { phone_number: phoneNumber, code },
  });
}

export function getTeamMe() {
  return apiRequest('/api/auth/team/me');
}
