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
import { createOrder, getDeliveryEstimate } from '../../../api/orders';
import { getProfile } from '../../../api/profile';
import { getRewards } from '../../../api/rewards';
import BottomNav from '../../../components/BottomNav';
import FormField from '../../../components/FormField';
import PrimaryButton from '../../../components/PrimaryButton';
import {
  Card,
  ErrorState,
  IconTile,
  LoadingState,
  MpesaMark,
  Pill,
  RadioDot,
  SectionLabel,
  TopBar,
} from '../../../components/ui';
import { useCart } from '../../../context/CartContext';
import { FREE_20L, HALF_OFF, getReward } from '../../../data/rewards';
import { COLORS, FONTS } from '../../../theme';
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


// One selectable row with a radio circle, used for addresses, branches
// and rewards.
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
      <RadioDot selected={selected} />

      <View style={styles.optionText}>
        <View style={styles.optionTitleRow}>
          <Text style={styles.optionTitle}>{title}</Text>
          {tag ? <Pill label={tag} tone="ok" /> : null}
        </View>

        {subtitle ? <Text style={styles.optionSubtitle}>{subtitle}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}


const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "4:27 PM", or "Fri 8:45 AM" when it is not today.
function formatTime(isoString) {
  const date = new Date(isoString);
  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const time = `${hours}:${minutes} ${date.getHours() < 12 ? 'AM' : 'PM'}`;

  return date.toDateString() === new Date().toDateString()
    ? time
    : `${DAYS[date.getDay()]} ${time}`;
}


// When the order will arrive if placed now. Outside delivery hours
// (8 AM to 8 PM) it waits for the next morning.
function DeliveryPromise({ estimate }) {
  const minutes = Math.round((new Date(estimate.promised_by) - Date.now()) / 60000);

  return (
    <View style={[styles.promise, estimate.is_scheduled && styles.promiseScheduled]}>
      <Ionicons
        name={estimate.is_scheduled ? 'moon' : 'time'}
        size={20}
        color={estimate.is_scheduled ? COLORS.amber : COLORS.royal}
      />

      <View style={styles.promiseText}>
        <Text style={styles.promiseTitle}>
          {estimate.is_scheduled
            ? `Delivered by ${formatTime(estimate.promised_by)}`
            : `Arrives by ${formatTime(estimate.promised_by)}`}
        </Text>
        <Text style={styles.promiseSub}>
          {estimate.is_scheduled
            ? 'We deliver from 8 AM to 8 PM, so this goes out first thing in the morning.'
            : `About ${minutes} minutes after you order.`}
        </Text>
      </View>
    </View>
  );
}


// M-Pesa or cash, shown as two tiles side by side.
function PaymentTile({ title, subtitle, mark, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.payTile, selected && styles.optionRowSelected]}
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
    >
      <View style={styles.payTileTop}>
        {mark}
        <RadioDot selected={selected} />
      </View>

      <Text style={styles.payTileTitle}>{title}</Text>
      <Text style={styles.optionSubtitle}>{subtitle}</Text>
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

  // { promised_by, is_scheduled } for an order placed now.
  const [estimate, setEstimate] = useState(null);

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
      const [addressData, branchData, rewardData, profile, estimateData] =
        await Promise.all([
          getAddresses(),
          getBranches(),
          getRewards(),
          getProfile(),
          getDeliveryEstimate(hasBulk),
        ]);

      setEstimate(estimateData);

      // M-Pesa defaults to the number the customer registered with.
      setMpesaPhone(profile.phone_number.slice(3));

      setAddresses(addressData);
      setBranches(branchData);
      setRewards(rewardData.available_rewards);
    } catch (err) {
      handleApiError(err, setLoadError);
    }
  }, [handleApiError, hasBulk]);


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
      return loadError ? (
        <ErrorState message={loadError} onRetry={loadOptions} />
      ) : (
        <LoadingState />
      );
    }

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* =====================================
            WHEN IT ARRIVES
        ===================================== */}

        {estimate ? <DeliveryPromise estimate={estimate} /> : null}


        {/* =====================================
            DELIVER TO
        ===================================== */}

        <SectionLabel>DELIVER TO</SectionLabel>

        <Card style={styles.section}>
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

          {location.status === LOCATION_DETECTING ? (
            <View style={styles.detectingRow}>
              <ActivityIndicator size="small" color={COLORS.royal} />
              <Text style={styles.helpText}>Finding where you are…</Text>
            </View>
          ) : null}

          {locationUnavailable ? (
            <View style={styles.locationHelp}>
              <Text style={styles.helpText}>
                {location.status === LOCATION_DENIED
                  ? 'Allow location for this app in your phone settings, or choose a saved address.'
                  : 'Make sure location is on, or choose a saved address.'}
              </Text>

              <TouchableOpacity onPress={retryLocation} accessibilityRole="button">
                <Text style={styles.linkText}>Try again</Text>
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
                placeholderTextColor="#8193B0"
                maxLength={255}
                multiline
                accessibilityLabel="Delivery address"
              />

              <Text style={styles.confirmHint}>
                Correct it or add a building, house number or landmark.
              </Text>

              {currentConfirmed ? (
                <View style={styles.confirmedRow}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.ok} />
                  <Text style={styles.confirmedText}>Address confirmed</Text>
                </View>
              ) : (
                <PrimaryButton
                  title="Confirm address"
                  onPress={() => setCurrentConfirmed(true)}
                  disabled={currentLine.length < 2}
                  style={styles.smallButton}
                />
              )}
            </View>
          ) : null}

          {addresses.length > 0 ? (
            <View>
              <Text style={styles.subheading}>Saved addresses</Text>

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
              <Text style={styles.helpText}>
                You have no saved delivery address. Add one to continue.
              </Text>

              <TextInput
                style={[styles.confirmInput, styles.newAddressInput]}
                value={newAddress}
                onChangeText={setNewAddress}
                placeholder="Estate, building, house or landmark"
                placeholderTextColor="#8193B0"
                accessibilityLabel="New delivery address"
              />

              <PrimaryButton
                title="Save address"
                onPress={handleSaveAddress}
                disabled={newAddress.trim().length < 2}
                loading={savingAddress}
                style={styles.smallButton}
              />
            </View>
          ) : null}
        </Card>


        {/* =====================================
            BRANCH
        ===================================== */}

        <SectionLabel>FROM BRANCH</SectionLabel>

        <View style={styles.section} accessibilityRole="radiogroup">
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
          <>
            <SectionLabel>USE A REWARD</SectionLabel>

            <View style={styles.section}>
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

              <Text style={styles.footnote}>
                Optional. Tap a selected reward again to remove it.
              </Text>
            </View>
          </>
        ) : null}


        {/* =====================================
            PAYMENT
        ===================================== */}

        <SectionLabel>PAY WITH</SectionLabel>

        <View style={styles.section}>
          <View style={styles.payRow} accessibilityRole="radiogroup">
            <PaymentTile
              title="M-Pesa"
              subtitle="Pay now"
              mark={<MpesaMark />}
              selected={paymentMethod === MPESA}
              onPress={() => setPaymentMethod(MPESA)}
            />

            <PaymentTile
              title="Cash"
              subtitle="On delivery"
              mark={<IconTile name="wallet" tone="neutral" size={30} iconSize={17} />}
              selected={paymentMethod === CASH}
              onPress={() => setPaymentMethod(CASH)}
            />
          </View>

          {paymentMethod === MPESA ? (
            <FormField
              label="M-Pesa number"
              prefix="+254"
              value={mpesaPhone}
              onChangeText={(value) => setMpesaPhone(value.replace(/\D/g, ''))}
              placeholder="7XX XXX XXX"
              keyboardType="phone-pad"
              maxLength={9}
              style={styles.mpesaField}
            />
          ) : null}
        </View>


        {/* =====================================
            ORDER SUMMARY
        ===================================== */}

        <SectionLabel>ORDER SUMMARY</SectionLabel>

        <Card style={styles.summary}>
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
              <Text style={styles.summaryItem}>1 × 20L Water (reward)</Text>
              <Text style={styles.freeText}>FREE</Text>
            </View>
          ) : null}

          {note.trim() ? (
            <Text style={styles.noteText}>Note: {note.trim()}</Text>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatKes(subtotal)}</Text>
          </View>

          {discount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Reward discount</Text>
              <Text style={styles.freeText}>−{formatKes(discount)}</Text>
            </View>
          ) : null}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={styles.freeText}>Free</Text>
          </View>
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

      </ScrollView>
    );
  };


  // What still stands between the customer and placing the order.
  let hint = '';

  if (addresses !== null && !error) {
    if (usingCurrent && locationReady && !currentConfirmed) {
      hint = 'Confirm your delivery address to continue.';
    } else if (deliveryReady && branchId === null) {
      hint = 'Choose a branch to continue.';
    } else if (deliveryReady && branchId !== null && !paymentReady) {
      hint =
        paymentMethod === MPESA
          ? 'Enter a valid M-Pesa number.'
          : 'Choose how you want to pay.';
    }
  }


  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <TopBar title="Checkout" onBack={() => navigation.goBack()} />

      {renderContent()}

      {addresses !== null ? (
        <View style={styles.actionBar}>
          {hint ? (
            <Text style={styles.hintText}>{hint}</Text>
          ) : (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total · free delivery</Text>
              <Text style={styles.totalValue}>{formatKes(total)}</Text>
            </View>
          )}

          <PrimaryButton
            title={paymentMethod === MPESA ? 'Pay with M-Pesa' : 'Place order'}
            rightText={formatKes(total)}
            onPress={handlePlaceOrder}
            disabled={!canPlace && !placing}
            loading={placing}
          />
        </View>
      ) : null}

      <BottomNav activeTab="home" navigation={navigation} />
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
    marginBottom: 20,
    gap: 8,
  },

  /* Delivery promise */
  promise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.tint,
  },
  promiseScheduled: {
    backgroundColor: COLORS.amberBg,
  },
  promiseText: {
    flex: 1,
  },
  promiseTitle: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 15,
  },
  promiseSub: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 12,
    lineHeight: 17,
  },

  /* Option rows */
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  optionRowSelected: {
    borderColor: COLORS.royal,
    backgroundColor: '#F4F7FF',
  },
  optionRowDisabled: {
    opacity: 0.5,
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
    color: COLORS.ink,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  optionSubtitle: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 12,
    lineHeight: 17,
  },

  /* Detected location */
  detectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationHelp: {
    gap: 2,
  },
  helpText: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 19,
  },
  linkText: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 14,
    lineHeight: 22,
  },
  confirmBox: {
    gap: 6,
  },
  confirmLabel: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 14,
  },
  confirmInput: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    color: COLORS.ink,
    fontFamily: FONTS.medium,
    fontSize: 15,
    lineHeight: 20,
  },
  newAddressInput: {
    marginTop: 8,
  },
  confirmHint: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  confirmedText: {
    color: COLORS.ok,
    fontFamily: FONTS.extrabold,
    fontSize: 14,
  },
  smallButton: {
    height: 48,
    marginTop: 6,
  },
  subheading: {
    marginTop: 6,
    marginBottom: 8,
    color: COLORS.muted,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  footnote: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 12,
  },

  /* Payment */
  payRow: {
    flexDirection: 'row',
    gap: 10,
  },
  payTile: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  payTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  payTileTitle: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 14,
  },
  mpesaField: {
    marginTop: 6,
  },

  /* Summary */
  summary: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    color: COLORS.ink,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  summaryLabel: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  summaryValue: {
    color: COLORS.ink,
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  freeText: {
    color: COLORS.ok,
    fontFamily: FONTS.extrabold,
    fontSize: 14,
  },
  noteText: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontStyle: 'italic',
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.line,
  },
  errorText: {
    marginTop: 14,
    color: COLORS.red,
    fontFamily: FONTS.semibold,
    fontSize: 14,
    lineHeight: 20,
  },

  /* Action bar */
  actionBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  hintText: {
    marginBottom: 8,
    textAlign: 'center',
    color: COLORS.muted,
    fontFamily: FONTS.semibold,
    fontSize: 13,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
  totalValue: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 15,
  },
});
