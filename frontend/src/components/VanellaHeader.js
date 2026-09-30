import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

// The curved navy "Vanella" header used on the order screens.
// `pageBackground` must match the screen behind it so the curve blends in.
export default function VanellaHeader({ onBack, pageBackground = '#F5F8FC' }) {
  return (
    <View style={styles.header}>

      <View style={styles.headerContent}>

        {onBack ? (
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={27} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}

        <View style={styles.brandContainer}>
          <Text style={styles.brandText}>
            Vanella
          </Text>

          <View style={styles.brandUnderline}>
            <View style={styles.brandUnderlineInner} />
          </View>
        </View>

        {/* Empty spacer keeps Vanella perfectly centered */}
        <View style={styles.headerSpacer} />

      </View>

      <View style={styles.blueWave} />
      <View style={styles.lightBlueWave} />
      <View style={[styles.whiteWave, { backgroundColor: pageBackground }]} />

    </View>
  );
}


const styles = StyleSheet.create({

  header: {
    height: 145,

    backgroundColor: '#052B6B',

    position: 'relative',

    overflow: 'hidden',
  },

  headerContent: {
    height: 88,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: 20,

    zIndex: 20,
  },

  backButton: {
    width: 48,
    height: 48,

    borderRadius: 24,

    backgroundColor: 'rgba(255,255,255,0.11)',

    alignItems: 'center',
    justifyContent: 'center',
  },

  headerSpacer: {
    width: 48,
    height: 48,
  },

  brandContainer: {
    alignItems: 'center',
    justifyContent: 'center',

    marginTop: -3,
  },

  brandText: {
    color: '#FFFFFF',

    fontSize: 34,
    lineHeight: 39,

    fontWeight: '900',
    fontStyle: 'italic',

    letterSpacing: -1.2,
  },

  brandUnderline: {
    width: 118,
    height: 13,

    marginTop: -6,

    overflow: 'hidden',
  },

  brandUnderlineInner: {
    width: 120,
    height: 18,

    borderBottomWidth: 4,
    borderBottomColor: '#FFFFFF',

    borderRadius: 60,

    transform: [
      {
        rotate: '-3deg',
      },
    ],
  },

  blueWave: {
    position: 'absolute',

    width: '120%',
    height: 85,

    left: '-10%',
    bottom: -43,

    borderRadius: 100,

    backgroundColor: '#168CF7',

    transform: [
      {
        rotate: '2deg',
      },
    ],
  },

  lightBlueWave: {
    position: 'absolute',

    width: '120%',
    height: 70,

    left: '-10%',
    bottom: -48,

    borderRadius: 100,

    backgroundColor: '#66BCFF',

    transform: [
      {
        rotate: '-2deg',
      },
    ],
  },

  whiteWave: {
    position: 'absolute',

    width: '125%',
    height: 67,

    left: '-12.5%',
    bottom: -57,

    borderRadius: 100,
  },

});
