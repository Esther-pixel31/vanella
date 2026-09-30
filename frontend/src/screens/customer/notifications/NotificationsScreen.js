import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import BottomNav from '../../../components/BottomNav';
import VanellaHeader from '../../../components/VanellaHeader';


const COLORS = {
  background: '#F5F8FC',
  text: '#082D6A',
  muted: '#63738B',
};


// The backend has no notifications yet, so this only shows the empty state.
export default function NotificationsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />

      <VanellaHeader
        onBack={() => navigation.goBack()}
        pageBackground={COLORS.background}
      />

      <View style={styles.content}>

        <Text style={styles.pageTitle}>
          Notifications
        </Text>

        <View style={styles.centered}>
          <Ionicons
            name="notifications-outline"
            size={48}
            color={COLORS.muted}
          />

          <Text style={styles.centeredTitle}>
            No notifications yet
          </Text>

          <Text style={styles.centeredText}>
            Updates about your orders and rewards will appear here.
          </Text>
        </View>

      </View>

      <BottomNav activeTab="notifications" navigation={navigation} />

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },


  content: {
    flex: 1,

    paddingHorizontal: 20,
    paddingTop: 4,
  },


  pageTitle: {
    color: COLORS.text,

    fontSize: 29,
    lineHeight: 35,

    fontWeight: '900',
  },


  centered: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 16,
  },


  centeredTitle: {
    color: COLORS.text,

    fontSize: 21,
    lineHeight: 26,

    fontWeight: '900',

    marginTop: 12,
  },


  centeredText: {
    color: COLORS.muted,

    fontSize: 15,
    lineHeight: 22,

    textAlign: 'center',

    marginTop: 6,
  },

});
