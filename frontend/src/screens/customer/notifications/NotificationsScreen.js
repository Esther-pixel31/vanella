import React from 'react';
import { StyleSheet } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import BottomNav from '../../../components/BottomNav';
import { EmptyState, ScreenTitle } from '../../../components/ui';
import { COLORS } from '../../../theme';


// The backend has no notifications yet, so this only shows the empty state.
// The canvas has the design for the list once they exist.
export default function NotificationsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <ScreenTitle title="Alerts" />

      <EmptyState
        icon="notifications-outline"
        title="No alerts yet"
        text="Updates about your orders, payments and rewards will appear here."
      />

      <BottomNav activeTab="notifications" navigation={navigation} />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.ground,
  },
});
