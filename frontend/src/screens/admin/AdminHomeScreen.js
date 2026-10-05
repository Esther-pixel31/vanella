import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import { getTeamMembers } from '../../api/admin';
import { getBranches } from '../../api/branches';
import { getStaffSummary } from '../../api/staff';
import { getTeamMe } from '../../api/team';
import DarkHeader, { HeaderStat, HeaderStats, Initials } from '../../components/DarkHeader';
import TeamNav from '../../components/TeamNav';
import { Card, ErrorState, IconTile, LoadingState, Pill, SectionTitle } from '../../components/ui';
import { COLORS, FONTS } from '../../theme';
import { formatKes } from '../../utils/format';
import { todayLabel, useTeamErrorHandler } from '../team/teamErrors';

function LinkRow({ icon, title, sub, extra, onPress, last = false }) {
  return (
    <TouchableOpacity style={[styles.linkRow, !last && styles.divider]} onPress={onPress} accessibilityRole="button">
      <IconTile name={icon} size={38} iconSize={19} />
      <View style={styles.linkText}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkSub}>{sub}</Text>
      </View>
      {extra}
      <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

export default function AdminHomeScreen({ navigation }) {
  const handleError = useTeamErrorHandler(navigation);

  const [me, setMe] = useState(null);
  const [branches, setBranches] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [team, setTeam] = useState([]);
  const [loadError, setLoadError] = useState('');

  const loadBase = useCallback(async () => {
    try {
      const [meData, branchData, staff, drivers] = await Promise.all([
        getTeamMe(),
        getBranches(),
        getTeamMembers('staff'),
        getTeamMembers('drivers'),
      ]);

      setMe(meData);
      setBranches(branchData);
      setTeam([...staff, ...drivers]);
      setBranchId((current) => current || branchData[0]?.id || null);
      setLoadError('');
    } catch (err) {
      handleError(err, setLoadError);
    }
  }, [handleError]);

  useFocusEffect(
    useCallback(() => {
      loadBase();
    }, [loadBase])
  );

  useEffect(() => {
    if (!branchId) return;

    setSummary(null);
    getStaffSummary(branchId)
      .then(setSummary)
      .catch((err) => handleError(err, setLoadError));
  }, [branchId, handleError]);

  if (branches === null) {
    return (
      <SafeAreaView style={styles.loadingArea} edges={['top']}>
        <StatusBar style="dark" />
        {loadError ? <ErrorState message={loadError} onRetry={loadBase} /> : <LoadingState />}
        <TeamNav role="admin" activeTab="overview" navigation={navigation} />
      </SafeAreaView>
    );
  }

  const branch = branches.find((item) => item.id === branchId);
  const inBranch = team.filter((member) => member.branch?.id === branchId && member.is_active);
  const staffCount = inBranch.filter((member) => member.role === 'staff').length;
  const driverCount = inBranch.filter((member) => member.role === 'driver').length;
  const open = summary ? summary.new_orders + summary.ready_orders + summary.on_the_way : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <DarkHeader eyebrow="ADMIN" eyebrowIcon="key" title={todayLabel()} right={<Initials name={me?.full_name} />}>
          <View style={styles.switch} accessibilityRole="tablist">
            {branches.map((item) => {
              const selected = item.id === branchId;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.switchButton, selected && styles.switchButtonOn]}
                  onPress={() => setBranchId(item.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.switchText, selected && styles.switchTextOn]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {summary ? (
            <HeaderStats>
              <HeaderStat label="ORDERS TODAY" value={String(summary.orders_today)} sub={summary.awaiting_payment ? `+${summary.awaiting_payment} waiting for M-Pesa` : 'placed today'} />
              <HeaderStat label="TO DELIVER" value={String(open)} sub={`${summary.new_orders} new · ${summary.ready_orders} ready · ${summary.on_the_way} out`} />
              <HeaderStat label="M-PESA RECEIVED" value={formatKes(summary.mpesa_received)} sub="today" />
              <HeaderStat label="CASH TO COLLECT" value={formatKes(summary.cash_to_collect)} sub={`${formatKes(summary.cash_collected)} collected today`} />
            </HeaderStats>
          ) : (
            <Text style={styles.loadingText}>Loading today's numbers…</Text>
          )}
        </DarkHeader>

        <View style={styles.body}>
          <SectionTitle title={`${branch?.name || ''} branch`} />

          <Card style={styles.listCard}>
            <LinkRow
              icon="receipt"
              title="Orders"
              sub="See and manage the branch's orders"
              extra={open ? <Pill label={`${open} open`} tone="blue" /> : null}
              onPress={() => navigation.navigate('StaffHome', { branchId })}
            />
            <LinkRow icon="people" title="Staff" sub={`${staffCount} active`} onPress={() => navigation.navigate('AdminTeam', { filter: 'staff' })} />
            <LinkRow icon="car" title="Drivers" sub={`${driverCount} active`} onPress={() => navigation.navigate('AdminTeam', { filter: 'driver' })} last />
          </Card>

          <SectionTitle title="Team" style={styles.section} />

          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AdminMemberForm')} accessibilityRole="button">
            <Ionicons name="person-add" size={19} color={COLORS.royal} />
            <Text style={styles.addText}>Add a staff member or driver</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TeamNav role="admin" activeTab="overview" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.deep },
  loadingArea: { flex: 1, backgroundColor: COLORS.ground },
  scroll: { flex: 1, backgroundColor: COLORS.ground },
  scrollContent: { paddingBottom: 24 },
  switch: { flexDirection: 'row', marginTop: 14, padding: 4, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.10)' },
  switchButton: { flex: 1, height: 38, paddingHorizontal: 6, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  switchButtonOn: { backgroundColor: COLORS.surface },
  switchText: { color: '#CFE6FF', fontFamily: FONTS.extrabold, fontSize: 13 },
  switchTextOn: { color: COLORS.ink },
  loadingText: { marginTop: 14, color: '#B9CCE8', fontFamily: FONTS.medium, fontSize: 13 },
  body: { paddingHorizontal: 20, paddingTop: 18 },
  section: { marginTop: 20 },
  listCard: { paddingVertical: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: COLORS.line },
  linkText: { flex: 1 },
  linkTitle: { color: COLORS.ink, fontFamily: FONTS.extrabold, fontSize: 14 },
  linkSub: { marginTop: 1, color: COLORS.muted, fontFamily: FONTS.medium, fontSize: 12 },
  addButton: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#A9B8CE', backgroundColor: COLORS.surface },
  addText: { color: COLORS.royal, fontFamily: FONTS.extrabold, fontSize: 14 },
});
