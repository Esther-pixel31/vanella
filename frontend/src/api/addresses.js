import { apiRequest } from './client';

export function getAddresses() {
  return apiRequest('/api/customer/addresses');
}

// latitude/longitude are optional: only GPS-detected addresses have them.
export function createAddress({
  label = 'Home',
  addressLine,
  latitude = null,
  longitude = null,
  isDefault = false,
}) {
  return apiRequest('/api/customer/addresses', {
    method: 'POST',
    body: {
      label,
      address_line: addressLine,
      latitude,
      longitude,
      is_default: isDefault,
    },
  });
}
