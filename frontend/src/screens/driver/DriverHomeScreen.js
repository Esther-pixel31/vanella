import React, { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import { getMyDeliveries } from '../../api/driver';
import { getTeamMe } from '../../api/team';
import DarkHeader, { HeaderStat, HeaderStats, Initials } from '../../components/DarkHeader';
import TeamNav from '../../components/TeamNav';
import { Card, EmptyState, ErrorState, LoadingState, MpesaMark, Pill } from '../../components/ui';
import useDriverLocation, { DENIED, SHARING, STARTING } from '../../hooks/useDriverLocation';
import { COLORS, FONTS } from '../../theme';
import { formatKes } from '../../utils/format';
import { formatTime, mapsUrl, useTeamErrorHandler } from '../team/teamErrors';

const REFRESH_MS = 15000;
const ON_THE_WAY = 'On the Way';

export function MoneyLine({ order }) {
  if (order.payment_method === 'cash' && order.payment_status !== 'paid') {
    return (
      <View style={[styles.money, styles.moneyCash]}>
        <Ionicons name="cash-outline" size={17} color={COLORS.amber} />
        <Text style={[styles.moneyText, { color: COLORS.amber }]}>Collect {formatKes(order.total)} cash</Text>
      </View>
    );
  }

  return (
    <View style={[styles.money, styles.moneyPaid]}>
      <MpesaMark width={36} height={20} />
      <Text style={[styles.moneyText, { color: COLORS.ok }]}>Paid · nothing to collect</Text>
    </View>
  );
}

function LocationBar({ status }) {
  if (status === SHARING) {
    return (
      <View style={styles.locationBar}>
        <View style={[styles.dot, { backgroundColor: COLORS.ok }]} />
        <Text style={styles.locationText}>Sharing your location with your customers</Text>
      </View>
    );
  }

  if (status === DENIED) {
    return (
      <View style={[styles.locationBar, styles.locationBad]}>
        <Ionicons name="warning" size={16} color={COLORS.red} />
        <Text style={[styles.locationText, { color: COLORS.red }]}>
          Location is off, so customers cannot follow you. Allow location for this app in your phone settings.
        </Text>
      </View>
    );
  }

  if (status === STARTING) {
    return (
      <View style={styles.locationBar}>
        <View style={[styles.dot, { backgroundColor: '#A9B8CE' }]} />
        <Text style={styles.locationText}>Starting location sharing…</Text>
      </View>
    );
  }

  return null;
}

function DeliveryCard({ order, number, onOpen }) {
  const onTheWay = order.status === ON_THE_WAY;

  return (
    <Card>
      <TouchableOpacity onPress={onOpen} activeOpacity={0.85} accessibilityRole="button">
        <View style={styles.cardTop}>
          <View style={styles.number}>
            <Text style={styles.numberText}>{number}</Text>
          </View>
          <View style={styles.cardTopText}>
            <Text style={styles.customer}>{order.customer.full_name}</Text>
            <Text style={styles.meta}>
              {onTheWay && order.dispatched_at ? `On the way since ${formatTime(order.dispatched_at)}` : 'Being prepared at the branch'}
            </Text>
          </View>
          {onTheWay ? null : <Pill label="Not ready yet" tone="neutral" />}
        </View>

        <View style={styles.placeRow}>
          <Ionicons name="location-outline" size={15} color={COLORS.muted} />
          <Text style={styles.place} numberOfLines={1}>{order.address.label} · {order.address.address_line}</Text>
        </View>
        <Text style={styles.items}>
          {order.items.map((item) => `${item.quantity} × ${item.product_name}`).join(', ')}
        </Text>

        <MoneyLine order={order} />
      </TouchableOpacity>

      {onTheWay ? (
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => Linking.openURL(`tel:+${order.customer.phone_number}`)}
            accessibilityRole="button"
            accessibilityLabel={`Call ${order.customer.full_name}`}
          >
            <Ionicons name="call" size={16} color={COLORS.royal} />
            <Text style={styles.outlineText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => Linking.openURL(mapsUrl(order.address))}
            accessibilityRole="button"
          >
            <Ionicons name="navigate" size={16} color={COLORS.royal} />
            <Text style={styles.outlineText}>Navigate</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.solidButton} onPress={onOpen} accessibilityRole="button">
            <Text style={styles.solidText}>Open</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </Card>
  );
}

export default function DriverHomeScreen({ navigation }) {
  const handleError = useTeamErrorHandler(navigation);

  const [me, setMe] = useState(null);
  const [deliveries, setDeliveries] = useState(null);
  const [doneCount, setDoneCount] = useState(0);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    try {
      const [meData, active, done] = await Promise.all([
        getTeamMe(),
        getMyDeliveries(false),
        getMyDeliveries(true),
      ]);

      setMe(meData);
      setDeliveries(active);
      setDoneCount(done.length);
      setLoadError('');
    } catch (err) {
      handleError(err, setLoadError);
    }
  }, [handleError]);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, REFRESH_MS);
      return () => clearInterval(timer);
    }, [load])
  );

  const onTheWay = (deliveries || []).filter((order) => order.status === ON_THE_WAY);

  // This screen stays open underneath the delivery screen, so sharing
  // keeps running while the driver works through a delivery.
  const { status: locationStatus } = useDriverLocation(onTheWay.length > 0);

  const cashToCollect = onTheWay.filter(
    (order) => order.payment_method === 'cash' && order.payment_status !== 'paid'
  ).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />

      {deliveries === null ? (
        loadError ? <ErrorState message={loadError} onRetry={load} /> : <LoadingState />
      ) : (
        <>
          <DarkHeader
            eyebrow={`${(me?.branch?.name || '').toUpperCase()} · DRIVER`}
            eyebrowIcon="car"
            title={`Hi, ${me?.full_name.split(' ')[0] || ''}`}
            right={<Initials name={me?.full_name} />}
          >
            <HeaderStats>
              <HeaderStat
                label="TO DELIVER"
                value={String(onTheWay.length)}
                sub={cashToCollect ? `${cashToCollect} cash to collect` : 'nothing to collect'}
              />
              <HeaderStat label="DELIVERED TODAY" value={String(doneCount)} sub="see Done today" />
            </HeaderStats>
          </DarkHeader>

          {deliveries.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState icon="car-outline" title="No deliveries right now" text="When the branch assigns you an order, it appears here." />
            </View>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              <LocationBar status={locationStatus} />

              {deliveries.map((order, index) => (
                <DeliveryCard
                  key={order.id}
                  order={order}
                  number={index + 1}
                  onOpen={() => navigation.navigate('DriverDelivery', { orderId: order.id })}
                />
              ))}
            </ScrollView>
          )}
        </>
      )}

      <TeamNav role="driver" activeTab="deliveries" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.deep },
  emptyWrap: { flex: 1, backgroundColor: COLORS.ground },
  list: { flex: 1, backgroundColor: COLORS.ground },
  listContent: { gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 },
  locationBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  locationBad: { padding: 12, borderRadius: 12, backgroundColor: COLORS.redBg },
  locationText: { flex: 1, color: COLORS.muted, fontFamily: FONTS.semibold, fontSize: 12, lineHeight: 17 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  number: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.tint, alignItems: 'center', justifyContent: 'center' },
  numberText: { color: COLORS.royal, fontFamily: FONTS.extrabold, fontSize: 13 },
  cardTopText: { flex: 1 },
  customer: { color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 15 },
  meta: { marginTop: 1, color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 12 },
  placeRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  place: { flex: 1, color: COLORS.ink, fontFamily: FONTS.medium, fontSize: 13 },
  items: { marginTop: 4, marginBottom: 10, color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 13 },
  money: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },
  moneyCash: { backgroundColor: COLORS.amberBg },
  moneyPaid: { backgroundColor: COLORS.okBg },
  moneyText: { fontFamily: FONTS.extrabold, fontSize: 13 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 10 },
  outlineButton: { flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.line },
  outlineText: { color: COLORS.royal, fontFamily: FONTS.extrabold, fontSize: 13 },
  solidButton: { flex: 1, height: 42, borderRadius: 12, backgroundColor: COLORS.royal, alignItems: 'center', justifyContent: 'center' },
  solidText: { color: COLORS.surface, fontFamily: FONTS.extrabold, fontSize: 13 },
});
