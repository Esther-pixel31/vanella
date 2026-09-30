import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { createAddress, getAddresses } from '../../../api/addresses';
import { getBranches } from '../../../api/branches';
import { ApiError } from '../../../api/client';
import { createOrder } from '../../../api/orders';
import { getProfile } from '../../../api/profile';
import { getRewards } from '../../../api/rewards';
import VanellaHeader from '../../../components/VanellaHeader';
import { useCart } from '../../../context/CartContext';
import { FREE_20L, HALF_OFF, getReward } from '../../../data/rewards';
import { formatKes } from '../../../utils/format';
import {
  LOCATION_DENIED,
  LOCATION_FAILED,
  LOCATION_OFF,
  LocationError,
  detectLocation,
  distanceKm,
  hasCoordinates,
} from '../../../utils/location';


const COLORS = {
  primary: '#087FF5',
  background: '#F5F8FC',
  white: '#FFFFFF',
  text: '#082D6A',
  muted: '#63738B',
  border: '#E5EDF6',
  error: '#C62828',
};

const NETWORK_ERROR =
  'Could not reach the server. Check your connection and try again.';


// The "deliver to" choice is either this marker (the phone's detected
// location) or the id of a saved address.
const CURRENT_LOCATION = 'current';

const LOCATION_DETECTING = 'detecting';
const LOCATION_READY = 'ready';

// Label stored on addresses created from a detected location.
const DETECTED_ADDRESS_LABEL = 'Pinned location';

const LOCATION_MESSAGES = {
  [LOCATION_DETECTING]: 'Finding your location…',
  [LOCATION_DENIED]: 'Location access is off for this app',
  [LOCATION_OFF]: 'Location (GPS) is turned off on your phone',
  [LOCATION_FAILED]: 'Could not find your location',
};

const MPESA = 'mpesa';
const CASH = 'cash';

// Safaricom numbers: 9 digits starting with 7 or 1, after +254.
const isValidLocalPhone = (value) => /^[17]\d{8}$/.test(value);

const formatDistance = (km) =>
  km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`;


// One selectable row with a radio circle, used for addresses and branches.
function OptionRow({ title, subtitle, tag, selected, disabled = false, onPress }) {
  return (
    <TouchableOpacity
      style={[
        styles.optionRow,
        selected && styles.optionRowSelected,
        disabled && styles.optionRowDisabled,
      ]}
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>

      <View style={styles.optionText}>
        <View style={styles.optionTitleRow}>
          <Text style={styles.optionTitle}>
            {title}
          </Text>

          {tag ? (
            <View style={styles.optionTag}>
              <Text style={styles.optionTagText}>
                {tag}
              </Text>
            </View>
          ) : null}
        </View>

        {subtitle ? (
          <Text style={styles.optionSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}


export default function CheckoutScreen({ navigation }) {
  const { items, note, subtotal, clear } = useCart();

  const [addresses, setAddresses] = useState(null);
  const [branches, setBranches] = useState([]);

  // Rewards already claimed with points; at most one is used per order.
  const [rewards, setRewards] = useState([]);
  const [rewardId, setRewardId] = useState(null);

  // How to pay: MPESA, CASH or null until the customer chooses.
  const [paymentMethod, setPaymentMethod] = useState(null);

  // The 9 digits after +254 that the M-Pesa request is sent to.
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [loadError, setLoadError] = useState('');

  // Where to deliver: CURRENT_LOCATION or a saved address id.
  const [choice, setChoice] = useState(CURRENT_LOCATION);
  const [branchId, setBranchId] = useState(null);

  // Once the customer picks by hand, automatic selection stops overriding.
  const choiceTouched = useRef(false);
  const branchTouched = useRef(false);

  const [location, setLocation] = useState({
    status: LOCATION_DETECTING,
    coords: null,
  });
  const [currentText, setCurrentText] = useState('');
  const [currentConfirmed, setCurrentConfirmed] = useState(false);

  const [newAddress, setNewAddress] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const bulkTotal = items
    .filter((item) => item.isBulk)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  const hasBulk = bulkTotal > 0;

  const selectedReward =
    rewards.find((reward) => reward.id === rewardId) || null;

  const addsFreeBottle = selectedReward?.reward_type === FREE_20L;

  // Shown to the customer only. The backend works out the real discount.
  const discount =
    selectedReward?.reward_type === HALF_OFF ? bulkTotal * 0.5 : 0;

  // Vanella delivery is free.
  const total = subtotal - discount;


  const handleApiError = useCallback(
    (err, showMessage) => {
      // 401 here means the saved login could not be refreshed.
      if (err instanceof ApiError && err.status === 401) {
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        return;
      }

      showMessage(err instanceof ApiError ? err.message : NETWORK_ERROR);
    },
    [navigation]
  );


  const loadOptions = useCallback(async () => {
    setLoadError('');

    try {
      const [addressData, branchData, rewardData, profile] =
        await Promise.all([
          getAddresses(),
          getBranches(),
          getRewards(),
          getProfile(),
        ]);

      // M-Pesa defaults to the number the customer registered with.
      setMpesaPhone(profile.phone_number.slice(3));

      setAddresses(addressData);
      setBranches(branchData);
      setRewards(rewardData.available_rewards);
    } catch (err) {
      handleApiError(err, setLoadError);
    }
  }, [handleApiError]);


  const runDetectLocation = useCallback(async () => {
    setLocation({ status: LOCATION_DETECTING, coords: null });

    try {
      const found = await detectLocation();

      setLocation({
        status: LOCATION_READY,
        coords: { latitude: found.latitude, longitude: found.longitude },
      });
      setCurrentText(found.addressText);
      setCurrentConfirmed(false);
    } catch (err) {
      setLocation({
        status: err instanceof LocationError ? err.reason : LOCATION_FAILED,
        coords: null,
      });
    }
  }, []);


  useEffect(() => {
    loadOptions();
    runDetectLocation();
  }, [loadOptions, runDetectLocation]);


  const locationReady = location.status === LOCATION_READY;
  const locationUnavailable =
    !locationReady && location.status !== LOCATION_DETECTING;


  // Automatic "deliver to": the detected location when there is one,
  // otherwise the default saved address (the backend lists it first).
  useEffect(() => {
    if (choiceTouched.current || addresses === null) return;

    if (locationUnavailable && addresses.length > 0) {
      setChoice(addresses[0].id);
    } else {
      setChoice(CURRENT_LOCATION);
    }
  }, [addresses, locationUnavailable]);


  const selectedAddress =
    addresses?.find((address) => address.id === choice) || null;

  // The point branches are measured from: the chosen delivery spot when
  // its position is known, otherwise wherever the phone is.
  const referencePoint =
    choice !== CURRENT_LOCATION && hasCoordinates(selectedAddress)
      ? selectedAddress
      : location.coords;

  const branchDistances = useMemo(() => {
    const distances = {};

    if (referencePoint) {
      branches.filter(hasCoordinates).forEach((branch) => {
        distances[branch.id] = distanceKm(referencePoint, branch);
      });
    }

    return distances;
  }, [branches, referencePoint]);

  const nearestBranchId = useMemo(() => {
    const ids = Object.keys(branchDistances);

    if (ids.length === 0) return null;

    return ids.reduce((nearest, id) =>
      branchDistances[id] < branchDistances[nearest] ? id : nearest
    );
  }, [branchDistances]);


  // Automatic branch: whichever is nearest.
  useEffect(() => {
    if (branchTouched.current || nearestBranchId === null) return;

    setBranchId(nearestBranchId);
  }, [nearestBranchId]);


  const chooseDelivery = (value) => {
    choiceTouched.current = true;
    setChoice(value);
  };

  const chooseBranch = (id) => {
    branchTouched.current = true;
    setBranchId(id);
  };

  const retryLocation = () => {
    choiceTouched.current = false;
    runDetectLocation();
  };


  const handleSaveAddress = async () => {
    const addressLine = newAddress.trim();

    if (addressLine.length < 2 || savingAddress) return;

    setError('');
    setSavingAddress(true);

    try {
      const saved = await createAddress({
        label: 'Home',
        addressLine,
        isDefault: true,
      });

      setAddresses([saved]);
      chooseDelivery(saved.id);
      setNewAddress('');
    } catch (err) {
      handleApiError(err, setError);
    } finally {
      setSavingAddress(false);
    }
  };


  const usingCurrent = choice === CURRENT_LOCATION;
  const currentLine = currentText.trim();

  const deliveryReady = usingCurrent
    ? locationReady && currentConfirmed && currentLine.length >= 2
    : selectedAddress !== null;

  const paymentReady =
    paymentMethod === CASH ||
    (paymentMethod === MPESA && isValidLocalPhone(mpesaPhone));

  const canPlace =
    items.length > 0 &&
    deliveryReady &&
    branchId !== null &&
    paymentReady &&
    !placing;


  // Orders need a saved address, so a confirmed detected location is
  // saved first (or matched to one already saved with the same text).
  const resolveAddressId = async () => {
    if (!usingCurrent) return choice;

    const existing = addresses.find(
      (address) =>
        address.address_line.trim().toLowerCase() === currentLine.toLowerCase()
    );

    if (existing) return existing.id;

    const saved = await createAddress({
      label: DETECTED_ADDRESS_LABEL,
      addressLine: currentLine,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    setAddresses((current) => [...current, saved]);

    return saved.id;
  };


  const handlePlaceOrder = async () => {
    if (!canPlace) return;

    setError('');
    setPlacing(true);

    try {
      const addressId = await resolveAddressId();

      const order = await createOrder({
        branchId,
        addressId,
        note: note.trim(),
        items,
        rewardId,
        paymentMethod,
      });

      // Back from the tracking page must go Home, not to this screen.
      navigation.reset({
        index: 1,
        routes: [
          { name: 'CustomerHome' },
          {
            name: 'OrderTracking',
            params: {
              orderId: order.id,
              justPlaced: true,
              // The tracking page sends the M-Pesa request on arrival.
              payPhone: paymentMethod === MPESA ? `254${mpesaPhone}` : null,
            },
          },
        ],
      });

      clear();
    } catch (err) {
      handleApiError(err, setError);
      setPlacing(false);
    }
  };


  const renderContent = () => {
    if (addresses === null) {
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
              style={styles.centeredButton}
              activeOpacity={0.85}
              onPress={loadOptions}
            >
              <Text style={styles.centeredButtonText}>
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        <Text style={styles.pageTitle}>
          Checkout
        </Text>


        {/* =====================================
            DELIVERY ADDRESS
        ===================================== */}

        <View style={styles.card}>

          <View style={styles.cardHeader}>
            <Ionicons name="location" size={21} color="#0869E8" />

            <Text style={styles.cardTitle}>
              Deliver to
            </Text>
          </View>

          {/* DETECTED LOCATION */}

          <OptionRow
            title="Current location"
            subtitle={
              locationReady
                ? currentLine || 'Location found. Add your address below.'
                : LOCATION_MESSAGES[location.status]
            }
            selected={usingCurrent}
            onPress={() => {
              if (locationReady) {
                chooseDelivery(CURRENT_LOCATION);
              } else if (locationUnavailable) {
                retryLocation();
              }
            }}
          />

          {locationUnavailable ? (
            <View style={styles.locationHelp}>
              <Text style={styles.locationHelpText}>
                {location.status === LOCATION_DENIED
                  ? 'Allow location for this app in your phone settings to use it, or choose a saved address.'
                  : 'Make sure location is on, or choose a saved address.'}
              </Text>

              <TouchableOpacity onPress={retryLocation}>
                <Text style={styles.linkText}>
                  Try again
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {usingCurrent && locationReady ? (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmLabel}>
                Is this where we should deliver?
              </Text>

              <TextInput
                style={styles.confirmInput}
                value={currentText}
                onChangeText={(value) => {
                  setCurrentText(value);
                  setCurrentConfirmed(false);
                }}
                placeholder="Estate, building, house or landmark"
                placeholderTextColor="#8DA5C2"
                maxLength={255}
                multiline
              />

              <Text style={styles.confirmHint}>
                Correct it or add a building, house number or landmark.
              </Text>

              {currentConfirmed ? (
                <View style={styles.confirmedRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#19A65B"
                  />

                  <Text style={styles.confirmedText}>
                    Address confirmed
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.saveAddressButton,
                    currentLine.length < 2 && styles.buttonDisabled,
                  ]}
                  activeOpacity={0.85}
                  disabled={currentLine.length < 2}
                  onPress={() => setCurrentConfirmed(true)}
                >
                  <Text style={styles.saveAddressText}>
                    Confirm Address
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}


          {/* SAVED ADDRESSES */}

          {addresses.length > 0 ? (
            <View>
              <Text style={styles.subheading}>
                Saved addresses
              </Text>

              {addresses.map((address) => (
                <OptionRow
                  key={address.id}
                  title={address.label}
                  subtitle={address.address_line}
                  selected={address.id === choice}
                  onPress={() => chooseDelivery(address.id)}
                />
              ))}
            </View>
          ) : locationUnavailable ? (
            <View>
              <Text style={styles.cardHint}>
                You have no saved delivery address. Add one to continue.
              </Text>

              <TextInput
                style={styles.addressInput}
                value={newAddress}
                onChangeText={setNewAddress}
                placeholder="Estate, building, house or landmark"
                placeholderTextColor="#8DA5C2"
              />

              <TouchableOpacity
                style={[
                  styles.saveAddressButton,
                  (newAddress.trim().length < 2 || savingAddress) &&
                    styles.buttonDisabled,
                ]}
                activeOpacity={0.85}
                disabled={newAddress.trim().length < 2 || savingAddress}
                onPress={handleSaveAddress}
              >
                {savingAddress ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveAddressText}>
                    Save Address
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

        </View>


        {/* =====================================
            BRANCH
        ===================================== */}

        <View style={styles.card}>

          <View style={styles.cardHeader}>
            <Ionicons name="storefront" size={20} color="#0869E8" />

            <Text style={styles.cardTitle}>
              Order from
            </Text>
          </View>

          {branches.map((branch) => (
            <OptionRow
              key={branch.id}
              title={branch.name}
              subtitle={
                branchDistances[branch.id] !== undefined
                  ? `${branch.location} · ${formatDistance(branchDistances[branch.id])}`
                  : branch.location
              }
              tag={branch.id === nearestBranchId ? 'Nearest' : null}
              selected={branch.id === branchId}
              onPress={() => chooseBranch(branch.id)}
            />
          ))}

        </View>


        {/* =====================================
            REWARD
        ===================================== */}

        {rewards.length > 0 ? (
          <View style={styles.card}>

            <View style={styles.cardHeader}>
              <Ionicons name="gift" size={20} color="#0869E8" />

              <Text style={styles.cardTitle}>
                Use a reward
              </Text>
            </View>

            {rewards.map((reward) => {
              const details = getReward(reward.reward_type);
              const needsBulk = reward.reward_type === HALF_OFF && !hasBulk;
              const selected = reward.id === rewardId;

              return (
                <OptionRow
                  key={reward.id}
                  title={details ? details.title : reward.reward_type}
                  subtitle={
                    needsBulk
                      ? 'Only for orders with 6,000L or 10,000L water'
                      : details?.description
                  }
                  selected={selected}
                  disabled={needsBulk}
                  onPress={() => setRewardId(selected ? null : reward.id)}
                />
              );
            })}

            <Text style={styles.cardFootnote}>
              Optional. Tap a selected reward again to remove it.
            </Text>

          </View>
        ) : null}


        {/* =====================================
            ORDER SUMMARY
        ===================================== */}

        <View style={styles.card}>

          <View style={styles.cardHeader}>
            <Ionicons name="receipt" size={20} color="#0869E8" />

            <Text style={styles.cardTitle}>
              Order summary
            </Text>
          </View>

          {items.map((item) => (
            <View key={item.id} style={styles.summaryRow}>
              <Text style={styles.summaryItem}>
                {item.quantity} × {item.name.replace('\n', ' ')}
              </Text>

              <Text style={styles.summaryValue}>
                {formatKes(item.price * item.quantity)}
              </Text>
            </View>
          ))}

          {addsFreeBottle ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryItem}>
                1 × 20L Water (reward)
              </Text>

              <Text style={styles.freeDelivery}>
                FREE
              </Text>
            </View>
          ) : null}

          {note.trim() ? (
            <Text style={styles.noteText}>
              Note: {note.trim()}
            </Text>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Subtotal
            </Text>

            <Text style={styles.summaryValue}>
              {formatKes(subtotal)}
            </Text>
          </View>

          {discount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Reward discount
              </Text>

              <Text style={styles.freeDelivery}>
                −{formatKes(discount)}
              </Text>
            </View>
          ) : null}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Delivery Fee
            </Text>

            <Text style={styles.freeDelivery}>
              FREE
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Total
            </Text>

            <Text style={styles.totalAmount}>
              {formatKes(total)}
            </Text>
          </View>

        </View>


        {/* =====================================
            PAYMENT
        ===================================== */}

        <View style={styles.card}>

          <View style={styles.cardHeader}>
            <Ionicons name="wallet" size={20} color="#0869E8" />

            <Text style={styles.cardTitle}>
              Pay with
            </Text>
          </View>

          <OptionRow
            title="M-Pesa"
            subtitle="Pay now. A request is sent to your phone."
            selected={paymentMethod === MPESA}
            onPress={() => setPaymentMethod(MPESA)}
          />

          {paymentMethod === MPESA ? (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmLabel}>
                M-Pesa number
              </Text>

              <View style={styles.mpesaPhoneContainer}>
                <Text style={styles.mpesaPrefix}>
                  +254
                </Text>

                <View style={styles.mpesaDivider} />

                <TextInput
                  style={styles.mpesaPhoneInput}
                  value={mpesaPhone}
                  onChangeText={(value) =>
                    setMpesaPhone(value.replace(/\D/g, ''))
                  }
                  placeholder="7XX XXX XXX"
                  placeholderTextColor="#8DA5C2"
                  keyboardType="phone-pad"
                  maxLength={9}
                />
              </View>
            </View>
          ) : null}

          <OptionRow
            title="Cash on delivery"
            subtitle="Pay when your water arrives."
            selected={paymentMethod === CASH}
            onPress={() => setPaymentMethod(CASH)}
          />

        </View>


        {/* =====================================
            PLACE ORDER
        ===================================== */}

        {error ? (
          <Text style={styles.errorText}>
            {error}
          </Text>
        ) : null}

        {!error && usingCurrent && locationReady && !currentConfirmed ? (
          <Text style={styles.hintText}>
            Confirm your delivery address to place your order.
          </Text>
        ) : null}

        {!error && deliveryReady && branchId === null ? (
          <Text style={styles.hintText}>
            Choose a branch to place your order.
          </Text>
        ) : null}

        {!error && deliveryReady && branchId !== null && !paymentReady ? (
          <Text style={styles.hintText}>
            {paymentMethod === MPESA
              ? 'Enter a valid M-Pesa number.'
              : 'Choose how you want to pay.'}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.placeButton, !canPlace && styles.buttonDisabled]}
          activeOpacity={0.85}
          disabled={!canPlace}
          onPress={handlePlaceOrder}
        >
          {placing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.placeText}>
              {paymentMethod === MPESA
                ? `Pay ${formatKes(total)} with M-Pesa`
                : 'Place Order'}
            </Text>
          )}
        </TouchableOpacity>

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


  /* =======================================
     MAIN CONTENT
  ======================================= */

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


  /* =======================================
     LOADING / ERROR
  ======================================= */

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
  },


  centeredButton: {
    height: 48,

    paddingHorizontal: 30,

    borderRadius: 24,

    backgroundColor: '#0866DD',

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 20,
  },


  centeredButtonText: {
    color: COLORS.white,

    fontSize: 15,
    fontWeight: '800',
  },


  /* =======================================
     CARDS
  ======================================= */

  card: {
    backgroundColor: COLORS.white,

    borderRadius: 18,

    paddingHorizontal: 18,
    paddingVertical: 16,

    marginBottom: 13,

    shadowColor: '#163A6D',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,

    elevation: 1,
  },


  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 9,

    marginBottom: 12,
  },


  cardTitle: {
    color: COLORS.text,

    fontSize: 17,
    lineHeight: 22,

    fontWeight: '900',
  },


  cardFootnote: {
    color: COLORS.muted,

    fontSize: 12,
    lineHeight: 17,

    marginTop: 2,
  },


  cardHint: {
    color: COLORS.muted,

    fontSize: 14,
    lineHeight: 20,

    marginBottom: 10,
  },


  /* =======================================
     OPTION ROWS
  ======================================= */

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1.4,
    borderColor: COLORS.border,

    borderRadius: 14,

    paddingHorizontal: 14,
    paddingVertical: 12,

    marginBottom: 8,
  },


  optionRowSelected: {
    borderColor: COLORS.primary,

    backgroundColor: '#F1F8FF',
  },


  optionRowDisabled: {
    opacity: 0.5,
  },


  radio: {
    width: 22,
    height: 22,

    borderRadius: 11,

    borderWidth: 2,
    borderColor: '#B6C6D8',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 12,
  },


  radioSelected: {
    borderColor: COLORS.primary,
  },


  radioDot: {
    width: 10,
    height: 10,

    borderRadius: 5,

    backgroundColor: COLORS.primary,
  },


  optionText: {
    flex: 1,
  },


  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',

    gap: 8,
  },


  optionTitle: {
    color: COLORS.text,

    fontSize: 15,
    lineHeight: 20,

    fontWeight: '800',
  },


  optionTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,

    borderRadius: 9,

    backgroundColor: '#DFF5E6',
  },


  optionTagText: {
    color: '#19703A',

    fontSize: 11,
    lineHeight: 15,

    fontWeight: '800',
  },


  /* =======================================
     DETECTED LOCATION
  ======================================= */

  locationHelp: {
    marginBottom: 10,
  },


  locationHelpText: {
    color: COLORS.muted,

    fontSize: 13,
    lineHeight: 19,
  },


  linkText: {
    color: COLORS.primary,

    fontSize: 14,
    lineHeight: 20,

    fontWeight: '800',

    marginTop: 4,
  },


  confirmBox: {
    marginBottom: 12,
  },


  confirmLabel: {
    color: COLORS.text,

    fontSize: 14,
    lineHeight: 19,

    fontWeight: '800',

    marginBottom: 7,
  },


  confirmInput: {
    minHeight: 52,

    borderWidth: 1.4,
    borderColor: '#D5E4F1',

    borderRadius: 14,

    backgroundColor: '#FCFEFF',

    paddingHorizontal: 15,
    paddingVertical: 12,

    color: COLORS.text,

    fontSize: 15,
    lineHeight: 20,
  },


  confirmHint: {
    color: COLORS.muted,

    fontSize: 12,
    lineHeight: 17,

    marginTop: 5,
  },


  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 6,

    marginTop: 10,
  },


  confirmedText: {
    color: '#19703A',

    fontSize: 14,
    lineHeight: 19,

    fontWeight: '800',
  },


  mpesaPhoneContainer: {
    height: 52,

    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1.4,
    borderColor: '#D5E4F1',

    borderRadius: 14,

    backgroundColor: '#FCFEFF',

    paddingHorizontal: 15,
  },


  mpesaPrefix: {
    color: COLORS.text,

    fontSize: 15,
    fontWeight: '800',

    paddingRight: 13,
  },


  mpesaDivider: {
    width: 1,
    height: 26,

    backgroundColor: '#D8E5EF',
  },


  mpesaPhoneInput: {
    flex: 1,

    paddingHorizontal: 13,

    color: COLORS.text,

    fontSize: 15,
  },


  subheading: {
    color: COLORS.muted,

    fontSize: 13,
    lineHeight: 18,

    fontWeight: '700',

    marginTop: 2,
    marginBottom: 8,
  },


  optionSubtitle: {
    color: COLORS.muted,

    fontSize: 13,
    lineHeight: 18,

    marginTop: 1,
  },


  /* =======================================
     ADD ADDRESS
  ======================================= */

  addressInput: {
    height: 52,

    borderWidth: 1.4,
    borderColor: '#D5E4F1',

    borderRadius: 14,

    backgroundColor: '#FCFEFF',

    paddingHorizontal: 15,

    color: COLORS.text,

    fontSize: 15,
  },


  saveAddressButton: {
    height: 46,

    borderRadius: 23,

    backgroundColor: '#0866DD',

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 10,
  },


  saveAddressText: {
    color: COLORS.white,

    fontSize: 15,
    fontWeight: '800',
  },


  /* =======================================
     SUMMARY
  ======================================= */

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginBottom: 9,
  },


  summaryItem: {
    flex: 1,

    color: '#173B6D',

    fontSize: 15,
    lineHeight: 20,

    fontWeight: '500',

    marginRight: 10,
  },


  summaryLabel: {
    color: '#173B6D',

    fontSize: 15,
    lineHeight: 20,

    fontWeight: '500',
  },


  summaryValue: {
    color: COLORS.text,

    fontSize: 15,
    lineHeight: 20,

    fontWeight: '900',
  },


  noteText: {
    color: COLORS.muted,

    fontSize: 13,
    lineHeight: 19,

    fontStyle: 'italic',

    marginTop: 2,
  },


  freeDelivery: {
    color: COLORS.primary,

    fontSize: 15,
    lineHeight: 20,

    fontWeight: '900',
  },


  divider: {
    height: 1,

    backgroundColor: '#E1E9F2',

    marginTop: 4,
    marginBottom: 12,
  },


  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },


  totalLabel: {
    color: COLORS.text,

    fontSize: 20,
    lineHeight: 25,

    fontWeight: '900',
  },


  totalAmount: {
    color: '#0864D9',

    fontSize: 26,
    lineHeight: 31,

    fontWeight: '900',
  },


  /* =======================================
     PLACE ORDER
  ======================================= */

  errorText: {
    color: COLORS.error,

    fontSize: 14,
    lineHeight: 20,

    marginBottom: 10,
  },


  hintText: {
    color: COLORS.muted,

    fontSize: 14,
    lineHeight: 20,

    textAlign: 'center',

    marginBottom: 10,
  },


  placeButton: {
    height: 61,

    backgroundColor: '#0866DD',

    borderRadius: 31,

    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#0866DD',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 9,

    elevation: 4,
  },


  buttonDisabled: {
    backgroundColor: '#9DBFEF',

    shadowOpacity: 0,

    elevation: 0,
  },


  placeText: {
    color: COLORS.white,

    fontSize: 18,
    lineHeight: 23,

    fontWeight: '800',
  },

});
