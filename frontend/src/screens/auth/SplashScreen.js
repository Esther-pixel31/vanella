import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { getRefreshToken, getRole } from '../../api/client';
import BottleGlow from '../../components/BottleGlow';
import { homeRouteFor } from '../../navigation/roles';
import { COLORS, FONTS } from '../../theme';

// How long the splash shows before moving on.
const SPLASH_MS = 2800;

function LoadingDots() {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.35))).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.stagger(
        180,
        dots.map((dot) =>
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0.35, duration: 320, useNativeDriver: true }),
          ])
        )
      )
    );

    pulse.start();

    return () => pulse.stop();
  }, [dots]);

  return (
    <View style={styles.dots}>
      {dots.map((opacity, index) => (
        <Animated.View key={index} style={[styles.dot, { opacity }]} />
      ))}
    </View>
  );
}

export default function SplashScreen({ navigation }) {
  const appear = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    floating.start();

    const timer = setTimeout(async () => {
      // A saved refresh token means someone has logged in on this phone
      // before; their role decides which home opens. If the login has
      // expired, that screen sends them back to Welcome.
      let route = 'Welcome';

      try {
        if (await getRefreshToken()) {
          route = homeRouteFor(await getRole());
        }
      } catch (err) {
        // Treat an unreadable token store as signed out.
      }

      navigation.replace(route);
    }, SPLASH_MS);

    return () => {
      clearTimeout(timer);
      floating.stop();
    };
  }, [appear, float, navigation]);

  const bottleStyle = {
    opacity: appear,
    transform: [
      { scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
      { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
    ],
  };

  const textStyle = {
    opacity: appear,
    transform: [
      { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
    ],
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <View style={styles.center}>
        <Animated.View style={bottleStyle}>
          <BottleGlow width={250} height={340} />
        </Animated.View>

        <Animated.View style={[styles.brand, textStyle]}>
          <Text style={styles.wordmark}>Vanella</Text>
          <Text style={styles.tagline}>WATER, HEALTHY LIVING</Text>
        </Animated.View>

        <LoadingDots />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.night,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    marginTop: -10,
    alignItems: 'center',
  },
  wordmark: {
    color: COLORS.surface,
    fontFamily: FONTS.script,
    fontSize: 56,
    lineHeight: 76,
  },
  tagline: {
    color: COLORS.sky,
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 2.4,
  },
  dots: {
    marginTop: 48,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surface,
  },
});
