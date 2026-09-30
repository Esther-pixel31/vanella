// The rewards a customer can claim with points. The backend has no endpoint
// listing these, so `type` and `cost` must match REWARD_COSTS in
// backend/app/services/customer/loyalty_service.py. The backend still
// checks the real cost when a reward is claimed.
export const FREE_20L = 'free_20l';
export const HALF_OFF = 'half_off';

export const REWARDS = [
  {
    type: FREE_20L,
    title: 'Free 20L Water',
    description: 'One free 20L bottle added to an order.',
    cost: 50,
    icon: 'water',
  },
  {
    type: HALF_OFF,
    title: '50% Off Bulk Water',
    description: 'Half price on the 6,000L or 10,000L water in an order.',
    cost: 500,
    icon: 'pricetag',
  },
];

export const POINTS_PER_20L = 10;
export const POINTS_PER_BULK = 100;

export function getReward(type) {
  return REWARDS.find((reward) => reward.type === type) || null;
}
