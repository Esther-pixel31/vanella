import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';

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
import TeamLoginScreen from './src/screens/auth/TeamLoginScreen';
import TeamAccountScreen from './src/screens/team/TeamAccountScreen';
import StaffHomeScreen from './src/screens/staff/StaffHomeScreen';
import StaffOrderScreen from './src/screens/staff/StaffOrderScreen';
import DriverHomeScreen from './src/screens/driver/DriverHomeScreen';
import DriverDeliveryScreen from './src/screens/driver/DriverDeliveryScreen';
import DriverDoneScreen from './src/screens/driver/DriverDoneScreen';
import AdminHomeScreen from './src/screens/admin/AdminHomeScreen';
import AdminTeamScreen from './src/screens/admin/AdminTeamScreen';
import AdminMemberScreen from './src/screens/admin/AdminMemberScreen';
import AdminMemberFormScreen from './src/screens/admin/AdminMemberFormScreen';
import { CartProvider } from './src/context/CartContext';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Pacifico_400Regular,
  });

  // Wait briefly for the fonts. If they fail to load, carry on with the
  // system font rather than blocking the app.
  if (!fontsLoaded && !fontError) {
    return null;
  }

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

            {/* Team: staff, drivers and admins */}
            <Stack.Screen name="TeamLogin" component={TeamLoginScreen} />
            <Stack.Screen name="TeamAccount" component={TeamAccountScreen} />
            <Stack.Screen name="StaffHome" component={StaffHomeScreen} />
            <Stack.Screen name="StaffOrder" component={StaffOrderScreen} />
            <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
            <Stack.Screen name="DriverDelivery" component={DriverDeliveryScreen} />
            <Stack.Screen name="DriverDone" component={DriverDoneScreen} />
            <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
            <Stack.Screen name="AdminTeam" component={AdminTeamScreen} />
            <Stack.Screen name="AdminMember" component={AdminMemberScreen} />
            <Stack.Screen name="AdminMemberForm" component={AdminMemberFormScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </CartProvider>
    </SafeAreaProvider>
  );
}