import { useCallback } from 'react';

import { ApiError } from '../../api/client';

const NETWORK_ERROR =
  'Could not reach the server. Check your connection and try again.';

// Turns an API error into a message for team screens. A login that has
// expired (401) or belongs to another role (403) goes back to Welcome.
export function useTeamErrorHandler(navigation) {
  return useCallback(
    (err, showMessage) => {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        return;
      }

      showMessage(err instanceof ApiError ? err.message : NETWORK_ERROR);
    },
    [navigation]
  );
}

// Kenyan phone numbers are stored as 2547XXXXXXXX.
export function formatPhone(phone = '') {
  return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "Today, Sun 5 Oct"
export function todayLabel() {
  const now = new Date();
  return `Today, ${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;
}

// "4:27 PM", or "Fri 8:45 AM" when it is not today.
export function formatTime(isoString) {
  const date = new Date(isoString);
  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const time = `${hours}:${minutes} ${date.getHours() < 12 ? 'AM' : 'PM'}`;

  return date.toDateString() === new Date().toDateString()
    ? time
    : `${DAYS[date.getDay()]} ${time}`;
}

// Opens Google Maps (or the phone's map app) with directions to an address.
export function mapsUrl(address) {
  const destination =
    address.latitude != null
      ? `${address.latitude},${address.longitude}`
      : encodeURIComponent(address.address_line);

  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}
