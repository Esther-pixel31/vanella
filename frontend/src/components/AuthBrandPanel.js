import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONTS } from '../theme';

const BOTTLE = require('../../assets/images/product-20l.png');

const CLEAR = 'rgba(6, 18, 46, 0)';

// Dark header with the Vanella name and the glowing 20L bottle, used on
// the log in, sign up and code screens. It runs under the status bar.
export default function AuthBrandPanel({ height, onBack }) {
  const insets = useSafeAreaInsets();
  const fullHeight = height + insets.top;

  return (
    <View style={[styles.panel, { height: fullHeight }]}>
      <Image
        source={BOTTLE}
        style={[styles.bottle, { height: fullHeight + 20 }]}
        resizeMode="cover"
        accessible={false}
      />

      {/* Fade the photo's own dark background into the panel. */}
      <LinearGradient
        colors={[COLORS.night, CLEAR]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 0.5, y: 0.5 }}
        style={[styles.bottle, { height: fullHeight + 20 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[CLEAR, COLORS.night]}
        start={{ x: 0.5, y: 0.6 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {onBack ? (
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 12 }]}
          onPress={onBack}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.surface} />
        </TouchableOpacity>
      ) : null}

      <View>
        <Text style={styles.wordmark}>Vanella</Text>
        <Text style={styles.tagline}>WATER, HEALTHY LIVING</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: COLORS.night,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  bottle: {
    position: 'absolute',
    right: -30,
    top: -10,
    width: 190,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    color: COLORS.surface,
    fontFamily: FONTS.script,
    fontSize: 40,
    lineHeight: 56,
  },
  tagline: {
    color: COLORS.sky,
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 2.4,
  },
});
