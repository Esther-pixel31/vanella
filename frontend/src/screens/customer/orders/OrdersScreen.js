import React, { useCallback, useState } from 'react';

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

import { ApiError } from '../../../api/client';
import { getOrders } from '../../../api/orders';
import { getProducts } from '../../../api/products';
import BottomNav from '../../../components/BottomNav';
import VanellaHeader from '../../../components/VanellaHeader';
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
  border: '#E5EDF6',
};


// Backend status text -> pill colours.
const STATUS_STYLES = {
  'Order Received': { background: '#E4F1FF', text: '#0866DD' },
  'Ready to Deliver': { background: '#FFF1D6', text: '#9A5B00' },
  Delivered: { background: '#DFF5E6', text: '#19703A' },
};

const DEFAULT_STATUS_STYLE = { background: '#EEF2F7', text: '#63738B' };
const AWAITING_PAYMENT_STYLE = { background: '#FDE3E3', text: '#B42318' };


function OrderCard({ order, productNames, onPress }) {
  // An M-Pesa order is not confirmed until it has been paid for.
  const awaitingPayment =
    order.payment_method === 'mpesa' && order.payment_status !== 'paid';

  const statusStyle = awaitingPayment
    ? AWAITING_PAYMENT_STYLE
    : STATUS_STYLES[order.status] || DEFAULT_STATUS_STYLE;

  // A reward can make the total lower than the subtotal.
  const discount = Number(order.subtotal) - Number(order.total);

  return (
    <TouchableOpacity
      style={styles.orderCard}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Track order ${formatOrderRef(order.id)}`}
    >

      <View style={styles.orderTopRow}>
        <View>
          <Text style={styles.orderRef}>
            Order #{formatOrderRef(order.id)}
          </Text>

          <Text style={styles.orderDate}>
            {formatOrderDate(order.created_at)}
          </Text>
        </View>

        <View
          style={[
            styles.statusPill,
            { backgroundColor: statusStyle.background },
          ]}
        >
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {awaitingPayment ? 'Awaiting payment' : order.status}
          </Text>
        </View>
      </View>


      <View style={styles.divider} />


      {order.order_items.map((item) => {
        const isFree = Number(item.line_total) === 0;

        return (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName}>
              {item.quantity} × {productNames[item.product_id] || 'Water'}
            </Text>

            <Text style={isFree ? styles.itemFree : styles.itemTotal}>
              {isFree ? 'FREE' : formatKes(item.line_total)}
            </Text>
          </View>
        );
      })}


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

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>
          Total
        </Text>

        <Text style={styles.totalAmount}>
          {formatKes(order.total)}
        </Text>
      </View>

      <View style={styles.trackRow}>
        <Text style={styles.trackText}>
          {awaitingPayment
            ? 'Complete payment'
            : order.status === 'Delivered'
              ? 'View order'
              : 'Track order'}
        </Text>

        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
      </View>

    </TouchableOpacity>
  );
}


export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState(null);
  const [productNames, setProductNames] = useState({});
  const [loadError, setLoadError] = useState('');


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
              onPress={loadOrders}
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

    if (orders.length === 0) {
      return (
        <View style={styles.centered}>
          <Ionicons
            name="receipt-outline"
            size={48}
            color={COLORS.muted}
          />

          <Text style={styles.centeredTitle}>
            No orders yet
          </Text>

          <Text style={styles.centeredText}>
            When you place an order, it will appear here.
          </Text>

          <TouchableOpacity
            style={styles.centeredButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CustomerHome')}
          >
            <Text style={styles.centeredButtonText}>
              Order Water
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <Text style={styles.pageTitle}>
          Your Orders
        </Text>

        {orders.map((order) => (
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
      <StatusBar style="light" />

      <VanellaHeader
        onBack={() => navigation.goBack()}
        pageBackground={COLORS.background}
      />

      {renderContent()}


      <BottomNav activeTab="orders" navigation={navigation} />

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


  /* =======================================
     MAIN CONTENT
  ======================================= */

  scrollView: {
    flex: 1,
  },


  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,

    paddingBottom: 25,
  },


  pageTitle: {
    color: COLORS.text,

    fontSize: 29,
    lineHeight: 35,

    fontWeight: '900',

    marginBottom: 17,
  },


  /* =======================================
     LOADING / EMPTY / ERROR
  ======================================= */

  centered: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 36,
  },


  centeredTitle: {
    color: COLORS.text,

    fontSize: 21,
    lineHeight: 26,

    fontWeight: '900',

    marginTop: 12,
  },


  centeredText: {
    color: COLORS.muted,

    fontSize: 15,
    lineHeight: 22,

    textAlign: 'center',

    marginTop: 6,
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
     ORDER CARD
  ======================================= */

  orderCard: {
    backgroundColor: COLORS.white,

    borderRadius: 19,

    paddingHorizontal: 18,
    paddingVertical: 16,

    marginBottom: 12,

    shadowColor: '#163A6D',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,

    elevation: 2,
  },


  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },


  orderRef: {
    color: COLORS.text,

    fontSize: 16,
    lineHeight: 20,

    fontWeight: '900',
  },


  orderDate: {
    color: COLORS.muted,

    fontSize: 13,
    lineHeight: 18,

    marginTop: 2,
  },


  statusPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,

    borderRadius: 13,
  },


  statusText: {
    fontSize: 12,
    lineHeight: 16,

    fontWeight: '800',
  },


  divider: {
    height: 1,

    backgroundColor: '#E1E9F2',

    marginVertical: 12,
  },


  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginBottom: 6,
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


  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },


  totalLabel: {
    color: COLORS.text,

    fontSize: 17,
    lineHeight: 22,

    fontWeight: '900',
  },


  totalAmount: {
    color: '#0864D9',

    fontSize: 20,
    lineHeight: 25,

    fontWeight: '900',
  },


  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',

    gap: 2,

    marginTop: 10,
  },


  trackText: {
    color: COLORS.primary,

    fontSize: 14,
    lineHeight: 18,

    fontWeight: '800',
  },


});
