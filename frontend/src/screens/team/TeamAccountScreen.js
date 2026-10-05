import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import { clearTokens } from '../../api/client';
import { getTeamMe } from '../../api/team';
import { Initials } from '../../components/DarkHeader';
import PrimaryButton from '../../components/PrimaryButton';
import TeamNav from '../../components/TeamNav';
import { Card, ErrorState, IconTile, LoadingState, ScreenTitle } from '../../components/ui';
import { COLORS, FONTS } from '../../theme';
import { formatPhone, useTeamErrorHandler } from './teamErrors';

const ROLE_NAMES = { admin: 'Admin', staff: 'Branch staff', driver: 'Driver' };

function InfoRow({ icon, label, value, last = false }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <IconTile name={icon} size={36} iconSize={18} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

// Account page shared by admins, staff and drivers.
export default function TeamAccountScreen({ navigation, route }) {
  const handleError = useTeamErrorHandler(navigation);

  const [me, setMe] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoadError('');

    try {
      setMe(await getTeamMe());
    } catch (err) {
      handleError(err, setLoadError);
    }
  }, [handleError]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleLogout = async () => {
    await clearTokens();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const role = me?.role || route.params?.role;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <ScreenTitle title="Account" />

      {me === null ? (
        loadError ? <ErrorState message={loadError} onRetry={load} /> : <LoadingState />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.identity}>
            <Initials name={me.full_name} size={58} />
            <View style={styles.identityText}>
              <Text style={styles.name}>{me.full_name}</Text>
              <Text style={styles.role}>
                {ROLE_NAMES[me.role] || me.role}
                {me.branch ? ` · ${me.branch.name}` : ''}
              </Text>
            </View>
          </View>

          <Card style={styles.card}>
            <InfoRow icon="call" label="Phone number" value={formatPhone(me.phone_number)} />
            <InfoRow
              icon="person"
              label="Username"
              value={me.username || 'Not set (log in with your phone)'}
              last
            />
          </Card>

          <Text style={styles.note}>
            To change your details or password, ask your admin.
          </Text>

          {confirming ? (
            <Card style={styles.card}>
              <Text style={styles.confirmTitle}>Log out?</Text>
              <Text style={styles.confirmText}>
                You will need your username or phone number to sign in again.
              </Text>

              <PrimaryButton title="Yes, log out" onPress={handleLogout} style={styles.logoutConfirm} />

              <TouchableOpacity
                style={styles.cancel}
                onPress={() => setConfirming(false)}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <TouchableOpacity
              style={styles.logout}
              onPress={() => setConfirming(true)}
              accessibilityRole="button"
            >
              <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {role ? <TeamNav role={role} activeTab="account" navigation={navigation} /> : null}
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
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: COLORS.deep,
  },
  identityText: {
    flex: 1,
  },
  name: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 19,
  },
  role: {
    marginTop: 2,
    color: '#B9CCE8',
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
  card: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  rowValue: {
    marginTop: 1,
    color: COLORS.ink,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  note: {
    marginTop: 10,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
  logout: {
    height: 52,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F0C4C4',
    backgroundColor: COLORS.surface,
  },
  logoutText: {
    color: COLORS.red,
    fontFamily: FONTS.extrabold,
    fontSize: 15,
  },
  confirmTitle: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 18,
  },
  confirmText: {
    marginTop: 4,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  logoutConfirm: {
    marginTop: 14,
    backgroundColor: COLORS.red,
  },
  cancel: {
    height: 44,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 15,
  },
});
