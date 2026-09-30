import { apiRequest } from './client';

// Returns { points_balance, available_rewards } where available_rewards are
// rewards already claimed but not yet used on an order.
export function getRewards() {
  return apiRequest('/api/customer/rewards');
}

export function claimReward(rewardType) {
  return apiRequest('/api/customer/rewards/claim', {
    method: 'POST',
    body: { reward_type: rewardType },
  });
}
