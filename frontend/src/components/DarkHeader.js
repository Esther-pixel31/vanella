import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONTS } from '../theme';

// The dark navy header of the team screens: a small label (e.g. the
// branch), a title, an optional element on the right, and anything below.
export default function DarkHeader({ eyebrow, eyebrowIcon = 'storefront', title, right, children }) {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <View style={styles.text}>
          {eyebrow ? (
            <View style={styles.eyebrowRow}>
              <Ionicons name={eyebrowIcon} size={13} color={COLORS.sky} />
              <Text style={styles.eyebrow}>{eyebrow}</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
        </View>

        {right}
      </View>

      {children}
    </View>
  );
}

// A number tile for inside the dark header.
export function HeaderStat({ label, value, sub }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export function HeaderStats({ children }) {
  return <View style={styles.stats}>{children}</View>;
}

export function Initials({ name, size = 44 }) {
  const letters = (name || '?')
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean);
  const text = letters.length > 1 ? letters[0] + letters[letters.length - 1] : letters[0] || '?';

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size >= 50 ? 19 : 15 }]}>{text.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    backgroundColor: COLORS.deep,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: {
    flex: 1,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    color: COLORS.sky,
    fontFamily: FONTS.bold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  title: {
    marginTop: 4,
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 24,
    letterSpacing: -0.4,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statLabel: {
    color: COLORS.sky,
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  statValue: {
    marginTop: 4,
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 20,
  },
  statSub: {
    marginTop: 2,
    color: '#B9CCE8',
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  avatar: {
    backgroundColor: COLORS.royal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
  },
});
