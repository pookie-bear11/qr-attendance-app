import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type Role = 'student' | 'teacher' | 'admin';

type EventReport = {
  id: string;
  eventCode: string;
  title: string;
  attendanceCount: number;
  startTime: string | null;
};

export default function AdminReportEventsScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<EventReport[]>([]);
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!user) {
      setRoleLoading(false);
      setLoading(false);
      return;
    }

    setErrorMessage(null);

    try {
      const profile = await getProfile(user.id);

      setRole(profile?.role ?? null);
      setRoleLoading(false);

      if (profile?.role !== 'admin') {
        setLoading(false);
        return;
      }

      setLoading(true);

      const [eventsResult, attendanceResult] = await Promise.all([
        supabase
          .from('events')
          .select(
            'id, event_code, title, start_time, created_at'
          )
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('attendance')
          .select(
            'id, event_id, student_id, scanned_at'
          )
          .order('scanned_at', {
            ascending: false,
          }),
      ]);

      if (eventsResult.error) {
        console.log(
          'REPORT EVENTS ERROR:',
          eventsResult.error
        );

        setErrorMessage(
          'Unable to load event reports.'
        );

        return;
      }

      if (attendanceResult.error) {
        console.log(
          'REPORT ATTENDANCE ERROR:',
          attendanceResult.error
        );
      }

      const eventData = eventsResult.data ?? [];
      const attendanceData = attendanceResult.data ?? [];

      const eventReports: EventReport[] = eventData.map((event) => {
        const attendanceCount = attendanceData.filter(
          (record) => record.event_id === event.id
        ).length;

        return {
          id: event.id,
          eventCode: event.event_code,
          title: event.title,
          attendanceCount,
          startTime: event.start_time,
        };
      });

      setEvents(eventReports);
    } catch (error) {
      console.log(
        'ADMIN REPORT EVENTS ERROR:',
        error
      );

      setErrorMessage(
        'Unable to load event reports.'
      );
    } finally {
      setLoading(false);
      setRoleLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const searchQuery = search.trim().toLowerCase();

  const filteredEvents = searchQuery
    ? events.filter(
        (event) =>
          event.title
            .toLowerCase()
            .includes(searchQuery) ||
          event.eventCode
            .toLowerCase()
            .includes(searchQuery)
      )
    : events;

  if (roleLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingIcon}>
          <Ionicons
            name="bar-chart-outline"
            size={42}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.loadingTitle}>
          Loading Event Reports...
        </Text>

        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={styles.loadingIndicator}
        />
      </View>
    );
  }

  if (role !== 'admin') {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.lockIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={46}
            color={COLORS.danger}
          />
        </View>

        <Text style={styles.lockTitle}>
          Administrator Only
        </Text>

        <Text style={styles.lockSubtitle}>
          Only administrator accounts can access event reports.
        </Text>

        <View style={styles.securityBadge}>
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color={COLORS.accent}
          />

          <Text style={styles.securityBadgeText}>
            Protected Admin Area
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            router.replace('/admin-reports')
          }
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={COLORS.textPrimary}
          />
        </Pressable>

        <View style={styles.headerText}>
          <View style={styles.eyebrowRow}>
            <Ionicons
              name="bar-chart-outline"
              size={14}
              color={COLORS.accent}
            />

            <Text style={styles.eyebrow}>
              ADMIN REPORTS
            </Text>
          </View>

          <Text style={styles.title}>
            Attendance by Event
          </Text>

          <Text style={styles.subtitle}>
            View attendance records for all events.
          </Text>
        </View>
      </View>

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Ionicons
          name="search-outline"
          size={20}
          color={COLORS.textSecondary}
        />

        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search event name or code..."
          placeholderTextColor={COLORS.textSecondary}
          autoCorrect={false}
          autoCapitalize="none"
        />

        {search.length > 0 && (
          <Pressable
            onPress={() => setSearch('')}
            hitSlop={8}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={COLORS.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {/* ERROR */}
      {errorMessage && (
        <View style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="warning-outline"
              size={18}
              color={COLORS.danger}
            />
          </View>

          <Text style={styles.errorText}>
            {errorMessage}
          </Text>
        </View>
      )}

      {/* RESULT HEADER */}
      <View style={styles.resultHeader}>
        <View>
          <Text style={styles.resultTitle}>
            {searchQuery ? 'Search Results' : 'All Events'}
          </Text>

          <Text style={styles.resultSubtitle}>
            Attendance summary
          </Text>
        </View>

        <View style={styles.resultCountBadge}>
          <Text style={styles.resultCount}>
            {filteredEvents.length}
          </Text>

          <Text style={styles.resultCountLabel}>
            {filteredEvents.length === 1
              ? 'EVENT'
              : 'EVENTS'}
          </Text>
        </View>
      </View>

      {/* EVENT LIST */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={
                  searchQuery
                    ? 'search-outline'
                    : 'document-text-outline'
                }
                size={40}
                color={COLORS.textSecondary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {searchQuery
                ? 'No Matching Events'
                : 'No Event Data'}
            </Text>

            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try searching for a different event name or event code.'
                : 'Attendance reports will appear here after events are created.'}
            </Text>
          </View>
        ) : (
          <View style={styles.eventCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardHeaderTitle}>
                  Event Attendance
                </Text>

                <Text style={styles.cardHeaderSubtitle}>
                  Total attendees recorded per event
                </Text>
              </View>

              <View style={styles.cardHeaderIcon}>
                <Ionicons
                  name="people-outline"
                  size={19}
                  color={COLORS.accent}
                />
              </View>
            </View>

            {filteredEvents.map((event, index) => (
              <EventReportRow
                key={event.id}
                event={event}
                rank={index + 1}
                last={
                  index === filteredEvents.length - 1
                }
              />
            ))}
          </View>
        )}

        <Text style={styles.footerText}>
          Pull down to refresh event reports.
        </Text>
      </ScrollView>
    </View>
  );
}

/* =========================
   EVENT REPORT ROW
   ========================= */

type EventReportRowProps = {
  event: EventReport;
  rank: number;
  last: boolean;
};

function EventReportRow({
  event,
  rank,
  last,
}: EventReportRowProps) {
  return (
    <View
      style={[
        styles.eventRow,
        last && styles.eventRowLast,
      ]}
    >
      <View style={styles.rankCircle}>
        <Text style={styles.rankText}>
          {rank}
        </Text>
      </View>

      <View style={styles.eventInfo}>
        <Text
          style={styles.eventTitle}
          numberOfLines={1}
        >
          {event.title}
        </Text>

        <View style={styles.codeRow}>
          <Ionicons
            name="qr-code-outline"
            size={12}
            color={COLORS.primary}
          />

          <Text style={styles.eventCode}>
            {event.eventCode}
          </Text>
        </View>

        <View style={styles.dateRow}>
          <Ionicons
            name="calendar-outline"
            size={12}
            color={COLORS.textSecondary}
          />

          <Text style={styles.eventDate}>
            {formatDate(event.startTime)}
          </Text>
        </View>
      </View>

      <View style={styles.attendanceBox}>
        <Ionicons
          name="people-outline"
          size={16}
          color={COLORS.accent}
        />

        <Text style={styles.attendanceNumber}>
          {event.attendanceCount}
        </Text>

        <Text style={styles.attendanceLabel}>
          attendees
        </Text>
      </View>
    </View>
  );
}

/* =========================
   DATE FORMAT
   ========================= */

function formatDate(
  value: string | null
): string {
  if (!value) {
    return 'No date';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  );
}

/* =========================
   STYLES
   ========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },

  loadingIcon: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
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

  loadingIndicator: {
    marginTop: 12,
  },

  lockIcon: {
    width: 82,
    height: 82,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  lockTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 18,
  },

  lockSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 7,
    maxWidth: 320,
  },

  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 18,
  },

  securityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    marginLeft: 6,
  },

  header: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 21,
    marginBottom: 5,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  pressed: {
    opacity: 0.7,
  },

  headerText: {
    flex: 1,
  },

  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: COLORS.accent,
    marginLeft: 5,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  searchBox: {
    width: '92%',
    maxWidth: 816,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    marginBottom: 20,
    paddingHorizontal: 13,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginLeft: 9,
    paddingVertical: 0,
  },

  errorCard: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 13,
    padding: 12,
    marginHorizontal: 22,
    marginBottom: 16,
  },

  errorIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.danger,
    marginLeft: 9,
  },

  resultHeader: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginBottom: 14,
  },

  resultTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  resultSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  resultCountBadge: {
    minWidth: 58,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    alignItems: 'center',
  },

  resultCount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },

  resultCountLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  list: {
    flex: 1,
  },

  listContent: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingBottom: 48,
  },

  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  cardHeaderSubtitle: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  cardHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 17,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  eventRowLast: {
    borderBottomWidth: 0,
  },

  rankCircle: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  rankText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },

  eventInfo: {
    flex: 1,
    marginRight: 10,
  },

  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  eventCode: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 4,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  eventDate: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },

  attendanceBox: {
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 9,
  },

  attendanceNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },

  attendanceLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 30,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 14,
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 7,
    maxWidth: 290,
  },

  footerText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 18,
  },
});