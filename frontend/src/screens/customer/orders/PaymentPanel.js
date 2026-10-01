import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ApiError } from '../../../api/client';
import {
  getPaymentStatus,
  startMpesaPayment,
  switchToCash,
} from '../../../api/payments';
import FormField from '../../../components/FormField';
import PrimaryButton from '../../../components/PrimaryButton';
import { Card, MpesaMark } from '../../../components/ui';
import { COLORS, FONTS } from '../../../theme';
import { formatKes } from '../../../utils/format';


const NETWORK_ERROR =
  'Could not reach the server. Check your connection and try again.';

// How often the payment result is checked while waiting for the PIN.
const POLL_MS = 5000;

const IDLE = 'idle';
const SENDING = 'sending';
const WAITING = 'waiting';

// Safaricom numbers: 9 digits starting with 7 or 1, after +254.
const isValidLocalPhone = (value) => /^[17]\d{8}$/.test(value);


// Shown on the tracking page while an M-Pesa order is still unpaid.
// `autoStartPhone` (2547XXXXXXXX) sends the PIN prompt as soon as the
// panel opens, which is what happens straight after checkout.
export default function PaymentPanel({
  order,
  autoStartPhone,
  onOrderUpdated,
  onAuthExpired,
}) {
  const [phase, setPhase] = useState(autoStartPhone ? SENDING : IDLE);
  const [payment, setPayment] = useState(null);
  const [localPhone, setLocalPhone] = useState(
    autoStartPhone ? autoStartPhone.slice(3) : ''
  );
  const [error, setError] = useState('');
  const [switching, setSwitching] = useState(false);

  const started = useRef(false);


  const showError = useCallback(
    (err) => {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired();
        return;
      }

      setError(err instanceof ApiError ? err.message : NETWORK_ERROR);
    },
    [onAuthExpired]
  );


  // Applies a payment result from the backend to the panel.
  const applyPayment = useCallback(
    (result) => {
      setPayment(result);
      setLocalPhone(result.phone_number.slice(3));

      if (result.status === 'pending') {
        setPhase(WAITING);
        return;
      }

      setPhase(IDLE);

      if (result.status === 'success') {
        onOrderUpdated();
      } else {
        setError(result.message);
      }
    },
    [onOrderUpdated]
  );


  const sendPrompt = useCallback(
    async (phoneNumber) => {
      setError('');
      setPhase(SENDING);

      try {
        applyPayment(await startMpesaPayment(order.id, phoneNumber));
      } catch (err) {
        setPhase(IDLE);
        showError(err);
      }
    },
    [applyPayment, order.id, showError]
  );


  // On opening: send the prompt (after checkout), or pick up an attempt
  // that is already in progress (coming back to the order later).
  useEffect(() => {
    if (started.current) return;

    started.current = true;

    if (autoStartPhone) {
      sendPrompt(autoStartPhone);
      return;
    }

    getPaymentStatus(order.id)
      .then(applyPayment)
      .catch((err) => {
        // 404 just means no attempt has been made yet.
        if (!(err instanceof ApiError && err.status === 404)) {
          showError(err);
        }
      });
  }, [applyPayment, autoStartPhone, order.id, sendPrompt, showError]);


  // While waiting for the PIN, keep checking for the result. A failed
  // check is ignored: the next tick simply tries again.
  useEffect(() => {
    if (phase !== WAITING) return undefined;

    const timer = setInterval(async () => {
      try {
        applyPayment(await getPaymentStatus(order.id));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          onAuthExpired();
        }
      }
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [applyPayment, onAuthExpired, order.id, phase]);


  const handleSwitchToCash = async () => {
    setError('');
    setSwitching(true);

    try {
      await switchToCash(order.id);
      onOrderUpdated();
    } catch (err) {
      showError(err);
      setSwitching(false);
    }
  };


  const busy = phase !== IDLE || switching;

  // In test mode the backend requests a token amount, not the real total.
  const testAmount =
    payment && Number(payment.amount) !== Number(order.total)
      ? payment.amount
      : null;


  return (
    <Card style={styles.card}>

      {phase === IDLE ? (
        <View>
          <View style={styles.titleRow}>
            <MpesaMark width={52} height={34} />

            <View style={styles.titleText}>
              <Text style={styles.title}>Pay {formatKes(order.total)}</Text>
              <Text style={styles.text}>
                Enter your M-Pesa PIN on your phone when asked.
              </Text>
            </View>
          </View>

          <FormField
            label="M-Pesa number"
            prefix="+254"
            value={localPhone}
            onChangeText={(value) => setLocalPhone(value.replace(/\D/g, ''))}
            placeholder="7XX XXX XXX"
            keyboardType="phone-pad"
            maxLength={9}
            editable={!busy}
          />
        </View>
      ) : (
        <View style={styles.waiting}>
          <View style={styles.waitingMark}>
            <MpesaMark width={64} height={42} />
          </View>

          <ActivityIndicator size="small" color={COLORS.royal} />

          <Text style={styles.waitingTitle}>
            {phase === SENDING ? 'Sending M-Pesa request…' : 'Check your phone'}
          </Text>

          {phase === WAITING ? (
            <Text style={styles.waitingText}>
              Enter your M-Pesa PIN on +254 {localPhone} to pay. This page
              updates once the payment goes through.
            </Text>
          ) : null}

          {phase === WAITING && testAmount ? (
            <Text style={styles.testNote}>
              Test mode: {formatKes(testAmount)} is requested instead of{' '}
              {formatKes(order.total)}.
            </Text>
          ) : null}
        </View>
      )}

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={19} color={COLORS.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {phase === IDLE ? (
        <PrimaryButton
          title={payment ? 'Try M-Pesa again' : 'Pay with M-Pesa'}
          onPress={() => sendPrompt(`254${localPhone}`)}
          disabled={!isValidLocalPhone(localPhone) || busy}
          style={styles.payButton}
        />
      ) : null}

      {phase !== SENDING ? (
        <TouchableOpacity
          style={styles.cashButton}
          activeOpacity={0.7}
          disabled={switching}
          onPress={handleSwitchToCash}
          accessibilityRole="button"
        >
          {switching ? (
            <ActivityIndicator color={COLORS.royal} />
          ) : (
            <Text style={styles.cashButtonText}>Pay cash on delivery instead</Text>
          )}
        </TouchableOpacity>
      ) : null}

    </Card>
  );
}


const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  titleText: {
    flex: 1,
  },
  title: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 18,
  },
  text: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 19,
  },
  waiting: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  waitingMark: {
    marginBottom: 14,
  },
  waitingTitle: {
    marginTop: 10,
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 18,
  },
  waitingText: {
    marginTop: 5,
    textAlign: 'center',
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  testNote: {
    marginTop: 8,
    textAlign: 'center',
    color: COLORS.amber,
    fontFamily: FONTS.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    color: COLORS.red,
    fontFamily: FONTS.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  payButton: {
    marginTop: 14,
  },
  cashButton: {
    height: 46,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashButtonText: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 15,
  },
});
