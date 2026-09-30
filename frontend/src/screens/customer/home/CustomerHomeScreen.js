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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import { ApiError } from '../../../api/client';
import { getHomeSummary } from '../../../api/home';
import { getProducts } from '../../../api/products';
import { useCart } from '../../../context/CartContext';
import { toProductCard } from '../../../data/products';
import {
  formatKes,
  formatOrderDate,
  formatOrderRef,
} from '../../../utils/format';

/* -------------------------------------------------------------------------- */
/* Theme                                                                      */
/* -------------------------------------------------------------------------- */

const COLORS = {
  navy: '#071F68',
  primary: '#087FF5',
  textMuted: '#53698E',
  textSoft: '#7486A8',
  textDisabled: '#8291A8',
  white: '#FFFFFF',
  background: '#F9FCFF',
  tint: '#E4F4FF',
  tintSoft: '#E9F7FF',
  border: '#CDE8FA',
  track: '#DFE6EE',
  inactive: '#C7D4E1',
  alert: '#FF334F',
  navBorder: '#EEF2F7',
  onNavy: '#BFDFFF',
};

const shadow = (color, opacity, radius, offsetY, elevation) => ({
  shadowColor: color,
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: offsetY },
  elevation,
});

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

const toRecentOrder = (order) => ({
  id: formatOrderRef(order.id),
  productName: order.product_name,
  placedAt: formatOrderDate(order.placed_at),
  status: order.status, // 'received' | 'ready' | 'delivered'
});

const firstName = (fullName) => fullName.trim().split(/\s+/)[0];

const ORDER_STEPS = [
  { id: 'received', label: 'Order Received' },
  { id: 'ready', label: 'Ready to Deliver' },
  { id: 'delivered', label: 'Delivered' },
];

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { id: 'orders', label: 'Orders', icon: 'receipt-outline', activeIcon: 'receipt' },
  { id: 'rewards', label: 'Rewards', icon: 'star-outline', activeIcon: 'star' },
  { id: 'notifications', label: 'Alerts', icon: 'notifications-outline', activeIcon: 'notifications' },
  { id: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

// Points needed for the free 20L reward shown on the loyalty card.
const REWARD_TARGET = 50;

/* -------------------------------------------------------------------------- */
/* Layout constants                                                           */
/* -------------------------------------------------------------------------- */

const NAV_CONTENT_HEIGHT = 74;

// Hero: uses the full-bottle shot. hero-water.png has the bottle cut off at
// its right edge, so it can't show the whole bottle at any size.

const HERO_IMAGE = require('../../../../assets/images/hero-water.png');
const REWARDS_BACKGROUND = require('../../../../assets/images/rewards-water.png');

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

function Header({ name, cartCount, onCartPress }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Hello, {name}</Text>
        <Text style={styles.greetingSub}>Healthy living</Text>
      </View>

      <TouchableOpacity
        style={styles.headerCartButton}
        activeOpacity={0.8}
        onPress={onCartPress}
        accessibilityRole="button"
        accessibilityLabel={
          cartCount > 0 ? `Cart, ${cartCount} items` : 'Cart'
        }
      >
        <Ionicons name="cart-outline" size={25} color={COLORS.textMuted} />

        {cartCount > 0 && (
          <View style={styles.headerCartBadge}>
            <Text style={styles.headerCartBadgeText}>{cartCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

function HeroCard({ onOrderPress }) {
  return (
    <View style={styles.heroCard}>
      {/* FULL HERO BACKGROUND */}
      <Image
        source={HERO_IMAGE}
        style={styles.heroImage}
        resizeMode="cover"
        accessible={false}
      />

      {/* CONTENT OVER THE IMAGE */}
      <View style={styles.heroContent}>
        <Text style={styles.heroTitle}>Need water?</Text>

        <Text style={styles.heroSubtitle}>
          We've got you covered.
        </Text>

        {/* BENEFITS */}
        <View style={styles.heroBenefits}>

          <View style={styles.heroBenefit}>
            <View style={styles.benefitIconCircle}>
              <Ionicons
                name="car-outline"
                size={16}
                color="#FFFFFF"
              />
            </View>

            <View>
              <Text style={styles.benefitTitle}>Fast</Text>
              <Text style={styles.benefitText}>Delivery</Text>
            </View>
          </View>

          <View style={styles.heroBenefit}>
            <View style={styles.benefitIconCircle}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color="#FFFFFF"
              />
            </View>

            <View>
              <Text style={styles.benefitTitle}>Clean</Text>
              <Text style={styles.benefitText}>& Safe</Text>
            </View>
          </View>

          <View style={styles.heroBenefit}>
            <View style={styles.benefitIconCircle}>
              <Ionicons
                name="water-outline"
                size={16}
                color="#FFFFFF"
              />
            </View>

            <View>
              <Text style={styles.benefitTitle}>Trusted</Text>
              <Text style={styles.benefitText}>Quality</Text>
            </View>
          </View>

        </View>

        {/* ORDER BUTTON */}
        <TouchableOpacity
          style={styles.orderButton}
          onPress={onOrderPress}
          activeOpacity={0.85}
        >
          <Text style={styles.orderButtonText}>
            Order Water
          </Text>

          <View style={styles.orderButtonArrow}>
            <Text style={styles.orderButtonArrowText}>›</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
function LoyaltyCard({ points, target, onViewRewardsPress }) {
  const remaining = Math.max(target - points, 0);
  const progress = Math.min(points / target, 1);
  const progressPercent = Math.round(progress * 100);

  const milestones = [10, 20, 30, 40, 50];

  return (
    <View style={styles.loyaltyCard}>
      {/* WATER BACKGROUND */}
      <Image
        source={REWARDS_BACKGROUND}
        style={styles.rewardsBackground}
        resizeMode="cover"
        accessible={false}
      />

      {/* ALL UI CONTENT */}
      <View style={styles.rewardsContent}>

        {/* TOP ROW */}
        <View style={styles.rewardsTopRow}>

          {/* LEFT SIDE */}
          <View style={styles.rewardsLeft}>

            {/* VANELLA REWARDS */}
            <View style={styles.rewardsBrandRow}>
              <View style={styles.rewardsCrown}>
                <Ionicons
                  name="trophy"
                  size={15}
                  color="#FFFFFF"
                />
              </View>

              <Text style={styles.rewardsEyebrow}>
                VANELLA REWARDS
              </Text>
            </View>

            <Text style={styles.rewardsTitle}>
              You're getting closer!
            </Text>

            <Text style={styles.rewardsMessage}>
              {remaining > 0 ? `${remaining} points until your` : 'Congratulations!'}
            </Text>

            <Text style={styles.rewardsFree}>
              {remaining > 0 ? 'FREE 20L WATER' : 'REWARD UNLOCKED'}
            </Text>
          </View>


          {/* RIGHT SIDE */}
          <View style={styles.rewardsRight}>
            <Text style={styles.rewardsPoints}>
              {points}
              <Text style={styles.rewardsPointsUnit}> PTS</Text>
            </Text>

            <Text style={styles.progressLabel}>
              Your progress
            </Text>

            <Text style={styles.rewardsPercentage}>
              {progressPercent}%
            </Text>

            <View style={styles.rewardsProgressTrack}>
              <View
                style={[
                  styles.rewardsProgressFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>

        </View>


        {/* BOTTOM AREA */}
        <View style={styles.rewardsBottom}>

          {/* MILESTONE JOURNEY */}
          <View style={styles.milestoneArea}>

            {/* LINE BEHIND ICONS */}
            <View style={styles.milestoneLine}>
              <View
                style={[
                  styles.milestoneLineActive,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>

            <View style={styles.milestones}>
              {milestones.map((milestone) => {
                const reached = points >= milestone;
                const isReward = milestone === target;

                return (
                  <View
                    key={milestone}
                    style={styles.milestoneItem}
                  >
                    {isReward ? (
                      <View style={styles.rewardGiftCircle}>
                        <Ionicons
                          name="gift"
                          size={19}
                          color="#F21B2D"
                        />
                      </View>
                    ) : (
                      <Ionicons
                        name="water"
                        size={30}
                        color={
                          reached
                            ? COLORS.primary
                            : '#C8D0D8'
                        }
                      />
                    )}

                    <Text
                      style={[
                        styles.milestoneText,
                        reached && styles.milestoneTextReached,
                      ]}
                    >
                      {milestone}
                    </Text>
                  </View>
                );
              })}
            </View>

          </View>


          {/* VIEW REWARDS */}
          <TouchableOpacity
            style={styles.rewardsButton}
            onPress={onViewRewardsPress}
            activeOpacity={0.85}
          >
            <Text style={styles.rewardsButtonText}>
              View Rewards
            </Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>

        </View>

      </View>
    </View>
  );
}

function SectionHeader({ title, onViewAllPress }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <TouchableOpacity
        onPress={onViewAllPress}
        accessibilityRole="button"
        accessibilityLabel={`View all ${title.toLowerCase()}`}
        style={styles.viewAllButton}
      >
        <Text style={styles.viewAll}>View All</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

function ProductCard({ product, onPress }) {
  const isOutline = product.variant === 'outline';

  return (
    <View style={styles.productCard}>
      {/* PRODUCT IMAGE */}
      <View style={styles.productImageContainer}>
        <Image
          source={product.image}
          style={styles.productImage}
          resizeMode="contain"
        />
      </View>

      {/* PRODUCT DETAILS */}
      <View style={styles.productInfo}>
        <Text
          style={styles.productName}
          numberOfLines={2}
        >
          {product.name}
        </Text>

        <Text style={styles.productPrice}>
          {formatKes(product.price)}
        </Text>

        <TouchableOpacity
          style={[
            styles.productButton,
            isOutline && styles.productButtonOutline,
          ]}
          activeOpacity={0.8}
          onPress={() => onPress(product)}
          accessibilityRole="button"
          accessibilityLabel={`${product.action}: ${product.name}`}
        >
          <Ionicons
            name="cart-outline"
            size={18}
            color={COLORS.primary}
          />

          <Text
            style={[
              styles.productButtonText,
              isOutline && styles.productButtonTextOutline,
            ]}
          >
            {product.action}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


/* -------------------------------------------------------------------------- */
/* PRODUCTS SECTION                                                           */
/* -------------------------------------------------------------------------- */

function ProductsSection({ products, onProductPress, onSeeAllPress }) {
  return (
    <View style={styles.productsSection}>

      {/* HEADER */}
      <View style={styles.productsHeader}>
        <Text style={styles.productsTitle}>
          Our Products
        </Text>

        <View style={styles.productsHeaderRight}>

          {/* CART */}
          <TouchableOpacity
            style={styles.cartButton}
            activeOpacity={0.7}
            onPress={() => console.log('Open cart')}
          >
            <Ionicons
              name="cart-outline"
              size={22}
              color={COLORS.navy}
            />

            {/* CART QUANTITY BADGE */}
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>0</Text>
            </View>
          </TouchableOpacity>

          {/* SEE ALL */}
          <TouchableOpacity
            style={styles.seeAllButton}
            activeOpacity={0.7}
            onPress={onSeeAllPress}
          >
            <Text style={styles.seeAllText}>
              See All
            </Text>

            <Ionicons
              name="chevron-forward"
              size={14}
              color={COLORS.primary}
            />
          </TouchableOpacity>

        </View>
      </View>


      {/* PRODUCT CARDS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsRow}
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onPress={onProductPress}
          />
        ))}
      </ScrollView>

    </View>
  );
}

function OrderTracker({ status }) {
  const currentIndex = Math.max(
    ORDER_STEPS.findIndex((step) => step.id === status),
    0,
  );
  const progress = currentIndex / (ORDER_STEPS.length - 1);

  return (
    <View style={styles.tracker}>
      <View style={styles.trackerLine}>
        <View style={[styles.trackerLineActive, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.trackerSteps}>
        {ORDER_STEPS.map((step, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isReached = isDone || isCurrent;

          return (
            <View key={step.id} style={styles.step}>
              <View style={isReached ? styles.stepActive : styles.stepInactive}>
                {isDone ? (
                  <Ionicons name="checkmark" size={18} color={COLORS.white} />
                ) : (
                  <View style={styles.stepDot} />
                )}
              </View>

              <Text
                style={[styles.stepText, !isReached && styles.stepTextInactive]}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function RecentOrder({ order }) {
  return (
    <View style={styles.recentOrder}>
      <View style={styles.orderSummary}>
        <View style={styles.orderIconBox}>
          <Ionicons name="water" size={28} color={COLORS.primary} />
        </View>

        <View>
          <Text style={styles.orderProduct}>{order.productName}</Text>
          <Text style={styles.orderMeta}>Order #{order.id}</Text>
          <Text style={styles.orderMeta}>{order.placedAt}</Text>
        </View>
      </View>

      <OrderTracker status={order.status} />
    </View>
  );
}

function NoRecentOrder() {
  return (
    <View style={styles.recentOrder}>
      <View style={styles.orderSummaryEmpty}>
        <View style={styles.orderIconBox}>
          <Ionicons name="water-outline" size={28} color={COLORS.primary} />
        </View>

        <View style={styles.orderEmptyText}>
          <Text style={styles.orderProduct}>No orders yet</Text>
          <Text style={styles.orderMeta}>Your latest order will appear here.</Text>
        </View>
      </View>
    </View>
  );
}

function LoadError({ message, onRetry }) {
  return (
    <View style={styles.centered}>
      <Ionicons name="cloud-offline-outline" size={44} color={COLORS.textSoft} />
      <Text style={styles.loadErrorText}>{message}</Text>

      <TouchableOpacity
        style={styles.retryButton}
        activeOpacity={0.85}
        onPress={onRetry}
        accessibilityRole="button"
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

function BottomNav({ activeTab, hasUnread, onTabPress }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bottomNav,
        {
          height: NAV_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === activeTab;
        const color = isActive ? COLORS.primary : COLORS.textMuted;

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => onTabPress(item.id)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
          >
            <View>
              <Ionicons
                name={isActive ? item.activeIcon : item.icon}
                size={26}
                color={color}
              />
              {item.id === 'notifications' && hasUnread && (
                <View style={styles.navDot} />
              )}
            </View>
            <Text style={[styles.navText, { color }, isActive && styles.navTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Screen                                                                     */
/* -------------------------------------------------------------------------- */

export default function CustomerHomeScreen({navigation}) {
  const insets = useSafeAreaInsets();
  const { addItem, items: cartItems } = useCart();

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState('');

  const loadHome = useCallback(async () => {
    setLoadError('');

    try {
      const [summaryData, productData] = await Promise.all([
        getHomeSummary(),
        getProducts(),
      ]);

      setSummary(summaryData);
      setProducts(productData.map(toProductCard));
    } catch (err) {
      // 401 here means the saved login could not be refreshed.
      if (err instanceof ApiError && err.status === 401) {
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        return;
      }

      setLoadError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the server. Check your connection and try again.'
      );
    }
  }, [navigation]);

  // Reload whenever the screen comes back into view, e.g. after an order.
  useFocusEffect(
    useCallback(() => {
      loadHome();
    }, [loadHome])
  );

  // TODO: wire these up to navigation / cart once those screens exist.
  const handleCartPress = () => { navigation.navigate('Cart'); };
  const handleOrderNow = () => {};
  const handleProductPress = (product) => {
    addItem(product);
    navigation.navigate('Cart');
  };
  const handleViewAllProducts = () => {};
  const handleViewAllOrders = () => { navigation.navigate('Orders'); };
  const handleTabPress = (tab) => {
    if (tab === 'home') {
      return;
    }

    if (tab === 'orders') {
      navigation.navigate('Orders');
      return;
    }

    if (tab === 'rewards') {
      navigation.navigate('Rewards');
      return;
    }

    if (tab === 'notifications') {
      navigation.navigate('Notifications');
      return;
    }

    if (tab === 'profile') {
      navigation.navigate('Profile');
    }
  };
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.screen}>
        {summary ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: NAV_CONTENT_HEIGHT + insets.bottom + 24 },
            ]}
          >
            <Header
              name={firstName(summary.full_name)}
              cartCount={cartCount}
              onCartPress={handleCartPress}
            />

            <HeroCard onOrderPress={handleOrderNow} />

            <LoyaltyCard
              points={summary.points_balance}
              target={REWARD_TARGET}
              onViewRewardsPress={() => navigation.navigate('Rewards')}
            />

            <SectionHeader title="Our Products" onViewAllPress={handleViewAllProducts} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsRow}
              nestedScrollEnabled
            >
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={handleProductPress}
                />
              ))}
            </ScrollView>

            <SectionHeader title="Recent Order" onViewAllPress={handleViewAllOrders} />
            {summary.recent_order ? (
              <RecentOrder order={toRecentOrder(summary.recent_order)} />
            ) : (
              <NoRecentOrder />
            )}
          </ScrollView>
        ) : loadError ? (
          <LoadError message={loadError} onRetry={loadHome} />
        ) : (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}

        <BottomNav
          activeTab="home"
          hasUnread={Boolean(summary?.has_unread_notifications)}
          onTabPress={handleTabPress}
        />
      </View>
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  /* Loading / error */
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: NAV_CONTENT_HEIGHT,
  },
  loadErrorText: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    height: 46,
    paddingHorizontal: 28,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greeting: {
    color: COLORS.navy,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  greetingSub: {
    color: COLORS.textSoft,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 3,
  },
  headerCartButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(COLORS.primary, 0.13, 10, 4, 4),
  },
  headerCartBadge: {
    position: 'absolute',
    right: 4,
    top: 4,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: COLORS.alert,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCartBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },

  /* HERO */

  heroCard: {
  height: 240,
  borderRadius: 24,
  overflow: 'hidden',
  position: 'relative',
  },

  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },

  heroContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,

    width: '65%',
    paddingLeft: 20,
    paddingRight: 8,

    justifyContent: 'center',

    zIndex: 10,
    elevation: 10,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.6,
  },

  heroSubtitle: {
    color: '#E8F7FF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    marginTop: 4,
  },

  heroBenefits: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 16,
  width: '100%',
  },

  heroBenefit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  benefitTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 12,
    fontWeight: '800',
  },

  benefitText: {
    color: '#E1F5FF',
    fontSize: 11,
    lineHeight: 11,
    fontWeight: '500',
  },
  /* ORDER BUTTON */

  orderButton: {
    width: 165,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 5,
    marginTop: 18,
  },

  orderButtonText: {
    color: '#073B97',
    fontSize: 14,
    fontWeight: '800',
  },

  orderButtonArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1269E8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  orderButtonArrowText: {
    color: '#FFFFFF',
    fontSize: 27,
    lineHeight: 29,
  },

  /* -------------------------------------------------------------------------- */
/* Rewards / Loyalty                                                          */
/* -------------------------------------------------------------------------- */

loyaltyCard: {
  height: 260,
  marginTop: 16,
  borderRadius: 24,
  overflow: 'hidden',
  position: 'relative',
  backgroundColor: '#E9F8FF',

  ...shadow('#087FF5', 0.10, 12, 5, 4),
},

rewardsBackground: {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
},

rewardsContent: {
  flex: 1,
  width: '100%',
  paddingHorizontal: 20,
  paddingTop: 18,
  paddingBottom: 16,
  zIndex: 5,
},


/* ---------- TOP ---------- */

rewardsTopRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},

rewardsLeft: {
  width: '58%',
},

rewardsRight: {
  width: '34%',
  paddingTop: 30,
},


/* ---------- BRAND ---------- */

rewardsBrandRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
},

rewardsCrown: {
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: COLORS.primary,
  alignItems: 'center',
  justifyContent: 'center',
},

rewardsEyebrow: {
  color: COLORS.primary,
  fontSize: 11,
  fontWeight: '900',
  letterSpacing: 0.8,
},


/* ---------- HEADLINE ---------- */

rewardsTitle: {
  color: COLORS.navy,
  fontSize: 22,
  lineHeight: 27,
  fontWeight: '900',
  marginTop: 9,
  letterSpacing: -0.4,
},

rewardsMessage: {
  color: COLORS.textMuted,
  fontSize: 13,      // increased
  lineHeight: 18,
  fontWeight: '600',
  marginTop: 5,
},

rewardsFree: {
  color: COLORS.primary,
  fontSize: 15,      // increased
  lineHeight: 20,
  fontWeight: '900',
},


/* ---------- POINTS ---------- */

rewardsPoints: {
  color: COLORS.navy,
  fontSize: 30,
  lineHeight: 34,
  fontWeight: '900',
  marginTop: 12, // ← moves ONLY 20 PTS lower
},

rewardsPointsUnit: {
  color: COLORS.navy,
  fontSize: 10,
  fontWeight: '800',
},

progressLabel: {
  color: COLORS.textSoft,
  fontSize: 11,
  lineHeight: 15,
  fontWeight: '700',
  marginTop: 5,
},

rewardsPercentage: {
  color: COLORS.primary,
  fontSize: 18,
  lineHeight: 22,
  fontWeight: '900',
  marginTop: 1,
},

rewardsProgressTrack: {
  width: '100%',
  height: 7,
  borderRadius: 10,
  backgroundColor: '#D3E8F6',
  overflow: 'hidden',
  marginTop: 4,
},

rewardsProgressFill: {
  height: '100%',
  borderRadius: 10,
  backgroundColor: COLORS.primary,
},


/* ---------- BOTTOM ---------- */

rewardsBottom: {
  width: '100%',
  marginTop: 18,
  flexDirection: 'column', // ← milestone first, button underneath
},

milestoneArea: {
  width: '100%',  // ← stretches 10–50 across the card
  position: 'relative',
  paddingHorizontal: 4,
},

/* ---------- MILESTONE LINE ---------- */

milestoneLine: {
  position: 'absolute',

  top: 14,
  left: '9%',
  right: '9%',

  height: 3,
  borderRadius: 2,

  backgroundColor: '#C8D5E1',
  overflow: 'hidden',
},

milestoneLineActive: {
  height: '100%',
  backgroundColor: COLORS.primary,
},


/* ---------- MILESTONES ---------- */

milestones: {
  width: '100%',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
},

milestoneItem: {
  width: 34,
  alignItems: 'center',
  zIndex: 2,
},

rewardGiftCircle: {
  width: 30,
  height: 30,
  borderRadius: 15,

  backgroundColor: '#FFFFFF',

  alignItems: 'center',
  justifyContent: 'center',

  ...shadow('#071F68', 0.10, 5, 2, 2),
},

milestoneText: {
  color: COLORS.textSoft,
  fontSize: 9,
  lineHeight: 12,
  fontWeight: '700',
  marginTop: 3,
},

milestoneTextReached: {
  color: COLORS.primary,
  fontWeight: '900',
},


/* ---------- BUTTON ---------- */

rewardsButton: {
  alignSelf: 'flex-end', // ← RIGHT
  height: 42,

  paddingLeft: 17,
  paddingRight: 12,

  borderRadius: 22,
  backgroundColor: COLORS.primary,

  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',

  gap: 7,
  

  ...shadow('#087FF5', 0.20, 8, 4, 4),
},

rewardsButtonText: {
  color: '#FFFFFF',
  fontSize: 11,
  fontWeight: '800',
},

  /* Section headers */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 11,
  },
  sectionTitle: {
    color: COLORS.navy,
    fontSize: 21,
    fontWeight: '900',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAll: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },

  /* Products */
  /* -------------------------------------------------------------------------- */

productsSection: {
  marginTop: 20,
  width: '100%',
},

productsHeader: {
  width: '100%',

  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',

  marginBottom: 10,
},

productsTitle: {
  color: COLORS.navy,

  fontSize: 18,
  lineHeight: 22,

  fontWeight: '900',
},

seeAllButton: {
  flexDirection: 'row',
  alignItems: 'center',

  gap: 2,
},

seeAllText: {
  color: COLORS.primary,

  fontSize: 11,
  fontWeight: '800',
},


productsRow: {
  flexDirection: 'row',
  gap: 12,
  paddingRight: 24,
  paddingBottom: 6,
},

productCard: {
  width: 155,            // IMPORTANT for horizontal scrolling
  height: 235,

  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  overflow: 'hidden',

  ...shadow('#071F68', 0.08, 8, 3, 3),
},

productImageContainer: {
  width: '100%',
  height: 110,

  alignItems: 'center',
  justifyContent: 'center',

  paddingHorizontal: 8,
  paddingTop: 6,
},

productImage: {
  width: '95%',
  height: '95%',
},

productInfo: {
  flex: 1,
  paddingHorizontal: 10,
  paddingBottom: 10,
},

productName: {
  color: COLORS.navy,

  fontSize: 16,          // LARGER
  lineHeight: 19,
  fontWeight: '900',     // THICKER

  minHeight: 38,
},

productPrice: {
  color: COLORS.primary,

  fontSize: 16,          // LARGER PRICE
  lineHeight: 20,
  fontWeight: '900',

  marginTop: 2,
},

productButton: {
  height: 34,

  borderRadius: 18,
  backgroundColor: '#DCEEFF',

  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',

  gap: 6,

  marginTop: 'auto',
  paddingHorizontal: 8,
},

productButtonOutline: {
  backgroundColor: '#DCEEFF',
  borderWidth: 0,
},

productButtonText: {
  color: COLORS.primary,

  fontSize: 12,          // LARGER
  lineHeight: 15,
  fontWeight: '900',     // THICKER

  textAlign: 'center',
},

productButtonTextOutline: {
  color: COLORS.primary,
},

productsHeaderRight: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 14,
},

cartButton: {
  width: 34,
  height: 34,

  alignItems: 'center',
  justifyContent: 'center',

  position: 'relative',
},

cartBadge: {
  position: 'absolute',

  top: 0,
  right: 0,

  minWidth: 16,
  height: 16,

  paddingHorizontal: 4,

  borderRadius: 8,

  backgroundColor: COLORS.primary,

  alignItems: 'center',
  justifyContent: 'center',
},

cartBadgeText: {
  color: '#FFFFFF',

  fontSize: 12,
  fontWeight: '900',
},
  /* Recent order */
  recentOrder: {
    backgroundColor: COLORS.tintSoft,
    borderRadius: 20,
    padding: 15,
  },
  orderSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  orderSummaryEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderEmptyText: {
    flex: 1,
  },
  orderIconBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderProduct: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '900',
  },
  orderMeta: {
    color: COLORS.textSoft,
    fontSize: 13,
    marginTop: 2,
  },

  /* Order tracker */
  tracker: {
    position: 'relative',
  },
  trackerLine: {
    position: 'absolute',
    top: 14,
    left: '16%',
    right: '16%',
    height: 3,
    backgroundColor: COLORS.inactive,
  },
  trackerLineActive: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  trackerSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  step: {
    width: '31%',
    alignItems: 'center',
  },
  stepActive: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInactive: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.inactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.white,
  },
  stepText: {
    color: COLORS.navy,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 5,
  },
  stepTextInactive: {
    color: COLORS.textDisabled,
    fontWeight: '400',
  },

  /* Bottom navigation */
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.navBorder,
    ...shadow('#0A315F', 0.08, 12, -4, 12),
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navDot: {
    position: 'absolute',
    right: -1,
    top: 0,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.alert,
  },
  navText: {
    fontSize: 12,
    fontWeight: '600',
  },
  navTextActive: {
    fontWeight: '800',
  },
});