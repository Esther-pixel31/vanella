import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
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
import { formatKes } from '../../../utils/format';


const COLORS = {
  primary: '#087FF5',
  white: '#FFFFFF',
  text: '#082D6A',
  muted: '#63738B',
  error: '#C62828',
};

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
    <View style={styles.card}>

      {phase === IDLE ? (
        <View>
          <Text style={styles.title}>
            Pay {formatKes(order.total)} with M-Pesa
          </Text>

          <Text style={styles.text}>
            We will send a request to this number. Enter your M-Pesa PIN on
            your phone to pay.
          </Text>

          <View style={styles.phoneContainer}>
            <Text style={styles.prefix}>
              +254
            </Text>

            <View style={styles.divider} />

            <TextInput
              style={styles.phoneInput}
              value={localPhone}
              onChangeText={(value) =>
                setLocalPhone(value.replace(/\D/g, ''))
              }
              placeholder="7XX XXX XXX"
              placeholderTextColor="#8DA5C2"
              keyboardType="phone-pad"
              maxLength={9}
              editable={!busy}
            />
          </View>
        </View>
      ) : (
        <View style={styles.waiting}>
          <ActivityIndicator size="large" color={COLORS.primary} />

          <Text style={styles.waitingTitle}>
            {phase === SENDING
              ? 'Sending M-Pesa request…'
              : 'Check your phone'}
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
          <Ionicons name="alert-circle" size={19} color={COLORS.error} />

          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}


      {phase === IDLE ? (
        <TouchableOpacity
          style={[
            styles.payButton,
            (!isValidLocalPhone(localPhone) || busy) && styles.buttonDisabled,
          ]}
          activeOpacity={0.85}
          disabled={!isValidLocalPhone(localPhone) || busy}
          onPress={() => sendPrompt(`254${localPhone}`)}
        >
          <Text style={styles.payButtonText}>
            {payment ? 'Try M-Pesa Again' : 'Pay with M-Pesa'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {phase !== SENDING ? (
        <TouchableOpacity
          style={styles.cashButton}
          activeOpacity={0.7}
          disabled={switching}
          onPress={handleSwitchToCash}
        >
          {switching ? (
            <ActivityIndicator color="#0866DD" />
          ) : (
            <Text style={styles.cashButtonText}>
              Pay cash on delivery instead
            </Text>
          )}
        </TouchableOpacity>
      ) : null}

    </View>
  );
}


const styles = StyleSheet.create({

  card: {
    backgroundColor: COLORS.white,

    borderRadius: 18,

    paddingHorizontal: 18,
    paddingVertical: 18,

    marginTop: 14,
    marginBottom: 13,

    shadowColor: '#163A6D',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,

    elevation: 1,
  },


  title: {
    color: COLORS.text,

    fontSize: 18,
    lineHeight: 23,

    fontWeight: '900',
  },


  text: {
    color: COLORS.muted,

    fontSize: 14,
    lineHeight: 20,

    marginTop: 4,
    marginBottom: 12,
  },


  phoneContainer: {
    height: 54,

    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1.4,
    borderColor: '#D5E4F1',

    borderRadius: 14,

    backgroundColor: '#FCFEFF',

    paddingHorizontal: 15,
  },


  prefix: {
    color: COLORS.text,

    fontSize: 16,
    fontWeight: '800',

    paddingRight: 13,
  },


  divider: {
    width: 1,
    height: 28,

    backgroundColor: '#D8E5EF',
  },


  phoneInput: {
    flex: 1,

    paddingHorizontal: 13,

    color: COLORS.text,

    fontSize: 16,
  },


  waiting: {
    alignItems: 'center',

    paddingVertical: 8,
  },


  waitingTitle: {
    color: COLORS.text,

    fontSize: 18,
    lineHeight: 23,

    fontWeight: '900',

    marginTop: 12,
  },


  waitingText: {
    color: COLORS.muted,

    fontSize: 14,
    lineHeight: 20,

    textAlign: 'center',

    marginTop: 5,
  },


  testNote: {
    color: '#9A5B00',

    fontSize: 13,
    lineHeight: 18,

    textAlign: 'center',

    marginTop: 8,
  },


  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',

    gap: 7,

    marginTop: 12,
  },


  errorText: {
    flex: 1,

    color: COLORS.error,

    fontSize: 14,
    lineHeight: 20,
  },


  payButton: {
    height: 52,

    borderRadius: 26,

    backgroundColor: '#0866DD',

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 14,
  },


  buttonDisabled: {
    backgroundColor: '#9DBFEF',
  },


  payButtonText: {
    color: COLORS.white,

    fontSize: 16,
    fontWeight: '800',
  },


  cashButton: {
    height: 46,

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 6,
  },


  cashButtonText: {
    color: '#0866DD',

    fontSize: 15,
    fontWeight: '800',
  },

});
