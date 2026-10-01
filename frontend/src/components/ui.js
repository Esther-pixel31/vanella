// Small building blocks of the redesign, shared by the customer screens.
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONTS } from '../theme';

const TONES = {
  blue: { fg: COLORS.royal, bg: COLORS.tint },
  ok: { fg: COLORS.ok, bg: COLORS.okBg },
  amber: { fg: COLORS.amber, bg: COLORS.amberBg },
  red: { fg: COLORS.red, bg: COLORS.redBg },
  neutral: { fg: COLORS.muted, bg: COLORS.track },
};

// Order status (backend text) -> pill tone.
export const ORDER_STATUS_TONES = {
  'Order Received': 'neutral',
  'Ready to Deliver': 'amber',
  'On the Way': 'blue',
  Delivered: 'ok',
};

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// Back button, centred title and an optional element on the right.
export function TopBar({ title, onBack, right }) {
  return (
    <View style={styles.topBar}>
      {onBack ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={21} color={COLORS.ink} />
        </TouchableOpacity>
      ) : (
        <View style={styles.topBarSide} />
      )}

      <Text style={styles.topBarTitle} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.topBarSide}>{right}</View>
    </View>
  );
}

// Large page title used on the bottom-bar screens.
export function ScreenTitle({ title, right }) {
  return (
    <View style={styles.screenTitleRow}>
      <Text style={styles.screenTitle}>{title}</Text>
      {right}
    </View>
  );
}

export function SectionLabel({ children, style }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

export function SectionTitle({ title, actionLabel, onAction, style }) {
  return (
    <View style={[styles.sectionTitleRow, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {actionLabel ? (
        <TouchableOpacity onPress={onAction} accessibilityRole="button">
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Pill({ label, tone = 'blue' }) {
  const colors = TONES[tone] || TONES.neutral;

  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <Text style={[styles.pillText, { color: colors.fg }]}>{label}</Text>
    </View>
  );
}

export function IconTile({ name, tone = 'blue', size = 40, iconSize = 20 }) {
  const colors = TONES[tone] || TONES.blue;

  return (
    <View
      style={[
        styles.iconTile,
        { width: size, height: size, backgroundColor: colors.bg },
      ]}
    >
      <Ionicons name={name} size={iconSize} color={colors.fg} />
    </View>
  );
}

// Stand-in for Safaricom's M-Pesa logo until the official file is added.
export function MpesaMark({ width = 44, height = 30 }) {
  return (
    <View
      style={[styles.mpesa, { width, height }]}
      accessible
      accessibilityLabel="M-Pesa"
    >
      <Text style={styles.mpesaText}>M-PESA</Text>
    </View>
  );
}

export function ProgressBar({ progress, color = COLORS.royal, height = 6 }) {
  const percent = Math.max(0, Math.min(progress, 1)) * 100;

  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      <View
        style={{
          width: `${percent}%`,
          height: '100%',
          borderRadius: height,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function RadioDot({ selected }) {
  return (
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected ? <View style={styles.radioInner} /> : null}
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={COLORS.royal} />
    </View>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.centered}>
      <Ionicons name="cloud-offline-outline" size={44} color={COLORS.muted} />
      <Text style={styles.centeredText}>{message}</Text>

      {onRetry ? (
        <TouchableOpacity
          style={styles.centeredButton}
          onPress={onRetry}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.centeredButtonText}>Try Again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon, title, text, actionLabel, onAction }) {
  return (
    <View style={styles.centered}>
      <IconTile name={icon} size={64} iconSize={30} />
      <Text style={styles.centeredTitle}>{title}</Text>
      <Text style={styles.centeredText}>{text}</Text>

      {actionLabel ? (
        <TouchableOpacity
          style={styles.centeredButton}
          onPress={onAction}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.centeredButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarSide: {
    minWidth: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    marginHorizontal: 8,
    textAlign: 'center',
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 18,
  },
  screenTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },
  screenTitle: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 27,
    letterSpacing: -0.5,
  },
  sectionLabel: {
    marginBottom: 8,
    color: COLORS.muted,
    fontFamily: FONTS.extrabold,
    fontSize: 12,
    letterSpacing: 0.7,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 16,
  },
  sectionAction: {
    color: COLORS.royal,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  pill: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    justifyContent: 'center',
  },
  pillText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  iconTile: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mpesa: {
    borderRadius: 8,
    backgroundColor: COLORS.mpesa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mpesaText: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontStyle: 'italic',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  track: {
    overflow: 'hidden',
    backgroundColor: COLORS.track,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#A9B8CE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.royal,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.royal,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  centeredTitle: {
    marginTop: 14,
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 20,
  },
  centeredText: {
    marginTop: 8,
    textAlign: 'center',
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  centeredButton: {
    height: 48,
    marginTop: 20,
    paddingHorizontal: 28,
    borderRadius: 16,
    backgroundColor: COLORS.royal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredButtonText: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 15,
  },
});
