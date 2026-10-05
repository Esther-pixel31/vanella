import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONTS } from '../theme';

const ACCOUNT = { id: 'account', label: 'Account', route: 'TeamAccount', icon: 'person-outline', activeIcon: 'person' };

// Tabs for each team role (customers use BottomNav instead).
const TABS = {
  staff: [
    { id: 'orders', label: 'Orders', route: 'StaffHome', icon: 'receipt-outline', activeIcon: 'receipt' },
    ACCOUNT,
  ],
  driver: [
    { id: 'deliveries', label: 'Deliveries', route: 'DriverHome', icon: 'car-outline', activeIcon: 'car' },
    { id: 'done', label: 'Done today', route: 'DriverDone', icon: 'checkmark-done-outline', activeIcon: 'checkmark-done' },
    ACCOUNT,
  ],
  admin: [
    { id: 'overview', label: 'Overview', route: 'AdminHome', icon: 'grid-outline', activeIcon: 'grid' },
    { id: 'team', label: 'Team', route: 'AdminTeam', icon: 'people-outline', activeIcon: 'people' },
    ACCOUNT,
  ],
};

export default function TeamNav({ role, activeTab, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: 8 + insets.bottom }]}>
      {(TABS[role] || []).map((tab) => {
        const active = tab.id === activeTab;
        const color = active ? COLORS.royal : COLORS.muted;

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.item}
            activeOpacity={0.7}
            onPress={() => {
              if (!active) navigation.navigate(tab.route, tab.id === 'account' ? { role } : undefined);
            }}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
          >
            <View style={[styles.iconPill, active && styles.iconPillActive]}>
              <Ionicons name={active ? tab.activeIcon : tab.icon} size={22} color={color} />
            </View>

            <Text style={[styles.label, { color }, active && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconPill: {
    width: 56,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: COLORS.tint,
  },
  label: {
    fontFamily: FONTS.semibold,
    fontSize: 11.5,
  },
  labelActive: {
    fontFamily: FONTS.extrabold,
  },
});
