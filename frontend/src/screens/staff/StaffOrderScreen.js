import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
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
  assignOrderDriver,
  confirmOrderCash,
  getBranchDrivers,
  getStaffOrder,
  markOrderReady,
  staffMarkDelivered,
} from '../../api/staff';
import { Initials } from '../../components/DarkHeader';
import PrimaryButton from '../../components/PrimaryButton';
import {
  Card,
  ErrorState,
  IconTile,
  LoadingState,
  MpesaMark,
  Pill,
  RadioDot,
  TopBar,
} from '../../components/ui';
import { COLORS, FONTS } from '../../theme';
import { formatKes, formatOrderRef } from '../../utils/format';
import { formatTime, mapsUrl, useTeamErrorHandler } from '../team/teamErrors';

const STEPS = ['Order Received', 'Ready to Deliver', 'On the Way', 'Delivered'];
const STEP_LABELS = ['Received', 'Ready', 'On the way', 'Delivered'];

function InfoRow({ lead, label, value, extra }) {
  return (
    <View style={styles.infoRow}>
      {lead}
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      {extra}
    </View>
  );
}

function SmallButton({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.smallButton} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={17} color={COLORS.royal} />
    </TouchableOpacity>
  );
}

// Choosing a driver for an order, as a sheet over the order.
function AssignSheet({ visible, order, onClose, onAssigned, handleError }) {
  const [drivers, setDrivers] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;

    setDrivers(null);
    setError('');
    setSelected(order.driver?.id || null);

    getBranchDrivers(order.branch.id)
      .then(setDrivers)
      .catch((err) => handleError(err, setError));
  }, [visible, order, handleError]);

  const assign = async () => {
    setSaving(true);
    setError('');

    try {
      onAssigned(await assignOrderDriver(order.id, selected));
    } catch (err) {
      handleError(err, setError);
    } finally {
      setSaving(false);
    }
  };

  const chosen = drivers?.find((driver) => driver.id === selected);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTap} onPress={onClose} accessibilityLabel="Close" />

        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Assign a driver</Text>
          <Text style={styles.sheetSub}>
            #{formatOrderRef(order.id)} · {order.customer.full_name} · {order.address.address_line}
          </Text>

          {drivers === null ? (
            error ? <Text style={styles.errorText}>{error}</Text> : <ActivityIndicator style={styles.sheetLoading} color={COLORS.royal} />
          ) : drivers.length === 0 ? (
            <Text style={styles.sheetEmpty}>
              This branch has no active drivers. Ask your admin to add one.
            </Text>
          ) : (
            <View style={styles.driverList} accessibilityRole="radiogroup">
              {drivers.map((driver) => {
                const isSelected = driver.id === selected;

                return (
                  <TouchableOpacity
                    key={driver.id}
                    style={[styles.driverRow, isSelected && styles.driverRowOn]}
                    onPress={() => setSelected(driver.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <RadioDot selected={isSelected} />
                    <Initials name={driver.full_name} size={38} />
                    <Text style={styles.driverName}>{driver.full_name}</Text>
                    {driver.active_deliveries > 0 ? (
                      <Pill label={`On ${driver.active_deliveries} deliver${driver.active_deliveries === 1 ? 'y' : 'ies'}`} tone="amber" />
                    ) : (
                      <Pill label="Available" tone="ok" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {error && drivers !== null ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            title={chosen ? `Assign ${chosen.full_name.split(' ')[0]}` : 'Assign driver'}
            onPress={assign}
            disabled={!selected}
            loading={saving}
            style={styles.sheetButton}
          />

          <TouchableOpacity style={styles.cancel} onPress={onClose} accessibilityRole="button">
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function StaffOrderScreen({ navigation, route }) {
  const { orderId, openAssign = false } = route.params;
  const handleError = useTeamErrorHandler(navigation);

  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [confirmOverride, setConfirmOverride] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await getStaffOrder(orderId));
      setLoadError('');
    } catch (err) {
      handleError(err, setLoadError);
    }
  }, [handleError, orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Opened from the queue's "Assign driver" button.
  useEffect(() => {
    if (openAssign && order && order.status !== 'Delivered') setAssigning(true);
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  const run = async (action) => {
    setError('');
    setBusy(true);

    try {
      setOrder(await action());
      setConfirmOverride(false);
    } catch (err) {
      handleError(err, setError);
    } finally {
      setBusy(false);
    }
  };

  if (order === null) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <TopBar title="Order" onBack={() => navigation.goBack()} />
        {loadError ? <ErrorState message={loadError} onRetry={load} /> : <LoadingState />}
      </SafeAreaView>
    );
  }

  const stepIndex = Math.max(STEPS.indexOf(order.status), 0);
  const delivered = order.status === 'Delivered';
  const cashUnpaid = order.payment_method === 'cash' && order.payment_status !== 'paid';

  let primary = null;

  if (order.awaiting_payment) {
    primary = { note: 'Waiting for the customer to pay by M-Pesa. Do not prepare it yet.' };
  } else if (order.status === 'Order Received') {
    primary = { title: 'Mark ready', onPress: () => run(() => markOrderReady(order.id)), note: order.driver ? `It will go out with ${order.driver.full_name} straight away.` : null };
  } else if (order.status === 'Ready to Deliver') {
    primary = { title: 'Assign driver', onPress: () => setAssigning(true), note: 'The order goes on its way as soon as a driver is assigned.' };
  } else if (order.status === 'On the Way') {
    primary = { note: `On its way with ${order.driver?.full_name}. The driver finishes it with the customer's code.` };
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <TopBar title={`Order #${formatOrderRef(order.id)}`} onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>
          {formatTime(order.created_at)} · {order.payment_method === 'mpesa' ? 'M-PESA' : 'CASH ON DELIVERY'}
          {order.is_scheduled ? ' · NEXT-DAY' : ''}
        </Text>
        <Text style={styles.headline}>{order.awaiting_payment ? 'Waiting for payment' : order.status}</Text>

        <View style={styles.segments}>
          {STEPS.map((step, index) => (
            <View key={step} style={[styles.segment, index <= stepIndex && !order.awaiting_payment && styles.segmentOn]} />
          ))}
        </View>
        <View style={styles.segmentLabels}>
          {STEP_LABELS.map((label) => (
            <Text key={label} style={styles.segmentLabel}>{label}</Text>
          ))}
        </View>

        {/* CUSTOMER */}
        <Card style={[styles.card, styles.cardGap]}>
          <InfoRow
            lead={<IconTile name="person" size={36} iconSize={18} />}
            label="Customer"
            value={order.customer.full_name}
            extra={<SmallButton icon="call" label={`Call ${order.customer.full_name}`} onPress={() => Linking.openURL(`tel:+${order.customer.phone_number}`)} />}
          />
          <InfoRow
            lead={<IconTile name="location" size={36} iconSize={18} />}
            label="Deliver to"
            value={`${order.address.label} · ${order.address.address_line}`}
            extra={<SmallButton icon="map" label="Open in maps" onPress={() => Linking.openURL(mapsUrl(order.address))} />}
          />
          {order.customer_note ? (
            <InfoRow lead={<IconTile name="document-text" tone="amber" size={36} iconSize={18} />} label="Customer note" value={order.customer_note} />
          ) : null}
        </Card>

        {/* ITEMS */}
        <Card style={[styles.card, styles.itemsCard]}>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.quantity} × {item.product_name}</Text>
              <Text style={item.is_free ? styles.freeText : styles.itemTotal}>
                {item.is_free ? 'FREE' : formatKes(item.line_total)}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.itemRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatKes(order.total)}</Text>
          </View>
        </Card>

        {/* PAYMENT */}
        <Card style={styles.card}>
          <InfoRow
            lead={order.payment_method === 'mpesa' ? <MpesaMark width={36} height={36} /> : <IconTile name="cash" tone={cashUnpaid ? 'amber' : 'ok'} size={36} iconSize={18} />}
            label={order.payment_method === 'mpesa' ? 'Payment · M-Pesa' : 'Payment · cash on delivery'}
            value={order.payment_status === 'paid' ? `${formatKes(order.total)} paid` : `${formatKes(order.total)} not collected yet`}
            extra={order.payment_status === 'paid' ? <Pill label="Paid" tone="ok" /> : null}
          />
          {cashUnpaid && delivered ? (
            <TouchableOpacity style={styles.outlineButton} onPress={() => run(() => confirmOrderCash(order.id))} disabled={busy} accessibilityRole="button">
              <Text style={styles.outlineText}>Confirm cash received</Text>
            </TouchableOpacity>
          ) : null}
        </Card>

        {/* DRIVER */}
        <Card style={styles.card}>
          <InfoRow
            lead={order.driver ? <Initials name={order.driver.full_name} size={36} /> : <IconTile name="car" tone="neutral" size={36} iconSize={18} />}
            label="Driver"
            value={order.driver ? order.driver.full_name : 'No driver assigned yet'}
            extra={order.driver ? <SmallButton icon="call" label={`Call ${order.driver.full_name}`} onPress={() => Linking.openURL(`tel:+${order.driver.phone_number}`)} /> : null}
          />
          {!delivered && !order.awaiting_payment ? (
            <TouchableOpacity style={styles.outlineButton} onPress={() => setAssigning(true)} accessibilityRole="button">
              <Text style={styles.outlineText}>{order.driver ? 'Change driver' : 'Assign driver'}</Text>
            </TouchableOpacity>
          ) : null}
        </Card>

        {/* OVERRIDE */}
        {order.status === 'On the Way' ? (
          confirmOverride ? (
            <Card style={styles.card}>
              <Text style={styles.overrideTitle}>Finish without the customer's code?</Text>
              <Text style={styles.overrideText}>
                Only if the code cannot be used, e.g. the customer's phone is off.
                {cashUnpaid ? ' Confirm the cash separately once it is handed in.' : ''}
              </Text>
              <PrimaryButton title="Yes, mark delivered" onPress={() => run(() => staffMarkDelivered(order.id))} loading={busy} style={styles.overrideButton} />
              <TouchableOpacity style={styles.cancel} onPress={() => setConfirmOverride(false)} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <TouchableOpacity style={styles.linkButton} onPress={() => setConfirmOverride(true)} accessibilityRole="button">
              <Text style={styles.linkText}>Problem with the delivery code?</Text>
            </TouchableOpacity>
          )
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {primary ? (
        <View style={styles.actionBar}>
          {primary.note ? <Text style={styles.actionNote}>{primary.note}</Text> : null}
          {primary.title ? <PrimaryButton title={primary.title} onPress={primary.onPress} loading={busy} /> : null}
        </View>
      ) : null}

      <AssignSheet
        visible={assigning}
        order={order}
        onClose={() => setAssigning(false)}
        onAssigned={(updated) => {
          setOrder(updated);
          setAssigning(false);
        }}
        handleError={handleError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.ground },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 24 },
  eyebrow: { color: COLORS.royal, fontFamily: FONTS.bold, fontSize: 12, letterSpacing: 1 },
  headline: { marginTop: 4, color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 26, letterSpacing: -0.5 },
  segments: { flexDirection: 'row', gap: 6, marginTop: 12 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.track },
  segmentOn: { backgroundColor: COLORS.royal },
  segmentLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  segmentLabel: { color: COLORS.muted, fontFamily: FONTS.bold, fontSize: 11 },
  card: { marginTop: 12 },
  cardGap: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { flex: 1 },
  infoLabel: { color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 12 },
  infoValue: { marginTop: 1, color: COLORS.ink, fontFamily: FONTS.bold, fontSize: 14 },
  smallButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  itemsCard: { gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  itemName: { flex: 1, color: COLORS.ink, fontFamily: FONTS.medium, fontSize: 14 },
  itemTotal: { color: COLORS.ink, fontFamily: FONTS.bold, fontSize: 14 },
  freeText: { color: COLORS.ok, fontFamily: FONTS.extrabold, fontSize: 14 },
  divider: { height: 1, backgroundColor: COLORS.line },
  totalLabel: { color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 16 },
  totalValue: { color: COLORS.royal, fontFamily: FONTS.extrabold, fontSize: 18 },
  outlineButton: { height: 44, marginTop: 12, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  outlineText: { color: COLORS.royal, fontFamily: FONTS.extrabold, fontSize: 14 },
  overrideTitle: { color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 16 },
  overrideText: { marginTop: 4, color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 13, lineHeight: 19 },
  overrideButton: { marginTop: 12, backgroundColor: COLORS.amber },
  linkButton: { height: 44, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  linkText: { color: COLORS.muted, fontFamily: FONTS.bold, fontSize: 13, textDecorationLine: 'underline' },
  errorText: { marginTop: 12, color: COLORS.red, fontFamily: FONTS.semibold, fontSize: 14, lineHeight: 20 },
  actionBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.surface, gap: 8 },
  actionNote: { textAlign: 'center', color: COLORS.muted, fontFamily: FONTS.semibold, fontSize: 13, lineHeight: 18 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(6, 18, 46, 0.55)' },
  backdropTap: { flex: 1 },
  sheet: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: COLORS.surface },
  handle: { alignSelf: 'center', width: 40, height: 5, marginBottom: 14, borderRadius: 3, backgroundColor: COLORS.line },
  sheetTitle: { color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 20 },
  sheetSub: { marginTop: 4, marginBottom: 14, color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 13 },
  sheetLoading: { marginVertical: 24 },
  sheetEmpty: { marginVertical: 12, color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 14, lineHeight: 20 },
  driverList: { gap: 8 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.line },
  driverRowOn: { borderColor: COLORS.royal, backgroundColor: '#F4F7FF' },
  driverName: { flex: 1, color: COLORS.ink, fontFamily: FONTS.bold, fontSize: 14 },
  sheetButton: { marginTop: 16 },
  cancel: { height: 44, marginTop: 4, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: COLORS.royal, fontFamily: FONTS.extrabold, fontSize: 15 },
});
