import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { createAddress } from '../../api/addresses';
import { requestOtp, verifyOtp } from '../../api/auth';
import { ApiError, setTokens } from '../../api/client';
import AuthBrandPanel from '../../components/AuthBrandPanel';
import PrimaryButton from '../../components/PrimaryButton';
import { COLORS, FONTS } from '../../theme';

const CODE_LENGTH = 6;
const RESEND_WAIT_SECONDS = 30;

const NETWORK_ERROR =
  'Could not reach the server. Check your connection and try again.';

const NO_ACCOUNT_ERROR =
  'There is no account with this number. Go back and choose Create Account.';

// 254700000003 -> +254 700 000 003
function formatPhone(phone = '') {
  return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
}

export default function OtpScreen({ navigation, route }) {
  // mode is 'signup' (all fields) or 'login' (phone only).
  // deliveryCoords is set when the delivery location came from GPS.
  const {
    mode,
    phone,
    fullName,
    physicalAddress,
    deliveryLocation,
    deliveryCoords,
  } = route.params || {};

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_WAIT_SECONDS);

  // Once the code is accepted it cannot be reused, so a retry after that
  // point must only repeat the address step.
  const [addressPending, setAddressPending] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const codeComplete = code.length === CODE_LENGTH;
  const canSubmit = (codeComplete || addressPending) && !loading;

  const goToHome = () => {
    // reset, not navigate: back must not return to the auth screens.
    navigation.reset({
      index: 0,
      routes: [{ name: 'CustomerHome' }],
    });
  };

  const saveDeliveryLocation = async () => {
    try {
      await createAddress({
        label: 'Home',
        addressLine: deliveryLocation,
        latitude: deliveryCoords?.latitude ?? null,
        longitude: deliveryCoords?.longitude ?? null,
        isDefault: true,
      });

      goToHome();
    } catch (err) {
      setAddressPending(true);
      setError(
        'Your account is ready, but we could not save your delivery location. Tap Try Again.'
      );
    }
  };

  const handleVerify = async () => {
    if (!canSubmit) return;

    setError('');
    setNotice('');
    setLoading(true);

    try {
      if (addressPending) {
        await saveDeliveryLocation();
        return;
      }

      const result = await verifyOtp({
        phoneNumber: phone,
        code,
        fullName,
        physicalAddress,
      });

      await setTokens({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        role: 'customer',
      });

      if (result.is_new_customer && deliveryLocation) {
        await saveDeliveryLocation();
      } else {
        goToHome();
      }
    } catch (err) {
      // Logging in with a number that has no account: the backend asks for
      // a name, because it treats an unknown number as a new registration.
      const unknownNumber =
        mode === 'login' &&
        err instanceof ApiError &&
        err.message.includes('full_name');

      if (unknownNumber) {
        setError(NO_ACCOUNT_ERROR);
      } else {
        setError(err instanceof ApiError ? err.message : NETWORK_ERROR);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || resending || loading) return;

    setError('');
    setNotice('');
    setResending(true);

    try {
      await requestOtp(phone);

      setCode('');
      setNotice('A new code has been sent.');
      setSecondsLeft(RESEND_WAIT_SECONDS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : NETWORK_ERROR);
    } finally {
      setResending(false);
    }
  };

  const handleChangeCode = (value) => {
    setCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH));

    if (error) setError('');
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
          <AuthBrandPanel
            height={170}
            onBack={addressPending ? undefined : () => navigation.goBack()}
          />

          <View style={styles.content}>
            <Text style={styles.title}>Verify your number</Text>

            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.subtitlePhone}>{formatPhone(phone)}</Text>
            </Text>

            {/* CODE BOXES */}

            <Pressable
              style={styles.codeRow}
              onPress={() => inputRef.current?.focus()}
              accessibilityLabel="Verification code"
            >
              {Array.from({ length: CODE_LENGTH }).map((_, index) => {
                const digit = code[index];
                const isActive =
                  index === Math.min(code.length, CODE_LENGTH - 1);

                return (
                  <View
                    key={index}
                    style={[
                      styles.codeBox,
                      isActive && !addressPending && styles.codeBoxActive,
                      digit && styles.codeBoxFilled,
                      error && !addressPending && styles.codeBoxError,
                    ]}
                  >
                    <Text style={styles.codeDigit}>{digit || ''}</Text>
                  </View>
                );
              })}

              {/* One real input sits invisibly over the boxes. */}
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={handleChangeCode}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                autoFocus
                editable={!loading && !addressPending}
                caretHidden
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                style={styles.hiddenInput}
              />
            </Pressable>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

            <PrimaryButton
              title={addressPending ? 'Try Again' : 'Verify'}
              onPress={handleVerify}
              disabled={!canSubmit && !loading}
              loading={loading}
            />

            {!addressPending && (
              <View style={styles.resendRow}>
                <Text style={styles.resendQuestion}>Didn't get the code? </Text>

                {secondsLeft > 0 ? (
                  <Text style={styles.resendWait}>Resend in {secondsLeft}s</Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resending}
                    accessibilityRole="button"
                  >
                    <Text style={styles.resendLink}>
                      {resending ? 'Sending…' : 'Resend'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
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
    paddingTop: 24,
  },
  title: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 26,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 24,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  subtitlePhone: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  codeBox: {
    width: '14.5%',
    height: 58,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBoxActive: {
    borderColor: COLORS.royal,
  },
  codeBoxFilled: {
    backgroundColor: COLORS.tint,
  },
  codeBoxError: {
    borderColor: COLORS.red,
  },
  codeDigit: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 24,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  errorText: {
    marginTop: -6,
    marginBottom: 14,
    color: COLORS.red,
    fontFamily: FONTS.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  noticeText: {
    marginTop: -6,
    marginBottom: 14,
    color: COLORS.royal,
    fontFamily: FONTS.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  resendRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendQuestion: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  resendWait: {
    color: COLORS.muted,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  resendLink: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 14,
  },
});
