import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import SplashScreen from './src/screens/auth/SplashScreen';
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import OtpScreen from './src/screens/auth/OtpScreen';
import CartScreen from './src/screens/customer/orders/CartScreen';
import CustomerHomeScreen from './src/screens/customer/home/CustomerHomeScreen';
import OrdersScreen from './src/screens/customer/orders/OrdersScreen';
import CheckoutScreen from './src/screens/customer/orders/CheckoutScreen';
import OrderTrackingScreen from './src/screens/customer/orders/OrderTrackingScreen';
import ProfileScreen from './src/screens/customer/profile/ProfileScreen';
import RewardsScreen from './src/screens/customer/rewards/RewardsScreen';
import NotificationsScreen from './src/screens/customer/notifications/NotificationsScreen';
import { CartProvider } from './src/context/CartContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <CartProvider>
        <NavigationContainer>
          <StatusBar style="light" />

          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="OTP" component={OtpScreen} />
            <Stack.Screen name="Cart" component={CartScreen}/>
            <Stack.Screen name="CustomerHome" component={CustomerHomeScreen} />
            <Stack.Screen name="Orders" component={OrdersScreen}/>
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Rewards" component={RewardsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </CartProvider>
    </SafeAreaProvider>
  );
}