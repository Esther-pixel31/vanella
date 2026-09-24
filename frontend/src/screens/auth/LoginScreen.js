import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');

  const phoneReady = phone.trim().length === 9;

  const handleContinue = () => {
    if (!phoneReady) return;

    navigation.navigate('CustomerHome');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* =========================
              TOP WATER
          ========================== */}

          <View style={styles.topSection}>
            <Image
              source={require('../../../assets/images/signup-water-top.png')}
              style={styles.topWaterImage}
              resizeMode="stretch"
            />

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}
            >
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
          </View>


          {/* =========================
              LOGIN CONTENT
          ========================== */}

          <View style={styles.content}>

            <Text style={styles.title}>
              Welcome back
            </Text>

            <Text style={styles.subtitle}>
              Log in to order clean water and{'\n'}
              earn rewards with every purchase.
            </Text>


            {/* =========================
                PHONE NUMBER
            ========================== */}

            <View style={styles.field}>

              <Text style={styles.label}>
                Phone Number
              </Text>

              <View style={styles.phoneContainer}>

                <View style={styles.countrySection}>
                  <Text style={styles.flag}>
                    🇰🇪
                  </Text>

                  <Text style={styles.chevron}>
                    ⌄
                  </Text>
                </View>

                <View style={styles.divider} />

                <Text style={styles.prefix}>
                  +254
                </Text>

                <View style={styles.divider} />

                <TextInput
                  value={phone}
                  onChangeText={(value) => {
                    const numbersOnly = value.replace(/\D/g, '');
                    setPhone(numbersOnly);
                  }}
                  placeholder="7XX XXX XXX"
                  placeholderTextColor="#A2B1CA"
                  keyboardType="phone-pad"
                  maxLength={9}
                  style={styles.phoneInput}
                />

              </View>
            </View>


            {/* =========================
                CONTINUE
            ========================== */}

            <TouchableOpacity
              style={[
                styles.continueButton,
                !phoneReady && styles.continueDisabled,
              ]}
              disabled={!phoneReady}
              activeOpacity={0.85}
              onPress={handleContinue}
            >
              <Text style={styles.continueText}>
                Continue
              </Text>

              <Text style={styles.continueArrow}>
                →
              </Text>
            </TouchableOpacity>


            {/* =========================
                CREATE ACCOUNT
            ========================== */}

            <View style={styles.signupRow}>

              <Text style={styles.signupQuestion}>
                Don’t have an account?
              </Text>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Signup')
                }
                activeOpacity={0.7}
              >
                <Text style={styles.signupLink}>
                  {' '}Create Account
                </Text>
              </TouchableOpacity>

            </View>

          </View>


          {/* =========================
              BOTTOM WATER
          ========================== */}

          <View style={styles.bottomSection}>

            <Image
              source={require('../../../assets/images/signup-water-bottom.png')}
              style={styles.bottomWaterImage}
              resizeMode="stretch"
            />

          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({

  flex: {
    flex: 1,
  },

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
    height: 175,

    position: 'relative',

    overflow: 'hidden',

    backgroundColor: '#FFFFFF',
  },

  topWaterImage: {
    position: 'absolute',

    width: '100%',
    height: 145,

    left: 0,
    bottom: 0,
  },


  /* =========================
     BACK BUTTON
  ========================== */

  backButton: {
    position: 'absolute',

    top: 14,
    left: 22,

    zIndex: 20,

    width: 48,
    height: 48,

    borderRadius: 24,

    backgroundColor: 'rgba(235,247,255,0.94)',

    justifyContent: 'center',
    alignItems: 'center',
  },

  backArrow: {
    color: '#062B68',

    fontSize: 38,
    lineHeight: 40,

    marginTop: -5,
  },


  /* =========================
     CONTENT
  ========================== */

  content: {
    paddingHorizontal: 28,
    paddingTop: 38,
  },

  title: {
    color: '#061F5C',

    fontSize: 40,
    lineHeight: 48,

    fontWeight: '800',

    letterSpacing: -1.2,
  },

  subtitle: {
    marginTop: 14,
    marginBottom: 42,

    color: '#7B8FAE',

    fontSize: 18,
    lineHeight: 28,
  },


  /* =========================
     PHONE FIELD
  ========================== */

  field: {
    marginBottom: 26,
  },

  label: {
    marginBottom: 10,

    color: '#061F5C',

    fontSize: 16,
    fontWeight: '800',
  },

  phoneContainer: {
    height: 64,

    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1.4,
    borderColor: '#D1E0EF',

    borderRadius: 17,

    backgroundColor: '#FFFFFF',

    paddingHorizontal: 15,
  },

  countrySection: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingRight: 13,
  },

  flag: {
    fontSize: 22,
  },

  chevron: {
    marginLeft: 8,
    marginTop: -4,

    color: '#173B78',

    fontSize: 19,
    fontWeight: '700',
  },

  divider: {
    width: 1,
    height: 33,

    backgroundColor: '#D2E0EE',
  },

  prefix: {
    paddingHorizontal: 16,

    color: '#061F5C',

    fontSize: 17,
    fontWeight: '800',
  },

  phoneInput: {
    flex: 1,

    paddingHorizontal: 16,
    paddingVertical: 16,

    color: '#0A315F',

    fontSize: 17,
  },


  /* =========================
     CONTINUE BUTTON
  ========================== */

  continueButton: {
    height: 62,

    borderRadius: 18,

    backgroundColor: '#087FD1',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#0077CA',

    shadowOpacity: 0.24,

    shadowRadius: 12,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    elevation: 5,
  },

  continueDisabled: {
    backgroundColor: '#86BFE3',

    shadowOpacity: 0,

    elevation: 0,
  },

  continueText: {
    color: '#FFFFFF',

    fontSize: 18,
    fontWeight: '800',
  },

  continueArrow: {
    marginLeft: 15,
    marginTop: -2,

    color: '#FFFFFF',

    fontSize: 29,
  },


  /* =========================
     SIGN UP LINK
  ========================== */

  signupRow: {
    marginTop: 26,

    flexDirection: 'row',

    justifyContent: 'center',
    alignItems: 'center',
  },

  signupQuestion: {
    color: '#617895',

    fontSize: 14,
  },

  signupLink: {
    color: '#0875CB',

    fontSize: 14,
    fontWeight: '800',
  },


  /* =========================
     BOTTOM WATER
  ========================== */

  bottomSection: {
    height: 175,

    marginTop: 'auto',

    position: 'relative',

    overflow: 'hidden',

    backgroundColor: '#FFFFFF',
  },

  bottomWaterImage: {
    position: 'absolute',

    width: '100%',
    height: 155,

    left: 0,
    bottom: 0,
  },

});