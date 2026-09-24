import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const BLUE = '#008FD5';
const DEEP_BLUE = '#006BB6';
const CYAN = '#42C8F5';
const LIGHT_BLUE = '#BDEEFF';

/*
 * Creates bubbles throughout the screen.
 * These are deterministic so they don't jump into new
 * positions every time React re-renders.
 */
function createFloatingBubbles() {
  const sizes = [6, 8, 10, 13, 16, 20, 25, 31, 38, 48, 58];

  return Array.from({ length: 55 }, (_, index) => {
    const size = sizes[index % sizes.length];

    return {
      id: index,
      size,

      left:
        ((index * 79 + index * index * 13) %
          Math.max(1, Math.floor(width - size))),

      startY:
        height +
        ((index * 61) % Math.floor(height * 0.8)),

      duration:
        3800 +
        (index % 8) * 450,

      delay:
        (index * 120) % 2200,

      drift:
        index % 2 === 0
          ? 12 + (index % 5) * 5
          : -(12 + (index % 5) * 5),

      opacity:
        size > 40
          ? 0.48
          : 0.55 + (index % 3) * 0.1,
    };
  });
}

/*
 * Creates dense soap-like foam at the bottom.
 */
function createFoamBubbles() {
  const sizes = [
    16, 24, 12, 35, 19, 45, 14, 28, 55, 20,
    38, 15, 26, 48, 18, 32, 13, 42, 23, 60,
    17, 30, 50, 21, 36, 14, 27, 44, 19, 34,
  ];

  return sizes.map((size, index) => ({
    id: index,
    size,

    left:
      ((index * 47 + index * index * 7) %
        Math.max(1, Math.floor(width - size))),

    bottom:
      -5 +
      ((index * 23) % 100),
  }));
}

function FloatingBubble({
  size,
  left,
  startY,
  duration,
  delay,
  drift,
  opacity: maxOpacity,
}) {
  const translateY = useRef(
    new Animated.Value(startY)
  ).current;

  const translateX = useRef(
    new Animated.Value(0)
  ).current;

  const opacity = useRef(
    new Animated.Value(0)
  ).current;

  const scale = useRef(
    new Animated.Value(0.7)
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),

        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -size - 120,
            duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),

          Animated.sequence([
            Animated.timing(translateX, {
              toValue: drift,
              duration: duration / 3,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(translateX, {
              toValue: -drift,
              duration: duration / 3,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(translateX, {
              toValue: 0,
              duration: duration / 3,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),

          Animated.sequence([
            Animated.timing(opacity, {
              toValue: maxOpacity,
              duration: 500,
              useNativeDriver: true,
            }),

            Animated.delay(
              Math.max(0, duration - 1100)
            ),

            Animated.timing(opacity, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),

          Animated.sequence([
            Animated.spring(scale, {
              toValue: 1,
              friction: 5,
              useNativeDriver: true,
            }),

            Animated.delay(
              Math.max(0, duration - 700)
            ),
          ]),
        ]),

        Animated.parallel([
          Animated.timing(translateY, {
            toValue: startY,
            duration: 0,
            useNativeDriver: true,
          }),

          Animated.timing(translateX, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),

          Animated.timing(scale, {
            toValue: 0.7,
            duration: 0,
            useNativeDriver: true,
          }),

          Animated.timing(opacity, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [
    delay,
    drift,
    duration,
    maxOpacity,
    opacity,
    scale,
    startY,
    translateX,
    translateY,
  ]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left,
          opacity,

          transform: [
            { translateY },
            { translateX },
            { scale },
          ],
        },
      ]}
    >
      {/* bright reflection */}
      <View
        style={[
          styles.bubbleHighlight,
          {
            width: Math.max(3, size * 0.23),
            height: Math.max(3, size * 0.23),
            borderRadius: size,
          },
        ]}
      />

      {/* blue inner reflection */}
      <View
        style={[
          styles.bubbleBlueReflection,
          {
            width: size * 0.38,
            height: size * 0.38,
            borderRadius: size,
          },
        ]}
      />

      {/* lower glass reflection */}
      {size >= 20 && (
        <View
          style={[
            styles.bubbleGlassRing,
            {
              width: size * 0.72,
              height: size * 0.72,
              borderRadius: size,
            },
          ]}
        />
      )}
    </Animated.View>
  );
}

function FoamBubble({ size, left, bottom }) {
  const float = useRef(
    new Animated.Value(0)
  ).current;

  const scale = useRef(
    new Animated.Value(1)
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(float, {
            toValue: -7,
            duration: 1300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),

          Animated.timing(scale, {
            toValue: 1.08,
            duration: 1300,
            useNativeDriver: true,
          }),
        ]),

        Animated.parallel([
          Animated.timing(float, {
            toValue: 0,
            duration: 1300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),

          Animated.timing(scale, {
            toValue: 1,
            duration: 1300,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [float, scale]);

  return (
    <Animated.View
      style={[
        styles.foamBubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left,
          bottom,

          transform: [
            { translateY: float },
            { scale },
          ],
        },
      ]}
    >
      <View style={styles.foamHighlight} />
    </Animated.View>
  );
}

export default function SplashScreen({ navigation }) {
  const floatingBubbles = useMemo(
    () => createFloatingBubbles(),
    []
  );

  const foamBubbles = useMemo(
    () => createFoamBubbles(),
    []
  );

  const logoScale = useRef(
    new Animated.Value(0)
  ).current;

  const logoOpacity = useRef(
    new Animated.Value(0)
  ).current;

  const logoY = useRef(
    new Animated.Value(55)
  ).current;

  const logoRotate = useRef(
    new Animated.Value(0)
  ).current;

  const haloScale = useRef(
    new Animated.Value(0.4)
  ).current;

  const haloOpacity = useRef(
    new Animated.Value(0)
  ).current;

  useEffect(() => {
    /*
     * Logo appears after bubbles have already started.
     */
    Animated.sequence([
      Animated.delay(650),

      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),

        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 55,
          useNativeDriver: true,
        }),

        Animated.spring(logoY, {
          toValue: 0,
          friction: 5,
          tension: 45,
          useNativeDriver: true,
        }),

        Animated.timing(haloOpacity, {
          toValue: 0.8,
          duration: 500,
          useNativeDriver: true,
        }),

        Animated.spring(haloScale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),

      /*
       * Small pop after the logo lands.
       */
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.08,
          duration: 160,
          useNativeDriver: true,
        }),

        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    /*
     * Very subtle floating movement
     * after logo appears.
     */
    const floatingLogo = Animated.loop(
      Animated.sequence([
        Animated.delay(1600),

        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),

        Animated.timing(logoRotate, {
          toValue: -1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),

        Animated.timing(logoRotate, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    floatingLogo.start();

    const timer = setTimeout(() => {
      navigation.replace('Welcome');
    }, 4700);

    return () => {
      clearTimeout(timer);
      floatingLogo.stop();
    };
  }, [
    haloOpacity,
    haloScale,
    logoOpacity,
    logoRotate,
    logoScale,
    logoY,
    navigation,
  ]);

  const rotation = logoRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-1deg', '0deg', '1deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.background}>

        {/* Background blue depth */}
        <View style={styles.blueGlowLeft} />
        <View style={styles.blueGlowRight} />
        <View style={styles.whiteLight} />

        {/* Background bubbles */}
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          {floatingBubbles
            .slice(0, 38)
            .map((bubble) => (
              <FloatingBubble
                key={bubble.id}
                {...bubble}
              />
            ))}
        </View>

        {/* Logo light halo */}
        <Animated.View
          style={[
            styles.logoHalo,
            {
              opacity: haloOpacity,
              transform: [
                { scale: haloScale },
              ],
            },
          ]}
        />

        {/* Actual Vanella logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,

              transform: [
                { translateY: logoY },
                { scale: logoScale },
                { rotate: rotation },
              ],
            },
          ]}
        >
          <Image
            source={require(
              '../../../assets/images/vanella-logo.jpg'
            )}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Foreground bubbles */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.foreground,
          ]}
        >
          {floatingBubbles
            .slice(38)
            .map((bubble) => (
              <FloatingBubble
                key={`front-${bubble.id}`}
                {...bubble}
              />
            ))}
        </View>

        {/* FOAM */}
        <View
          pointerEvents="none"
          style={styles.foamArea}
        >
          <View style={styles.foamGlow} />

          {foamBubbles.map((bubble) => (
            <FoamBubble
              key={`foam-${bubble.id}`}
              {...bubble}
            />
          ))}

          {/* second layer creates denser foam */}
          {foamBubbles
            .slice(0, 18)
            .map((bubble) => (
              <FoamBubble
                key={`foam-extra-${bubble.id}`}
                size={bubble.size * 0.72}
                left={
                  (bubble.left + 27) %
                  Math.max(1, width - bubble.size)
                }
                bottom={bubble.bottom + 50}
              />
            ))}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DDF6FF',
  },

  background: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DDF6FF',
  },

  blueGlowLeft: {
    position: 'absolute',
    width: 450,
    height: 450,
    borderRadius: 225,
    backgroundColor: '#53C8F3',
    left: -270,
    top: height * 0.12,
    opacity: 0.48,
  },

  blueGlowRight: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: '#008ED4',
    right: -340,
    bottom: height * 0.08,
    opacity: 0.32,
  },

  whiteLight: {
    position: 'absolute',
    width: 360,
    height: 500,
    borderRadius: 180,
    backgroundColor: '#FFFFFF',
    top: -230,
    right: -80,
    opacity: 0.55,
    transform: [{ rotate: '20deg' }],
  },

  logoHalo: {
    position: 'absolute',
    width: width * 0.74,
    height: width * 0.74,
    borderRadius: width,
    backgroundColor: '#FFFFFF',
    opacity: 0.65,
  },

  logoContainer: {
    width: width * 0.72,
    height: width * 0.72,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },

  logo: {
    width: '100%',
    height: '100%',
  },

  bubble: {
    position: 'absolute',
    top: 0,

    borderWidth: 1.5,
    borderColor: 'rgba(0, 109, 185, 0.7)',

    backgroundColor:
      'rgba(222, 248, 255, 0.20)',

    shadowColor: DEEP_BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },

  bubbleHighlight: {
    position: 'absolute',
    left: '17%',
    top: '13%',
    backgroundColor: '#FFFFFF',
    opacity: 0.95,
  },

  bubbleBlueReflection: {
    position: 'absolute',
    right: '5%',
    bottom: '7%',
    backgroundColor:
      'rgba(0, 143, 213, 0.16)',
  },

  bubbleGlassRing: {
    position: 'absolute',
    left: '13%',
    top: '14%',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.7)',
  },

  foreground: {
    zIndex: 30,
  },

  foamArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 190,
    zIndex: 40,
  },

  foamGlow: {
    position: 'absolute',
    width: '130%',
    height: 100,
    bottom: -25,
    left: '-15%',
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    opacity: 0.7,
  },

  foamBubble: {
    position: 'absolute',

    backgroundColor:
      'rgba(238, 251, 255, 0.88)',

    borderWidth: 1.5,

    borderColor:
      'rgba(30, 166, 224, 0.72)',

    shadowColor: BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  foamHighlight: {
    position: 'absolute',
    width: '27%',
    height: '27%',
    left: '18%',
    top: '13%',
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    opacity: 0.95,
  },
});