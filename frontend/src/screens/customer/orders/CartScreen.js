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
import Svg, { Path } from 'react-native-svg';


const COLORS = {
  navy: '#071F68',
  primary: '#087FF5',
  blue: '#0A5ED7',
  lightBlue: '#EAF5FF',
  background: '#F6F9FD',
  white: '#FFFFFF',
  text: '#071F68',
  muted: '#60708C',
  border: '#E4ECF5',
  danger: '#E64A4A',
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
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };


  const decreaseQuantity = (id) => {
    setItems((current) =>
      current.map((item) =>
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
    setItems((current) =>
      current.filter((item) => item.id !== id)
    );
  };


  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const deliveryFee = 0;
  const total = subtotal + deliveryFee;


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.white}
          />
        </TouchableOpacity>

        <Text style={styles.logoText}>
          Vanella
        </Text>

        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => setItems([])}
          activeOpacity={0.8}
        >
          <Ionicons
            name="trash-outline"
            size={22}
            color={COLORS.white}
          />
        </TouchableOpacity>

        <View style={styles.headerWaveOne} />
        <View style={styles.headerWaveTwo} />
      </View>


      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <Text style={styles.pageTitle}>
          Your Order
        </Text>


        {/* ITEMS */}
        {items.map((item) => (
          <View
            key={item.id}
            style={styles.orderItem}
          >

            <View style={styles.itemImageBox}>
              <Image
                source={item.image}
                style={styles.itemImage}
                resizeMode="contain"
              />
            </View>


            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>
                {item.name}
              </Text>

              <Text style={styles.itemPrice}>
                {formatKes(item.price)}
              </Text>
            </View>


            <View style={styles.itemRight}>

              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() =>
                    decreaseQuantity(item.id)
                  }
                >
                  <Ionicons
                    name="remove"
                    size={17}
                    color={COLORS.muted}
                  />
                </TouchableOpacity>

                <Text style={styles.quantity}>
                  {item.quantity}
                </Text>

                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() =>
                    increaseQuantity(item.id)
                  }
                >
                  <Ionicons
                    name="add"
                    size={17}
                    color={COLORS.muted}
                  />
                </TouchableOpacity>
              </View>


              <Text style={styles.itemTotal}>
                {formatKes(
                  item.price * item.quantity
                )}
              </Text>

            </View>


            <TouchableOpacity
              style={styles.deleteItem}
              onPress={() => removeItem(item.id)}
            >
              <Ionicons
                name="trash-outline"
                size={19}
                color={COLORS.muted}
              />
            </TouchableOpacity>

          </View>
        ))}


        {/* NOTE */}
        <View style={styles.noteCard}>
          <Ionicons
            name="pencil"
            size={22}
            color={COLORS.primary}
          />

          <View style={styles.noteContent}>
            <Text style={styles.noteTitle}>
              Add a note (optional)
            </Text>

            <TextInput
              style={styles.noteInput}
              placeholder="E.g. Gate code, special instructions..."
              placeholderTextColor={COLORS.muted}
              value={note}
              onChangeText={setNote}
            />
          </View>
        </View>


        {/* TOTAL */}
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

            <Text style={styles.freeText}>
              FREE
            </Text>
          </View>


          <View style={styles.summaryDivider} />


          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Total
            </Text>

            <Text style={styles.totalValue}>
              {formatKes(total)}
            </Text>
          </View>

        </View>


        {/* CHECKOUT */}
        <TouchableOpacity
          style={styles.checkoutButton}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('Checkout', {
              items,
              subtotal,
              total,
              note,
            })
          }
        >
          <Text style={styles.checkoutButtonText}>
            Proceed to Checkout
          </Text>

          <Ionicons
            name="chevron-forward"
            size={19}
            color={COLORS.white}
          />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },


  /* HEADER */

  header: {
    height: 118,

    backgroundColor: COLORS.navy,

    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',

    paddingHorizontal: 20,
    paddingTop: 15,

    overflow: 'hidden',
  },

  headerIcon: {
    width: 42,
    height: 42,

    borderRadius: 21,

    backgroundColor: 'rgba(255,255,255,0.10)',

    alignItems: 'center',
    justifyContent: 'center',

    zIndex: 5,
  },

  logoText: {
    color: COLORS.white,

    fontSize: 31,
    lineHeight: 38,

    fontWeight: '800',
    fontStyle: 'italic',

    zIndex: 5,
  },

  headerWaveOne: {
    position: 'absolute',

    left: -30,
    right: -30,
    bottom: -29,

    height: 55,

    borderRadius: 50,

    backgroundColor: '#1686F5',

    transform: [
      { rotate: '-2deg' },
    ],
  },

  headerWaveTwo: {
    position: 'absolute',

    left: -25,
    right: -25,
    bottom: -35,

    height: 49,

    borderRadius: 50,

    backgroundColor: COLORS.background,

    transform: [
      { rotate: '2deg' },
    ],
  },


  /* CONTENT */

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 35,
  },

  pageTitle: {
    color: COLORS.navy,

    fontSize: 26,
    lineHeight: 32,

    fontWeight: '900',

    marginTop: 8,
    marginBottom: 14,
  },


  /* ORDER ITEM */

  orderItem: {
    minHeight: 115,

    backgroundColor: COLORS.white,

    borderRadius: 18,

    marginBottom: 10,

    paddingHorizontal: 12,
    paddingVertical: 12,

    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: '#071F68',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 2,
  },

  itemImageBox: {
    width: 72,
    height: 82,

    borderRadius: 13,

    backgroundColor: '#F4F9FF',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },

  itemImage: {
    width: '90%',
    height: '90%',
  },

  itemDetails: {
    flex: 1,
    alignSelf: 'center',
  },

  itemName: {
    color: COLORS.navy,

    fontSize: 15,
    lineHeight: 18,

    fontWeight: '900',
  },

  itemPrice: {
    color: COLORS.primary,

    fontSize: 14,
    lineHeight: 18,

    fontWeight: '900',

    marginTop: 5,
  },

  itemRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',

    marginRight: 27,
  },

  quantityRow: {
    height: 34,

    borderRadius: 9,

    backgroundColor: '#F3F7FC',

    flexDirection: 'row',
    alignItems: 'center',
  },

  quantityButton: {
    width: 31,
    height: 34,

    alignItems: 'center',
    justifyContent: 'center',
  },

  quantity: {
    width: 25,

    color: COLORS.navy,

    fontSize: 15,
    fontWeight: '900',

    textAlign: 'center',
  },

  itemTotal: {
    color: COLORS.navy,

    fontSize: 14,
    fontWeight: '800',

    marginTop: 9,
  },

  deleteItem: {
    position: 'absolute',

    right: 10,
    top: 18,

    width: 28,
    height: 28,

    alignItems: 'center',
    justifyContent: 'center',
  },


  /* NOTE */

  noteCard: {
    minHeight: 82,

    backgroundColor: COLORS.white,

    borderRadius: 17,

    flexDirection: 'row',
    alignItems: 'flex-start',

    paddingHorizontal: 17,
    paddingVertical: 14,

    marginTop: 3,
    marginBottom: 12,
  },

  noteContent: {
    flex: 1,
    marginLeft: 13,
  },

  noteTitle: {
    color: COLORS.navy,

    fontSize: 15,
    fontWeight: '700',
  },

  noteInput: {
    color: COLORS.navy,

    fontSize: 12,

    padding: 0,
    marginTop: 4,
  },


  /* SUMMARY */

  summaryCard: {
    backgroundColor: COLORS.white,

    borderRadius: 18,

    paddingHorizontal: 18,
    paddingVertical: 17,

    marginBottom: 13,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginBottom: 11,
  },

  summaryLabel: {
    color: COLORS.navy,

    fontSize: 15,
    fontWeight: '600',
  },

  summaryValue: {
    color: COLORS.navy,

    fontSize: 15,
    fontWeight: '800',
  },

  freeText: {
    color: COLORS.primary,

    fontSize: 14,
    fontWeight: '900',
  },

  summaryDivider: {
    height: 1,

    backgroundColor: COLORS.border,

    marginVertical: 4,
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginTop: 9,
  },

  totalLabel: {
    color: COLORS.navy,

    fontSize: 18,
    fontWeight: '900',
  },

  totalValue: {
    color: COLORS.primary,

    fontSize: 23,
    fontWeight: '900',
  },


  /* CHECKOUT BUTTON */

  checkoutButton: {
    height: 58,

    borderRadius: 29,

    backgroundColor: '#0966E8',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 7,
  },

  checkoutButtonText: {
    color: COLORS.white,

    fontSize: 16,
    fontWeight: '900',
  },

});