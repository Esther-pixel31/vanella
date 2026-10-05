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

import {
  confirmOrderCash,
  getStaffOrders,
  getStaffSummary,
  markOrderReady,
} from '../../api/staff';
import DarkHeader, { HeaderStat, HeaderStats } from '../../components/DarkHeader';
import TeamNav from '../../components/TeamNav';
import { Card, EmptyState, ErrorState, LoadingState, MpesaMark, Pill } from '../../components/ui';
import { COLORS, FONTS } from '../../theme';
import { formatKes, formatOrderRef } from '../../utils/format';
import { formatTime, todayLabel, useTeamErrorHandler } from '../team/teamErrors';

// How often the queue refreshes while open.
const REFRESH_MS = 20000;

const TABS = [
  { view: 'new', label: 'New', count: 'new_orders', hint: 'Prepare these, then mark them ready. Oldest first.' },
  { view: 'ready', label: 'Ready', count: 'ready_orders', hint: 'Assign a driver; the order then goes on its way by itself.' },
  { view: 'on_the_way', label: 'On the way', count: 'on_the_way', hint: 'Out with a driver. The customer gives the driver a code to finish.' },
  { view: 'delivered', label: 'Delivered', count: 'delivered_today', hint: 'Delivered today.' },
  { view: 'awaiting_payment', label: 'Awaiting M-Pesa', count: 'awaiting_payment', hint: 'Not paid yet. Do not prepare these.' },
];

function PaymentBadge({ order }) {
  if (order.payment_method === 'mpesa') {
    return (
      <View style={styles.badgeRow}>
        <MpesaMark width={38} height={22} />
        {order.payment_status === 'paid' ? <Pill label="Paid" tone="ok" /> : <Pill label="Not paid" tone="red" />}
      </View>
    );
  }

  if (order.payment_status === 'paid') return <Pill label="Cash · paid" tone="ok" />;

  return <Pill label={order.status === 'Delivered' ? 'Cash to confirm' : 'Cash on delivery'} tone={order.status === 'Delivered' ? 'amber' : 'neutral'} />;
}

function OrderCard({ order, busy, onOpen, onAction }) {
  const items = order.items
    .map((item) => `${item.quantity} × ${item.product_name}${item.is_free ? ' (free)' : ''}`)
    .join(', ');

  let action = null;

  if (order.status === 'Order Received' && !order.awaiting_payment) {
    action = { label: 'Mark ready', kind: 'ready' };
  } else if (order.status === 'Ready to Deliver' && !order.driver) {
    action = { label: 'Assign driver', kind: 'assign' };
  } else if (order.status === 'Delivered' && order.payment_method === 'cash' && order.payment_status !== 'paid') {
    action = { label: 'Confirm cash', kind: 'cash' };
  }

  return (
    <Card>
      <TouchableOpacity onPress={onOpen} activeOpacity={0.85} accessibilityRole="button">
        <View style={styles.cardTop}>
          <View style={styles.cardTopText}>
            <Text style={styles.customer}>{order.customer.full_name}</Text>
            <Text style={styles.meta}>
              #{formatOrderRef(order.id)} · {formatTime(order.created_at)}
              {order.is_scheduled ? ' · next-day order' : ''}
            </Text>
          </View>
          <Text style={styles.total}>{formatKes(order.total)}</Text>
        </View>

        <View style={styles.placeRow}>
          <Ionicons name="location-outline" size={15} color={COLORS.muted} />
          <Text style={styles.place} numberOfLines={1}>
            {order.address.address_line}
          </Text>
        </View>

        <Text style={styles.items}>{items}</Text>

        {order.driver ? (
          <View style={styles.placeRow}>
            <Ionicons name="car-outline" size={15} color={COLORS.muted} />
            <Text style={styles.place}>{order.driver.full_name}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <View style={styles.cardBottom}>
        <PaymentBadge order={order} />

        {action ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onAction(action.kind)}
            disabled={busy}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <Text style={styles.actionText}>{action.label}</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </Card>
  );
}

// The branch's order queue. Admins open it with `branchId` and `branchName`.
export default function StaffHomeScreen({ navigation, route }) {
  const branchId = route.params?.branchId || null;
  const isAdmin = Boolean(branchId);
  const handleError = useTeamErrorHandler(navigation);

  const [view, setView] = useState('new');
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [summaryData, orderData] = await Promise.all([
        getStaffSummary(branchId),
        getStaffOrders(view, branchId),
      ]);

      setSummary(summaryData);
      setOrders(orderData);
      setLoadError('');
    } catch (err) {
      handleError(err, setLoadError);
    }
  }, [branchId, handleError, view]);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, REFRESH_MS);
      return () => clearInterval(timer);
    }, [load])
  );

  const switchView = (next) => {
    setView(next);
    setOrders(null);
    setActionError('');
  };

  const handleAction = async (order, kind) => {
    if (kind === 'assign') {
      navigation.navigate('StaffOrder', { orderId: order.id, openAssign: true });
      return;
    }

    setActionError('');
    setBusyId(order.id);

    try {
      if (kind === 'ready') await markOrderReady(order.id);
      if (kind === 'cash') await confirmOrderCash(order.id);
      await load();
    } catch (err) {
      handleError(err, setActionError);
    } finally {
      setBusyId(null);
    }
  };

  const tab = TABS.find((item) => item.view === view);
  const toDeliver = summary ? summary.new_orders + summary.ready_orders + summary.on_the_way : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />

      {summary === null ? (
        loadError ? <ErrorState message={loadError} onRetry={load} /> : <LoadingState />
      ) : (
        <>
          <DarkHeader
            eyebrow={`${summary.branch.name.toUpperCase()} BRANCH`}
            title={todayLabel()}
            right={
              isAdmin ? (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => navigation.goBack()}
                  accessibilityRole="button"
                  accessibilityLabel="Back to overview"
                >
                  <Ionicons name="close" size={22} color={COLORS.surface} />
                </TouchableOpacity>
              ) : null
            }
          >
            <HeaderStats>
              <HeaderStat
                label="ORDERS"
                value={String(summary.orders_today)}
                sub={summary.awaiting_payment ? `+${summary.awaiting_payment} waiting for M-Pesa` : 'placed today'}
              />
              <HeaderStat
                label="TO DELIVER"
                value={String(toDeliver)}
                sub={`${summary.new_orders} new · ${summary.ready_orders} ready · ${summary.on_the_way} out`}
              />
              <HeaderStat label="M-PESA RECEIVED" value={formatKes(summary.mpesa_received)} sub="today" />
              <HeaderStat
                label="CASH TO COLLECT"
                value={formatKes(summary.cash_to_collect)}
                sub={`${formatKes(summary.cash_collected)} collected today`}
              />
            </HeaderStats>
          </DarkHeader>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabs}
          >
            {TABS.map((item) => {
              const selected = item.view === view;

              return (
                <TouchableOpacity
                  key={item.view}
                  style={[styles.tab, selected && styles.tabOn]}
                  onPress={() => switchView(item.view)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.tabText, selected && styles.tabTextOn]}>{item.label}</Text>
                  <View style={[styles.tabCount, selected && styles.tabCountOn]}>
                    <Text style={[styles.tabCountText, selected && styles.tabTextOn]}>
                      {summary[item.count]}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {orders === null ? (
            <LoadingState />
          ) : orders.length === 0 ? (
            <EmptyState icon="receipt-outline" title="Nothing here" text={tab.hint} />
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.hint}>{tab.hint}</Text>

              {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  busy={busyId === order.id}
                  onOpen={() => navigation.navigate('StaffOrder', { orderId: order.id })}
                  onAction={(kind) => handleAction(order, kind)}
                />
              ))}
            </ScrollView>
          )}
        </>
      )}

      <TeamNav role={isAdmin ? 'admin' : 'staff'} activeTab={isAdmin ? 'overview' : 'orders'} navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.deep,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsScroll: {
    flexGrow: 0,
    backgroundColor: COLORS.ground,
  },
  tabs: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  tab: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  tabOn: {
    borderColor: COLORS.ink,
    backgroundColor: COLORS.ink,
  },
  tabText: {
    color: COLORS.ink,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  tabTextOn: {
    color: COLORS.surface,
  },
  tabCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: COLORS.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountOn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabCountText: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 11,
  },
  list: {
    flex: 1,
    backgroundColor: COLORS.ground,
  },
  listContent: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 24,
  },
  hint: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  errorText: {
    color: COLORS.red,
    fontFamily: FONTS.semibold,
    fontSize: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTopText: {
    flex: 1,
  },
  customer: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 15,
  },
  meta: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  total: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 15,
  },
  placeRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  place: {
    flex: 1,
    color: COLORS.ink,
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
  items: {
    marginTop: 4,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
  cardBottom: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButton: {
    height: 40,
    minWidth: 110,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.royal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 13,
  },
});
