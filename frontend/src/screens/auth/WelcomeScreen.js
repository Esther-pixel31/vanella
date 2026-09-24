import React from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >

        {/* =========================
            TOP WATER
        ========================== */}

        <View style={styles.topSection}>
          <Image
            source={require('../../../assets/images/signup-water-top.png')}
            style={styles.topWater}
            resizeMode="stretch"
          />
        </View>


        {/* =========================
            MAIN CONTENT
        ========================== */}

        <View style={styles.content}>

          {/* VANELLA LOGO */}

          <Image
            source={require('../../../assets/images/vanella-logo-transparent.png')}
            style={styles.logo}
            resizeMode="contain"
          />


          {/* HEADLINE */}

          <View style={styles.headingContainer}>

            <Text style={styles.cleanWater}>
              Clean Water.
            </Text>

            <Text style={styles.healthyLiving}>
              Healthy Living.
            </Text>

          </View>


          {/* DESCRIPTION */}

          <Text style={styles.description}>
            Fresh, clean water delivered{'\n'}
            when you need it.
          </Text>


          {/* CREATE ACCOUNT */}

          <TouchableOpacity
            style={styles.createButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Signup')}
          >

            <Text style={styles.createButtonText}>
              Create Account
            </Text>

            <Text style={styles.createArrow}>
              →
            </Text>

          </TouchableOpacity>


          {/* LOGIN */}

          <TouchableOpacity
            style={styles.loginButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Login')}
          >

            <Text style={styles.loginButtonText}>
              Log In
            </Text>

          </TouchableOpacity>

        </View>


        {/* =========================
            BOTTOM WATER
        ========================== */}

        <View style={styles.bottomSection}>

          <Image
            source={require('../../../assets/images/signup-water-bottom.png')}
            style={styles.bottomWater}
            resizeMode="stretch"
          />

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },


  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },


  /* =========================
     TOP WATER
  ========================== */

  topSection: {
    height: 185,

    position: 'relative',

    overflow: 'hidden',

    backgroundColor: '#FFFFFF',
  },


  topWater: {
    position: 'absolute',

    width: '100%',
    height: 155,

    left: 0,
    bottom: 0,
  },


  /* =========================
     MAIN CONTENT
  ========================== */

  content: {
    flex: 1,

    paddingHorizontal: 30,

    alignItems: 'center',
  },


  /* =========================
     LOGO
  ========================== */

  logo: {
    width: 190,
    height: 145,

    marginTop: 12,
    marginBottom: 14,
  },


  /* =========================
     HEADLINE
  ========================== */

  headingContainer: {
    width: '100%',

    alignItems: 'center',

    marginTop: 4,
  },


  cleanWater: {
    color: '#061F67',

    fontSize: 45,
    lineHeight: 53,

    fontWeight: '600',

    textAlign: 'center',

    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),

    letterSpacing: -1,
  },


  healthyLiving: {
    color: '#0878F5',

    fontSize: 45,
    lineHeight: 53,

    fontWeight: '600',

    textAlign: 'center',

    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),

    letterSpacing: -1,
  },


  /* =========================
     DESCRIPTION
  ========================== */

  description: {
    marginTop: 17,
    marginBottom: 32,

    color: '#7589A8',

    fontSize: 17,
    lineHeight: 25,

    fontWeight: '500',

    textAlign: 'center',
  },


  /* =========================
     CREATE ACCOUNT
  ========================== */

  createButton: {
    width: '100%',
    height: 61,

    borderRadius: 18,

    backgroundColor: '#0785E4',

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#0785E4',

    shadowOpacity: 0.22,

    shadowRadius: 12,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    elevation: 5,
  },


  createButtonText: {
    color: '#FFFFFF',

    fontSize: 18,
    fontWeight: '800',
  },


  createArrow: {
    marginLeft: 17,
    marginTop: -2,

    color: '#FFFFFF',

    fontSize: 29,

    fontWeight: '300',
  },


  /* =========================
     LOGIN
  ========================== */

  loginButton: {
    width: '100%',
    height: 61,

    marginTop: 15,

    borderRadius: 18,

    borderWidth: 2,
    borderColor: '#087DF0',

    backgroundColor: '#FFFFFF',

    alignItems: 'center',
    justifyContent: 'center',
  },


  loginButtonText: {
    color: '#0875EA',

    fontSize: 18,
    fontWeight: '800',
  },


  /* =========================
     BOTTOM WATER
  ========================== */

  bottomSection: {
    height: 170,

    marginTop: 20,

    position: 'relative',

    overflow: 'hidden',

    backgroundColor: '#FFFFFF',
  },


  bottomWater: {
    position: 'absolute',

    width: '100%',
    height: 160,

    left: 0,
    bottom: 0,
  },

});