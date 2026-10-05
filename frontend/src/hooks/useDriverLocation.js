import { useEffect, useRef, useState } from 'react';

import * as Location from 'expo-location';

import { sendDriverLocation } from '../api/driver';

// Send at most one position every this many milliseconds.
const SEND_EVERY_MS = 5000;

export const SHARING = 'sharing';
export const STARTING = 'starting';
export const DENIED = 'denied';
export const OFF = 'off';

// While `active` (the driver has an order on its way), watches the phone's
// position and sends it to the backend so customers can follow on a map.
// In Expo Go this only runs while the app is open on screen.
//
// Returns { status, position } — position is { latitude, longitude } or null.
export default function useDriverLocation(active) {
  const [status, setStatus] = useState(OFF);
  const [position, setPosition] = useState(null);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!active) {
      setStatus(OFF);
      return undefined;
    }

    let subscription = null;
    let cancelled = false;

    (async () => {
      setStatus(STARTING);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        if (!cancelled) setStatus(DENIED);
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: SEND_EVERY_MS,
          distanceInterval: 10,
        },
        (update) => {
          const { latitude, longitude } = update.coords;

          setPosition({ latitude, longitude });
          setStatus(SHARING);

          if (Date.now() - lastSent.current >= SEND_EVERY_MS) {
            lastSent.current = Date.now();
            // A failed send is fine: the next position goes out shortly.
            sendDriverLocation(latitude, longitude).catch(() => {});
          }
        }
      );

      if (cancelled) subscription.remove();
    })();

    return () => {
      cancelled = true;
      if (subscription) subscription.remove();
    };
  }, [active]);

  return { status, position };
}
