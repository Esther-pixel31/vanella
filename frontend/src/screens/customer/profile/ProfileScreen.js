import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
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

import { ApiError, clearTokens } from '../../../api/client';
import { getProfile } from '../../../api/profile';
import BottomNav from '../../../components/BottomNav';
import VanellaHeader from '../../../components/VanellaHeader';
import { useCart } from '../../../context/CartContext';


const COLORS = {
  primary: '#087FF5',
  background: '#F5F8FC',
  white: '#FFFFFF',
  text: '#082D6A',
  muted: '#63738B',
  danger: '#C62828',
};


// 254700000003 -> +254 700 000 003
function formatPhone(phone = '') {
  return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
}


function DetailRow({ icon, label, value, last = false }) {
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <Ionicons name={icon} size={20} color="#0869E8" />

      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>
          {label}
        </Text>

        <Text style={styles.detailValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}


export default function ProfileScreen({ navigation }) {
  const { clear } = useCart();

  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [confirmingLogout, setConfirmingLogout] = useState(false);


  const goToWelcome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  }, [navigation]);


  const loadProfile = useCallback(async () => {
    setLoadError('');

    try {
      setProfile(await getProfile());
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
    if (profile === null) {
      if (loadError) {
        return (
          <View style={styles.centered}>
            <Ionicons
              name="cloud-offline-outline"
              size={44}
              color={COLORS.muted}
            />

            <Text style={styles.centeredText}>
              {loadError}
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={loadProfile}
            >
              <Text style={styles.primaryButtonText}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <Text style={styles.pageTitle}>
          Profile
        </Text>


        <View style={styles.card}>

          <DetailRow
            icon="person"
            label="Name"
            value={profile.full_name}
          />

          <DetailRow
            icon="call"
            label="Phone number"
            value={formatPhone(profile.phone_number)}
          />

          <DetailRow
            icon="location"
            label="Physical address"
            value={profile.physical_address || 'Not set'}
            last
          />

        </View>


        {/* =====================================
            LOG OUT
        ===================================== */}

        {confirmingLogout ? (
          <View style={styles.card}>

            <Text style={styles.confirmTitle}>
              Log out of Vanella?
            </Text>

            <Text style={styles.confirmText}>
              You will need your phone number and a new code to log back in.
            </Text>

            <TouchableOpacity
              style={styles.dangerButton}
              activeOpacity={0.85}
              onPress={handleLogout}
            >
              <Text style={styles.primaryButtonText}>
                Yes, Log Out
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.7}
              onPress={() => setConfirmingLogout(false)}
            >
              <Text style={styles.cancelButtonText}>
                Cancel
              </Text>
            </TouchableOpacity>

          </View>
        ) : (
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.8}
            onPress={() => setConfirmingLogout(true)}
          >
            <Ionicons name="log-out-outline" size={21} color={COLORS.danger} />

            <Text style={styles.logoutText}>
              Log Out
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    );
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />

      <VanellaHeader
        onBack={() => navigation.goBack()}
        pageBackground={COLORS.background}
      />

      {renderContent()}

      <BottomNav activeTab="profile" navigation={navigation} />

    </SafeAreaView>
  );
}


/* =========================================
   STYLES
========================================= */

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },


  scrollView: {
    flex: 1,
  },


  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,

    paddingBottom: 35,
  },


  pageTitle: {
    color: COLORS.text,

    fontSize: 29,
    lineHeight: 35,

    fontWeight: '900',

    marginBottom: 17,
  },


  centered: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 36,
  },


  centeredText: {
    color: COLORS.muted,

    fontSize: 15,
    lineHeight: 22,

    textAlign: 'center',

    marginTop: 10,
    marginBottom: 20,
  },


  /* =======================================
     DETAILS
  ======================================= */

  card: {
    backgroundColor: COLORS.white,

    borderRadius: 18,

    paddingHorizontal: 18,
    paddingVertical: 18,

    marginBottom: 14,

    shadowColor: '#163A6D',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,

    elevation: 1,
  },


  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',

    marginBottom: 16,
  },


  detailRowLast: {
    marginBottom: 0,
  },


  detailText: {
    flex: 1,

    marginLeft: 13,
  },


  detailLabel: {
    color: COLORS.muted,

    fontSize: 13,
    lineHeight: 17,
  },


  detailValue: {
    color: COLORS.text,

    fontSize: 16,
    lineHeight: 21,

    fontWeight: '800',

    marginTop: 1,
  },


  /* =======================================
     LOG OUT
  ======================================= */

  logoutButton: {
    height: 56,

    borderRadius: 28,

    borderWidth: 1.4,
    borderColor: '#F0C4C4',

    backgroundColor: COLORS.white,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 8,
  },


  logoutText: {
    color: COLORS.danger,

    fontSize: 16,
    fontWeight: '800',
  },


  confirmTitle: {
    color: COLORS.text,

    fontSize: 18,
    lineHeight: 23,

    fontWeight: '900',
  },


  confirmText: {
    color: COLORS.muted,

    fontSize: 14,
    lineHeight: 20,

    marginTop: 4,
    marginBottom: 16,
  },


  primaryButton: {
    height: 48,

    paddingHorizontal: 30,

    borderRadius: 24,

    backgroundColor: '#0866DD',

    alignItems: 'center',
    justifyContent: 'center',
  },


  dangerButton: {
    height: 50,

    borderRadius: 25,

    backgroundColor: COLORS.danger,

    alignItems: 'center',
    justifyContent: 'center',
  },


  primaryButtonText: {
    color: COLORS.white,

    fontSize: 15,
    fontWeight: '800',
  },


  cancelButton: {
    height: 46,

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 4,
  },


  cancelButtonText: {
    color: '#0866DD',

    fontSize: 15,
    fontWeight: '800',
  },

});
