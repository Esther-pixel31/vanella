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

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');

  const formComplete =
    fullName.trim().length > 0 &&
    phone.trim().length > 0 &&
    physicalAddress.trim().length > 0 &&
    deliveryLocation.trim().length > 0;

  const handleContinue = () => {
    if (!formComplete) return;

    navigation.navigate('OTP', {
      mode: 'signup',
      fullName,
      phone,
      physicalAddress,
      deliveryLocation,
    });
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
              FORM CONTENT
          ========================== */}

          <View style={styles.content}>

            <Text style={styles.title}>
              Create your account
            </Text>

            <Text style={styles.subtitle}>
              Order clean water and earn rewards{'\n'}
              with every purchase.
            </Text>


            {/* FULL NAME */}

            <View style={styles.field}>
              <Text style={styles.label}>
                Full Name
              </Text>

              <View style={styles.inputContainer}>
                <View style={styles.personIcon}>
                  <View style={styles.personHead} />
                  <View style={styles.personBody} />
                </View>

                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#8DA5C2"
                  autoCapitalize="words"
                  style={styles.input}
                />
              </View>
            </View>


            {/* PHONE */}

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
                  onChangeText={setPhone}
                  placeholder="7XX XXX XXX"
                  placeholderTextColor="#8DA5C2"
                  keyboardType="phone-pad"
                  maxLength={9}
                  style={styles.phoneInput}
                />

              </View>
            </View>


            {/* PHYSICAL ADDRESS */}

            <View style={styles.field}>
              <Text style={styles.label}>
                Physical Address
              </Text>

              <View style={styles.inputContainer}>
                <View style={styles.locationPin}>
                  <View style={styles.locationDot} />
                </View>

                <TextInput
                  value={physicalAddress}
                  onChangeText={setPhysicalAddress}
                  placeholder="e.g. Bamburi, Mombasa"
                  placeholderTextColor="#8DA5C2"
                  style={styles.input}
                />
              </View>
            </View>


            {/* DELIVERY LOCATION */}

            <View style={styles.field}>
              <Text style={styles.label}>
                Delivery Location
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.homeIcon}>
                  ◆
                </Text>

                <TextInput
                  value={deliveryLocation}
                  onChangeText={setDeliveryLocation}
                  placeholder="Estate, building, house or landmark"
                  placeholderTextColor="#8DA5C2"
                  style={styles.input}
                />
              </View>
            </View>


            {/* CONTINUE */}

            <TouchableOpacity
              style={[
                styles.continueButton,
                !formComplete && styles.continueDisabled,
              ]}
              disabled={!formComplete}
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


            {/* LOGIN */}

            <View style={styles.loginRow}>
              <Text style={styles.loginQuestion}>
                Already have an account?
              </Text>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Login')
                }
              >
                <Text style={styles.loginLink}>
                  {' '}Log In
                </Text>
              </TouchableOpacity>
            </View>

          </View>


          {/* =========================
              REAL BOTTOM WATER
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
  height: 150,
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
},

topWaterImage: {
  position: 'absolute',
  width: '100%',
  height: 135,
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

    zIndex: 10,

    width: 48,
    height: 48,

    borderRadius: 24,

    backgroundColor: 'rgba(235,247,255,0.92)',

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
    paddingTop: 28,
  },

  title: {
    color: '#061F5C',

    fontSize: 32,
    lineHeight: 39,

    fontWeight: '800',

    letterSpacing: -0.8,
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 29,

    color: '#7B91AE',

    fontSize: 16,
    lineHeight: 24,
  },


  /* =========================
     FIELDS
  ========================== */

  field: {
    marginBottom: 18,
  },

  label: {
    marginBottom: 8,

    color: '#061F5C',

    fontSize: 15,
    fontWeight: '800',
  },

  inputContainer: {
    height: 58,

    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1.4,
    borderColor: '#D5E4F1',

    borderRadius: 16,

    backgroundColor: '#FCFEFF',

    paddingHorizontal: 17,
  },

  input: {
    flex: 1,

    paddingVertical: 15,

    color: '#0B315F',

    fontSize: 16,
  },


  /* =========================
     PERSON ICON
  ========================== */

  personIcon: {
    width: 24,
    height: 27,

    marginRight: 14,

    alignItems: 'center',
  },

  personHead: {
    width: 9,
    height: 9,

    borderRadius: 5,

    backgroundColor: '#8098B5',
  },

  personBody: {
    width: 18,
    height: 10,

    marginTop: 3,

    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,

    backgroundColor: '#8098B5',
  },


  /* =========================
     PHONE
  ========================== */

  phoneContainer: {
    height: 58,

    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1.4,
    borderColor: '#D5E4F1',

    borderRadius: 16,

    backgroundColor: '#FCFEFF',

    paddingHorizontal: 15,
  },

  countrySection: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingRight: 12,
  },

  flag: {
    fontSize: 21,
  },

  chevron: {
    marginLeft: 7,
    marginTop: -4,

    color: '#7B92AE',

    fontSize: 18,
  },

  divider: {
    width: 1,
    height: 30,

    backgroundColor: '#D8E5EF',
  },

  prefix: {
    paddingHorizontal: 15,

    color: '#061F5C',

    fontSize: 16,
    fontWeight: '800',
  },

  phoneInput: {
    flex: 1,

    paddingHorizontal: 15,
    paddingVertical: 15,

    color: '#0B315F',

    fontSize: 16,
  },


  /* =========================
     LOCATION ICON
  ========================== */

  locationPin: {
    width: 19,
    height: 23,

    marginRight: 16,

    borderRadius: 11,

    backgroundColor: '#8098B5',

    justifyContent: 'center',
    alignItems: 'center',

    transform: [
      {
        rotate: '45deg',
      },
    ],
  },

  locationDot: {
    width: 6,
    height: 6,

    borderRadius: 3,

    backgroundColor: '#FFFFFF',
  },


  /* =========================
     HOME ICON
  ========================== */

  homeIcon: {
    marginRight: 16,

    color: '#8098B5',

    fontSize: 18,
  },


  /* =========================
     BUTTON
  ========================== */

  continueButton: {
    height: 60,

    marginTop: 7,

    borderRadius: 18,

    backgroundColor: '#087FD1',

    flexDirection: 'row',

    justifyContent: 'center',
    alignItems: 'center',

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
    marginLeft: 14,
    marginTop: -2,

    color: '#FFFFFF',

    fontSize: 28,
  },


  /* =========================
     LOGIN
  ========================== */

  loginRow: {
    marginTop: 21,

    flexDirection: 'row',

    justifyContent: 'center',
    alignItems: 'center',
  },

  loginQuestion: {
    color: '#617A97',

    fontSize: 14,
  },

  loginLink: {
    color: '#0075CA',

    fontSize: 14,
    fontWeight: '800',
  },


  /* =========================
     BOTTOM WATER
  ========================== */

  bottomSection: {
  height: 145,
  marginTop: 5,
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
},

bottomWaterImage: {
  position: 'absolute',
  width: '100%',
  height: 135,
  left: 0,
  bottom: 0,
},

});