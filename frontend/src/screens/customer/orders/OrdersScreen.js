import React, { useCallback, useState } from 'react';

import {
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

import { ApiError } from '../../../api/client';
import { getOrders } from '../../../api/orders';
import { getProducts } from '../../../api/products';
import BottomNav from '../../../components/BottomNav';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  MpesaMark,
  ORDER_STATUS_TONES,
  Pill,
  ScreenTitle,
} from '../../../components/ui';
import { COLORS, FONTS } from '../../../theme';
import {
  formatKes,
  formatOrderDate,
  formatOrderRef,
} from '../../../utils/format';


const ACTIVE = 'active';
const PAST = 'past';

// An M-Pesa order is not confirmed until it has been paid for.
const isAwaitingPayment = (order) =>
  order.payment_method === 'mpesa' && order.payment_status !== 'paid';

const isPast = (order) => order.status === 'Delivered';


function OrderCard({ order, productNames, onPress }) {
  const awaitingPayment = isAwaitingPayment(order);

  // A reward can make the total lower than the subtotal.
  const discount = Number(order.subtotal) - Number(order.total);

  const items = order.order_items
    .map((item) => {
      const name = productNames[item.product_id] || 'Water';
      const free = Number(item.line_total) === 0 ? ' (free)' : '';

      return `${item.quantity} × ${name}${free}`;
    })
    .join('\n');

  let actionLabel = 'Track order';

  if (order.status === 'Delivered') actionLabel = 'View order';

  return (
    <Card>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Order ${formatOrderRef(order.id)}`}
      >
        <View style={styles.cardTopRow}>
          <View>
            <Text style={styles.orderRef}>Order #{formatOrderRef(order.id)}</Text>
            <Text style={styles.orderDate}>{formatOrderDate(order.created_at)}</Text>
          </View>

          {awaitingPayment ? (
            <Pill label="Awaiting payment" tone="red" />
          ) : (
            <Pill
              label={order.status}
              tone={ORDER_STATUS_TONES[order.status] || 'neutral'}
            />
          )}
        </View>

        <Text style={styles.items}>{items}</Text>

        {discount > 0 ? (
          <Text style={styles.discount}>Reward discount −{formatKes(discount)}</Text>
        ) : null}

        <View style={styles.cardBottomRow}>
          <Text style={styles.total}>{formatKes(order.total)}</Text>

          {awaitingPayment ? (
            <View style={styles.payButton}>
              <MpesaMark width={40} height={28} />
              <Text style={styles.payButtonText}>Pay now</Text>
            </View>
          ) : (
            <View style={styles.trackLink}>
              <Text style={styles.trackText}>{actionLabel}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.royal} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );
}


export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState(null);
  const [productNames, setProductNames] = useState({});
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState(ACTIVE);


  const loadOrders = useCallback(async () => {
    setLoadError('');

    try {
      const [orderData, productData] = await Promise.all([
        getOrders(),
        getProducts(),
      ]);

      // Orders only carry product ids, so names are looked up here.
      const names = {};

      productData.forEach((product) => {
        names[product.id] = product.name;
      });

      setProductNames(names);
      setOrders(orderData);
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
  }, [navigation]);


  // Reload whenever the screen comes into view, e.g. after placing an order.
  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );


  const renderContent = () => {
    if (orders === null) {
      return loadError ? (
        <ErrorState message={loadError} onRetry={loadOrders} />
      ) : (
        <LoadingState />
      );
    }

    const shown = orders.filter((order) =>
      filter === PAST ? isPast(order) : !isPast(order)
    );

    if (shown.length === 0) {
      return filter === PAST ? (
        <EmptyState
          icon="receipt-outline"
          title="No past orders yet"
          text="Delivered orders will appear here."
        />
      ) : (
        <EmptyState
          icon="receipt-outline"
          title="No active orders"
          text="When you place an order, you can follow it here."
          actionLabel="Order water"
          onAction={() => navigation.navigate('CustomerHome')}
        />
      );
    }

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {shown.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            productNames={productNames}
            onPress={() =>
              navigation.navigate('OrderTracking', { orderId: order.id })
            }
          />
        ))}
      </ScrollView>
    );
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <ScreenTitle title="Orders" />

      <View style={styles.tabs} accessibilityRole="tablist">
        {[
          [ACTIVE, 'Active'],
          [PAST, 'Past'],
        ].map(([id, label]) => {
          const selected = filter === id;

          return (
            <TouchableOpacity
              key={id}
              style={[styles.tab, selected && styles.tabSelected]}
              onPress={() => setFilter(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
  tab: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
  },
  tabSelected: {
    borderColor: COLORS.ink,
    backgroundColor: COLORS.ink,
  },
  tabText: {
    color: COLORS.ink,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  tabTextSelected: {
    color: COLORS.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 24,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  orderRef: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 15,
  },
  orderDate: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  items: {
    marginTop: 12,
    color: COLORS.ink,
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 21,
  },
  discount: {
    marginTop: 4,
    color: COLORS.ok,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  cardBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  total: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 17,
  },
  payButton: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: 20,
    backgroundColor: COLORS.royal,
  },
  payButtonText: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 13,
  },
  trackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trackText: {
    color: COLORS.royal,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
});
