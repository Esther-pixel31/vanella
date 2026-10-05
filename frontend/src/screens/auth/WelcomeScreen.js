import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import BottleGlow from '../../components/BottleGlow';
import PrimaryButton from '../../components/PrimaryButton';
import { COLORS, FONTS } from '../../theme';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.hero}>
          <BottleGlow width={220} height={300} />

          <Text style={styles.wordmark}>Vanella</Text>
          <Text style={styles.tagline}>WATER, HEALTHY LIVING</Text>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.headline}>Clean water.{'\n'}Healthy living.</Text>

          <Text style={styles.description}>
            Fresh, clean water delivered when you need it, with rewards on every
            order.
          </Text>

          <PrimaryButton
            title="Create account"
            onPress={() => navigation.navigate('Signup')}
            style={styles.createButton}
          />

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.loginText}>Log in</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.staffLink}
            onPress={() => navigation.navigate('TeamLogin')}
            accessibilityRole="button"
          >
            <Text style={styles.staffLinkText}>Vanella staff or driver? Sign in here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.night,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 24,
  },
  wordmark: {
    marginTop: -14,
    color: COLORS.surface,
    fontFamily: FONTS.script,
    fontSize: 44,
    lineHeight: 62,
  },
  tagline: {
    color: COLORS.sky,
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 2.4,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  headline: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -0.6,
  },
  description: {
    marginTop: 10,
    color: '#B9CCE8',
    fontFamily: FONTS.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  createButton: {
    marginTop: 26,
  },
  loginButton: {
    height: 56,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 16,
  },
  staffLink: {
    height: 44,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffLinkText: {
    color: COLORS.sky,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
});
