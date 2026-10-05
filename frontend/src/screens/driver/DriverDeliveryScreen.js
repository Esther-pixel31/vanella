import React, { useCallback, useState } from 'react';
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

import { ApiError } from '../../api/client';
import { deliverWithCode, getMyDelivery } from '../../api/driver';
import LiveMap from '../../components/LiveMap';
import PrimaryButton from '../../components/PrimaryButton';
import { Card, ErrorState, IconTile, LoadingState, TopBar } from '../../components/ui';
import { COLORS, FONTS } from '../../theme';
import { formatKes, formatOrderRef } from '../../utils/format';
import { mapsUrl, useTeamErrorHandler } from '../team/teamErrors';
import { MoneyLine } from './DriverHomeScreen';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

// Number pad sheet where the driver types the customer's 4-digit code.
function CodeSheet({ visible, order, onClose, onDelivered, handleError }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const press = (key) => {
    setError('');
    if (key === 'back') setCode((value) => value.slice(0, -1));
    else if (key && code.length < 4) setCode((value) => value + key);
  };

  const confirm = async () => {
    setSaving(true);
    setError('');

    try {
      onDelivered(await deliverWithCode(order.id, code));
      setCode('');
    } catch (err) {
      // A wrong code is a 400 with a helpful message; keep the sheet open.
      if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
        setCode('');
      } else {
        handleError(err, setError);
      }
    } finally {
      setSaving(false);
    }
  };

  const cash = order.payment_method === 'cash' && order.payment_status !== 'paid';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTap} onPress={onClose} accessibilityLabel="Close" />

        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Enter the delivery code</Text>
          <Text style={styles.sheetSub}>
            Ask {order.customer.full_name.split(' ')[0]} for the 4-digit code in their Vanella app.
            {cash ? ` Collect ${formatKes(order.total)} cash first.` : ''}
          </Text>

          <View style={styles.boxes} accessible accessibilityLabel={`Code entered: ${code.split('').join(' ') || 'none'}`}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.box,
                  index === code.length && styles.boxActive,
                  Boolean(code[index]) && styles.boxFilled,
                  Boolean(error) && styles.boxError,
                ]}
              >
                <Text style={styles.boxText}>{code[index] || ''}</Text>
              </View>
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.pad}>
            {KEYS.map((key, index) =>
              key ? (
                <TouchableOpacity
                  key={index}
                  style={[styles.key, key === 'back' && styles.keyPlain]}
                  onPress={() => press(key)}
                  accessibilityRole="button"
                  accessibilityLabel={key === 'back' ? 'Delete' : key}
                >
                  {key === 'back' ? (
                    <Ionicons name="backspace-outline" size={24} color={COLORS.ink} />
                  ) : (
                    <Text style={styles.keyText}>{key}</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View key={index} style={styles.keySpacer} />
              )
            )}
          </View>

          <PrimaryButton
            title="Confirm delivery"
            onPress={confirm}
            disabled={code.length !== 4}
            loading={saving}
            style={styles.confirm}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function DriverDeliveryScreen({ navigation, route }) {
  const { orderId } = route.params;
  const handleError = useTeamErrorHandler(navigation);

  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [entering, setEntering] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await getMyDelivery(orderId));
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

  if (order === null) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <TopBar title="Delivery" onBack={() => navigation.goBack()} />
        {loadError ? <ErrorState message={loadError} onRetry={load} /> : <LoadingState />}
      </SafeAreaView>
    );
  }

  const delivered = order.status === 'Delivered';
  const onTheWay = order.status === 'On the Way';
  const destination =
    order.address.latitude != null
      ? { latitude: order.address.latitude, longitude: order.address.longitude }
      : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <TopBar title={`Order #${formatOrderRef(order.id)}`} onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {delivered ? (
          <View style={styles.doneBanner}>
            <View style={styles.doneIcon}>
              <Ionicons name="checkmark" size={30} color={COLORS.surface} />
            </View>
            <Text style={styles.doneTitle}>Delivered</Text>
            <Text style={styles.doneText}>
              {order.payment_method === 'cash'
                ? `Hand the ${formatKes(order.total)} cash in at the branch.`
                : 'Paid by M-Pesa. Nothing to hand in.'}
            </Text>
          </View>
        ) : destination ? (
          <LiveMap driver={null} destination={destination} height={200} />
        ) : null}

        <View style={styles.body}>
          <Card style={styles.cardGap}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.label}>Deliver to</Text>
                <Text style={styles.value}>{order.customer.full_name} · {order.address.address_line}</Text>
                {order.customer_note ? <Text style={styles.note}>Note: {order.customer_note}</Text> : null}
              </View>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => Linking.openURL(`tel:+${order.customer.phone_number}`)}
                accessibilityRole="button"
                accessibilityLabel={`Call ${order.customer.full_name}`}
              >
                <Ionicons name="call" size={18} color={COLORS.royal} />
              </TouchableOpacity>
            </View>

            {!delivered ? (
              <TouchableOpacity style={styles.navButton} onPress={() => Linking.openURL(mapsUrl(order.address))} accessibilityRole="button">
                <Ionicons name="navigate" size={17} color={COLORS.royal} />
                <Text style={styles.navText}>Navigate with Google Maps</Text>
              </TouchableOpacity>
            ) : null}
          </Card>

          {!delivered ? <View style={styles.spaced}><MoneyLine order={order} /></View> : null}

          <Card style={[styles.spaced, styles.cardGap]}>
            {order.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.quantity} × {item.product_name}</Text>
                <Text style={styles.itemTotal}>{item.is_free ? 'FREE' : formatKes(item.line_total)}</Text>
              </View>
            ))}
          </Card>

          {!onTheWay && !delivered ? (
            <View style={[styles.spaced, styles.waiting]}>
              <IconTile name="time" tone="neutral" size={36} iconSize={18} />
              <Text style={styles.waitingText}>Still being prepared at the branch. It will move to your list when it is ready.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {onTheWay ? (
        <View style={styles.actionBar}>
          <Text style={styles.actionNote}>At the door, ask the customer for their 4-digit code.</Text>
          <PrimaryButton title="Enter delivery code" onPress={() => setEntering(true)} />
        </View>
      ) : null}

      {onTheWay ? (
        <CodeSheet
          visible={entering}
          order={order}
          onClose={() => setEntering(false)}
          onDelivered={(updated) => {
            setEntering(false);
            setOrder(updated);
          }}
          handleError={handleError}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.ground },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  body: { paddingHorizontal: 20, paddingTop: 14 },
  cardGap: { gap: 10 },
  spaced: { marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowText: { flex: 1 },
  label: { color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 12 },
  value: { marginTop: 2, color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 16 },
  note: { marginTop: 4, color: COLORS.amber, fontFamily: FONTS.semibold, fontSize: 13 },
  iconButton: { width: 42, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  navButton: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.line },
  navText: { color: COLORS.royal, fontFamily: FONTS.extrabold, fontSize: 14 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  itemName: { flex: 1, color: COLORS.ink, fontFamily: FONTS.medium, fontSize: 14 },
  itemTotal: { color: COLORS.ink, fontFamily: FONTS.bold, fontSize: 14 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waitingText: { flex: 1, color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 13, lineHeight: 19 },
  doneBanner: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 },
  doneIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.ok, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { marginTop: 12, color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 24 },
  doneText: { marginTop: 4, textAlign: 'center', color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 14 },
  actionBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.surface, gap: 8 },
  actionNote: { textAlign: 'center', color: COLORS.muted, fontFamily: FONTS.semibold, fontSize: 13 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(6, 18, 46, 0.55)' },
  backdropTap: { flex: 1 },
  sheet: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: COLORS.ground },
  handle: { alignSelf: 'center', width: 40, height: 5, marginBottom: 14, borderRadius: 3, backgroundColor: COLORS.line },
  sheetTitle: { color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 21 },
  sheetSub: { marginTop: 4, color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 13, lineHeight: 19 },
  boxes: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 18 },
  box: { width: 58, height: 66, borderRadius: 16, borderWidth: 2, borderColor: COLORS.line, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: COLORS.royal },
  boxFilled: { backgroundColor: COLORS.tint },
  boxError: { borderColor: COLORS.red },
  boxText: { color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 28 },
  errorText: { marginTop: -6, marginBottom: 12, textAlign: 'center', color: COLORS.red, fontFamily: FONTS.semibold, fontSize: 14 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  key: { width: '31.5%', height: 56, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  keyPlain: { backgroundColor: 'transparent' },
  keySpacer: { width: '31.5%', height: 56 },
  keyText: { color: COLORS.ink, fontFamily: FONTS.bold, fontSize: 24 },
  confirm: { marginTop: 14 },
});
