import React from 'react';

import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import BottomNav from '../../../components/BottomNav';
import PrimaryButton from '../../../components/PrimaryButton';
import { Card, EmptyState, TopBar } from '../../../components/ui';
import { useCart } from '../../../context/CartContext';
import { POINTS_PER_20L, POINTS_PER_BULK } from '../../../data/rewards';
import { COLORS, FONTS } from '../../../theme';
import { formatKes } from '../../../utils/format';


function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  // Cart names may contain a line break meant for the home cards.
  const name = item.name.replace('\n', ' ');

  return (
    <View style={styles.item}>
      <View style={styles.itemImageBox}>
        <Image source={item.image} style={styles.itemImage} resizeMode="cover" />
      </View>

      <View style={styles.itemBody}>
        <View style={styles.itemTopRow}>
          <Text style={styles.itemName}>{name}</Text>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${name}`}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.itemEach}>{formatKes(item.price)} each</Text>

        <View style={styles.itemBottomRow}>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={onDecrease}
              accessibilityRole="button"
              accessibilityLabel={`Fewer ${name}`}
            >
              <Ionicons name="remove" size={17} color={COLORS.ink} />
            </TouchableOpacity>

            <Text style={styles.quantity}>{item.quantity}</Text>

            <TouchableOpacity
              style={styles.stepButton}
              onPress={onIncrease}
              accessibilityRole="button"
              accessibilityLabel={`More ${name}`}
            >
              <Ionicons name="add" size={17} color={COLORS.ink} />
            </TouchableOpacity>
          </View>

          <Text style={styles.lineTotal}>
            {formatKes(item.price * item.quantity)}
          </Text>
        </View>
      </View>
    </View>
  );
}


export default function CartScreen({ navigation }) {
  const {
    items,
    note,
    setNote,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    clear,
    subtotal,
  } = useCart();

  // Vanella delivery is free.
  const total = subtotal;

  const cartEmpty = items.length === 0;

  // Matches the backend's earning rules (see data/rewards.js).
  const pointsToEarn = items.reduce(
    (points, item) =>
      points + item.quantity * (item.isBulk ? POINTS_PER_BULK : POINTS_PER_20L),
    0
  );

  const clearButton = cartEmpty ? null : (
    <TouchableOpacity onPress={clear} accessibilityRole="button">
      <Text style={styles.clearText}>Clear</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <TopBar
        title="Your order"
        onBack={() => navigation.goBack()}
        right={clearButton}
      />

      {cartEmpty ? (
        <EmptyState
          icon="cart-outline"
          title="Your order is empty"
          text="Add water from the home screen to get started."
          actionLabel="Browse products"
          onAction={() => navigation.navigate('CustomerHome')}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.itemList}>
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onIncrease={() => increaseQuantity(item.id)}
                onDecrease={() => decreaseQuantity(item.id)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </View>

          <Text style={styles.noteLabel}>
            Note for the driver <Text style={styles.noteOptional}>(optional)</Text>
          </Text>

          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Gate code, landmark or instructions"
            placeholderTextColor="#8193B0"
            accessibilityLabel="Note for the driver"
          />

          <View style={styles.pointsBanner}>
            <Ionicons name="gift" size={20} color={COLORS.royal} />
            <Text style={styles.pointsText}>
              You will earn{' '}
              <Text style={styles.pointsStrong}>{pointsToEarn} points</Text> with
              this order
            </Text>
          </View>

          <Card style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatKes(subtotal)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={styles.freeText}>Free</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatKes(total)}</Text>
            </View>
          </Card>
        </ScrollView>
      )}

      {cartEmpty ? null : (
        <View style={styles.actionBar}>
          <PrimaryButton
            title="Go to checkout"
            rightText={formatKes(total)}
            onPress={() => navigation.navigate('Checkout')}
          />
        </View>
      )}

      <BottomNav activeTab="home" navigation={navigation} />
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  clearText: {
    color: COLORS.muted,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },

  /* Items */
  itemList: {
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  itemImageBox: {
    width: 76,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.deep,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  itemName: {
    flex: 1,
    color: COLORS.ink,
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  removeButton: {
    width: 32,
    height: 32,
    marginTop: -6,
    marginRight: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemEach: {
    marginTop: -4,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF3FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    width: 30,
    textAlign: 'center',
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 15,
  },
  lineTotal: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 15,
  },

  /* Note */
  noteLabel: {
    marginTop: 16,
    marginBottom: 6,
    color: COLORS.ink,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  noteOptional: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
  },
  noteInput: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    color: COLORS.ink,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },

  /* Points */
  pointsBanner: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.tint,
  },
  pointsText: {
    flex: 1,
    color: COLORS.ink,
    fontFamily: FONTS.semibold,
    fontSize: 13,
  },
  pointsStrong: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
  },

  /* Summary */
  summary: {
    marginTop: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  summaryValue: {
    color: COLORS.ink,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  freeText: {
    color: COLORS.ok,
    fontFamily: FONTS.extrabold,
    fontSize: 14,
  },
  divider: {
    height: 1,
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
    fontSize: 22,
  },

  /* Action bar */
  actionBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
});
