import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { requestOtp } from '../../api/auth';
import { ApiError } from '../../api/client';
import AuthBrandPanel from '../../components/AuthBrandPanel';
import FormField from '../../components/FormField';
import PrimaryButton from '../../components/PrimaryButton';
import { COLORS, FONTS } from '../../theme';
import {
  LOCATION_DENIED,
  LOCATION_OFF,
  LocationError,
  detectLocation,
} from '../../utils/location';

const LOCATION_ERRORS = {
  [LOCATION_DENIED]: 'Location access is off for this app. Type your delivery location instead.',
  [LOCATION_OFF]: 'Location (GPS) is turned off on your phone. Turn it on or type your delivery location.',
};

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Set when the delivery location came from the phone's GPS; cleared if
  // the customer then types something else.
  const [deliveryCoords, setDeliveryCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');

  const formComplete =
    fullName.trim().length > 0 &&
    phone.trim().length > 0 &&
    physicalAddress.trim().length > 0 &&
    deliveryLocation.trim().length > 0;

  const handleUseLocation = async () => {
    if (locating) return;

    setLocationMessage('');
    setLocating(true);

    try {
      const found = await detectLocation();

      setDeliveryCoords({
        latitude: found.latitude,
        longitude: found.longitude,
      });

      if (found.addressText) {
        setDeliveryLocation(found.addressText);
      } else {
        setLocationMessage(
          'We found your location but not a place name. Add your estate, building or landmark.'
        );
      }
    } catch (err) {
      setLocationMessage(
        (err instanceof LocationError && LOCATION_ERRORS[err.reason]) ||
          'Could not find your location. Type your delivery location instead.'
      );
    } finally {
      setLocating(false);
    }
  };

  const handleContinue = async () => {
    if (!formComplete || loading) return;

    const localDigits = phone.replace(/\D/g, '');

    if (localDigits.length !== 9) {
      setError('Enter the 9 digits of your phone number after +254.');
      return;
    }

    // Backend expects the full number: country code, no + and no spaces.
    const formattedPhone = `254${localDigits}`;

    setError('');
    setLoading(true);

    try {
      await requestOtp(formattedPhone);

      navigation.navigate('OTP', {
        mode: 'signup',
        fullName: fullName.trim(),
        phone: formattedPhone,
        physicalAddress: physicalAddress.trim(),
        deliveryLocation: deliveryLocation.trim(),
        deliveryCoords,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the server. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const useLocationButton = (
    <TouchableOpacity
      style={styles.locationButton}
      onPress={handleUseLocation}
      disabled={locating}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Use my current location"
    >
      {locating ? (
        <ActivityIndicator size="small" color={COLORS.royal} />
      ) : (
        <>
          <Ionicons name="location" size={15} color={COLORS.royal} />
          <Text style={styles.locationButtonText}>Use my location</Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthBrandPanel height={170} onBack={() => navigation.goBack()} />

          <View style={styles.content}>
            <Text style={styles.title}>Create your account</Text>

            <Text style={styles.subtitle}>
              Order clean water and earn rewards with every purchase.
            </Text>

            <FormField
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              autoCapitalize="words"
              style={styles.field}
            />

            <FormField
              label="Phone number"
              prefix="+254"
              value={phone}
              onChangeText={setPhone}
              placeholder="7XX XXX XXX"
              keyboardType="phone-pad"
              maxLength={9}
              style={styles.field}
            />

            <FormField
              label="Physical address"
              value={physicalAddress}
              onChangeText={setPhysicalAddress}
              placeholder="e.g. Bamburi, Mombasa"
              style={styles.field}
            />

            <FormField
              label="Delivery location"
              value={deliveryLocation}
              onChangeText={(value) => {
                setDeliveryLocation(value);
                setDeliveryCoords(null);
              }}
              placeholder="Estate, building or landmark"
              trailing={useLocationButton}
              style={styles.field}
            />

            {locationMessage ? (
              <Text style={styles.hintText}>{locationMessage}</Text>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <PrimaryButton
              title="Continue"
              onPress={handleContinue}
              disabled={!formComplete}
              loading={loading}
              style={styles.button}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
                accessibilityRole="link"
              >
                <Text style={styles.footerLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 26,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 6,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 21,
  },
  field: {
    marginTop: 14,
  },
  locationButton: {
    height: 36,
    minWidth: 120,
    marginRight: -6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 10,
    backgroundColor: COLORS.tint,
  },
  locationButtonText: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 12,
  },
  hintText: {
    marginTop: 8,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 19,
  },
  errorText: {
    marginTop: 12,
    color: COLORS.red,
    fontFamily: FONTS.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    marginTop: 22,
  },
  footerRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  footerLink: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 14,
  },
});
