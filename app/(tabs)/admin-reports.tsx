
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type Role = 'student' | 'teacher' | 'admin';

type ReportStats = {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  totalEvents: number;
  totalAttendance: number;
  averageAttendance: number;
};

const INITIAL_STATS: ReportStats = {
  totalUsers: 0,
  totalStudents: 0,
  totalTeachers: 0,
  totalAdmins: 0,
  totalEvents: 0,
  totalAttendance: 0,
  averageAttendance: 0,
};

export default function AdminReportsScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<ReportStats>(INITIAL_STATS);

  const loadReports = useCallback(async () => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? null;

      setRole(currentRole as Role | null);

      if (currentRole !== 'admin') {
        return;
      }

      const [profilesResult, eventsResult, attendanceResult] =
        await Promise.all([
          supabase.from('profiles').select('id, role'),
          supabase.from('events').select('id'),
          supabase.from('attendance').select('id'),
        ]);

      const queryError =
        profilesResult.error ||
        eventsResult.error ||
        attendanceResult.error;

      if (queryError) {
        console.error('ADMIN REPORTS QUERY ERROR:', queryError);
        setErrorMessage('Unable to load reports. Please try again.');
        return;
      }

      const profiles = profilesResult.data ?? [];
      const events = eventsResult.data ?? [];
      const attendance = attendanceResult.data ?? [];

      const totalStudents = profiles.filter(
        (item) => item.role === 'student',
      ).length;

      const totalTeachers = profiles.filter(
        (item) => item.role === 'teacher',
      ).length;

      const totalAdmins = profiles.filter(
        (item) => item.role === 'admin',
      ).length;

      const totalUsers = profiles.length;
      const totalEvents = events.length;
      const totalAttendance = attendance.length;

      const averageAttendance =
        totalEvents > 0 ? totalAttendance / totalEvents : 0;

      setStats({
        totalUsers,
        totalStudents,
        totalTeachers,
        totalAdmins,
        totalEvents,
        totalAttendance,
        averageAttendance,
      });
    } catch (error) {
      console.error('ADMIN REPORTS ERROR:', error);
      setErrorMessage('Unable to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadReports();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingIcon}>
          <Ionicons
            name="bar-chart-outline"
            size={34}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.loadingTitle}>Loading Reports...</Text>
        <Text style={styles.loadingSubtitle}>
          Preparing system statistics
        </Text>

        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={styles.loadingIndicator}
        />
      </View>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.lockIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={34}
            color={COLORS.danger}
          />
        </View>

        <Text style={styles.lockTitle}>Administrator Only</Text>
        <Text style={styles.lockSubtitle}>
          Only administrator accounts can access reports.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.returnButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.replace('/admin')}
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color={COLORS.textOnPrimary}
          />
          <Text style={styles.returnButtonText}>
            Back to Dashboard
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* BACK BUTTON */}
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.replace('/admin')}
        >
          <View style={styles.backIcon}>
            <Ionicons
              name="arrow-back"
              size={18}
              color={COLORS.textPrimary}
            />
          </View>
          <Text style={styles.backText}>Admin Dashboard</Text>
        </Pressable>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="bar-chart"
              size={27}
              color={COLORS.textOnPrimary}
            />
          </View>

          <View style={styles.headerText}>
            <View style={styles.labelRow}>
              <View style={styles.labelDot} />
              <Text style={styles.headerLabel}>QRPass ADMIN</Text>
            </View>

            <Text style={styles.title}>Reports</Text>
            <Text style={styles.subtitle}>
              View attendance and system statistics.
            </Text>
          </View>
        </View>

        {/* ERROR MESSAGE */}
        {errorMessage && (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="warning-outline"
                size={20}
                color={COLORS.danger}
              />
            </View>

            <View style={styles.errorContent}>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <Pressable
                onPress={loadReports}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* REPORT OVERVIEW */}
        <Text style={styles.sectionTitle}>Report Overview</Text>

        <View style={styles.statsGrid}>
          <StatCard
            icon="people-outline"
            label="Users"
            value={stats.totalUsers}
          />
          <StatCard
            icon="calendar-outline"
            label="Events"
            value={stats.totalEvents}
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Attendance"
            value={stats.totalAttendance}
          />
          <StatCard
            icon="stats-chart-outline"
            label="Avg. Attendance"
            value={stats.averageAttendance.toFixed(1)}
          />
        </View>

        {/* USER STATISTICS */}
        <Text style={styles.sectionTitle}>User Statistics</Text>

        <View style={styles.card}>
          <ReportRow
            icon="school-outline"
            label="Students"
            value={stats.totalStudents}
          />
          <ReportRow
            icon="briefcase-outline"
            label="Teachers"
            value={stats.totalTeachers}
          />
          <ReportRow
            icon="shield-checkmark-outline"
            label="Administrators"
            value={stats.totalAdmins}
            last
          />
        </View>

        {/* REPORT OPTIONS */}
        <Text style={[styles.sectionTitle, styles.reportOptionsTitle]}>
          Report Options
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.reportOption,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push('/(tabs)/admin-report-events')}
        >
          <View style={styles.reportOptionIcon}>
            <Ionicons
              name="calendar-outline"
              size={24}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.reportOptionInfo}>
            <Text style={styles.reportOptionTitle}>
              Attendance by Event
            </Text>
            <Text style={styles.reportOptionDescription}>
              View attendance records and totals for each event.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={21}
            color={COLORS.textSecondary}
          />
        </Pressable>

        {/* REPORT SUMMARY */}
        <Text style={styles.sectionTitle}>Report Summary</Text>

        <View style={styles.card}>
          <ReportRow
            icon="people-outline"
            label="Total Users"
            value={stats.totalUsers}
          />
          <ReportRow
            icon="school-outline"
            label="Total Students"
            value={stats.totalStudents}
          />
          <ReportRow
            icon="briefcase-outline"
            label="Total Teachers"
            value={stats.totalTeachers}
          />
          <ReportRow
            icon="shield-checkmark-outline"
            label="Total Administrators"
            value={stats.totalAdmins}
          />
          <ReportRow
            icon="calendar-outline"
            label="Total Events"
            value={stats.totalEvents}
          />
          <ReportRow
            icon="checkmark-done-outline"
            label="Total Attendance"
            value={stats.totalAttendance}
          />
          <ReportRow
            icon="analytics-outline"
            label="Average Attendance"
            value={stats.averageAttendance.toFixed(1)}
            last
          />
        </View>

        {/* FOOTER */}
        <View style={styles.footerCard}>
          <Ionicons
            name="refresh-outline"
            size={17}
            color={COLORS.accent}
          />
          <Text style={styles.footerText}>
            Pull down to refresh reports.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
};

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={COLORS.primary}
        />
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type ReportRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  last?: boolean;
};

function ReportRow({
  icon,
  label,
  value,
  last = false,
}: ReportRowProps) {
  return (
    <View
      style={[
        styles.reportRow,
        last && styles.reportRowLast,
      ]}
    >
      <View style={styles.reportRowLeft}>
        <View style={styles.reportRowIcon}>
          <Ionicons
            name={icon}
            size={19}
            color={COLORS.accent}
          />
        </View>

        <Text style={styles.reportRowLabel}>{label}</Text>
      </View>

      <Text style={styles.reportRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 56,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  loadingIndicator: {
    marginTop: 14,
  },
  lockIcon: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 17,
  },
  lockSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 7,
    maxWidth: 310,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    marginTop: 22,
    gap: 8,
  },
  returnButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  pressed: {
    opacity: 0.75,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  backIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backText: {
    marginLeft: 9,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 17,
    borderRadius: 21,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderWidth: 0,
    marginRight: 13,
  },
  headerText: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  headerLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: COLORS.accent,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 13,
    padding: 12,
    marginBottom: 20,
  },
  errorIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContent: {
    flex: 1,
    marginLeft: 9,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.danger,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingRight: 10,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  reportOptionsTitle: {
    marginTop: 25,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '48.5%',
    minHeight: 134,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reportRowLast: {
    borderBottomWidth: 0,
  },
  reportRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  reportRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportRowLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginLeft: 10,
  },
  reportRowValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
    marginBottom: 28,
  },
  reportOptionIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportOptionInfo: {
    flex: 1,
    marginRight: 8,
  },
  reportOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  reportOptionDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});