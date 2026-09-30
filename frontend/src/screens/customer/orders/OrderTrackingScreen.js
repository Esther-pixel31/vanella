import React, { useCallback, useRef, useState } from 'react';

import {
  ActivityIndicator,
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
import { getOrder } from '../../../api/orders';
import { getProducts } from '../../../api/products';
import VanellaHeader from '../../../components/VanellaHeader';
import PaymentPanel from './PaymentPanel';
import {
  formatKes,
  formatOrderDate,
  formatOrderRef,
} from '../../../utils/format';


const COLORS = {
  primary: '#087FF5',
  background: '#F5F8FC',
  white: '#FFFFFF',
  text: '#082D6A',
  muted: '#63738B',
  inactive: '#D5DFEA',
  done: '#19A65B',
};

// How often the status is re-checked while this screen is open.
const REFRESH_MS = 15000;

const FINAL_STATUS = 'Delivered';

// `status` must match the backend's order status text exactly.
const STEPS = [
  {
    status: 'Order Received',
    icon: 'receipt',
    headline: 'Order received',
    message: 'We have your order and are getting it ready.',
  },
  {
    status: 'Ready to Deliver',
    icon: 'cube',
    headline: 'Ready to deliver',
    message: 'Your order is ready and will be delivered to you shortly.',
  },
  {
    status: 'Delivered',
    icon: 'home',
    headline: 'Delivered',
    message: 'Your order has been delivered. Thank you for choosing Vanella.',
  },
];


function ProgressBar({ currentIndex }) {
  return (
    <View style={styles.progressBar}>
      {STEPS.map((step, index) => (
        <View
          key={step.status}
          style={[
            styles.progressSegment,
            index <= currentIndex && styles.progressSegmentActive,
          ]}
        />
      ))}
    </View>
  );
}


function Timeline({ currentIndex, placedAt }) {
  const finished = currentIndex === STEPS.length - 1;

  return (
    <View style={styles.card}>
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex || (finished && index === currentIndex);
        const isCurrent = index === currentIndex && !finished;
        const isLast = index === STEPS.length - 1;

        return (
          <View key={step.status} style={styles.timelineRow}>

            <View style={styles.timelineMarker}>
              <View
                style={[
                  styles.timelineCircle,
                  isCurrent && styles.timelineCircleCurrent,
                  isDone && styles.timelineCircleDone,
                ]}
              >
                <Ionicons
                  name={isDone ? 'checkmark' : step.icon}
                  size={17}
                  color={isDone || isCurrent ? COLORS.white : '#8EA0B5'}
                />
              </View>

              {!isLast && (
                <View
                  style={[
                    styles.timelineLine,
                    index < currentIndex && styles.timelineLineDone,
                  ]}
                />
              )}
            </View>

            <View style={styles.timelineText}>
              <Text
                style={[
                  styles.timelineTitle,
                  !isDone && !isCurrent && styles.timelineTitleInactive,
                ]}
              >
                {step.status}
              </Text>

              {index === 0 ? (
                <Text style={styles.timelineMeta}>
                  {formatOrderDate(placedAt)}
                </Text>
              ) : null}

              {isCurrent && index > 0 ? (
                <Text style={styles.timelineMeta}>
                  In progress
                </Text>
              ) : null}
            </View>

          </View>
        );
      })}
    </View>
  );
}


export default function OrderTrackingScreen({ navigation, route }) {
  // `payPhone` is set straight after an M-Pesa checkout: the number the
  // PIN prompt should be sent to as soon as this page opens.
  const { orderId, justPlaced = false, payPhone = null } = route.params;

  const [order, setOrder] = useState(null);
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
      const [orderData, productData, addressData, branchData] =
        await Promise.all([
          getOrder(orderId),
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


  // Load when the screen opens, then keep the status fresh while it is
  // open. Refresh failures are ignored: the next tick simply tries again.
  useFocusEffect(
    useCallback(() => {
      loadOrder();

      const timer = setInterval(async () => {
        if (statusRef.current === null || statusRef.current === FINAL_STATUS) {
          return;
        }

        try {
          const fresh = await getOrder(orderId);

          statusRef.current = fresh.status;
          setOrder(fresh);
        } catch (err) {
          // Keep showing the last known status.
        }
      }, REFRESH_MS);

      return () => clearInterval(timer);
    }, [loadOrder, orderId])
  );


  // Called by the payment panel once the order is paid or moved to cash.
  const refreshOrder = useCallback(async () => {
    try {
      const fresh = await getOrder(orderId);

      statusRef.current = fresh.status;
      setOrder(fresh);
    } catch (err) {
      // The regular refresh will pick the change up.
    }
  }, [orderId]);


  const handleAuthExpired = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  }, [navigation]);


  const renderContent = () => {
    if (order === null) {
      if (loadError) {
        return (
          <View style={styles.centered}>
            <Ionicons
              name="cloud-offline-outline"
              size={44}
              color={COLORS.muted}
            />

            <Text style={styles.centeredText}>
              {loadError}
            </Text>

            <TouchableOpacity
              style={styles.centeredButton}
              activeOpacity={0.85}
              onPress={loadOrder}
            >
              <Text style={styles.centeredButtonText}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    const currentIndex = Math.max(
      STEPS.findIndex((step) => step.status === order.status),
      0
    );
    const currentStep = STEPS[currentIndex];
    const isDelivered = order.status === FINAL_STATUS;

    // An M-Pesa order is not confirmed until it has been paid for.
    const awaitingPayment =
      order.payment_method === 'mpesa' && order.payment_status !== 'paid';

    let paymentText = 'Cash on delivery';

    if (order.payment_method === 'mpesa') {
      paymentText = awaitingPayment ? 'M-Pesa · Not paid yet' : 'M-Pesa · Paid';
    } else if (order.payment_status === 'paid') {
      paymentText = 'Cash · Paid';
    }

    // A reward can make the total lower than the subtotal.
    const discount = Number(order.subtotal) - Number(order.total);

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* =====================================
            CURRENT STATUS
        ===================================== */}

        {awaitingPayment ? (
          <View>
            <Text style={styles.eyebrow}>
              ALMOST DONE
            </Text>

            <Text style={styles.headline}>
              Complete your payment
            </Text>

            <Text style={styles.message}>
              Your order will be confirmed once it is paid for.
            </Text>

            <PaymentPanel
              order={order}
              autoStartPhone={payPhone}
              onOrderUpdated={refreshOrder}
              onAuthExpired={handleAuthExpired}
            />
          </View>
        ) : (
          <View>
            {justPlaced && currentIndex === 0 ? (
              <Text style={styles.eyebrow}>
                ORDER PLACED
              </Text>
            ) : null}

            <Text style={styles.headline}>
              {currentStep.headline}
            </Text>

            <Text style={styles.message}>
              {currentStep.message}
            </Text>

            <ProgressBar currentIndex={currentIndex} />


            {/* TIMELINE */}

            <Timeline
              currentIndex={currentIndex}
              placedAt={order.created_at}
            />
          </View>
        )}


        {/* =====================================
            DELIVERY DETAILS
        ===================================== */}

        <View style={styles.card}>

          <View style={styles.detailRow}>
            <Ionicons name="location" size={20} color="#0869E8" />

            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>
                Delivering to
              </Text>

              <Text style={styles.detailValue}>
                {lookups.address
                  ? `${lookups.address.label} · ${lookups.address.address_line}`
                  : 'Your saved address'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="storefront" size={19} color="#0869E8" />

            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>
                From
              </Text>

              <Text style={styles.detailValue}>
                {lookups.branch
                  ? `Vanella ${lookups.branch.name}`
                  : 'Vanella'}
              </Text>
            </View>
          </View>

          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Ionicons name="wallet" size={19} color="#0869E8" />

            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>
                Payment
              </Text>

              <Text style={styles.detailValue}>
                {paymentText}
              </Text>
            </View>
          </View>

        </View>


        {/* =====================================
            ORDER DETAILS
        ===================================== */}

        <View style={styles.card}>

          <Text style={styles.cardTitle}>
            Order #{formatOrderRef(order.id)}
          </Text>

          {order.order_items.map((item) => {
            const isFree = Number(item.line_total) === 0;

            return (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {item.quantity} ×{' '}
                  {lookups.productNames[item.product_id] || 'Water'}
                </Text>

                <Text style={isFree ? styles.itemFree : styles.itemTotal}>
                  {isFree ? 'FREE' : formatKes(item.line_total)}
                </Text>
              </View>
            );
          })}

          {order.customer_note ? (
            <Text style={styles.noteText}>
              Note: {order.customer_note}
            </Text>
          ) : null}

          <View style={styles.divider} />

          {discount > 0 && (
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>
                Reward discount
              </Text>

              <Text style={styles.itemFree}>
                −{formatKes(discount)}
              </Text>
            </View>
          )}

          <View style={styles.itemRow}>
            <Text style={styles.itemName}>
              Delivery Fee
            </Text>

            <Text style={styles.itemFree}>
              FREE
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Total
            </Text>

            <Text style={styles.totalAmount}>
              {formatKes(order.total)}
            </Text>
          </View>

        </View>


        {!isDelivered && !awaitingPayment ? (
          <Text style={styles.refreshHint}>
            This page updates automatically.
          </Text>
        ) : null}

        <TouchableOpacity
          style={styles.homeButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CustomerHome')}
        >
          <Text style={styles.homeButtonText}>
            Back to Home
          </Text>
        </TouchableOpacity>

      </ScrollView>
    );
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />

      <VanellaHeader
        onBack={() => navigation.goBack()}
        pageBackground={COLORS.background}
      />

      {renderContent()}

    </SafeAreaView>
  );
}


/* =========================================
   STYLES
========================================= */

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },


  scrollView: {
    flex: 1,
  },


  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,

    paddingBottom: 35,
  },


  /* =======================================
     LOADING / ERROR
  ======================================= */

  centered: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 36,
  },


  centeredText: {
    color: COLORS.muted,

    fontSize: 15,
    lineHeight: 22,

    textAlign: 'center',

    marginTop: 10,
  },


  centeredButton: {
    height: 48,

    paddingHorizontal: 30,

    borderRadius: 24,

    backgroundColor: '#0866DD',

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 20,
  },


  centeredButtonText: {
    color: COLORS.white,

    fontSize: 15,
    fontWeight: '800',
  },


  /* =======================================
     CURRENT STATUS
  ======================================= */

  eyebrow: {
    color: COLORS.primary,

    fontSize: 12,
    lineHeight: 16,

    fontWeight: '900',

    letterSpacing: 0.9,

    marginBottom: 3,
  },


  headline: {
    color: COLORS.text,

    fontSize: 29,
    lineHeight: 35,

    fontWeight: '900',
  },


  message: {
    color: COLORS.muted,

    fontSize: 15,
    lineHeight: 22,

    marginTop: 4,
  },


  progressBar: {
    flexDirection: 'row',

    gap: 6,

    marginTop: 16,
    marginBottom: 18,
  },


  progressSegment: {
    flex: 1,
    height: 6,

    borderRadius: 3,

    backgroundColor: COLORS.inactive,
  },


  progressSegmentActive: {
    backgroundColor: COLORS.primary,
  },


  /* =======================================
     CARDS
  ======================================= */

  card: {
    backgroundColor: COLORS.white,

    borderRadius: 18,

    paddingHorizontal: 18,
    paddingVertical: 16,

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


  cardTitle: {
    color: COLORS.text,

    fontSize: 17,
    lineHeight: 22,

    fontWeight: '900',

    marginBottom: 12,
  },


  /* =======================================
     TIMELINE
  ======================================= */

  timelineRow: {
    flexDirection: 'row',
  },


  timelineMarker: {
    width: 34,

    alignItems: 'center',

    marginRight: 13,
  },


  timelineCircle: {
    width: 34,
    height: 34,

    borderRadius: 17,

    backgroundColor: '#EAF0F6',

    alignItems: 'center',
    justifyContent: 'center',
  },


  timelineCircleCurrent: {
    backgroundColor: COLORS.primary,
  },


  timelineCircleDone: {
    backgroundColor: COLORS.done,
  },


  timelineLine: {
    width: 3,
    height: 26,

    borderRadius: 2,

    backgroundColor: COLORS.inactive,

    marginVertical: 3,
  },


  timelineLineDone: {
    backgroundColor: COLORS.done,
  },


  timelineText: {
    flex: 1,

    minHeight: 34,

    justifyContent: 'center',
  },


  timelineTitle: {
    color: COLORS.text,

    fontSize: 16,
    lineHeight: 20,

    fontWeight: '900',
  },


  timelineTitleInactive: {
    color: '#8EA0B5',

    fontWeight: '600',
  },


  timelineMeta: {
    color: COLORS.muted,

    fontSize: 13,
    lineHeight: 17,
  },


  /* =======================================
     DELIVERY DETAILS
  ======================================= */

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',

    marginBottom: 14,
  },


  detailRowLast: {
    marginBottom: 0,
  },


  detailText: {
    flex: 1,

    marginLeft: 12,
  },


  detailLabel: {
    color: COLORS.muted,

    fontSize: 13,
    lineHeight: 17,
  },


  detailValue: {
    color: COLORS.text,

    fontSize: 15,
    lineHeight: 20,

    fontWeight: '800',

    marginTop: 1,
  },


  /* =======================================
     ORDER DETAILS
  ======================================= */

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginBottom: 8,
  },


  itemName: {
    flex: 1,

    color: '#173B6D',

    fontSize: 15,
    lineHeight: 20,

    fontWeight: '500',

    marginRight: 10,
  },


  itemTotal: {
    color: COLORS.text,

    fontSize: 15,
    lineHeight: 20,

    fontWeight: '800',
  },


  itemFree: {
    color: COLORS.primary,

    fontSize: 15,
    lineHeight: 20,

    fontWeight: '900',
  },


  noteText: {
    color: COLORS.muted,

    fontSize: 13,
    lineHeight: 19,

    fontStyle: 'italic',
  },


  divider: {
    height: 1,

    backgroundColor: '#E1E9F2',

    marginTop: 6,
    marginBottom: 12,
  },


  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginTop: 4,
  },


  totalLabel: {
    color: COLORS.text,

    fontSize: 18,
    lineHeight: 23,

    fontWeight: '900',
  },


  totalAmount: {
    color: '#0864D9',

    fontSize: 22,
    lineHeight: 27,

    fontWeight: '900',
  },


  /* =======================================
     FOOTER
  ======================================= */

  refreshHint: {
    color: COLORS.muted,

    fontSize: 13,
    lineHeight: 18,

    textAlign: 'center',

    marginTop: 2,
    marginBottom: 12,
  },


  homeButton: {
    height: 56,

    borderRadius: 28,

    backgroundColor: '#0866DD',

    alignItems: 'center',
    justifyContent: 'center',
  },


  homeButtonText: {
    color: COLORS.white,

    fontSize: 16,
    fontWeight: '800',
  },

});
