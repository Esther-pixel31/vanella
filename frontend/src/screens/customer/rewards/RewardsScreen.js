import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Image,
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
import Svg, { Circle } from 'react-native-svg';

import { ApiError } from '../../../api/client';
import { claimReward, getRewards } from '../../../api/rewards';
import BottomNav from '../../../components/BottomNav';
import {
  ErrorState,
  LoadingState,
  ProgressBar,
  ScreenTitle,
  SectionTitle,
} from '../../../components/ui';
import { useCart } from '../../../context/CartContext';
import {
  FREE_20L,
  POINTS_PER_20L,
  POINTS_PER_BULK,
  REWARDS,
  getReward,
} from '../../../data/rewards';
import { COLORS, FONTS } from '../../../theme';


const NETWORK_ERROR =
  'Could not reach the server. Check your connection and try again.';

const IMAGE_20L = require('../../../../assets/images/product-20l.png');
const IMAGE_BULK = require('../../../../assets/images/product-6000l.png');

const rewardImage = (type) => (type === FREE_20L ? IMAGE_20L : IMAGE_BULK);

const RING_SIZE = 132;
const RING_STROKE = 12;

// Decorative water bubbles on the points card: [left, top, size, opacity].
const BUBBLES = [
  [250, -18, 70, 0.35],
  [226, 64, 22, 0.45],
  [272, 96, 12, 0.5],
  [200, 18, 9, 0.5],
];


function PointsRing({ points, progress }) {
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(progress, 1)) * circumference;

  return (
    <View style={styles.ring}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.14)"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          stroke="#5FB4FF"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          fill="none"
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>

      <View style={styles.ringCenter}>
        <Text style={styles.ringPoints}>{points}</Text>
        <Text style={styles.ringLabel}>points</Text>
      </View>
    </View>
  );
}


// A reward shown as a ticket: product photo, perforated edge, details.
function RewardTicket({
  reward,
  points,
  confirming,
  claiming,
  onClaimPress,
  onConfirm,
  onCancel,
}) {
  const canClaim = points >= reward.cost;
  const missing = reward.cost - points;

  return (
    <View style={styles.ticket}>
      <View style={styles.ticketImageBox}>
        <Image
          source={rewardImage(reward.type)}
          style={styles.ticketPhoto}
          resizeMode="cover"
        />

        <View style={styles.costChip}>
          <Text style={styles.costChipText}>{reward.cost} pts</Text>
        </View>
      </View>

      {/* Notches that make the card look like a torn-off ticket. */}
      <View style={[styles.notch, styles.notchTop]} />
      <View style={[styles.notch, styles.notchBottom]} />

      <View style={styles.ticketBody}>
        <Text style={styles.ticketTitle}>{reward.title}</Text>
        <Text style={styles.ticketDescription}>{reward.description}</Text>

        <View style={styles.ticketProgress}>
          <ProgressBar
            progress={points / reward.cost}
            color={canClaim ? COLORS.ok : COLORS.royal}
          />
        </View>

        {confirming ? (
          <View style={styles.confirmRow}>
            <Text style={styles.confirmText}>Use {reward.cost} pts?</Text>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={claiming}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>No</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.claimButton}
              onPress={onConfirm}
              disabled={claiming}
              accessibilityRole="button"
              accessibilityLabel={`Yes, claim ${reward.title}`}
            >
              {claiming ? (
                <ActivityIndicator size="small" color={COLORS.surface} />
              ) : (
                <Text style={styles.claimText}>Yes</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ticketFooter}>
            <Text style={[styles.ticketStatus, canClaim && styles.ticketStatusReady]}>
              {canClaim ? 'Ready to claim' : `${missing} points to go`}
            </Text>

            <TouchableOpacity
              style={[styles.claimButton, !canClaim && styles.claimButtonDisabled]}
              onPress={onClaimPress}
              disabled={!canClaim}
              accessibilityRole="button"
              accessibilityLabel={`Claim ${reward.title}`}
              accessibilityState={{ disabled: !canClaim }}
            >
              <Text style={[styles.claimText, !canClaim && styles.claimTextDisabled]}>
                Claim
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}


function EarnTile({ image, points, label }) {
  return (
    <View style={styles.earnTile}>
      <View style={styles.earnImageBox}>
        <Image source={image} style={styles.ticketImage} resizeMode="cover" />
      </View>

      <View>
        <Text style={styles.earnPoints}>+{points}</Text>
        <Text style={styles.earnLabel}>{label}</Text>
      </View>
    </View>
  );
}


export default function RewardsScreen({ navigation }) {
  const { items: cartItems } = useCart();

  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [confirmingType, setConfirmingType] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');


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


  const loadRewards = useCallback(async () => {
    setLoadError('');

    try {
      setSummary(await getRewards());
    } catch (err) {
      handleApiError(err, setLoadError);
    }
  }, [handleApiError]);


  // Reload whenever the screen comes into view, e.g. after an order.
  useFocusEffect(
    useCallback(() => {
      loadRewards();
    }, [loadRewards])
  );


  const handleClaim = async (reward) => {
    setError('');
    setNotice('');
    setClaiming(true);

    try {
      await claimReward(reward.type);

      setSummary(await getRewards());
      setNotice(`${reward.title} claimed. Use it at checkout on your next order.`);
    } catch (err) {
      handleApiError(err, setError);
    } finally {
      setClaiming(false);
      setConfirmingType(null);
    }
  };


  const renderContent = () => {
    if (summary === null) {
      return loadError ? (
        <ErrorState message={loadError} onRetry={loadRewards} />
      ) : (
        <LoadingState />
      );
    }

    const points = summary.points_balance;
    const claimed = summary.available_rewards;

    // The ring shows progress towards the cheapest reward still out of reach.
    const nextReward = REWARDS.filter((reward) => reward.cost > points).sort(
      (a, b) => a.cost - b.cost
    )[0];
    const claimableCount = REWARDS.filter((reward) => points >= reward.cost).length;

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* =====================================
            POINTS
        ===================================== */}

        <View style={styles.pointsCard}>
          {BUBBLES.map(([left, top, size, opacity], index) => (
            <View
              key={index}
              style={[
                styles.bubble,
                {
                  left,
                  top,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderColor: `rgba(143, 196, 255, ${opacity})`,
                  backgroundColor: `rgba(143, 196, 255, ${opacity / 3})`,
                },
              ]}
            />
          ))}

          <PointsRing
            points={points}
            progress={nextReward ? points / nextReward.cost : 1}
          />

          <View style={styles.pointsText}>
            <Text style={styles.pointsEyebrow}>
              {nextReward ? 'NEXT REWARD' : 'ALL UNLOCKED'}
            </Text>

            <Text style={styles.pointsHeadline}>
              {nextReward
                ? `${nextReward.cost - points} points to ${nextReward.title.toLowerCase()}`
                : 'You have enough points for every reward'}
            </Text>

            {claimableCount > 0 ? (
              <View style={styles.claimChip}>
                <Ionicons name="gift" size={14} color="#CFE6FF" />
                <Text style={styles.claimChipText}>
                  {claimableCount === 1
                    ? '1 reward to claim'
                    : `${claimableCount} rewards to claim`}
                </Text>
              </View>
            ) : null}
          </View>
        </View>


        {/* =====================================
            MESSAGES
        ===================================== */}

        {notice ? (
          <View style={styles.noticeBox}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.ok} />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}


        {/* =====================================
            READY TO USE
        ===================================== */}

        {claimed.length > 0 ? (
          <View style={styles.section}>
            <SectionTitle title="Ready to use" />

            <View style={styles.list}>
              {claimed.map((item) => {
                const reward = getReward(item.reward_type);

                return (
                  <View key={item.id} style={styles.coupon}>
                    <View style={styles.couponIcon}>
                      <Ionicons name="gift" size={20} color={COLORS.ok} />
                    </View>

                    <View style={styles.couponText}>
                      <Text style={styles.couponTitle}>
                        {reward ? reward.title : item.reward_type}
                      </Text>
                      <Text style={styles.couponSubtitle}>
                        Claimed · add it at checkout
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.useButton}
                      onPress={() =>
                        navigation.navigate(cartItems.length > 0 ? 'Cart' : 'CustomerHome')
                      }
                      accessibilityRole="button"
                    >
                      <Text style={styles.useText}>Use now</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}


        {/* =====================================
            CLAIM WITH POINTS
        ===================================== */}

        <View style={styles.section}>
          <SectionTitle title="Claim with points" />

          <View style={styles.list}>
            {REWARDS.map((reward) => (
              <RewardTicket
                key={reward.type}
                reward={reward}
                points={points}
                confirming={confirmingType === reward.type}
                claiming={claiming}
                onClaimPress={() => {
                  setError('');
                  setNotice('');
                  setConfirmingType(reward.type);
                }}
                onConfirm={() => handleClaim(reward)}
                onCancel={() => setConfirmingType(null)}
              />
            ))}
          </View>
        </View>


        {/* =====================================
            HOW YOU EARN
        ===================================== */}

        <View style={styles.section}>
          <SectionTitle title="How you earn" />

          <View style={styles.earnRow}>
            <EarnTile image={IMAGE_20L} points={POINTS_PER_20L} label={'points per\n20L bottle'} />
            <EarnTile image={IMAGE_BULK} points={POINTS_PER_BULK} label={'points per\nbulk order'} />
          </View>
        </View>

      </ScrollView>
    );
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <ScreenTitle title="Rewards" />

      {renderContent()}

      <BottomNav activeTab="rewards" navigation={navigation} />
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
    marginTop: 20,
  },
  list: {
    gap: 12,
  },

  /* Points card */
  pointsCard: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    padding: 20,
    borderRadius: 24,
    backgroundColor: COLORS.deep,
  },
  bubble: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPoints: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 34,
    letterSpacing: -1,
  },
  ringLabel: {
    color: '#B9CCE8',
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  pointsText: {
    flex: 1,
  },
  pointsEyebrow: {
    color: COLORS.sky,
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  pointsHeadline: {
    marginTop: 6,
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 17,
    lineHeight: 22,
  },
  claimChip: {
    alignSelf: 'flex-start',
    marginTop: 10,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(95, 180, 255, 0.18)',
  },
  claimChipText: {
    color: '#CFE6FF',
    fontFamily: FONTS.bold,
    fontSize: 12,
  },

  /* Messages */
  noticeBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.okBg,
  },
  noticeText: {
    flex: 1,
    color: COLORS.ok,
    fontFamily: FONTS.bold,
    fontSize: 14,
    lineHeight: 19,
  },
  errorText: {
    marginTop: 14,
    color: COLORS.red,
    fontFamily: FONTS.semibold,
    fontSize: 14,
    lineHeight: 20,
  },

  /* Ready-to-use coupon */
  coupon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#7CC79A',
    backgroundColor: COLORS.okBg,
  },
  couponIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponText: {
    flex: 1,
  },
  couponTitle: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 15,
  },
  couponSubtitle: {
    marginTop: 1,
    color: COLORS.ok,
    fontFamily: FONTS.semibold,
    fontSize: 12,
  },
  useButton: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.ok,
    justifyContent: 'center',
  },
  useText: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 13,
  },

  /* Ticket */
  ticket: {
    flexDirection: 'row',
    minHeight: 150,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  ticketImageBox: {
    width: 100,
    backgroundColor: COLORS.deep,
  },
  ticketImage: {
    width: '100%',
    height: '100%',
  },
  // Absolute, so the photo fills the box without setting the ticket's height.
  ticketPhoto: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  costChip: {
    position: 'absolute',
    left: 8,
    top: 8,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 18, 46, 0.75)',
    justifyContent: 'center',
  },
  costChipText: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 11,
  },
  notch: {
    position: 'absolute',
    left: 89,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.ground,
  },
  notchTop: {
    top: -11,
  },
  notchBottom: {
    bottom: -11,
  },
  ticketBody: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 14,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.line,
    borderStyle: 'dashed',
  },
  ticketTitle: {
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 16,
  },
  ticketDescription: {
    marginTop: 3,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  ticketProgress: {
    marginTop: 'auto',
    paddingTop: 10,
  },
  ticketFooter: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  ticketStatus: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  ticketStatusReady: {
    color: COLORS.ok,
  },
  claimButton: {
    height: 40,
    minWidth: 64,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.royal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonDisabled: {
    backgroundColor: COLORS.track,
  },
  claimText: {
    color: COLORS.surface,
    fontFamily: FONTS.extrabold,
    fontSize: 13,
  },
  claimTextDisabled: {
    color: COLORS.muted,
  },
  confirmRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmText: {
    flex: 1,
    color: COLORS.ink,
    fontFamily: FONTS.extrabold,
    fontSize: 13,
  },
  cancelButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    justifyContent: 'center',
  },
  cancelText: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 13,
  },

  /* How you earn */
  earnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  earnTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
  },
  earnImageBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.deep,
  },
  earnPoints: {
    color: COLORS.royal,
    fontFamily: FONTS.extrabold,
    fontSize: 17,
  },
  earnLabel: {
    color: COLORS.muted,
    fontFamily: FONTS.medium,
    fontSize: 11,
    lineHeight: 14,
  },
});
