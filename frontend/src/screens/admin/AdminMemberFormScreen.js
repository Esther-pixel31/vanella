import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { createTeamMember, updateTeamMember } from '../../api/admin';
import { getBranches } from '../../api/branches';
import FormField from '../../components/FormField';
import PrimaryButton from '../../components/PrimaryButton';
import { Card, TopBar } from '../../components/ui';
import { COLORS, FONTS } from '../../theme';
import { useTeamErrorHandler } from '../team/teamErrors';

const ROLES = [
  ['staff', 'Staff'],
  ['driver', 'Driver'],
  ['admin', 'Admin'],
];

function Choice({ label, options, value, onChange }) {
  return (
    <View style={styles.choice}>
      <Text style={styles.choiceLabel}>{label}</Text>
      <View style={styles.choiceRow} accessibilityRole="radiogroup">
        {options.map(([id, text]) => {
          const selected = value === id;

          return (
            <TouchableOpacity
              key={id}
              style={[styles.choiceButton, selected && styles.choiceButtonOn]}
              onPress={() => onChange(id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.choiceText, selected && styles.choiceTextOn]} numberOfLines={1}>
                {text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Adds a team member, or edits one when `member` is passed.
export default function AdminMemberFormScreen({ navigation, route }) {
  const member = route.params?.member || null;
  const editing = Boolean(member);
  const handleError = useTeamErrorHandler(navigation);

  const [branches, setBranches] = useState([]);
  const [role, setRole] = useState(member?.role || 'staff');
  const [fullName, setFullName] = useState(member?.full_name || '');
  const [phone, setPhone] = useState(member ? member.phone_number.slice(3) : '');
  const [branchId, setBranchId] = useState(member?.branch?.id || null);
  const [withLogin, setWithLogin] = useState(Boolean(member?.username));
  const [username, setUsername] = useState(member?.username || '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getBranches()
      .then((data) => {
        setBranches(data);
        setBranchId((current) => current || data[0]?.id || null);
      })
      .catch((err) => handleError(err, setError));
  }, [handleError]);

  const needsBranch = role !== 'admin';
  const needsPassword = withLogin && (!editing || !member.has_password);

  const ready =
    fullName.trim().length >= 2 &&
    /^[17]\d{8}$/.test(phone) &&
    (!needsBranch || branchId) &&
    (!withLogin || (username.trim().length >= 3 && (!needsPassword || password.length >= 8)));

  const save = async () => {
    setSaving(true);
    setError('');

    try {
      if (editing) {
        const changes = {
          full_name: fullName.trim(),
          phone_number: `254${phone}`,
        };

        if (needsBranch) changes.branch_id = branchId;
        if (withLogin) changes.username = username.trim().toLowerCase();
        if (withLogin && password) changes.password = password;

        const updated = await updateTeamMember(member.role, member.id, changes);
        navigation.navigate('AdminMember', { userId: updated.id, role: updated.role });
      } else {
        const created = await createTeamMember({
          full_name: fullName.trim(),
          phone_number: `254${phone}`,
          role,
          branch_id: needsBranch ? branchId : null,
          username: withLogin ? username.trim().toLowerCase() : null,
          password: withLogin ? password : null,
        });

        navigation.replace('AdminMember', { userId: created.id, role: created.role, justCreated: true });
      }
    } catch (err) {
      handleError(err, setError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <TopBar title={editing ? 'Edit team member' : 'Add team member'} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!editing ? <Choice label="Role" options={ROLES} value={role} onChange={setRole} /> : null}

          <FormField label="Full name" value={fullName} onChangeText={setFullName} placeholder="e.g. Hassan Mwinyi" autoCapitalize="words" style={styles.field} />

          <FormField
            label="Phone number"
            prefix="+254"
            value={phone}
            onChangeText={(value) => setPhone(value.replace(/\D/g, ''))}
            placeholder="7XX XXX XXX"
            keyboardType="phone-pad"
            maxLength={9}
            style={styles.field}
          />

          {needsBranch && branches.length > 0 ? (
            <Choice label="Branch" options={branches.map((branch) => [branch.id, branch.name])} value={branchId} onChange={setBranchId} />
          ) : null}

          <Card style={styles.loginCard}>
            <View style={styles.loginRow}>
              <View style={styles.loginText}>
                <Text style={styles.loginTitle}>Username and password</Text>
                <Text style={styles.loginSub}>
                  Optional. Everyone can sign in with their phone number and a code.
                </Text>
              </View>
              <Switch
                value={withLogin}
                onValueChange={setWithLogin}
                trackColor={{ true: COLORS.royal, false: COLORS.line }}
                thumbColor={COLORS.surface}
                accessibilityLabel="Allow username login"
              />
            </View>

            {withLogin ? (
              <>
                <FormField
                  label="Username"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="e.g. hassan.m"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.field}
                />
                <FormField
                  label={needsPassword ? 'Temporary password' : 'New password (leave empty to keep)'}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  secureTextEntry
                  autoCapitalize="none"
                  style={styles.field}
                />
              </>
            ) : null}
          </Card>

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={18} color={COLORS.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.actionBar}>
        <PrimaryButton title={editing ? 'Save changes' : 'Create account'} onPress={save} disabled={!ready} loading={saving} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.ground },
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 24 },
  field: { marginTop: 14 },
  choice: { marginTop: 14 },
  choiceLabel: { marginBottom: 6, color: COLORS.ink, fontFamily: FONTS.bold, fontSize: 13 },
  choiceRow: { flexDirection: 'row', gap: 8 },
  choiceButton: { flex: 1, height: 46, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.line, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  choiceButtonOn: { borderColor: COLORS.royal, backgroundColor: '#F4F7FF' },
  choiceText: { color: COLORS.muted, fontFamily: FONTS.extrabold, fontSize: 13 },
  choiceTextOn: { color: COLORS.ink },
  loginCard: { marginTop: 18 },
  loginRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loginText: { flex: 1 },
  loginTitle: { color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 14 },
  loginSub: { marginTop: 2, color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 12, lineHeight: 17 },
  errorRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  errorText: { flex: 1, color: COLORS.red, fontFamily: FONTS.semibold, fontSize: 14, lineHeight: 20 },
  actionBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.surface },
});
