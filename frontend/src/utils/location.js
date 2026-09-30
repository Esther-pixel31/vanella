import * as Location from 'expo-location';

// Reasons detection can fail, so screens can show the right message.
export const LOCATION_DENIED = 'denied';
export const LOCATION_OFF = 'off';
export const LOCATION_FAILED = 'failed';

const POSITION_TIMEOUT_MS = 15000;

// Geocoders sometimes return Plus Codes like "XMQ2+4F" instead of a name.
const PLUS_CODE = /^[A-Z0-9]{4}\+[A-Z0-9]{2,}/i;

export class LocationError extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

function timeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('timeout')), ms);
  });
}

async function getPosition() {
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      timeout(POSITION_TIMEOUT_MS),
    ]);
  } catch (err) {
    // A fresh fix can be slow indoors; a recent one is good enough.
    const lastKnown = await Location.getLastKnownPositionAsync();

    if (lastKnown) return lastKnown;

    throw new LocationError(LOCATION_FAILED);
  }
}

// Builds "Links Road, Nyali, Mombasa" from the geocoder's separate parts.
function describePlace(place) {
  if (!place) return '';

  const parts = [
    place.street || place.name,
    place.district,
    place.city || place.subregion,
  ];

  const seen = new Set();

  return parts
    .filter((part) => part && !PLUS_CODE.test(part))
    .filter((part) => {
      const key = part.toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .join(', ');
}

// Asks for permission, reads the phone's position and turns it into a
// readable address. `addressText` is '' when no place name could be found.
export async function detectLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (!permission.granted) {
    throw new LocationError(LOCATION_DENIED);
  }

  if (!(await Location.hasServicesEnabledAsync())) {
    throw new LocationError(LOCATION_OFF);
  }

  const position = await getPosition();
  const { latitude, longitude } = position.coords;

  let addressText = '';

  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });

    addressText = describePlace(places[0]);
  } catch (err) {
    // The position is still usable; the customer types the address.
  }

  return { latitude, longitude, addressText };
}

// Straight-line distance between two { latitude, longitude } points.
export function distanceKm(from, to) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function hasCoordinates(place) {
  return (
    place != null &&
    typeof place.latitude === 'number' &&
    typeof place.longitude === 'number'
  );
}
