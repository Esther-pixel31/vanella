import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONTS } from '../theme';

const TABS = [
  { id: 'home', label: 'Home', route: 'CustomerHome', icon: 'home-outline', activeIcon: 'home' },
  { id: 'orders', label: 'Orders', route: 'Orders', icon: 'receipt-outline', activeIcon: 'receipt' },
  { id: 'rewards', label: 'Rewards', route: 'Rewards', icon: 'gift-outline', activeIcon: 'gift' },
  { id: 'notifications', label: 'Alerts', route: 'Notifications', icon: 'notifications-outline', activeIcon: 'notifications' },
  { id: 'profile', label: 'Profile', route: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

// The bottom bar on the customer screens. `activeTab` is the id of the
// tab the current screen belongs to. The home screen has its own copy.
export default function BottomNav({ activeTab, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bottomNav, { paddingBottom: 8 + insets.bottom }]}>
      {TABS.map((tab) => {
        const active = tab.id === activeTab;
        const color = active ? COLORS.royal : COLORS.muted;

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => {
              if (!active) navigation.navigate(tab.route);
            }}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
          >
            <View style={[styles.iconPill, active && styles.iconPillActive]}>
              <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={22}
                color={color}
              />
            </View>

            <Text
              style={[
                styles.navLabel,
                { color },
                active && styles.navLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  navItem: {
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
  navLabel: {
    fontFamily: FONTS.semibold,
    fontSize: 11.5,
  },
  navLabelActive: {
    fontFamily: FONTS.extrabold,
  },
});
