
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type AttendanceItem = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  eventId: string;
  eventTitle: string;
  eventCode: string;
  scannedAt: string;
  status: string;
};

export default function AdminAttendanceScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [records, setRecords] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStudentId, setEditStudentId] = useState('');
  const [editEventId, setEditEventId] = useState('');
  const [editScannedAt, setEditScannedAt] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAttendance = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setLoadError(null);

      try {
        if (!user) {
          setRole(null);
          setRecords([]);
          return;
        }

        const profile = await getProfile(user.id);
        setRole(profile?.role ?? null);

        if (profile?.role !== 'admin') {
          setRecords([]);
          return;
        }

        const { data, error } = await supabase
          .from('attendance')
          .select(`
            id,
            student_id,
            scanned_at,
            status,
            event_id,
            profiles!attendance_student_id_fkey (
              full_name,
              email
            ),
            events!attendance_event_id_fkey (
              event_code,
              title
            )
          `)
          .order('scanned_at', { ascending: false });

        if (error) throw error;

        const formatted: AttendanceItem[] = (data ?? []).map(
          (row: any) => ({
            id: row.id,
            studentId: row.student_id,
            studentName: row.profiles?.full_name ?? 'Unknown Student',
            studentEmail: row.profiles?.email ?? '',
            eventId: row.event_id,
            eventTitle: row.events?.title ?? 'Unknown Event',
            eventCode: row.events?.event_code ?? '',
            scannedAt: row.scanned_at,
            status: row.status ?? 'present',
          })
        );

        setRecords(formatted);
      } catch (error) {
        console.error('ADMIN ATTENDANCE LOAD ERROR:', error);
        setLoadError(
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      void loadAttendance();
    }, [loadAttendance])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAttendance(false);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;

    return records.filter((record) =>
      [
        record.studentName,
        record.studentEmail,
        record.eventTitle,
        record.eventCode,
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [records, search]);

  const startEditing = (item: AttendanceItem) => {
    setEditingId(item.id);
    setEditStudentId(item.studentId);
    setEditEventId(item.eventId);
    setEditScannedAt(item.scannedAt);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditStudentId('');
    setEditEventId('');
    setEditScannedAt('');
  };

  const saveAttendance = async (item: AttendanceItem) => {
    if (saving) return;

    const studentId = editStudentId.trim();
    const eventId = editEventId.trim();
    const scannedAt = editScannedAt.trim();

    if (!studentId || !eventId || !scannedAt) {
      Alert.alert(
        'Missing Information',
        'Student ID, Event ID, and Scanned At are required.'
      );
      return;
    }

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(studentId)) {
      Alert.alert('Invalid Student ID', 'Enter a valid student UUID.');
      return;
    }

    if (!uuidPattern.test(eventId)) {
      Alert.alert('Invalid Event ID', 'Enter a valid event UUID.');
      return;
    }

    const parsedDate = new Date(scannedAt);

    if (Number.isNaN(parsedDate.getTime())) {
      Alert.alert(
        'Invalid Date',
        'Enter a valid date and time, such as 2026-10-08T10:30:00.000Z.'
      );
      return;
    }

    setSaving(true);

    try {
      const { data: student, error: studentError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', studentId)
        .maybeSingle();

      if (studentError) throw studentError;

      if (!student) {
        Alert.alert(
          'Student Not Found',
          'The Student ID does not belong to an existing profile.'
        );
        return;
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .maybeSingle();

      if (eventError) throw eventError;

      if (!event) {
        Alert.alert(
          'Event Not Found',
          'The Event ID does not belong to an existing event.'
        );
        return;
      }

      const { data: duplicate, error: duplicateError } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('event_id', eventId)
        .neq('id', item.id)
        .maybeSingle();

      if (duplicateError) throw duplicateError;

      if (duplicate) {
        Alert.alert(
          'Duplicate Attendance',
          'This student already has an attendance record for this event.'
        );
        return;
      }

      const { error: updateError } = await supabase
        .from('attendance')
        .update({
          student_id: studentId,
          event_id: eventId,
          scanned_at: parsedDate.toISOString(),
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      cancelEditing();
      await loadAttendance(false);
      Alert.alert('Success', 'Attendance record updated successfully.');
    } catch (error) {
      console.error('SAVE ATTENDANCE ERROR:', error);
      Alert.alert(
        'Update Failed',
        error instanceof Error
          ? error.message
          : 'Unable to update the attendance record.'
      );
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const goToDashboard = () => {
    router.replace('/(tabs)/admin');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingIcon}>
          <Ionicons
            name="checkmark-done-outline"
            size={32}
            color={COLORS.primary}
          />
        </View>
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={styles.loadingSpinner}
        />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <View style={styles.center}>
        <View style={styles.accessIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={36}
            color={COLORS.danger}
          />
        </View>
        <Text style={styles.accessTitle}>Access Denied</Text>
        <Text style={styles.accessText}>
          Administrator access is required to view attendance records.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
          onPress={goToDashboard}
        >
          <Ionicons
            name="arrow-back"
            size={17}
            color={COLORS.textOnPrimary}
          />
          <Text style={styles.primaryButtonText}>Back to Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* FIXED HEADER AND SEARCH */}
      <View style={styles.fixedHeader}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={goToDashboard}
        >
          <View style={styles.backIcon}>
            <Ionicons
              name="arrow-back"
              size={18}
              color={COLORS.textPrimary}
            />
          </View>
          <View>
            <Text style={styles.backText}>Admin Dashboard</Text>
            <Text style={styles.backSubtext}>
              Return to administration
            </Text>
          </View>
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="checkmark-done"
              size={28}
              color={COLORS.textOnPrimary}
            />
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroLabelRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={13}
                color={COLORS.gold}
              />
              <Text style={styles.heroLabel}>
                ADMIN ATTENDANCE MANAGEMENT
              </Text>
            </View>
            <Text style={styles.title}>Attendance Records</Text>
            <Text style={styles.subtitle}>
              View and manage attendance records.
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>{records.length}</Text>
            <Text style={styles.countLabel}>TOTAL</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionText}>
            <Text style={styles.sectionTitle}>
              Attendance Management
            </Text>
            <Text style={styles.sectionSubtitle}>
              {filteredRecords.length}{' '}
              {filteredRecords.length === 1 ? 'record' : 'records'} shown
            </Text>
          </View>

          <View style={styles.adminBadge}>
            <Ionicons
              name="shield-checkmark"
              size={13}
              color={COLORS.gold}
            />
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        </View>

        {loadError && (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={23}
              color={COLORS.danger}
            />
            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>
                Unable to Load Attendance
              </Text>
              <Text style={styles.errorText}>{loadError}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => void loadAttendance()}
              >
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </View>
          </View>
        )}

        {records.length > 0 && (
          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={20}
              color={COLORS.accent}
            />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search student, email, event, or code..."
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              keyboardType="default"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* ONLY THIS AREA SCROLLS */}
      <View style={styles.listArea}>
        <ScrollView
          style={styles.recordsScroll}
          contentContainerStyle={styles.recordsContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
        >
          {!loadError && records.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="clipboard-outline"
                size={38}
                color={COLORS.accent}
              />
              <Text style={styles.emptyTitle}>
                No Attendance Records
              </Text>
              <Text style={styles.emptyText}>
                No attendance has been recorded yet.
              </Text>
              <Pressable
                style={styles.outlineButton}
                onPress={() => void loadAttendance()}
              >
                <Ionicons
                  name="refresh-outline"
                  size={17}
                  color={COLORS.primary}
                />
                <Text style={styles.outlineButtonText}>Try Again</Text>
              </Pressable>
            </View>
          ) : records.length > 0 && filteredRecords.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="search-outline"
                size={38}
                color={COLORS.accent}
              />
              <Text style={styles.emptyTitle}>No Matching Records</Text>
              <Text style={styles.emptyText}>
                No attendance record matches "{search}".
              </Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => setSearch('')}
              >
                <Ionicons
                  name="close"
                  size={17}
                  color={COLORS.textOnPrimary}
                />
                <Text style={styles.primaryButtonText}>Clear Search</Text>
              </Pressable>
            </View>
          ) : (
            filteredRecords.map((item) => {
              const isEditing = editingId === item.id;

              return (
                <View key={item.id} style={styles.recordCard}>
                  {isEditing ? (
                    <>
                      <View style={styles.editHeader}>
                        <Ionicons
                          name="create-outline"
                          size={22}
                          color={COLORS.primary}
                        />
                        <View style={styles.editHeaderText}>
                          <Text style={styles.editTitle}>
                            Edit Attendance
                          </Text>
                          <Text style={styles.editSubtitle}>
                            Update this attendance record.
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.inputLabel}>STUDENT ID</Text>
                      <TextInput
                        style={styles.input}
                        value={editStudentId}
                        onChangeText={setEditStudentId}
                        placeholder="Student UUID"
                        placeholderTextColor={COLORS.textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!saving}
                      />

                      <Text style={styles.inputLabel}>EVENT ID</Text>
                      <TextInput
                        style={styles.input}
                        value={editEventId}
                        onChangeText={setEditEventId}
                        placeholder="Event UUID"
                        placeholderTextColor={COLORS.textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!saving}
                      />

                      <Text style={styles.inputLabel}>SCANNED AT</Text>
                      <TextInput
                        style={styles.input}
                        value={editScannedAt}
                        onChangeText={setEditScannedAt}
                        placeholder="2026-10-08T10:30:00.000Z"
                        placeholderTextColor={COLORS.textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!saving}
                      />

                      <View style={styles.editActions}>
                        <Pressable
                          style={[
                            styles.cancelButton,
                            saving && styles.disabledButton,
                          ]}
                          onPress={cancelEditing}
                          disabled={saving}
                        >
                          <Ionicons
                            name="close"
                            size={17}
                            color={COLORS.textSecondary}
                          />
                          <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>

                        <Pressable
                          style={[
                            styles.saveButton,
                            saving && styles.disabledButton,
                          ]}
                          onPress={() => void saveAttendance(item)}
                          disabled={saving}
                        >
                          {saving ? (
                            <ActivityIndicator
                              size="small"
                              color={COLORS.textOnPrimary}
                            />
                          ) : (
                            <Ionicons
                              name="checkmark"
                              size={17}
                              color={COLORS.textOnPrimary}
                            />
                          )}
                          <Text style={styles.saveText}>
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.recordHeader}>
                        <View style={styles.iconBox}>
                          <Ionicons
                            name="checkmark-circle"
                            size={23}
                            color={COLORS.accent}
                          />
                        </View>
                        <View style={styles.studentInfo}>
                          <Text
                            style={styles.studentName}
                            numberOfLines={2}
                          >
                            {item.studentName}
                          </Text>
                          <Text
                            style={styles.studentEmail}
                            numberOfLines={2}
                          >
                            {item.studentEmail || 'No email'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.divider} />

                      <InfoRow
                        icon="calendar-outline"
                        color={COLORS.accent}
                        label="EVENT"
                        value={item.eventTitle}
                      />
                      <InfoRow
                        icon="qr-code-outline"
                        color={COLORS.primary}
                        label="EVENT CODE"
                        value={item.eventCode || 'N/A'}
                      />
                      <InfoRow
                        icon="time-outline"
                        color={COLORS.warning}
                        label="SCANNED AT"
                        value={formatDateTime(item.scannedAt)}
                      />

                      <View style={styles.statusBadge}>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={15}
                          color={COLORS.accent}
                        />
                        <Text style={styles.statusText}>
                          {item.status.toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.actions}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.editButton,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => startEditing(item)}
                        >
                          <Ionicons
                            name="create-outline"
                            size={17}
                            color={COLORS.primary}
                          />
                          <Text style={styles.editText}>Edit</Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              );
            })
          )}

          {records.length > 0 && (
            <View style={styles.securityCard}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={COLORS.gold}
              />
              <View style={styles.securityContent}>
                <Text style={styles.securityTitle}>
                  Administrator Controls
                </Text>
                <Text style={styles.securityText}>
                  Attendance changes are restricted to authorized
                  administrators.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

type InfoRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  value: string;
};

function InfoRow({ icon, color, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 0,
  },
  fixedHeader: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 22,
    flexShrink: 0,
  },
  listArea: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },
  recordsScroll: {
    flex: 1,
  },
  recordsContent: {
    paddingTop: 10,
    paddingBottom: 48,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 30,
  },
  loadingIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingSpinner: {
    marginTop: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  accessIcon: {
    width: 82,
    height: 82,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  accessTitle: {
    marginTop: 17,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  accessText: {
    marginTop: 7,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
  primaryButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  outlineButton: {
    marginTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  outlineButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  backIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 9,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  backSubtext: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    padding: 18,
    marginBottom: 22,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  heroContent: {
    flex: 1,
    marginLeft: 11,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroLabel: {
    flex: 1,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: COLORS.gold,
    marginLeft: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  countBadge: {
    minWidth: 43,
    height: 45,
    paddingHorizontal: 6,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginLeft: 7,
  },
  countText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  countLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionText: {
    flex: 1,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.gold,
    gap: 5,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.gold,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 12,
    marginBottom: 15,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  recordCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    padding: 18,
    marginBottom: 15,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  studentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  studentEmail: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoIcon: {
    width: 31,
    height: 31,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  infoContent: {
    flex: 1,
    marginLeft: 10,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
  },
  infoValue: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textPrimary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editButton: {
    flex: 1,
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  editText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  editHeaderText: {
    flex: 1,
    marginLeft: 10,
  },
  editTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  editSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 3,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 11,
  },
  editActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 3,
  },
  cancelButton: {
    flex: 1,
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1.35,
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  saveText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 42,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 15,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 15,
    padding: 13,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  errorText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 10,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 5,
    padding: 13,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  securityText: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textSecondary,
  },
});