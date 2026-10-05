import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import { getTeamMember, updateTeamMember } from '../../api/admin';
import { Initials } from '../../components/DarkHeader';
import FormField from '../../components/FormField';
import PrimaryButton from '../../components/PrimaryButton';
import { Card, ErrorState, IconTile, LoadingState, Pill, TopBar } from '../../components/ui';
import { COLORS, FONTS } from '../../theme';
import { formatPhone, useTeamErrorHandler } from '../team/teamErrors';

const ROLE_NAMES = { admin: 'Admin', staff: 'Branch staff', driver: 'Driver' };

function InfoRow({ icon, label, value, last = false }) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <IconTile name={icon} size={36} iconSize={18} />
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

function ActionRow({ icon, title, sub, danger = false, onPress, last = false }) {
  return (
    <TouchableOpacity style={[styles.row, !last && styles.divider]} onPress={onPress} accessibilityRole="button">
      <IconTile name={icon} tone={danger ? 'red' : 'blue'} size={38} iconSize={19} />
      <View style={styles.rowText}>
        <Text style={[styles.actionTitle, danger && { color: COLORS.red }]}>{title}</Text>
        <Text style={styles.label}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

export default function AdminMemberScreen({ navigation, route }) {
  const { userId, role, justCreated = false } = route.params;
  const handleError = useTeamErrorHandler(navigation);

  const [member, setMember] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [panel, setPanel] = useState(null); // null | 'password' | 'deactivate'
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(justCreated ? 'Account created. They can sign in now.' : '');

  const load = useCallback(async () => {
    try {
      setMember(await getTeamMember(role, userId));
      setLoadError('');
    } catch (err) {
      handleError(err, setLoadError);
    }
  }, [handleError, role, userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const update = async (changes, message) => {
    setSaving(true);
    setError('');

    try {
      setMember(await updateTeamMember(member.role, member.id, changes));
      setPanel(null);
      setPassword('');
      setNotice(message);
    } catch (err) {
      handleError(err, setError);
    } finally {
      setSaving(false);
    }
  };

  if (member === null) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <TopBar title="Team member" onBack={() => navigation.goBack()} />
        {loadError ? <ErrorState message={loadError} onRetry={load} /> : <LoadingState />}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <TopBar title="Team member" onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <Initials name={member.full_name} size={58} />
          <View style={styles.identityText}>
            <Text style={styles.name}>{member.full_name}</Text>
            <Text style={styles.role}>
              {ROLE_NAMES[member.role]}
              {member.branch ? ` · ${member.branch.name}` : ''}
            </Text>
          </View>
          {member.is_active ? <Pill label="Active" tone="ok" /> : <Pill label="Deactivated" tone="red" />}
        </View>

        {notice ? (
          <View style={styles.notice}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.ok} />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        <Card style={styles.card}>
          <InfoRow icon="call" label="Phone number" value={formatPhone(member.phone_number)} />
          <InfoRow icon="person" label="Username" value={member.username || 'Not set (signs in with phone)'} last />
        </Card>

        <Card style={styles.card}>
          <ActionRow icon="create" title="Edit details" sub="Name, phone, branch or username" onPress={() => navigation.navigate('AdminMemberForm', { member })} />
          {member.username ? (
            <ActionRow icon="key" title="Reset password" sub="Logs them out of every device" onPress={() => setPanel(panel === 'password' ? null : 'password')} />
          ) : null}
          {member.is_active ? (
            <ActionRow icon="ban" title="Deactivate account" sub="They can no longer sign in" danger onPress={() => setPanel(panel === 'deactivate' ? null : 'deactivate')} last />
          ) : (
            <ActionRow icon="refresh" title="Reactivate account" sub="Let them sign in again" onPress={() => update({ is_active: true }, 'Account reactivated.')} last />
          )}
        </Card>

        {panel === 'password' ? (
          <Card style={styles.card}>
            <FormField label="New password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoCapitalize="none" />
            <PrimaryButton
              title="Set new password"
              onPress={() => update({ password }, 'Password reset. Give them the new password.')}
              disabled={password.length < 8}
              loading={saving}
              style={styles.panelButton}
            />
          </Card>
        ) : null}

        {panel === 'deactivate' ? (
          <Card style={styles.card}>
            <Text style={styles.confirmTitle}>Deactivate {member.full_name.split(' ')[0]}?</Text>
            <Text style={styles.confirmText}>They are signed out at once and cannot sign in until you reactivate them.</Text>
            <PrimaryButton
              title="Yes, deactivate"
              onPress={() => update({ is_active: false }, 'Account deactivated.')}
              loading={saving}
              style={[styles.panelButton, { backgroundColor: COLORS.red }]}
            />
          </Card>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.ground },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 24 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 22, backgroundColor: COLORS.deep },
  identityText: { flex: 1 },
  name: { color: COLORS.surface, fontFamily: FONTS.extrabold, fontSize: 19 },
  role: { marginTop: 2, color: '#B9CCE8', fontFamily: FONTS.medium, fontSize: 13 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: COLORS.okBg },
  noticeText: { flex: 1, color: COLORS.ok, fontFamily: FONTS.bold, fontSize: 14 },
  card: { marginTop: 14, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  divider: { borderBottomWidth: 1, borderBottomColor: COLORS.line },
  rowText: { flex: 1 },
  label: { color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 12 },
  value: { marginTop: 1, color: COLORS.ink, fontFamily: FONTS.bold, fontSize: 14 },
  actionTitle: { color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 14 },
  panelButton: { marginTop: 14, marginBottom: 8 },
  confirmTitle: { marginTop: 8, color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 16 },
  confirmText: { marginTop: 4, color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 13, lineHeight: 19 },
  errorText: { marginTop: 12, color: COLORS.red, fontFamily: FONTS.semibold, fontSize: 14 },
});
