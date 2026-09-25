import React, { useState } from 'react';

import {
  Image,
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


const COLORS = {
  navy: '#07377E',
  deepNavy: '#052B6B',
  primary: '#087FF5',
  brightBlue: '#168CF7',
  lightBlue: '#66BCFF',
  background: '#F5F8FC',
  white: '#FFFFFF',
  text: '#082D6A',
  muted: '#63738B',
  border: '#E5EDF6',
  danger: '#718198',
};


const INITIAL_ITEMS = [
  {
    id: '20l',
    name: '20L Water',
    price: 100,
    quantity: 2,
    image: require('../../../../assets/images/product-20l.png'),
  },
  {
    id: '6000l',
    name: '6,000L\nBulk Water',
    price: 3500,
    quantity: 1,
    image: require('../../../../assets/images/product-6000l.png'),
  },
  {
    id: '10000l',
    name: '10,000L\nBulk Water',
    price: 5000,
    quantity: 1,
    image: require('../../../../assets/images/product-6000l.png'),
  },
];


function formatKes(value) {
  return `KES ${value.toLocaleString()}`;
}


export default function CartScreen({ navigation }) {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [note, setNote] = useState('');


  const increaseQuantity = (id) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  };


  const decreaseQuantity = (id) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(1, item.quantity - 1),
            }
          : item
      )
    );
  };


  const removeItem = (id) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== id)
    );
  };


  const subtotal = items.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  // Vanella delivery is free.
  const deliveryFee = 0;

  const total = subtotal + deliveryFee;


  const handleBottomTab = (tab) => {
    if (tab === 'home') {
      navigation.navigate('CustomerHome');
      return;
    }

    if (tab === 'orders') {
      navigation.navigate('Orders');
      return;
    }

    if (tab === 'rewards') {
      console.log('Rewards page coming next');
      return;
    }

    if (tab === 'profile') {
      console.log('Profile page coming next');
    }
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />


      {/* =======================================
          CURVED VANELLA HEADER
      ======================================= */}

      <View style={styles.header}>

        <View style={styles.headerContent}>

          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={27}
              color={COLORS.white}
            />
          </TouchableOpacity>


          <View style={styles.brandContainer}>
            <Text style={styles.brandText}>
              Vanella
            </Text>

            <View style={styles.brandUnderline}>
              <View style={styles.brandUnderlineInner} />
            </View>
          </View>


          {/* Empty spacer keeps Vanella perfectly centered */}
          <View style={styles.headerSpacer} />

        </View>


        {/* BLUE WAVE */}

        <View style={styles.blueWave} />


        {/* LIGHT BLUE WAVE */}

        <View style={styles.lightBlueWave} />


        {/* WHITE CURVE */}

        <View style={styles.whiteWave} />

      </View>


      {/* =======================================
          PAGE CONTENT
      ======================================= */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <Text style={styles.pageTitle}>
          Your Order
        </Text>


        {/* =====================================
            PRODUCT CARDS
        ===================================== */}

        {items.map((item) => (
          <View
            key={item.id}
            style={styles.orderCard}
          >

            {/* PRODUCT IMAGE */}

            <View style={styles.productImageContainer}>
              <Image
                source={item.image}
                style={styles.productImage}
                resizeMode="contain"
              />
            </View>


            {/* PRODUCT DETAILS */}

            <View style={styles.productDetails}>

              <Text style={styles.productName}>
                {item.name}
              </Text>

              <Text style={styles.productPrice}>
                {formatKes(item.price)}
              </Text>

            </View>


            {/* QUANTITY + TOTAL */}

            <View style={styles.productControls}>

              <View style={styles.quantityContainer}>

                <TouchableOpacity
                  style={styles.quantityButton}
                  activeOpacity={0.7}
                  onPress={() =>
                    decreaseQuantity(item.id)
                  }
                >
                  <Ionicons
                    name="remove"
                    size={18}
                    color="#72839A"
                  />
                </TouchableOpacity>


                <Text style={styles.quantityText}>
                  {item.quantity}
                </Text>


                <TouchableOpacity
                  style={styles.quantityButton}
                  activeOpacity={0.7}
                  onPress={() =>
                    increaseQuantity(item.id)
                  }
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color="#72839A"
                  />
                </TouchableOpacity>

              </View>


              <Text style={styles.lineTotal}>
                {formatKes(
                  item.price * item.quantity
                )}
              </Text>

            </View>


            {/* DELETE THIS ITEM */}

            <TouchableOpacity
              style={styles.deleteButton}
              activeOpacity={0.7}
              onPress={() => removeItem(item.id)}
            >
              <Ionicons
                name="trash-outline"
                size={22}
                color="#718198"
              />
            </TouchableOpacity>

          </View>
        ))}


        {/* =====================================
            NOTE
        ===================================== */}

        <View style={styles.noteCard}>

          <Ionicons
            name="pencil"
            size={24}
            color="#0869E8"
          />


          <View style={styles.noteContent}>

            <Text style={styles.noteTitle}>
              Add a note (optional)
            </Text>


            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="E.g. Gate code, special instructions..."
              placeholderTextColor="#697A91"
              multiline
            />

          </View>

        </View>


        {/* =====================================
            ORDER TOTAL
        ===================================== */}

        <View style={styles.summaryCard}>

          <View style={styles.summaryRow}>

            <Text style={styles.summaryLabel}>
              Subtotal
            </Text>

            <Text style={styles.summaryValue}>
              {formatKes(subtotal)}
            </Text>

          </View>


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
            CHECKOUT BUTTON
        ===================================== */}

        <TouchableOpacity
          style={styles.checkoutButton}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('Checkout', {
              items,
              note,
              subtotal,
              deliveryFee,
              total,
            })
          }
        >

          <Text style={styles.checkoutText}>
            Proceed to Checkout
          </Text>

          <Ionicons
            name="chevron-forward"
            size={21}
            color={COLORS.white}
          />

        </TouchableOpacity>

      </ScrollView>


      {/* =======================================
          BOTTOM NAVIGATION
      ======================================= */}

      <View style={styles.bottomNav}>

        <BottomNavItem
          icon="home-outline"
          label="Home"
          onPress={() => handleBottomTab('home')}
        />

        <BottomNavItem
          icon="cart-outline"
          label="Orders"
          active
          badge={items.length}
          onPress={() => handleBottomTab('orders')}
        />

        <BottomNavItem
          icon="gift-outline"
          label="Rewards"
          onPress={() => handleBottomTab('rewards')}
        />

        <BottomNavItem
          icon="person-outline"
          label="Profile"
          onPress={() => handleBottomTab('profile')}
        />

      </View>

    </SafeAreaView>
  );
}


/* =========================================
   BOTTOM NAV ITEM
========================================= */

function BottomNavItem({
  icon,
  label,
  active = false,
  badge,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.navItem}
      activeOpacity={0.7}
      onPress={onPress}
    >

      <View style={styles.navIconContainer}>

        <Ionicons
          name={icon}
          size={25}
          color={
            active
              ? COLORS.primary
              : '#718198'
          }
        />


        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badge}
            </Text>
          </View>
        )}

      </View>


      <Text
        style={[
          styles.navLabel,
          active && styles.navLabelActive,
        ]}
      >
        {label}
      </Text>

    </TouchableOpacity>
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
     HEADER
  ======================================= */

  header: {
    height: 145,

    backgroundColor: COLORS.deepNavy,

    position: 'relative',

    overflow: 'hidden',
  },


  headerContent: {
    height: 88,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: 20,

    zIndex: 20,
  },


  backButton: {
    width: 48,
    height: 48,

    borderRadius: 24,

    backgroundColor: 'rgba(255,255,255,0.11)',

    alignItems: 'center',
    justifyContent: 'center',
  },


  headerSpacer: {
    width: 48,
    height: 48,
  },


  brandContainer: {
    alignItems: 'center',
    justifyContent: 'center',

    marginTop: -3,
  },


  brandText: {
    color: COLORS.white,

    fontSize: 34,
    lineHeight: 39,

    fontWeight: '900',
    fontStyle: 'italic',

    letterSpacing: -1.2,
  },


  brandUnderline: {
    width: 118,
    height: 13,

    marginTop: -6,

    overflow: 'hidden',
  },


  brandUnderlineInner: {
    width: 120,
    height: 18,

    borderBottomWidth: 4,
    borderBottomColor: COLORS.white,

    borderRadius: 60,

    transform: [
      {
        rotate: '-3deg',
      },
    ],
  },


  /* BLUE CURVED LAYER */

  blueWave: {
    position: 'absolute',

    width: '120%',
    height: 85,

    left: '-10%',
    bottom: -43,

    borderRadius: 100,

    backgroundColor: COLORS.brightBlue,

    transform: [
      {
        rotate: '2deg',
      },
    ],
  },


  /* LIGHT BLUE LAYER */

  lightBlueWave: {
    position: 'absolute',

    width: '120%',
    height: 70,

    left: '-10%',
    bottom: -48,

    borderRadius: 100,

    backgroundColor: COLORS.lightBlue,

    transform: [
      {
        rotate: '-2deg',
      },
    ],
  },


  /* WHITE CURVED LAYER */

  whiteWave: {
    position: 'absolute',

    width: '125%',
    height: 67,

    left: '-12.5%',
    bottom: -57,

    borderRadius: 100,

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

    paddingBottom: 25,
  },


  pageTitle: {
    color: COLORS.text,

    fontSize: 29,
    lineHeight: 35,

    fontWeight: '900',

    marginBottom: 17,
  },


  /* =======================================
     ORDER CARD
  ======================================= */

  orderCard: {
    minHeight: 115,

    backgroundColor: COLORS.white,

    borderRadius: 19,

    flexDirection: 'row',
    alignItems: 'center',

    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 11,

    marginBottom: 11,

    shadowColor: '#163A6D',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,

    elevation: 2,
  },


  productImageContainer: {
    width: 79,
    height: 88,

    backgroundColor: '#F2F7FC',

    borderRadius: 13,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 12,
  },


  productImage: {
    width: '88%',
    height: '88%',
  },


  productDetails: {
    flex: 1,

    justifyContent: 'center',
  },


  productName: {
    color: COLORS.text,

    fontSize: 16,
    lineHeight: 19,

    fontWeight: '900',
  },


  productPrice: {
    color: '#0566E5',

    fontSize: 15,
    lineHeight: 19,

    fontWeight: '900',

    marginTop: 5,
  },


  productControls: {
    width: 117,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 24,
  },


  quantityContainer: {
    height: 38,

    backgroundColor: '#F3F6FA',

    borderRadius: 9,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    overflow: 'hidden',
  },


  quantityButton: {
    width: 37,
    height: 38,

    alignItems: 'center',
    justifyContent: 'center',
  },


  quantityText: {
    width: 38,

    color: COLORS.text,

    fontSize: 16,
    lineHeight: 20,

    fontWeight: '900',

    textAlign: 'center',

    backgroundColor: COLORS.white,

    paddingVertical: 8,
  },


  lineTotal: {
    color: COLORS.text,

    fontSize: 15,
    lineHeight: 19,

    fontWeight: '800',

    marginTop: 10,
  },


  deleteButton: {
    position: 'absolute',

    right: 8,
    top: 22,

    width: 30,
    height: 30,

    alignItems: 'center',
    justifyContent: 'center',
  },


  /* =======================================
     NOTE
  ======================================= */

  noteCard: {
    minHeight: 80,

    backgroundColor: COLORS.white,

    borderRadius: 18,

    flexDirection: 'row',
    alignItems: 'flex-start',

    paddingHorizontal: 20,
    paddingVertical: 14,

    marginTop: 3,
    marginBottom: 13,

    shadowColor: '#163A6D',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.035,
    shadowRadius: 8,

    elevation: 1,
  },


  noteContent: {
    flex: 1,

    marginLeft: 15,
  },


  noteTitle: {
    color: '#30496D',

    fontSize: 16,
    lineHeight: 20,

    fontWeight: '500',
  },


  noteInput: {
    minHeight: 30,

    color: COLORS.text,

    fontSize: 13,

    padding: 0,
    paddingTop: 4,
  },


  /* =======================================
     SUMMARY
  ======================================= */

  summaryCard: {
    backgroundColor: COLORS.white,

    borderRadius: 18,

    paddingHorizontal: 20,
    paddingVertical: 19,

    marginBottom: 12,

    shadowColor: '#163A6D',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,

    elevation: 1,
  },


  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginBottom: 12,
  },


  summaryLabel: {
    color: '#173B6D',

    fontSize: 16,
    lineHeight: 20,

    fontWeight: '500',
  },


  summaryValue: {
    color: COLORS.text,

    fontSize: 16,
    lineHeight: 20,

    fontWeight: '900',
  },


  freeDelivery: {
    color: '#087FF5',

    fontSize: 16,
    lineHeight: 20,

    fontWeight: '900',
  },


  divider: {
    height: 1,

    backgroundColor: '#E1E9F2',

    marginTop: 1,
    marginBottom: 13,
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
     CHECKOUT
  ======================================= */

  checkoutButton: {
    height: 61,

    backgroundColor: '#0866DD',

    borderRadius: 31,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 5,

    shadowColor: '#0866DD',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 9,

    elevation: 4,
  },


  checkoutText: {
    color: COLORS.white,

    fontSize: 18,
    lineHeight: 23,

    fontWeight: '800',

    marginRight: 3,
  },


  /* =======================================
     BOTTOM NAV
  ======================================= */

  bottomNav: {
    height: 82,

    backgroundColor: COLORS.white,

    borderTopWidth: 1,
    borderTopColor: '#E6EDF5',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',

    paddingBottom: 5,

    shadowColor: '#163A6D',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,

    elevation: 7,
  },


  navItem: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',
  },


  navIconContainer: {
    position: 'relative',
  },


  navLabel: {
    color: '#667891',

    fontSize: 12,
    lineHeight: 16,

    fontWeight: '500',

    marginTop: 3,
  },


  navLabelActive: {
    color: COLORS.primary,

    fontWeight: '700',
  },


  badge: {
    position: 'absolute',

    right: -10,
    top: -7,

    minWidth: 18,
    height: 18,

    borderRadius: 9,

    backgroundColor: '#F04444',

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 4,
  },


  badgeText: {
    color: COLORS.white,

    fontSize: 10,
    fontWeight: '900',
  },

});