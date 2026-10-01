import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { COLORS } from '../theme';

const BOTTLE = require('../../assets/images/product-20l.png');

const CLEAR = 'rgba(6, 18, 46, 0)';

// The glowing 20L bottle photo with its edges faded into the dark
// background, for the splash and welcome screens.
export default function BottleGlow({ width = 250, height = 340, style }) {
  const fadeX = width * 0.28;
  const fadeY = height * 0.22;

  return (
    <View style={[{ width, height }, style]}>
      <Image source={BOTTLE} style={styles.image} resizeMode="cover" accessible={false} />

      <LinearGradient
        colors={[COLORS.night, CLEAR]}
        style={[styles.edge, { left: 0, top: 0, bottom: 0, width: fadeX }]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[CLEAR, COLORS.night]}
        style={[styles.edge, { right: 0, top: 0, bottom: 0, width: fadeX }]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[COLORS.night, CLEAR]}
        style={[styles.edge, { left: 0, right: 0, top: 0, height: fadeY }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[CLEAR, COLORS.night]}
        style={[styles.edge, { left: 0, right: 0, bottom: 0, height: fadeY }]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  edge: {
    position: 'absolute',
  },
});
