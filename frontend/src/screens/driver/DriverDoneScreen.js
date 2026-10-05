import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import { getMyDeliveries } from '../../api/driver';
import TeamNav from '../../components/TeamNav';
import { Card, EmptyState, ErrorState, LoadingState, Pill, ScreenTitle } from '../../components/ui';
import { COLORS, FONTS } from '../../theme';
import { formatKes } from '../../utils/format';
import { formatTime, useTeamErrorHandler } from '../team/teamErrors';

export default function DriverDoneScreen({ navigation }) {
  const handleError = useTeamErrorHandler(navigation);

  const [done, setDone] = useState(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    try {
      setDone(await getMyDeliveries(true));
      setLoadError('');
    } catch (err) {
      handleError(err, setLoadError);
    }
  }, [handleError]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const cashOrders = (done || []).filter((order) => order.payment_method === 'cash');
  const cashTotal = cashOrders.reduce((sum, order) => sum + Number(order.total), 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <ScreenTitle title="Done today" />

      {done === null ? (
        loadError ? <ErrorState message={loadError} onRetry={load} /> : <LoadingState />
      ) : done.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="Nothing delivered yet today" text="Finished deliveries appear here." />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.cashCard}>
            <View style={styles.cashIcon}>
              <Ionicons name="cash-outline" size={22} color={COLORS.surface} />
            </View>
            <View>
              <Text style={styles.cashLabel}>CASH TO HAND IN</Text>
              <Text style={styles.cashValue}>{formatKes(cashTotal)}</Text>
              <Text style={styles.cashSub}>
                From {cashOrders.length} cash deliver{cashOrders.length === 1 ? 'y' : 'ies'} today
              </Text>
            </View>
          </View>

          <Card style={styles.list}>
            {done.map((order, index) => (
              <View key={order.id} style={[styles.row, index < done.length - 1 && styles.rowDivider]}>
                <View style={styles.tick}>
                  <Ionicons name="checkmark" size={16} color={COLORS.surface} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.name}>{order.customer.full_name}</Text>
                  <Text style={styles.meta}>
                    {order.address.address_line} · {order.delivered_at ? formatTime(order.delivered_at) : ''}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.amount}>{formatKes(order.total)}</Text>
                  {order.payment_method === 'cash' ? <Pill label="Cash · hand in" tone="amber" /> : <Pill label="M-Pesa · paid" tone="ok" />}
                </View>
              </View>
            ))}
          </Card>
        </ScrollView>
      )}

      <TeamNav role="driver" activeTab="done" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.ground },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  cashCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, backgroundColor: COLORS.deep },
  cashIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.12)', alignItems: 'center', justifyContent: 'center' },
  cashLabel: { color: COLORS.sky, fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1.2 },
  cashValue: { marginTop: 2, color: COLORS.surface, fontFamily: FONTS.extrabold, fontSize: 24 },
  cashSub: { marginTop: 2, color: '#B9CCE8', fontFamily: FONTS.medium, fontSize: 12 },
  list: { marginTop: 14, paddingVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.line },
  tick: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.ok, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  name: { color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 14 },
  meta: { marginTop: 1, color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 12 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 14 },
});
