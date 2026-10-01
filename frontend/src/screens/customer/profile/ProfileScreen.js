import React, { useCallback, useState } from 'react';

import {
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

import { getAddresses } from '../../../api/addresses';
import { ApiError, clearTokens } from '../../../api/client';
import { getProfile } from '../../../api/profile';
import { getRewards } from '../../../api/rewards';
import BottomNav from '../../../components/BottomNav';
import PrimaryButton from '../../../components/PrimaryButton';
import {
  Card,
  ErrorState,
  IconTile,
  LoadingState,
  Pill,
  ScreenTitle,
  SectionTitle,
} from '../../../components/ui';
import { useCart } from '../../../context/CartContext';
import { COLORS, FONTS } from '../../../theme';


// 254700000003 -> +254 700 000 003
function formatPhone(phone = '') {
  return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
}

// "Esther Wanza Mutua" -> "EM"
function initials(fullName = '') {
  const words = fullName.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}


// One row inside a list card. With `onPress` it is a link with a chevron.
function ListRow({ icon, title, subtitle, extra, onPress, last = false }) {
  const content = (
    <>
      <IconTile name={icon} size={36} iconSize={18} />

      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>

      {extra}

      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
      ) : null}
    </>
  );

  const style = [styles.row, !last && styles.rowDivider];

  if (!onPress) return <View style={style}>{content}</View>;

  return (
    <TouchableOpacity
      style={style}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
    >
      {content}
    </TouchableOpacity>
  );
}


export default function ProfileScreen({ navigation }) {
  const { clear } = useCart();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [confirmingLogout, setConfirmingLogout] = useState(false);


  const goToWelcome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  }, [navigation]);


  const loadProfile = useCallback(async () => {
    setLoadError('');

    try {
      const [profile, addresses, rewards] = await Promise.all([
        getProfile(),
        getAddresses(),
        getRewards(),
      ]);

      setData({ profile, addresses, points: rewards.points_balance });
    } catch (err) {
      // 401 here means the saved login could not be refreshed.
      if (err instanceof ApiError && err.status === 401) {
        goToWelcome();
        return;
      }

      setLoadError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the server. Check your connection and try again.'
      );
    }
  }, [goToWelcome]);


  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );


  const handleLogout = async () => {
    // Removing the saved tokens is what logs this phone out.
    await clearTokens();
    clear();
    goToWelcome();
  };


  const renderContent = () => {
    if (data === null) {
      return loadError ? (
        <ErrorState message={loadError} onRetry={loadProfile} />
      ) : (
        <LoadingState />
      );
    }

    const { profile, addresses, points } = data;

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* =====================================
            WHO
        ===================================== */}

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(profile.full_name)}</Text>
          </View>

          <View style={styles.identityText}>
            <Text style={styles.name}>{profile.full_name}</Text>
            <Text style={styles.phone}>{formatPhone(profile.phone_number)}</Text>
          </View>
        </View>


        {/* =====================================
            ADDRESSES
        ===================================== */}

        <View style={styles.section}>
          <SectionTitle title="Saved addresses" />

          <Card style={styles.listCard}>
            {addresses.length > 0 ? (
              addresses.map((address, index) => (
                <ListRow
                  key={address.id}
                  icon={address.is_default ? 'home' : 'location'}
                  title={address.label}
                  subtitle={address.address_line}
                  extra={address.is_default ? <Pill label="Default" tone="blue" /> : null}
                  last={index === addresses.length - 1}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>
                No saved addresses yet. One is saved when you confirm a delivery
                address at checkout.
              </Text>
            )}
          </Card>
        </View>


        {/* =====================================
            ACCOUNT
        ===================================== */}

        <View style={styles.section}>
          <SectionTitle title="Account" />

          <Card style={styles.listCard}>
            <ListRow
              icon="person"
              title="Physical address"
              subtitle={profile.physical_address || 'Not set'}
            />

            <ListRow
              icon="gift"
              title="Rewards"
              subtitle={`${points} points`}
              onPress={() => navigation.navigate('Rewards')}
            />

            <ListRow
              icon="receipt"
              title="Order history"
              subtitle="Your active and past orders"
              onPress={() => navigation.navigate('Orders')}
              last
            />
          </Card>
        </View>


        {/* =====================================
            LOG OUT
        ===================================== */}

        <View style={styles.section}>
          {confirmingLogout ? (
            <Card>
              <Text style={styles.confirmTitle}>Log out of Vanella?</Text>
              <Text style={styles.confirmText}>
                You will need your phone number and a new code to log back in.
              </Text>

              <PrimaryButton
                title="Yes, log out"
                onPress={handleLogout}
                style={styles.logoutConfirm}
              />

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setConfirmingLogout(false)}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => setConfirmingLogout(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    );
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <ScreenTitle title="Profile" />

      {renderContent()}

      <BottomNav activeTab="profile" navigation={navigation} />
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
  section: {
    marginTop: 18,
  },

  /* Identity */
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: COLORS.deep,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.royal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 20,
  },
  identityText: {
    flex: 1,
  },
  name: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 19,
  },
  phone: {
    marginTop: 2,
    color: '#B9CCE8',
    fontFamily: FONTS.medium,
    fontSize: 13,
  },

  /* Lists */
  listCard: {
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: COLORS.ink,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  rowSubtitle: {
    marginTop: 1,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  emptyText: {
    paddingVertical: 12,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 19,
  },

  /* Log out */
  logoutButton: {
    height: 52,
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
    marginTop: 16,
    backgroundColor: COLORS.red,
  },
  cancelButton: {
    height: 46,
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
