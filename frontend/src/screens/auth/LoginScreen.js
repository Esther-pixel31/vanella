import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { requestOtp } from '../../api/auth';
import { ApiError } from '../../api/client';
import AuthBrandPanel from '../../components/AuthBrandPanel';
import FormField from '../../components/FormField';
import PrimaryButton from '../../components/PrimaryButton';
import { COLORS, FONTS } from '../../theme';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const phoneReady = phone.trim().length === 9;

  const handleContinue = async () => {
    if (!phoneReady || loading) return;

    // Backend expects the full number: country code, no + and no spaces.
    const formattedPhone = `254${phone.trim()}`;

    setError('');
    setLoading(true);

    try {
      await requestOtp(formattedPhone);

      navigation.navigate('OTP', {
        mode: 'login',
        phone: formattedPhone,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the server. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthBrandPanel height={280} />

          <View style={styles.content}>
            <Text style={styles.title}>Welcome back</Text>

            <Text style={styles.subtitle}>
              Log in with your phone number. We will send you a 6-digit code.
            </Text>

            <FormField
              label="Phone number"
              prefix="+254"
              value={phone}
              onChangeText={(value) => setPhone(value.replace(/\D/g, ''))}
              placeholder="7XX XXX XXX"
              keyboardType="phone-pad"
              maxLength={9}
              style={styles.field}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <PrimaryButton
              title="Send code"
              onPress={handleContinue}
              disabled={!phoneReady}
              loading={loading}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>New to Vanella? </Text>

              <TouchableOpacity
                onPress={() => navigation.navigate('Signup')}
                activeOpacity={0.7}
                accessibilityRole="link"
              >
                <Text style={styles.footerLink}>Create an account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  title: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 28,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 6,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  field: {
    marginTop: 22,
    marginBottom: 20,
  },
  errorText: {
    marginTop: -8,
    marginBottom: 14,
    color: COLORS.red,
    fontFamily: FONTS.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  footerRow: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  footerLink: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 14,
  },
});
