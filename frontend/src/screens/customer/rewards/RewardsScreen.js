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

import { ApiError } from '../../../api/client';
import { claimReward, getRewards } from '../../../api/rewards';
import BottomNav from '../../../components/BottomNav';
import VanellaHeader from '../../../components/VanellaHeader';
import {
  POINTS_PER_20L,
  POINTS_PER_BULK,
  REWARDS,
  getReward,
} from '../../../data/rewards';


const COLORS = {
  primary: '#087FF5',
  navy: '#052B6B',
  background: '#F5F8FC',
  white: '#FFFFFF',
  text: '#082D6A',
  muted: '#63738B',
  track: '#DFE8F1',
  success: '#19703A',
  error: '#C62828',
};

const NETWORK_ERROR =
  'Could not reach the server. Check your connection and try again.';


function RewardCard({
  reward,
  points,
  confirming,
  claiming,
  onClaimPress,
  onConfirm,
  onCancel,
}) {
  const canClaim = points >= reward.cost;
  const progress = Math.min(points / reward.cost, 1);
  const missing = reward.cost - points;

  return (
    <View style={styles.card}>

      <View style={styles.rewardTopRow}>
        <View style={styles.rewardIcon}>
          <Ionicons name={reward.icon} size={22} color={COLORS.primary} />
        </View>

        <View style={styles.rewardText}>
          <Text style={styles.rewardTitle}>
            {reward.title}
          </Text>

          <Text style={styles.rewardDescription}>
            {reward.description}
          </Text>
        </View>

        <View style={styles.costPill}>
          <Text style={styles.costText}>
            {reward.cost} pts
          </Text>
        </View>
      </View>


      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <Text style={styles.progressText}>
        {canClaim
          ? 'You have enough points for this reward.'
          : `${missing} more points needed`}
      </Text>


      {confirming ? (
        <View>
          <Text style={styles.confirmText}>
            Use {reward.cost} points to claim this reward?
          </Text>

          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.7}
              disabled={claiming}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              activeOpacity={0.85}
              disabled={claiming}
              onPress={onConfirm}
            >
              {claiming ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.claimButtonText}>
                  Yes, Claim
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.claimButton, !canClaim && styles.claimButtonDisabled]}
          activeOpacity={0.85}
          disabled={!canClaim}
          onPress={onClaimPress}
        >
          <Text style={styles.claimButtonText}>
            Claim Reward
          </Text>
        </TouchableOpacity>
      )}

    </View>
  );
}


export default function RewardsScreen({ navigation }) {
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
              onPress={loadRewards}
            >
              <Text style={styles.claimButtonText}>
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

    const points = summary.points_balance;
    const claimed = summary.available_rewards;

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <Text style={styles.pageTitle}>
          Rewards
        </Text>


        {/* =====================================
            POINTS BALANCE
        ===================================== */}

        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>
              YOUR POINTS
            </Text>

            <Text style={styles.balancePoints}>
              {points}
              <Text style={styles.balanceUnit}> PTS</Text>
            </Text>
          </View>

          <View style={styles.balanceIcon}>
            <Ionicons name="trophy" size={28} color={COLORS.white} />
          </View>
        </View>


        {/* =====================================
            MESSAGES
        ===================================== */}

        {notice ? (
          <View style={styles.noticeBox}>
            <Ionicons name="checkmark-circle" size={20} color="#19A65B" />

            <Text style={styles.noticeText}>
              {notice}
            </Text>
          </View>
        ) : null}

        {error ? (
          <Text style={styles.errorText}>
            {error}
          </Text>
        ) : null}


        {/* =====================================
            CLAIMED, READY TO USE
        ===================================== */}

        {claimed.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>
              Ready to use
            </Text>

            {claimed.map((item) => {
              const reward = getReward(item.reward_type);

              return (
                <View key={item.id} style={styles.claimedRow}>
                  <Ionicons name="gift" size={21} color="#19A65B" />

                  <View style={styles.rewardText}>
                    <Text style={styles.claimedTitle}>
                      {reward ? reward.title : item.reward_type}
                    </Text>

                    <Text style={styles.rewardDescription}>
                      Choose it at checkout to use it.
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}


        {/* =====================================
            REWARDS TO CLAIM
        ===================================== */}

        <Text style={styles.sectionTitle}>
          Claim with points
        </Text>

        {REWARDS.map((reward) => (
          <RewardCard
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


        {/* =====================================
            HOW TO EARN
        ===================================== */}

        <Text style={styles.sectionTitle}>
          How you earn points
        </Text>

        <View style={styles.card}>

          <View style={styles.earnRow}>
            <Text style={styles.earnLabel}>
              Each 20L Water
            </Text>

            <Text style={styles.earnValue}>
              +{POINTS_PER_20L} pts
            </Text>
          </View>

          <View style={[styles.earnRow, styles.earnRowLast]}>
            <Text style={styles.earnLabel}>
              Each 6,000L or 10,000L Bulk Water
            </Text>

            <Text style={styles.earnValue}>
              +{POINTS_PER_BULK} pts
            </Text>
          </View>

        </View>

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


      <BottomNav activeTab="rewards" navigation={navigation} />

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

    paddingBottom: 25,
  },


  pageTitle: {
    color: COLORS.text,

    fontSize: 29,
    lineHeight: 35,

    fontWeight: '900',

    marginBottom: 17,
  },


  sectionTitle: {
    color: COLORS.text,

    fontSize: 18,
    lineHeight: 23,

    fontWeight: '900',

    marginTop: 8,
    marginBottom: 11,
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


  /* =======================================
     BALANCE
  ======================================= */

  balanceCard: {
    backgroundColor: COLORS.navy,

    borderRadius: 20,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: 22,
    paddingVertical: 20,

    marginBottom: 14,
  },


  balanceLabel: {
    color: '#BFDFFF',

    fontSize: 12,
    lineHeight: 16,

    fontWeight: '900',

    letterSpacing: 0.9,
  },


  balancePoints: {
    color: COLORS.white,

    fontSize: 40,
    lineHeight: 46,

    fontWeight: '900',

    marginTop: 2,
  },


  balanceUnit: {
    color: '#BFDFFF',

    fontSize: 14,
    fontWeight: '800',
  },


  balanceIcon: {
    width: 58,
    height: 58,

    borderRadius: 29,

    backgroundColor: COLORS.primary,

    alignItems: 'center',
    justifyContent: 'center',
  },


  /* =======================================
     MESSAGES
  ======================================= */

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 9,

    backgroundColor: '#DFF5E6',

    borderRadius: 14,

    paddingHorizontal: 14,
    paddingVertical: 12,

    marginBottom: 12,
  },


  noticeText: {
    flex: 1,

    color: COLORS.success,

    fontSize: 14,
    lineHeight: 19,

    fontWeight: '700',
  },


  errorText: {
    color: COLORS.error,

    fontSize: 14,
    lineHeight: 20,

    marginBottom: 12,
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


  claimedRow: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: COLORS.white,

    borderWidth: 1.4,
    borderColor: '#BFE8CD',

    borderRadius: 16,

    paddingHorizontal: 16,
    paddingVertical: 13,

    marginBottom: 10,
  },


  claimedTitle: {
    color: COLORS.text,

    fontSize: 15,
    lineHeight: 20,

    fontWeight: '900',
  },


  /* =======================================
     REWARD CARD
  ======================================= */

  rewardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },


  rewardIcon: {
    width: 44,
    height: 44,

    borderRadius: 13,

    backgroundColor: '#E4F1FF',

    alignItems: 'center',
    justifyContent: 'center',
  },


  rewardText: {
    flex: 1,

    marginHorizontal: 12,
  },


  rewardTitle: {
    color: COLORS.text,

    fontSize: 16,
    lineHeight: 21,

    fontWeight: '900',
  },


  rewardDescription: {
    color: COLORS.muted,

    fontSize: 13,
    lineHeight: 18,

    marginTop: 2,
  },


  costPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 12,

    backgroundColor: '#E4F1FF',
  },


  costText: {
    color: '#0866DD',

    fontSize: 12,
    lineHeight: 16,

    fontWeight: '900',
  },


  progressTrack: {
    height: 7,

    borderRadius: 4,

    backgroundColor: COLORS.track,

    overflow: 'hidden',

    marginTop: 14,
  },


  progressFill: {
    height: '100%',

    borderRadius: 4,

    backgroundColor: COLORS.primary,
  },


  progressText: {
    color: COLORS.muted,

    fontSize: 13,
    lineHeight: 18,

    marginTop: 6,
    marginBottom: 12,
  },


  claimButton: {
    height: 46,

    borderRadius: 23,

    backgroundColor: '#0866DD',

    alignItems: 'center',
    justifyContent: 'center',
  },


  claimButtonDisabled: {
    backgroundColor: '#9DBFEF',
  },


  claimButtonText: {
    color: COLORS.white,

    fontSize: 15,
    fontWeight: '800',
  },


  confirmText: {
    color: COLORS.text,

    fontSize: 14,
    lineHeight: 19,

    fontWeight: '800',

    marginBottom: 10,
  },


  confirmButtons: {
    flexDirection: 'row',

    gap: 10,
  },


  cancelButton: {
    flex: 1,
    height: 46,

    borderRadius: 23,

    borderWidth: 1.4,
    borderColor: '#C9D8E8',

    alignItems: 'center',
    justifyContent: 'center',
  },


  cancelButtonText: {
    color: '#0866DD',

    fontSize: 15,
    fontWeight: '800',
  },


  confirmButton: {
    flex: 1,
    height: 46,

    borderRadius: 23,

    backgroundColor: '#0866DD',

    alignItems: 'center',
    justifyContent: 'center',
  },


  /* =======================================
     HOW TO EARN
  ======================================= */

  earnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginBottom: 12,
  },


  earnRowLast: {
    marginBottom: 0,
  },


  earnLabel: {
    flex: 1,

    color: '#173B6D',

    fontSize: 15,
    lineHeight: 20,

    fontWeight: '500',

    marginRight: 10,
  },


  earnValue: {
    color: COLORS.primary,

    fontSize: 15,
    lineHeight: 20,

    fontWeight: '900',
  },


});
