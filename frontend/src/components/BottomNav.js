import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

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
  return (
    <View style={styles.bottomNav}>
      {TABS.map((tab) => {
        const active = tab.id === activeTab;

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

            <Ionicons
              name={active ? tab.activeIcon : tab.icon}
              size={25}
              color={active ? '#087FF5' : '#718198'}
            />

            <Text style={[styles.navLabel, active && styles.navLabelActive]}>
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
    height: 82,

    backgroundColor: '#FFFFFF',

    borderTopWidth: 1,
    borderTopColor: '#E6EDF5',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',

    paddingBottom: 5,

    shadowColor: '#163A6D',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,

    elevation: 7,
  },


  navItem: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',
  },


  navLabel: {
    color: '#667891',

    fontSize: 12,
    lineHeight: 16,

    fontWeight: '500',

    marginTop: 3,
  },


  navLabelActive: {
    color: '#087FF5',

    fontWeight: '700',
  },

});
