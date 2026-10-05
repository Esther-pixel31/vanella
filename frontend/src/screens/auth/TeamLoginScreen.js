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
import { Ionicons } from '@expo/vector-icons';

import { ApiError, setTokens } from '../../api/client';
import { teamPasswordLogin, teamRequestOtp, teamVerifyOtp } from '../../api/team';
import AuthBrandPanel from '../../components/AuthBrandPanel';
import FormField from '../../components/FormField';
import PrimaryButton from '../../components/PrimaryButton';
import { goHomeFor } from '../../navigation/roles';
import { COLORS, FONTS } from '../../theme';

const USERNAME = 'username';
const PHONE = 'phone';

const NETWORK_ERROR =
  'Could not reach the server. Check your connection and try again.';

// One sign-in for admins, staff and drivers. Phone + code is the default;
// username + password suits a shared counter phone.
export default function TeamLoginScreen({ navigation }) {
  // Phone + code first, like every other login in the app.
  const [method, setMethod] = useState(PHONE);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [phone, setPhone] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const switchMethod = (next) => {
    setMethod(next);
    setError('');
    setNotice('');
  };

  const finishLogin = async (result) => {
    await setTokens({
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      role: result.role,
    });

    goHomeFor(navigation, result.role);
  };

  const run = async (action) => {
    setError('');
    setLoading(true);

    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = () =>
    run(async () => {
      await finishLogin(await teamPasswordLogin(username.trim(), password));
    });

  const handleSendCode = () =>
    run(async () => {
      await teamRequestOtp(`254${phone}`);
      setCodeSent(true);
      setCode('');
      setNotice('If this number has a team account, a code has been sent to it.');
    });

  const handleVerifyCode = () =>
    run(async () => {
      await finishLogin(await teamVerifyOtp(`254${phone}`, code));
    });

  const phoneReady = /^[17]\d{8}$/.test(phone);

  const passwordToggle = (
    <TouchableOpacity
      style={styles.eyeButton}
      onPress={() => setShowPassword((value) => !value)}
      accessibilityRole="button"
      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
    >
      <Ionicons
        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
        size={20}
        color={COLORS.muted}
      />
    </TouchableOpacity>
  );

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
          <AuthBrandPanel height={190} onBack={() => navigation.goBack()} />

          <View style={styles.content}>
            <View style={styles.badge}>
              <Ionicons name="storefront" size={14} color={COLORS.royal} />
              <Text style={styles.badgeText}>STAFF · DRIVERS · ADMIN</Text>
            </View>

            <Text style={styles.title}>Team sign in</Text>

            <Text style={styles.subtitle}>
              Sign in with your phone number and the code we send you. A shared
              counter phone can use a username instead.
            </Text>

            {/* METHOD SWITCH */}

            <View style={styles.segment} accessibilityRole="tablist">
              {[
                [PHONE, 'Phone number'],
                [USERNAME, 'Username'],
              ].map(([id, label]) => {
                const selected = method === id;

                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.segmentButton, selected && styles.segmentButtonOn]}
                    onPress={() => switchMethod(id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextOn]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {method === USERNAME ? (
              <>
                <FormField
                  label="Username"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="e.g. bamburi.counter"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.field}
                />

                <FormField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  trailing={passwordToggle}
                  style={styles.field}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <PrimaryButton
                  title="Sign in"
                  onPress={handlePasswordLogin}
                  disabled={!username.trim() || !password}
                  loading={loading}
                  style={styles.button}
                />

                <Text style={styles.hint}>
                  Forgot your password? Ask your admin to reset it.
                </Text>
              </>
            ) : (
              <>
                <FormField
                  label="Phone number"
                  prefix="+254"
                  value={phone}
                  onChangeText={(value) => {
                    setPhone(value.replace(/\D/g, ''));
                    setCodeSent(false);
                  }}
                  placeholder="7XX XXX XXX"
                  keyboardType="phone-pad"
                  maxLength={9}
                  style={styles.field}
                />

                {codeSent ? (
                  <FormField
                    label="6-digit code"
                    value={code}
                    onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    keyboardType="number-pad"
                    maxLength={6}
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                    style={styles.field}
                  />
                ) : null}

                {notice && !error ? <Text style={styles.noticeText}>{notice}</Text> : null}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {codeSent ? (
                  <>
                    <PrimaryButton
                      title="Sign in"
                      onPress={handleVerifyCode}
                      disabled={code.length !== 6}
                      loading={loading}
                      style={styles.button}
                    />

                    <TouchableOpacity
                      style={styles.linkButton}
                      onPress={handleSendCode}
                      disabled={loading}
                      accessibilityRole="button"
                    >
                      <Text style={styles.linkText}>Send a new code</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <PrimaryButton
                    title="Send code"
                    onPress={handleSendCode}
                    disabled={!phoneReady}
                    loading={loading}
                    style={styles.button}
                  />
                )}
              </>
            )}
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
    paddingTop: 22,
  },
  badge: {
    alignSelf: 'flex-start',
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: COLORS.tint,
  },
  badgeText: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  title: {
    marginTop: 10,
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 27,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 6,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 21,
  },
  segment: {
    flexDirection: 'row',
    marginTop: 18,
    padding: 4,
    borderRadius: 14,
    backgroundColor: COLORS.track,
  },
  segmentButton: {
    flex: 1,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonOn: {
    backgroundColor: COLORS.surface,
  },
  segmentText: {
    color: COLORS.muted,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  segmentTextOn: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
  },
  field: {
    marginTop: 14,
  },
  eyeButton: {
    width: 40,
    height: 40,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: 20,
  },
  hint: {
    marginTop: 16,
    textAlign: 'center',
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
  noticeText: {
    marginTop: 12,
    color: COLORS.royal,
    fontFamily: FONTS.semibold,
    fontSize: 13,
    lineHeight: 19,
  },
  errorText: {
    marginTop: 12,
    color: COLORS.red,
    fontFamily: FONTS.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  linkButton: {
    height: 44,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 14,
  },
});
