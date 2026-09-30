import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

import { createAddress } from '../../api/addresses';
import { requestOtp, verifyOtp } from '../../api/auth';
import { ApiError, setTokens } from '../../api/client';

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
  const { mode, phone, fullName, physicalAddress, deliveryLocation } =
    route.params || {};

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* =========================
              TOP WATER
          ========================== */}

          <View style={styles.topSection}>
            <Image
              source={require('../../../assets/images/signup-water-top.png')}
              style={styles.topWaterImage}
              resizeMode="stretch"
            />

            {!addressPending && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.75}
              >
                <Text style={styles.backArrow}>‹</Text>
              </TouchableOpacity>
            )}
          </View>


          {/* =========================
              CONTENT
          ========================== */}

          <View style={styles.content}>

            <Text style={styles.title}>
              Verify your number
            </Text>

            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.subtitlePhone}>
                {formatPhone(phone)}
              </Text>
            </Text>


            {/* CODE BOXES */}

            <Pressable
              style={styles.codeRow}
              onPress={() => inputRef.current?.focus()}
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
                    <Text style={styles.codeDigit}>
                      {digit || ''}
                    </Text>
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


            {/* MESSAGES */}

            {error ? (
              <Text style={styles.errorText}>
                {error}
              </Text>
            ) : null}

            {notice ? (
              <Text style={styles.noticeText}>
                {notice}
              </Text>
            ) : null}


            {/* VERIFY */}

            <TouchableOpacity
              style={[
                styles.verifyButton,
                !canSubmit && styles.verifyDisabled,
              ]}
              disabled={!canSubmit}
              activeOpacity={0.85}
              onPress={handleVerify}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyText}>
                  {addressPending ? 'Try Again' : 'Verify'}
                </Text>
              )}
            </TouchableOpacity>


            {/* RESEND */}

            {!addressPending && (
              <View style={styles.resendRow}>
                <Text style={styles.resendQuestion}>
                  Didn't get the code?
                </Text>

                {secondsLeft > 0 ? (
                  <Text style={styles.resendWait}>
                    {' '}Resend in {secondsLeft}s
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resending}
                  >
                    <Text style={styles.resendLink}>
                      {' '}{resending ? 'Sending…' : 'Resend'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

          </View>


          {/* =========================
              BOTTOM WATER
          ========================== */}

          <View style={styles.bottomSection}>
            <Image
              source={require('../../../assets/images/signup-water-bottom.png')}
              style={styles.bottomWaterImage}
              resizeMode="stretch"
            />
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
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },


  /* =========================
     TOP WATER
  ========================== */

  topSection: {
    height: 150,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },

  topWaterImage: {
    position: 'absolute',
    width: '100%',
    height: 135,
    left: 0,
    bottom: 0,
  },


  /* =========================
     BACK BUTTON
  ========================== */

  backButton: {
    position: 'absolute',

    top: 14,
    left: 22,

    zIndex: 10,

    width: 48,
    height: 48,

    borderRadius: 24,

    backgroundColor: 'rgba(235,247,255,0.92)',

    justifyContent: 'center',
    alignItems: 'center',
  },

  backArrow: {
    color: '#062B68',

    fontSize: 38,
    lineHeight: 40,

    marginTop: -5,
  },


  /* =========================
     CONTENT
  ========================== */

  content: {
    flex: 1,

    paddingHorizontal: 28,
    paddingTop: 28,
  },

  title: {
    color: '#061F5C',

    fontSize: 32,
    lineHeight: 39,

    fontWeight: '800',

    letterSpacing: -0.8,
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 30,

    color: '#7B91AE',

    fontSize: 16,
    lineHeight: 24,
  },

  subtitlePhone: {
    color: '#061F5C',

    fontWeight: '800',
  },


  /* =========================
     CODE BOXES
  ========================== */

  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',

    marginBottom: 20,
  },

  codeBox: {
    width: '14.5%',
    height: 60,

    borderWidth: 1.4,
    borderColor: '#D5E4F1',

    borderRadius: 16,

    backgroundColor: '#FCFEFF',

    justifyContent: 'center',
    alignItems: 'center',
  },

  codeBoxActive: {
    borderColor: '#087FD1',
  },

  codeBoxFilled: {
    backgroundColor: '#EBF7FF',
  },

  codeBoxError: {
    borderColor: '#C62828',
  },

  codeDigit: {
    color: '#061F5C',

    fontSize: 24,
    fontWeight: '800',
  },

  hiddenInput: {
    position: 'absolute',

    top: 0,
    left: 0,

    width: '100%',
    height: '100%',

    opacity: 0,
  },


  /* =========================
     MESSAGES
  ========================== */

  errorText: {
    marginBottom: 10,

    color: '#C62828',

    fontSize: 14,
    lineHeight: 20,
  },

  noticeText: {
    marginBottom: 10,

    color: '#0075CA',

    fontSize: 14,
    lineHeight: 20,
  },


  /* =========================
     BUTTON
  ========================== */

  verifyButton: {
    height: 60,

    marginTop: 7,

    borderRadius: 18,

    backgroundColor: '#087FD1',

    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#0077CA',

    shadowOpacity: 0.24,

    shadowRadius: 12,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    elevation: 5,
  },

  verifyDisabled: {
    backgroundColor: '#86BFE3',

    shadowOpacity: 0,

    elevation: 0,
  },

  verifyText: {
    color: '#FFFFFF',

    fontSize: 18,
    fontWeight: '800',
  },


  /* =========================
     RESEND
  ========================== */

  resendRow: {
    marginTop: 21,

    flexDirection: 'row',

    justifyContent: 'center',
    alignItems: 'center',
  },

  resendQuestion: {
    color: '#617A97',

    fontSize: 14,
  },

  resendWait: {
    color: '#8DA5C2',

    fontSize: 14,
    fontWeight: '800',
  },

  resendLink: {
    color: '#0075CA',

    fontSize: 14,
    fontWeight: '800',
  },


  /* =========================
     BOTTOM WATER
  ========================== */

  bottomSection: {
    height: 145,
    marginTop: 5,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },

  bottomWaterImage: {
    position: 'absolute',
    width: '100%',
    height: 135,
    left: 0,
    bottom: 0,
  },

});
