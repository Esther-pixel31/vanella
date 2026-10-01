import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import { getAddresses } from '../../../api/addresses';
import { getBranches } from '../../../api/branches';
import { ApiError } from '../../../api/client';
import { getOrder, getOrderTracking } from '../../../api/orders';
import { getProducts } from '../../../api/products';
import BottomNav from '../../../components/BottomNav';
import LiveMap from '../../../components/LiveMap';
import {
  Card,
  ErrorState,
  IconTile,
  LoadingState,
  MpesaMark,
  Pill,
  ProgressBar,
  TopBar,
} from '../../../components/ui';
import { COLORS, FONTS } from '../../../theme';
import {
  formatKes,
  formatOrderDate,
  formatOrderRef,
} from '../../../utils/format';
import PaymentPanel from './PaymentPanel';


// How often the order is re-checked: often while the driver is moving.
const TRACKING_MS = 5000;
const IDLE_MS = 15000;

const ON_THE_WAY = 'On the Way';
const FINAL_STATUS = 'Delivered';

// `status` must match the backend's order status text exactly.
const STEPS = [
  {
    status: 'Order Received',
    short: 'Received',
    headline: 'Order received',
    message: 'We have your order and are getting it ready.',
  },
  {
    status: 'Ready to Deliver',
    short: 'Ready',
    headline: 'Ready to go',
    message: 'Your order is ready. A driver is being assigned.',
  },
  {
    status: ON_THE_WAY,
    short: 'On the way',
    headline: 'On the way',
    message: 'Your driver is bringing your water.',
  },
  {
    status: FINAL_STATUS,
    short: 'Delivered',
    headline: 'Delivered',
    message: 'Your order has been delivered. Thank you for choosing Vanella.',
  },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "4:27 PM", or "Fri 8:45 AM" when it is not today.
function formatTime(isoString) {
  const date = new Date(isoString);
  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const time = `${hours}:${minutes} ${date.getHours() < 12 ? 'AM' : 'PM'}`;

  return date.toDateString() === new Date().toDateString()
    ? time
    : `${DAYS[date.getDay()]} ${time}`;
}

// 1104 seconds -> "18:24"
function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
}


// Re-renders every second while the countdown is shown.
function useNow(active) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active) return undefined;

    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timer);
  }, [active]);

  return now;
}


function Countdown({ order, now }) {
  const promised = new Date(order.promised_by).getTime();
  const placed = new Date(order.created_at).getTime();
  const secondsLeft = Math.round((promised - now) / 1000);

  // More than three hours away: show when, not a countdown.
  if (secondsLeft > 3 * 3600) {
    return (
      <View style={styles.countdownBox}>
        <Text style={styles.countdownWhen}>{formatTime(order.promised_by)}</Text>
        <Text style={styles.countdownLabel}>DELIVERY BY</Text>
      </View>
    );
  }

  if (secondsLeft <= 0) {
    return (
      <View style={styles.countdownBox}>
        <Text style={[styles.countdownWhen, styles.lateText]}>Running late</Text>
        <Text style={styles.countdownLabel}>SORRY, IT IS COMING</Text>
      </View>
    );
  }

  return (
    <View style={styles.countdownBox}>
      <Text
        style={styles.countdownValue}
        accessibilityLabel={`${Math.ceil(secondsLeft / 60)} minutes left`}
      >
        {formatCountdown(secondsLeft)}
      </Text>
      <Text style={styles.countdownLabel}>MIN LEFT</Text>
      <View style={styles.countdownBar}>
        <ProgressBar progress={(now - placed) / (promised - placed)} />
      </View>
    </View>
  );
}


function StepsRow({ currentIndex, order }) {
  const finished = currentIndex === STEPS.length - 1;

  const times = {
    0: order.created_at,
    1: order.ready_at,
    2: order.dispatched_at,
    3: order.delivered_at,
  };

  return (
    <View style={styles.steps}>
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex || (finished && index === currentIndex);
        const isCurrent = index === currentIndex && !finished;

        return (
          <View key={step.status} style={styles.step}>
            {isDone ? (
              <View style={[styles.stepDot, styles.stepDone]}>
                <Ionicons name="checkmark" size={15} color={COLORS.surface} />
              </View>
            ) : isCurrent ? (
              <View style={[styles.stepDot, styles.stepCurrent]}>
                <View style={styles.stepCurrentInner} />
              </View>
            ) : (
              <View style={[styles.stepDot, styles.stepTodo]} />
            )}

            <Text style={[styles.stepLabel, !isDone && !isCurrent && styles.stepLabelTodo]}>
              {step.short}
            </Text>

            <Text style={styles.stepTime}>
              {times[index] && (isDone || isCurrent) ? formatTime(times[index]) : ' '}
            </Text>
          </View>
        );
      })}
    </View>
  );
}


function DeliveryCode({ code }) {
  return (
    <View style={styles.codeCard}>
      <Text style={styles.codeEyebrow}>YOUR DELIVERY CODE</Text>

      <View
        style={styles.codeDigits}
        accessible
        accessibilityLabel={`Delivery code ${code.split('').join(' ')}`}
      >
        {code.split('').map((digit, index) => (
          <View key={index} style={styles.codeDigitBox}>
            <Text style={styles.codeDigit}>{digit}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.codeText}>
        Give this code to the driver when your water arrives, not before. It
        confirms the delivery and, for cash orders, your payment.
      </Text>
    </View>
  );
}


function DetailRow({ lead, label, value, extra }) {
  return (
    <View style={styles.detailRow}>
      {lead}

      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>

      {extra}
    </View>
  );
}


export default function OrderTrackingScreen({ navigation, route }) {
  // `payPhone` is set straight after an M-Pesa checkout: the number the
  // PIN prompt should be sent to as soon as this page opens.
  const { orderId, justPlaced = false, payPhone = null } = route.params;

  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [lookups, setLookups] = useState({
    productNames: {},
    address: null,
    branch: null,
  });
  const [loadError, setLoadError] = useState('');

  // Lets the refresh timer see the latest status without restarting.
  const statusRef = useRef(null);


  const loadOrder = useCallback(async () => {
    setLoadError('');

    try {
      const [orderData, trackingData, productData, addressData, branchData] =
        await Promise.all([
          getOrder(orderId),
          getOrderTracking(orderId),
          getProducts(),
          getAddresses(),
          getBranches(),
        ]);

      // The order only carries ids, so names are looked up here.
      const productNames = {};

      productData.forEach((product) => {
        productNames[product.id] = product.name;
      });

      setLookups({
        productNames,
        address: addressData.find((a) => a.id === orderData.address_id) || null,
        branch: branchData.find((b) => b.id === orderData.branch_id) || null,
      });

      statusRef.current = orderData.status;
      setOrder(orderData);
      setTracking(trackingData);
    } catch (err) {
      // 401 here means the saved login could not be refreshed.
      if (err instanceof ApiError && err.status === 401) {
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        return;
      }

      setLoadError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the server. Check your connection and try again.'
      );
    }
  }, [navigation, orderId]);


  // Fetches the latest order and live tracking together.
  const refreshOrder = useCallback(async () => {
    try {
      const [fresh, freshTracking] = await Promise.all([
        getOrder(orderId),
        getOrderTracking(orderId),
      ]);

      statusRef.current = fresh.status;
      setOrder(fresh);
      setTracking(freshTracking);
    } catch (err) {
      // Keep showing the last known state; the next tick tries again.
    }
  }, [orderId]);


  // Load when the screen opens, then keep it fresh while it is open:
  // every 5 seconds while the driver is on the way, otherwise every 15.
  useFocusEffect(
    useCallback(() => {
      loadOrder();

      let timer = null;

      const schedule = () => {
        const delay = statusRef.current === ON_THE_WAY ? TRACKING_MS : IDLE_MS;

        timer = setTimeout(async () => {
          if (statusRef.current !== FINAL_STATUS) {
            await refreshOrder();
          }
          schedule();
        }, delay);
      };

      schedule();

      return () => clearTimeout(timer);
    }, [loadOrder, refreshOrder])
  );


  const handleAuthExpired = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  }, [navigation]);


  const isDelivered = order?.status === FINAL_STATUS;
  const awaitingPayment =
    order != null && order.payment_method === 'mpesa' && order.payment_status !== 'paid';
  const showCountdown = Boolean(
    order != null && !isDelivered && !awaitingPayment && order.promised_by
  );

  const now = useNow(showCountdown);


  const renderContent = () => {
    if (order === null) {
      return loadError ? (
        <ErrorState message={loadError} onRetry={loadOrder} />
      ) : (
        <LoadingState />
      );
    }

    const currentIndex = Math.max(
      STEPS.findIndex((step) => step.status === order.status),
      0
    );
    const currentStep = STEPS[currentIndex];
    const onTheWay = order.status === ON_THE_WAY;

    // Ordered outside delivery hours and not started yet.
    const waitingForMorning = order.is_scheduled && currentIndex === 0;

    const driver = tracking?.driver || null;
    const driverPoint =
      driver && driver.latitude != null
        ? { latitude: driver.latitude, longitude: driver.longitude }
        : null;
    const destination =
      tracking && tracking.destination_latitude != null
        ? { latitude: tracking.destination_latitude, longitude: tracking.destination_longitude }
        : null;

    // A reward can make the total lower than the subtotal.
    const discount = Number(order.subtotal) - Number(order.total);

    let eyebrow = `ORDER #${formatOrderRef(order.id)}`;
    if (awaitingPayment) eyebrow = 'ALMOST DONE';
    else if (justPlaced && currentIndex === 0) eyebrow = 'ORDER PLACED';

    let headline = currentStep.headline;
    let message = currentStep.message;

    if (awaitingPayment) {
      headline = 'Complete your payment';
      message = 'Your order will be confirmed once it is paid for.';
    } else if (waitingForMorning) {
      headline = 'Scheduled';
      message = 'Ordered outside delivery hours (8 AM to 8 PM). We will deliver it first thing.';
    }

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* =====================================
            LIVE MAP (while on the way)
        ===================================== */}

        {onTheWay ? <LiveMap driver={driverPoint} destination={destination} /> : null}

        <View style={[styles.body, onTheWay && styles.bodyOverMap]}>

          {/* STATUS + COUNTDOWN */}

          <View style={styles.statusRow}>
            <View style={styles.statusText}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={styles.headline}>{headline}</Text>
              <Text style={styles.message}>{message}</Text>

              {showCountdown ? (
                <Text style={styles.promised}>
                  Delivery by {formatTime(order.promised_by)}
                </Text>
              ) : null}
            </View>

            {showCountdown ? <Countdown order={order} now={now} /> : null}
          </View>

          {awaitingPayment ? (
            <PaymentPanel
              order={order}
              autoStartPhone={payPhone}
              onOrderUpdated={refreshOrder}
              onAuthExpired={handleAuthExpired}
            />
          ) : (
            <StepsRow currentIndex={currentIndex} order={order} />
          )}


          {/* DELIVERY CODE */}

          {!isDelivered && !awaitingPayment && tracking?.delivery_code ? (
            <DeliveryCode code={tracking.delivery_code} />
          ) : null}


          {/* DRIVER */}

          {driver ? (
            <Card style={styles.card}>
              <DetailRow
                lead={
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverInitials}>
                      {driver.full_name
                        .split(/\s+/)
                        .map((word) => word[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </Text>
                  </View>
                }
                label="Your driver"
                value={driver.full_name}
                extra={
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => Linking.openURL(`tel:+${driver.phone_number}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Call ${driver.full_name}`}
                  >
                    <Ionicons name="call" size={16} color={COLORS.royal} />
                    <Text style={styles.callText}>Call</Text>
                  </TouchableOpacity>
                }
              />
            </Card>
          ) : null}


          {/* DELIVERY DETAILS */}

          <Card style={[styles.card, styles.detailsCard]}>
            <DetailRow
              lead={<IconTile name="location" size={36} iconSize={18} />}
              label="Delivering to"
              value={
                lookups.address
                  ? `${lookups.address.label} · ${lookups.address.address_line}`
                  : 'Your saved address'
              }
            />

            <DetailRow
              lead={<IconTile name="storefront" size={36} iconSize={18} />}
              label="From"
              value={lookups.branch ? `Vanella ${lookups.branch.name}` : 'Vanella'}
            />

            <DetailRow
              lead={
                order.payment_method === 'mpesa' ? (
                  <MpesaMark width={36} height={36} />
                ) : (
                  <IconTile name="wallet" size={36} iconSize={18} />
                )
              }
              label="Payment"
              value={
                order.payment_method === 'mpesa'
                  ? awaitingPayment
                    ? 'M-Pesa · not paid yet'
                    : 'M-Pesa'
                  : 'Cash on delivery'
              }
              extra={order.payment_status === 'paid' ? <Pill label="Paid" tone="ok" /> : null}
            />
          </Card>


          {/* ITEMS */}

          <Card style={[styles.card, styles.itemsCard]}>
            {order.order_items.map((item) => {
              const isFree = Number(item.line_total) === 0;

              return (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={styles.itemName}>
                    {item.quantity} × {lookups.productNames[item.product_id] || 'Water'}
                  </Text>

                  <Text style={isFree ? styles.freeText : styles.itemTotal}>
                    {isFree ? 'FREE' : formatKes(item.line_total)}
                  </Text>
                </View>
              );
            })}

            {order.customer_note ? (
              <Text style={styles.noteText}>Note: {order.customer_note}</Text>
            ) : null}

            {discount > 0 ? (
              <View style={styles.itemRow}>
                <Text style={styles.mutedLabel}>Reward discount</Text>
                <Text style={styles.freeText}>−{formatKes(discount)}</Text>
              </View>
            ) : null}

            <View style={styles.itemRow}>
              <Text style={styles.mutedLabel}>Delivery</Text>
              <Text style={styles.freeText}>Free</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.itemRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatKes(order.total)}</Text>
            </View>
          </Card>

          {isDelivered && order.delivered_at ? (
            <Text style={styles.refreshHint}>
              Delivered {formatOrderDate(order.delivered_at)}
            </Text>
          ) : !awaitingPayment ? (
            <Text style={styles.refreshHint}>This page updates automatically.</Text>
          ) : null}

        </View>
      </ScrollView>
    );
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <TopBar title="Track order" onBack={() => navigation.goBack()} />

      {renderContent()}

      <BottomNav activeTab="orders" navigation={navigation} />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.ground,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  // The status sheet slides up over the bottom of the map.
  bodyOverMap: {
    marginTop: -24,
    paddingTop: 18,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: COLORS.ground,
  },

  /* Status */
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  statusText: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.royal,
    fontFamily: FONTS.bold,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  headline: {
    marginTop: 4,
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 27,
    letterSpacing: -0.6,
  },
  message: {
    marginTop: 4,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  promised: {
    marginTop: 6,
    color: COLORS.ink,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },

  /* Countdown */
  countdownBox: {
    minWidth: 96,
    alignItems: 'flex-end',
  },
  countdownValue: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 32,
    letterSpacing: -1,
  },
  countdownWhen: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 18,
    textAlign: 'right',
  },
  lateText: {
    color: COLORS.amber,
  },
  countdownLabel: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  countdownBar: {
    width: 96,
    marginTop: 8,
  },

  /* Steps */
  steps: {
    flexDirection: 'row',
    marginTop: 18,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDone: {
    backgroundColor: COLORS.ok,
  },
  stepCurrent: {
    borderWidth: 3,
    borderColor: COLORS.royal,
    backgroundColor: COLORS.surface,
  },
  stepCurrentInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.royal,
  },
  stepTodo: {
    borderWidth: 2,
    borderColor: '#C5D2E3',
    backgroundColor: COLORS.surface,
  },
  stepLabel: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 11,
    textAlign: 'center',
  },
  stepLabelTodo: {
    color: '#5F7090',
    fontFamily: FONTS.semibold,
  },
  stepTime: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 10,
  },

  /* Code */
  codeCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.deep,
  },
  codeEyebrow: {
    color: COLORS.sky,
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  codeDigits: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  codeDigitBox: {
    width: 52,
    height: 60,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeDigit: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 28,
  },
  codeText: {
    marginTop: 10,
    color: '#B9CCE8',
    fontFamily: FONTS.medium,
    fontSize: 12,
    lineHeight: 18,
  },

  /* Cards */
  card: {
    marginTop: 12,
  },
  detailsCard: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  detailValue: {
    marginTop: 1,
    color: COLORS.ink,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInitials: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 14,
  },
  callButton: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
  },
  callText: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 13,
  },

  /* Items */
  itemsCard: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemName: {
    flex: 1,
    color: COLORS.ink,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  itemTotal: {
    color: COLORS.ink,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  mutedLabel: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  freeText: {
    color: COLORS.ok,
    fontFamily: FONTS.extrabold,
    fontSize: 14,
  },
  noteText: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontStyle: 'italic',
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 2,
    backgroundColor: COLORS.line,
  },
  totalLabel: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 16,
  },
  totalValue: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 19,
  },
  refreshHint: {
    marginTop: 14,
    textAlign: 'center',
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
});
