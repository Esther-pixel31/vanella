import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

import { COLORS, FONTS } from '../theme';

// Roughly central Mombasa, used before any position is known.
const MOMBASA = { latitude: -4.03, longitude: 39.68 };

const hasPoint = (point) =>
  point != null &&
  typeof point.latitude === 'number' &&
  typeof point.longitude === 'number';

// A map following the driver towards the customer's address.
// `driver` and `destination` are { latitude, longitude } or null.
export default function LiveMap({ driver, destination, height = 260 }) {
  const mapRef = useRef(null);
  const fitted = useRef(false);

  const points = [driver, destination].filter(hasPoint);
  const start = points[0] || MOMBASA;

  // Frame both pins once; after that the customer can move the map freely.
  useEffect(() => {
    if (fitted.current || !mapRef.current || points.length < 2) return;

    fitted.current = true;
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
      animated: true,
    });
  });

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: start.latitude,
          longitude: start.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        toolbarEnabled={false}
        accessibilityLabel="Map showing your driver on the way"
      >
        {hasPoint(destination) ? (
          <Marker coordinate={destination} anchor={{ x: 0.5, y: 0.5 }} title="Your address">
            <View style={[styles.pin, styles.homePin]}>
              <Ionicons name="home" size={17} color={COLORS.surface} />
            </View>
          </Marker>
        ) : null}

        {hasPoint(driver) ? (
          <Marker coordinate={driver} anchor={{ x: 0.5, y: 0.5 }} title="Your driver">
            <View style={styles.driverHalo}>
              <View style={[styles.pin, styles.driverPin]}>
                <Ionicons name="car" size={19} color={COLORS.surface} />
              </View>
            </View>
          </Marker>
        ) : null}
      </MapView>

      <View style={styles.badge}>
        <View style={[styles.liveDot, !hasPoint(driver) && styles.waitingDot]} />
        <Text style={styles.badgeText}>
          {hasPoint(driver) ? 'Live' : "Waiting for the driver's location"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#EEF1EC',
  },
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  homePin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.ink,
  },
  driverHalo: {
    padding: 7,
    borderRadius: 30,
    backgroundColor: 'rgba(31, 69, 198, 0.18)',
  },
  driverPin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.royal,
  },
  badge: {
    position: 'absolute',
    top: 14,
    left: 14,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.ok,
  },
  waitingDot: {
    backgroundColor: '#A9B8CE',
  },
  badgeText: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 12,
  },
});
