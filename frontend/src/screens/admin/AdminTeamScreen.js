import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import { getTeamMembers } from '../../api/admin';
import { Initials } from '../../components/DarkHeader';
import TeamNav from '../../components/TeamNav';
import { Card, EmptyState, ErrorState, LoadingState, Pill, ScreenTitle } from '../../components/ui';
import { COLORS, FONTS } from '../../theme';
import { formatPhone, useTeamErrorHandler } from '../team/teamErrors';

const FILTERS = [
  ['all', 'All'],
  ['staff', 'Staff'],
  ['driver', 'Drivers'],
  ['admin', 'Admins'],
];

const ROLE_PILLS = {
  staff: { label: 'Staff', tone: 'blue' },
  driver: { label: 'Driver', tone: 'amber' },
  admin: { label: 'Admin', tone: 'neutral' },
};

export default function AdminTeamScreen({ navigation, route }) {
  const handleError = useTeamErrorHandler(navigation);

  const [members, setMembers] = useState(null);
  const [filter, setFilter] = useState(route.params?.filter || 'all');
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    try {
      const [staff, drivers] = await Promise.all([getTeamMembers('staff'), getTeamMembers('drivers')]);
      setMembers([...staff, ...drivers]);
      setLoadError('');
    } catch (err) {
      handleError(err, setLoadError);
    }
  }, [handleError]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const shown = (members || []).filter((member) => filter === 'all' || member.role === filter);

  // Grouped by branch; admins (no branch) last.
  const groups = {};
  shown.forEach((member) => {
    const key = member.branch ? member.branch.name : 'Admins';
    (groups[key] = groups[key] || []).push(member);
  });
  const groupNames = Object.keys(groups).sort((a, b) => (a === 'Admins') - (b === 'Admins') || a.localeCompare(b));

  const count = (role) => (members || []).filter((member) => role === 'all' || member.role === role).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <ScreenTitle
        title="Team"
        right={
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AdminMemberForm')} accessibilityRole="button">
            <Ionicons name="add" size={18} color={COLORS.surface} />
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filters}>
        {FILTERS.map(([id, label]) => {
          const selected = filter === id;

          return (
            <TouchableOpacity
              key={id}
              style={[styles.filter, selected && styles.filterOn]}
              onPress={() => setFilter(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.filterText, selected && styles.filterTextOn]}>
                {label} {members ? count(id) : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {members === null ? (
        loadError ? <ErrorState message={loadError} onRetry={load} /> : <LoadingState />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No one here yet"
          text="Add staff and drivers so they can sign in."
          actionLabel="Add member"
          onAction={() => navigation.navigate('AdminMemberForm')}
        />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {groupNames.map((name) => (
            <View key={name} style={styles.group}>
              <Text style={styles.groupTitle}>{name.toUpperCase()}</Text>

              <Card style={styles.groupCard}>
                {groups[name].map((member, index) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[styles.row, index < groups[name].length - 1 && styles.divider, !member.is_active && styles.inactive]}
                    onPress={() => navigation.navigate('AdminMember', { userId: member.id, role: member.role })}
                    accessibilityRole="button"
                  >
                    <Initials name={member.full_name} size={40} />
                    <View style={styles.rowText}>
                      <Text style={styles.name}>{member.full_name}</Text>
                      <Text style={styles.meta}>{formatPhone(member.phone_number)}</Text>
                    </View>
                    {member.is_active ? (
                      <Pill label={ROLE_PILLS[member.role].label} tone={ROLE_PILLS[member.role].tone} />
                    ) : (
                      <Pill label="Deactivated" tone="red" />
                    )}
                    <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
                  </TouchableOpacity>
                ))}
              </Card>
            </View>
          ))}
        </ScrollView>
      )}

      <TeamNav role="admin" activeTab="team" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.ground },
  addButton: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, borderRadius: 12, backgroundColor: COLORS.royal },
  addText: { color: COLORS.surface, fontFamily: FONTS.extrabold, fontSize: 13 },
  filtersScroll: { flexGrow: 0 },
  filters: { gap: 8, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  filter: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surface, justifyContent: 'center' },
  filterOn: { borderColor: COLORS.ink, backgroundColor: COLORS.ink },
  filterText: { color: COLORS.ink, fontFamily: FONTS.bold, fontSize: 13 },
  filterTextOn: { color: COLORS.surface },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  group: { marginTop: 10 },
  groupTitle: { marginBottom: 6, color: COLORS.muted, fontFamily: FONTS.extrabold, fontSize: 12, letterSpacing: 0.7 },
  groupCard: { paddingVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: COLORS.line },
  inactive: { opacity: 0.6 },
  rowText: { flex: 1 },
  name: { color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 14 },
  meta: { marginTop: 2, color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 12 },
});
