import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getAttendanceHistory,
  type AttendanceRecord,
  getTeacherEventAttendance,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getProfile } from '@/lib/profiles';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function HistoryScreen() {
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<
    TeacherEventAttendance[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { user } = useAuth();

  const loadHistory = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setTeacherEvents([]);
      setRole(null);
      setLoading(false);
      setErrorMessage(null);
      return;
    }

    setErrorMessage(null);

    try {
      const profile = await getProfile(user.id);
      const currentRole =
        profile?.role === 'teacher' ? 'teacher' : 'student';

      setRole(currentRole);

      if (currentRole === 'teacher') {
        const events = await getTeacherEventAttendance(user.id);
        setTeacherEvents(events);
        setRecords([]);
      } else {
        const rows = await getAttendanceHistory(user.id);
        setRecords(rows);
        setTeacherEvents([]);
      }
    } catch (error) {
      console.error('HISTORY SCREEN ERROR:', error);
      setErrorMessage(
        'Unable to load attendance records. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadHistory();
    }, [loadHistory])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadHistory();
    } finally {
      setRefreshing(false);
    }
  }, [loadHistory]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return records;

    return records.filter((item) => {
      const title = item.eventTitle?.toLowerCase() ?? '';
      const eventId = item.eventId?.toLowerCase() ?? '';

      return title.includes(query) || eventId.includes(query);
    });
  }, [records, search]);

  const filteredTeacherEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return teacherEvents;

    return teacherEvents.filter((item) => {
      const title = item.title?.toLowerCase() ?? '';
      const eventCode = item.eventCode?.toLowerCase() ?? '';

      return title.includes(query) || eventCode.includes(query);
    });
  }, [teacherEvents, search]);

  const isTeacher = role === 'teacher';

  const totalAttendance = isTeacher
    ? teacherEvents.reduce((total, event) => total + event.attendeeCount, 0)
    : records.length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>

          <Text style={styles.loadingTitle}>Loading attendance</Text>

          <Text style={styles.loadingText}>
            Please wait while we retrieve your records.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* FIXED HEADER */}
      <View style={styles.headerSection}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="time-outline"
            size={25}
            color={COLORS.accent}
          />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.eyebrow}>YOUR RECORDS</Text>

          <Text style={styles.title}>Attendance History</Text>

          <Text style={styles.subtitle}>
            {isTeacher
              ? 'Review attendance for your events.'
              : 'Keep track of the events you attended.'}
          </Text>
        </View>
      </View>

      {/* FIXED SUMMARY */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons
            name={
              isTeacher
                ? 'people-outline'
                : 'checkmark-done-outline'
            }
            size={26}
            color={COLORS.accent}
          />
        </View>

        <View style={styles.summaryInfo}>
          <Text style={styles.summaryLabel}>
            {isTeacher ? 'TOTAL ATTENDEES' : 'RECORDED ATTENDANCE'}
          </Text>

          <Text style={styles.summaryNumber}>{totalAttendance}</Text>

          <Text style={styles.summaryCaption}>
            {isTeacher
              ? `Across ${teacherEvents.length} event${
                  teacherEvents.length === 1 ? '' : 's'
                }`
              : `Attendance record${
                  records.length === 1 ? '' : 's'
                } saved`}
          </Text>
        </View>

        <View style={styles.summaryDecoration}>
          <Ionicons
            name="shield-checkmark-outline"
            size={48}
            color={COLORS.accent}
          />
        </View>
      </View>

      {/* FIXED SEARCH */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={21}
          color={COLORS.accent}
        />

        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search event name or code..."
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        {search.length > 0 && (
          <Pressable
            onPress={() => setSearch('')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={COLORS.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {/* FIXED LIST HEADING */}
      <View style={styles.listHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            {isTeacher ? 'Event Attendance' : 'Your Records'}
          </Text>

          <Text style={styles.sectionSubtitle}>
            {isTeacher
              ? 'Students registered in your events'
              : 'Your saved attendance entries'}
          </Text>
        </View>

        <View style={styles.resultBadge}>
          <Text style={styles.resultBadgeText}>
            {isTeacher
              ? filteredTeacherEvents.length
              : filteredRecords.length}
          </Text>
        </View>
      </View>

      {/* ERROR STATE */}
      {errorMessage ? (
        <View style={styles.stateCard}>
          <View style={styles.stateIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={30}
              color={COLORS.danger}
            />
          </View>

          <Text style={styles.stateTitle}>Couldn't load history</Text>

          <Text style={styles.stateDescription}>{errorMessage}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Ionicons
              name="refresh-outline"
              size={17}
              color={COLORS.textOnPrimary}
            />
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : isTeacher ? (
        /*
         * TEACHER HISTORY:
         * This wrapper fills the remaining screen height.
         * Only the FlatList scrolls; the header above stays fixed.
         */
        <View style={styles.listArea}>
          <FlatList
            style={styles.flexList}
            data={filteredTeacherEvents}
            keyExtractor={(item) => item.eventId}
            contentContainerStyle={[
              styles.list,
              filteredTeacherEvents.length === 0 && styles.emptyList,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.accent}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon={search ? 'search-outline' : 'clipboard-outline'}
                title={search ? 'No matching events' : 'No events yet'}
                description={
                  search
                    ? 'Try another event name or code.'
                    : 'Create an event to see attendance records here.'
                }
                onClear={search ? () => setSearch('') : undefined}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                {/* EVENT INFORMATION */}
                <View style={styles.eventHeader}>
                  <View style={styles.eventIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={23}
                      color={COLORS.accent}
                    />
                  </View>

                  <View style={styles.eventHeaderText}>
                    <Text
                      style={styles.eventTitle}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>

                    <View style={styles.codeRow}>
                      <Ionicons
                        name="qr-code-outline"
                        size={14}
                        color={COLORS.accent}
                      />
                      <Text style={styles.codeText}>
                        {item.eventCode}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.countContainer}>
                    <Text style={styles.countText}>
                      {item.attendeeCount}
                    </Text>
                    <Text style={styles.countLabel}>
                      {item.attendeeCount === 1
                        ? 'STUDENT'
                        : 'STUDENTS'}
                    </Text>
                  </View>
                </View>

                {item.startTime && (
                  <View style={styles.infoRow}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.eventMeta}>
                      {formatDate(item.startTime)}
                    </Text>
                  </View>
                )}

                {/* STUDENT LIST HEADER */}
                <View style={styles.attendeesHeader}>
                  <View style={styles.attendeesTitleRow}>
                    <Ionicons
                      name="people-outline"
                      size={18}
                      color={COLORS.accent}
                    />
                    <Text style={styles.attendeesTitle}>Students</Text>
                  </View>

                  <View style={styles.smallBadge}>
                    <Text style={styles.smallBadgeText}>
                      {item.attendeeCount}
                    </Text>
                  </View>
                </View>

                {item.attendees.length === 0 ? (
                  <View style={styles.noStudentsBox}>
                    <Ionicons
                      name="people-outline"
                      size={19}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.noStudentsText}>
                      No students scanned yet.
                    </Text>
                  </View>
                ) : (
                  item.attendees.map((student) => (
                    <View
                      key={`${student.studentId}-${student.scannedAt}`}
                      style={styles.attendeeRow}
                    >
                      <View style={styles.studentIcon}>
                        <Ionicons
                          name="person-outline"
                          size={16}
                          color={COLORS.accent}
                        />
                      </View>

                      <View style={styles.studentInfo}>
                        <Text
                          style={styles.studentName}
                          numberOfLines={1}
                        >
                          {student.studentName ||
                            shortId(student.studentId)}
                        </Text>

                        <Text style={styles.eventMeta}>
                          {formatDate(student.scannedAt)} · {student.status}
                        </Text>
                      </View>

                      <View style={styles.checkedIcon}>
                        <Ionicons
                          name="checkmark"
                          size={15}
                          color={COLORS.success}
                        />
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          />
        </View>
      ) : (
        /* STUDENT HISTORY — existing behavior preserved */
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.list,
            filteredRecords.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={search ? 'search-outline' : 'time-outline'}
              title={search ? 'No matching records' : 'No attendance yet'}
              description={
                search
                  ? 'Try another event name or code.'
                  : 'Scan an event QR code to record your attendance.'
              }
              onClear={search ? () => setSearch('') : undefined}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.studentHistoryRow}>
                <View style={styles.eventIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={23}
                    color={COLORS.accent}
                  />
                </View>

                <View style={styles.studentHistoryInfo}>
                  <Text
                    style={styles.eventTitle}
                    numberOfLines={2}
                  >
                    {item.eventTitle || 'School Event'}
                  </Text>

                  <View style={styles.codeRow}>
                    <Ionicons
                      name="qr-code-outline"
                      size={14}
                      color={COLORS.accent}
                    />
                    <Text style={styles.codeText}>{item.eventId}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons
                      name="time-outline"
                      size={15}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.eventMeta}>
                      {formatDate(item.scannedAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.presentBadge}>
                  <Ionicons
                    name={item.status.toLowerCase() === 'present'
                      ? 'checkmark-circle'
                      : 'alert-circle'}
                    size={14}
                    color={item.status.toLowerCase() === 'present'
                      ? COLORS.success
                      : COLORS.warning}
                  />
                  <Text style={styles.presentText}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.recordFooter}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={COLORS.success}
                />
                <Text style={styles.recordFooterText}>
                  Attendance recorded
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function EmptyState({
  icon,
  title,
  description,
  onClear,
}: {
  icon: IconName;
  title: string;
  description: string;
  onClear?: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={30} color={COLORS.accent} />
      </View>

      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>

      {onClear && (
        <Pressable
          style={styles.clearButton}
          onPress={onClear}
        >
          <Text style={styles.clearButtonText}>Clear Search</Text>
        </Pressable>
      )}
    </View>
  );
}

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'Unknown student';
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return 'Date unavailable';

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 22,
    paddingTop: 21,
  },

  /* LOADING */
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingIcon: {
    width: 66,
    height: 66,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  loadingText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  /* HEADER */
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 23,
    paddingTop: 4,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  headerContent: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: COLORS.accent,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  /* SUMMARY */
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    overflow: 'hidden',
    boxShadow: '0px 8px 14px rgba(0, 0, 0, 0.18)',
  },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.textSecondary,
  },
  summaryNumber: {
    fontSize: 29,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  summaryCaption: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryDecoration: {
    opacity: 0.45,
    marginLeft: 4,
  },

  /* SEARCH */
  searchContainer: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    marginBottom: 25,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
  },

  /* LIST HEADER */
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  resultBadge: {
    minWidth: 38,
    height: 38,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.accent,
  },

  /* SCROLLABLE TEACHER LIST AREA */
  listArea: {
    flex: 1,
    minHeight: 0,
  },
  flexList: {
    flex: 1,
  },
  list: {
    paddingBottom: 30,
  },
  emptyList: {
    flexGrow: 1,
  },

  /* EVENT CARD */
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 19,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    boxShadow: '0px 5px 10px rgba(0, 0, 0, 0.14)',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  eventHeaderText: {
    flex: 1,
    paddingRight: 7,
  },
  eventTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  codeText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },
  countContainer: {
    minWidth: 57,
    paddingHorizontal: 7,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  countText: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.accent,
  },
  countLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
    gap: 5,
  },
  eventMeta: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },

  /* TEACHER ATTENDEES */
  attendeesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 19,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attendeesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  attendeesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  smallBadge: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 7,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.accent,
  },
  noStudentsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 14,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  noStudentsText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  studentIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  checkedIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginLeft: 8,
  },

  /* STUDENT HISTORY */
  studentHistoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  studentHistoryInfo: {
    flex: 1,
    paddingRight: 7,
  },
  presentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.10)',
  },
  presentText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.success,
  },
  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  recordFooterText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
  },

  /* EMPTY AND ERROR STATES */
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stateIcon: {
    width: 62,
    height: 62,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  stateDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 7,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 18,
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },
  clearButton: {
    marginTop: 17,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accent,
  },
});