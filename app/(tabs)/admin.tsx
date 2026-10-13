
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getAllEvents, type CloudEvent } from '@/lib/events';
import { getAllProfiles, getProfile, type Profile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type Stats = {
  users: number;
  students: number;
  teachers: number;
  admins: number;
  events: number;
  attendance: number;
};

function formatDate(value: string | null | undefined) {
  if (!value) return 'No date';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const EMPTY_STATS: Stats = {
  users: 0,
  students: 0,
  teachers: 0,
  admins: 0,
  events: 0,
  attendance: 0,
};

export default function Admin() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [recentEvents, setRecentEvents] = useState<CloudEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);

      setError(null);

      if (!user) {
        setAuthorized(false);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const profile = await getProfile(user.id);

        if (profile?.role !== 'admin') {
          setAuthorized(false);
          return;
        }

        setAuthorized(true);

        const [profiles, events, attendanceResult] = await Promise.all([
          getAllProfiles(),
          getAllEvents(),
          supabase
            .from('attendance')
            .select('id', { count: 'exact', head: true }),
        ]);

        if (attendanceResult.error) {
          throw new Error(attendanceResult.error.message);
        }

        const students = profiles.filter(
          (item: Profile) => item.role === 'student'
        ).length;

        const teachers = profiles.filter(
          (item: Profile) => item.role === 'teacher'
        ).length;

        const admins = profiles.filter(
          (item: Profile) => item.role === 'admin'
        ).length;

        const sortedEvents = [...events].sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();

          return (
            (Number.isNaN(dateB) ? 0 : dateB) -
            (Number.isNaN(dateA) ? 0 : dateA)
          );
        });

        setStats({
          users: profiles.length,
          students,
          teachers,
          admins,
          events: events.length,
          attendance: attendanceResult.count ?? 0,
        });

        setRecentEvents(sortedEvents.slice(0, 3));
      } catch (err) {
        console.error('Admin dashboard load error:', err);

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load admin dashboard.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadDashboard(false);
  }, [loadDashboard]);

  const handleRetry = useCallback(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={32}
              color={COLORS.primary}
            />
          </View>
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={styles.loadingSpinner}
          />
          <Text style={styles.loadingText}>Loading Admin Dashboard...</Text>
        </View>
      </View>
    );
  }

  if (authorized === false) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.lockIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={38}
              color={COLORS.primary}
            />
          </View>

          <Text style={styles.lockTitle}>Administrator Only</Text>
          <Text style={styles.lockText}>
            You are not authorized to access the Admin Dashboard.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back-outline"
              size={18}
              color={COLORS.textOnPrimary}
            />
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.adminLabelRow}>
              <View style={styles.adminLabelDot} />
              <Text style={styles.adminLabel}>QRPASS ADMINISTRATION</Text>
            </View>

            <Text style={styles.pageTitle}>Admin Dashboard</Text>
            <Text style={styles.pageSubtitle}>
              Manage users, events, attendance, and reports.
            </Text>
          </View>

          <View style={styles.adminBadge}>
            <Ionicons
              name="shield-checkmark"
              size={24}
              color={COLORS.gold}
            />
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons
              name={hasError ? 'warning-outline' : 'pulse-outline'}
              size={20}
              color={hasError ? COLORS.danger : COLORS.accent}
            />
          </View>

          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>
              {hasError ? 'Dashboard Needs Attention' : 'System Active'}
            </Text>
            <Text style={styles.statusText}>
              {hasError
                ? 'Some dashboard information could not be loaded.'
                : 'QRPass attendance management is running normally.'}
            </Text>
          </View>

          <View
            style={[
              styles.onlineDot,
              hasError && styles.offlineDot,
            ]}
          />
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="warning-outline"
                size={21}
                color={COLORS.danger}
              />
            </View>

            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>
                Unable to load dashboard
              </Text>
              <Text style={styles.errorText}>{error}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="refresh-outline"
                  size={15}
                  color={COLORS.textOnPrimary}
                />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>System Statistics</Text>
            <Text style={styles.sectionHint}>Current system overview</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="people-outline"
            label="Total Users"
            value={stats.users}
            accent="blue"
          />
          <StatCard
            icon="school-outline"
            label="Students"
            value={stats.students}
            accent="cyan"
          />
          <StatCard
            icon="person-outline"
            label="Teachers"
            value={stats.teachers}
            accent="gold"
          />
          <StatCard
            icon="shield-checkmark-outline"
            label="Admins"
            value={stats.admins}
            accent="orange"
          />
          <StatCard
            icon="calendar-outline"
            label="Events"
            value={stats.events}
            accent="blue"
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Attendance"
            value={stats.attendance}
            accent="cyan"
          />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Text style={styles.sectionHint}>
              Common administration tools
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <ActionCard
            icon="add-circle-outline"
            title="Create Event"
            description="Create an event and generate its QR code."
            onPress={() => router.push('/teacher')}
            featured
          />

          <ActionCard
            icon="people-outline"
            title="Manage Users"
            description="Manage students, teachers, and administrators."
            onPress={() => router.push('/(tabs)/admin-users')}
          />

          <ActionCard
            icon="calendar-outline"
            title="Manage Events"
            description="View and edit events, or close them without deleting attendance history."
            onPress={() => router.push('/(tabs)/admin-events')}
          />

          <ActionCard
            icon="checkmark-done-outline"
            title="Attendance"
            description="View and manage attendance records."
            onPress={() => router.push('/(tabs)/admin-attendance')}
          />

          <ActionCard
            icon="bar-chart-outline"
            title="Reports"
            description="View system statistics and attendance reports."
            onPress={() => router.push('/(tabs)/admin-reports')}
          />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent Events</Text>
            <Text style={styles.sectionHint}>Latest 3 created events</Text>
          </View>

          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push('/(tabs)/admin-events')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons
              name="chevron-forward"
              size={17}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {hasError ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="cloud-offline-outline"
                size={30}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>Data Unavailable</Text>
            <Text style={styles.emptyText}>
              Refresh the dashboard to try loading the latest event information.
            </Text>
          </View>
        ) : recentEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-outline"
                size={30}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>No Events Yet</Text>
            <Text style={styles.emptyText}>
              Create your first school event using the Create Event action.
            </Text>
          </View>
        ) : (
          <View style={styles.eventsContainer}>
            {recentEvents.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={23}
                    color={COLORS.accent}
                  />
                </View>

                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {event.title}
                  </Text>

                  <View style={styles.eventCodeRow}>
                    <Ionicons
                      name="qr-code-outline"
                      size={13}
                      color={COLORS.accent}
                    />
                    <Text style={styles.eventCode}>
                      {event.event_code}
                    </Text>
                  </View>

                  <View style={styles.eventDateRow}>
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.eventDate}>
                      {formatDate(event.start_time)}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>System Summary</Text>
            <Text style={styles.sectionHint}>
              Detailed account and attendance totals
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <SummaryRow
            icon="people-outline"
            label="Registered Users"
            value={stats.users}
          />
          <SummaryRow
            icon="school-outline"
            label="Student Accounts"
            value={stats.students}
          />
          <SummaryRow
            icon="person-outline"
            label="Teacher Accounts"
            value={stats.teachers}
          />
          <SummaryRow
            icon="shield-checkmark-outline"
            label="Administrator Accounts"
            value={stats.admins}
          />
          <SummaryRow
            icon="calendar-outline"
            label="School Events"
            value={stats.events}
          />
          <SummaryRow
            icon="checkmark-circle-outline"
            label="Attendance Records"
            value={stats.attendance}
            last
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <View style={styles.footerBrand}>
            <Ionicons
              name="qr-code-outline"
              size={15}
              color={COLORS.accent}
            />
            <Text style={styles.footerText}>
              QRPass • Administrator Control Panel
            </Text>
          </View>
          <Text style={styles.footerSubtext}>
            School Event Attendance Management System
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  accent: 'blue' | 'cyan' | 'gold' | 'orange';
}) {
  const accentColor =
    accent === 'gold'
      ? COLORS.gold
      : accent === 'orange'
        ? COLORS.orange
        : accent === 'cyan'
          ? COLORS.accent
          : COLORS.primary;

  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { borderColor: accentColor }]}>
        <Ionicons name={icon} size={21} color={accentColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({
  icon,
  title,
  description,
  onPress,
  featured = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  onPress: () => void;
  featured?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionCard, featured && styles.featuredActionCard]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[styles.actionIcon, featured && styles.featuredActionIcon]}
      >
        <Ionicons
          name={icon}
          size={25}
          color={featured ? COLORS.textOnPrimary : COLORS.accent}
        />
      </View>

      <View style={styles.actionContent}>
        <View style={styles.actionTitleRow}>
          <Text
            style={[
              styles.actionTitle,
              featured && styles.featuredActionTitle,
            ]}
          >
            {title}
          </Text>

          {featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>PRIMARY</Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.actionDescription,
            featured && styles.featuredActionDescription,
          ]}
        >
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={featured ? COLORS.textOnPrimary : COLORS.textSecondary}
      />
    </TouchableOpacity>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  last?: boolean;
}) {
  return (
    <View style={[styles.summaryRow, last && styles.summaryRowLast]}>
      <View style={styles.summaryLeft}>
        <View style={styles.summaryIcon}>
          <Ionicons name={icon} size={18} color={COLORS.accent} />
        </View>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 96,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: COLORS.background,
  },
  loadingIcon: {
    width: 68,
    height: 68,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    marginTop: 18,
  },
  loadingText: {
    marginTop: 9,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  lockIcon: {
    width: 78,
    height: 78,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: {
    marginTop: 18,
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  lockText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  primaryButton: {
    marginTop: 22,
    minWidth: 145,
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    marginLeft: 7,
    color: COLORS.textOnPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  adminLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  adminLabelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    marginRight: 6,
  },
  adminLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: COLORS.gold,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  adminBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusCard: {
    minHeight: 76,
    marginBottom: 26,
    padding: 15,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContent: {
    flex: 1,
    marginLeft: 10,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statusText: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
    marginHorizontal: 7,
  },
  offlineDot: {
    backgroundColor: COLORS.danger,
  },
  errorCard: {
    marginBottom: 20,
    padding: 13,
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 13,
  },
  errorIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContent: {
    flex: 1,
    marginLeft: 10,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  errorText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  retryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionHint: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  statCard: {
    width: '48.5%',
    minHeight: 132,
    marginBottom: 12,
    padding: 15,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
  },
  statIcon: {
    width: 35,
    height: 35,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
  },
  actionsContainer: {
    marginBottom: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48.5%',
    minHeight: 154,
    marginBottom: 12,
    padding: 15,
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
  },
  featuredActionCard: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    width: '100%',
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginRight: 0,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featuredActionIcon: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.textOnPrimary,
    marginRight: 13,
    marginBottom: 0,
  },
  actionContent: {
    flex: 1,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  featuredActionTitle: {
    color: COLORS.textOnPrimary,
  },
  featuredBadge: {
    marginLeft: 7,
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  featuredBadgeText: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: COLORS.textOnPrimary,
  },
  actionDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  featuredActionDescription: {
    color: COLORS.textOnPrimary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingLeft: 8,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 2,
  },
  eventsContainer: {
    marginBottom: 22,
  },
  eventCard: {
    minHeight: 92,
    marginBottom: 11,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
  },
  eventIcon: {
    width: 46,
    height: 46,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 11,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  eventCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventCode: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventDate: {
    flex: 1,
    marginLeft: 5,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  emptyCard: {
    minHeight: 170,
    marginBottom: 22,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 11,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptyText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  summaryCard: {
    marginBottom: 24,
    paddingHorizontal: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
  },
  summaryRow: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    flex: 1,
    marginLeft: 9,
    marginRight: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 3,
    paddingBottom: 10,
  },
  footerLine: {
    width: 45,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.border,
    marginBottom: 13,
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  footerSubtext: {
    marginTop: 4,
    fontSize: 9,
    color: COLORS.textSecondary,
    opacity: 0.7,
  },
});