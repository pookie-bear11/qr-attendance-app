
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
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
import {
  getAllEvents,
  updateEvent,
  type CloudEvent,
} from '@/lib/events';
import { getProfile, type Role } from '@/lib/profiles';

export default function AdminEventsScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const loadEvents = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setLoadError(null);

      try {
        if (!user) {
          setRole(null);
          setEvents([]);
          return;
        }

        const profile = await getProfile(user.id);
        setRole(profile?.role ?? null);

        if (profile?.role !== 'admin') {
          setEvents([]);
          return;
        }

        setEvents(await getAllEvents());
      } catch (error) {
        console.error('ADMIN EVENTS LOAD ERROR:', error);
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
      void loadEvents();
    }, [loadEvents])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadEvents(false);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return events;

    return events.filter(
      event =>
        event.title.toLowerCase().includes(query) ||
        event.event_code.toLowerCase().includes(query)
    );
  }, [events, search]);

  const goToDashboard = () => router.replace('/(tabs)/admin');

  const startEditing = (event: CloudEvent) => {
    if (saving || closingId) return;
    setEditingId(event.id);
    setEditTitle(event.title);
    setEditCode(event.event_code);
    setEditVenue(event.venue ?? '');
    setEditDescription(event.description ?? '');
    setEditStartTime(event.start_time ?? '');
    setEditEndTime(event.end_time ?? '');
  };

  const cancelEditing = () => {
    if (saving) return;
    setEditingId(null);
    setEditTitle('');
    setEditCode('');
    setEditVenue('');
    setEditDescription('');
    setEditStartTime('');
    setEditEndTime('');
  };

  const saveEvent = async (eventId: string) => {
    if (saving || closingId) return;

    const title = editTitle.trim();
    const code = editCode.trim();
    const startTime = new Date(editStartTime);
    const endTime = new Date(editEndTime);

    if (!title || !code || !editStartTime.trim() || !editEndTime.trim()) {
      Alert.alert(
        'Missing Information',
        'Please enter the event name, event code, start time, and end time.'
      );
      return;
    }

    if (
      Number.isNaN(startTime.getTime()) ||
      Number.isNaN(endTime.getTime()) ||
      endTime.getTime() <= startTime.getTime()
    ) {
      Alert.alert(
        'Invalid Schedule',
        'Enter valid ISO date/time values and make sure the end is after the start.'
      );
      return;
    }

    setSaving(true);

    try {
      const result = await updateEvent(eventId, {
        title,
        event_code: code,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        venue: editVenue.trim() || null,
        description: editDescription.trim() || null,
      });

      if (result.error) {
        Alert.alert('Update Failed', result.error);
        return;
      }

      setEvents(current =>
        current.map(event =>
          event.id === eventId
            ? {
                ...event,
                title,
                event_code: code,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                venue: editVenue.trim() || null,
                description: editDescription.trim() || null,
              }
            : event
        )
      );

      setEditingId(null);
      setEditTitle('');
      setEditCode('');
      setEditVenue('');
      setEditDescription('');
      setEditStartTime('');
      setEditEndTime('');
      Alert.alert('Success', 'Event updated successfully.');
    } catch (error) {
      console.error('ADMIN EVENT UPDATE ERROR:', error);
      Alert.alert(
        'Update Failed',
        error instanceof Error
          ? error.message
          : 'Unable to update this event. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (event: CloudEvent) => {
    if (closingId || saving || event.status === 'closed') return;
    setClosingId(event.id);

    try {
      const result = await updateEvent(event.id, { status: 'closed' });

      if (result.error) {
        Alert.alert('Unable to Close Event', result.error);
        return;
      }

      setEvents(current =>
        current.map(item =>
          item.id === event.id ? { ...item, status: 'closed' } : item
        )
      );
      Alert.alert('Event Closed', 'This event will no longer accept attendance.');
    } catch (error) {
      console.error('ADMIN EVENT CLOSE ERROR:', error);
      Alert.alert(
        'Unable to Close Event',
        error instanceof Error
          ? error.message
          : 'Unable to close this event. Please try again.'
      );
    } finally {
      setClosingId(null);
    }
  };

  const confirmClose = (event: CloudEvent) => {
    if (closingId || saving || event.status === 'closed') return;

    Alert.alert('Close Event', `Close "${event.title}"? Students will no longer be able to record attendance.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close Event',
        style: 'destructive',
        onPress: () => void handleClose(event),
      },
    ]);
  };

  const formatDate = (value: string | null) => {
    if (!value) return 'Not set';

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

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingIcon}>
          <Ionicons name="calendar-outline" size={32} color={COLORS.primary} />
        </View>
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={styles.loadingSpinner}
        />
        <Text style={styles.loadingText}>Loading events...</Text>
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
          Administrator access is required to manage events.
        </Text>
        <Pressable style={styles.primaryButton} onPress={goToDashboard}>
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
      {/* FIXED HEADER: does not scroll with the event records */}
      <View style={styles.fixedHeader}>
        <Pressable style={styles.backButton} onPress={goToDashboard}>
          <View style={styles.backIcon}>
            <Ionicons
              name="arrow-back"
              size={18}
              color={COLORS.textPrimary}
            />
          </View>
          <View>
            <Text style={styles.backText}>Admin Dashboard</Text>
            <Text style={styles.backSubtext}>Return to administration</Text>
          </View>
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="calendar"
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
              <Text style={styles.heroLabel}>ADMIN EVENT MANAGEMENT</Text>
            </View>
            <Text style={styles.title}>Manage Events</Text>
            <Text style={styles.subtitle}>
              View and edit events, or close them without deleting attendance records.
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{events.length}</Text>
            <Text style={styles.countLabel}>TOTAL</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionText}>
            <Text style={styles.sectionTitle}>Event Management</Text>
            <Text style={styles.sectionSubtitle}>
              {filteredEvents.length}{' '}
              {filteredEvents.length === 1 ? 'event' : 'events'} shown
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

        {events.length > 0 && (
          <View style={styles.searchBox}>
            <View style={styles.searchIconContainer}>
              <Ionicons
                name="search-outline"
                size={19}
                color={COLORS.accent}
              />
            </View>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search event name or code..."
              placeholderTextColor={COLORS.textSecondary}
              autoCorrect={false}
              spellCheck={false}
              autoCapitalize="none"
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

        {loadError && (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color={COLORS.danger}
            />
            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>Unable to Load Events</Text>
              <Text style={styles.errorText}>{loadError}</Text>
              <Pressable
                onPress={() => void loadEvents()}
                style={styles.retryButton}
                disabled={loading}
              >
                <Ionicons
                  name="refresh-outline"
                  size={15}
                  color={COLORS.primary}
                />
                <Text style={styles.retryText}>
                  {loading ? 'Retrying...' : 'Try Again'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* ONLY THIS AREA SCROLLS */}
      <ScrollView
        style={styles.recordsScroll}
        contentContainerStyle={styles.recordsContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        nestedScrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {events.length === 0 && !loadError ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-outline"
                size={34}
                color={COLORS.accent}
              />
            </View>
            <Text style={styles.emptyTitle}>No Events Found</Text>
            <Text style={styles.emptyText}>
              There are currently no events in the system.
            </Text>
            <Pressable
              style={styles.outlineButton}
              onPress={() => router.replace('/(tabs)/teacher')}
            >
              <Ionicons name="add" size={17} color={COLORS.primary} />
              <Text style={styles.outlineButtonText}>Create an Event</Text>
            </Pressable>
          </View>
        ) : events.length > 0 && filteredEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="search-outline"
                size={34}
                color={COLORS.accent}
              />
            </View>
            <Text style={styles.emptyTitle}>No Matching Events</Text>
            <Text style={styles.emptyText}>
              No event name or code matches "{search}".
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => setSearch('')}
            >
              <Ionicons
                name="close"
                size={16}
                color={COLORS.textOnPrimary}
              />
              <Text style={styles.primaryButtonText}>Clear Search</Text>
            </Pressable>
          </View>
        ) : (
          filteredEvents.map(event => {
            const isEditing = editingId === event.id;
            const isClosing = closingId === event.id;

            return (
              <View key={event.id} style={styles.eventCard}>
                {isEditing ? (
                  <>
                    <View style={styles.editHeader}>
                      <View style={styles.editIcon}>
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color={COLORS.primary}
                        />
                      </View>
                      <View style={styles.editHeaderText}>
                        <Text style={styles.editTitle}>Edit Event</Text>
                        <Text style={styles.editSubtitle}>
                          Update the event information below.
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>EVENT NAME</Text>
                    <TextInput
                      style={styles.input}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      placeholder="Event name"
                      placeholderTextColor={COLORS.textSecondary}
                      editable={!saving}
                      autoCorrect={false}
                    />

                    <Text style={styles.inputLabel}>EVENT CODE</Text>
                    <TextInput
                      style={styles.input}
                      value={editCode}
                      onChangeText={setEditCode}
                      placeholder="Event code"
                      placeholderTextColor={COLORS.textSecondary}
                      editable={!saving}
                      autoCorrect={false}
                      autoCapitalize="characters"
                    />

                    <Text style={styles.inputLabel}>START DATE/TIME (ISO 8601)</Text>
                    <TextInput
                      style={styles.input}
                      value={editStartTime}
                      onChangeText={setEditStartTime}
                      placeholder="2026-10-13T09:00:00+08:00"
                      placeholderTextColor={COLORS.textSecondary}
                      editable={!saving}
                      autoCapitalize="none"
                    />

                    <Text style={styles.inputLabel}>END DATE/TIME (ISO 8601)</Text>
                    <TextInput
                      style={styles.input}
                      value={editEndTime}
                      onChangeText={setEditEndTime}
                      placeholder="2026-10-13T10:00:00+08:00"
                      placeholderTextColor={COLORS.textSecondary}
                      editable={!saving}
                      autoCapitalize="none"
                    />

                    <Text style={styles.inputLabel}>VENUE</Text>
                    <TextInput
                      style={styles.input}
                      value={editVenue}
                      onChangeText={setEditVenue}
                      placeholder="Event venue"
                      placeholderTextColor={COLORS.textSecondary}
                      editable={!saving}
                    />

                    <Text style={styles.inputLabel}>DESCRIPTION</Text>
                    <TextInput
                      style={[styles.input, styles.descriptionInput]}
                      value={editDescription}
                      onChangeText={setEditDescription}
                      placeholder="Event description"
                      placeholderTextColor={COLORS.textSecondary}
                      editable={!saving}
                      multiline
                      textAlignVertical="top"
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
                        onPress={() => void saveEvent(event.id)}
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
                    <View style={styles.eventHeader}>
                      <View style={styles.eventIcon}>
                        <Ionicons
                          name="calendar"
                          size={22}
                          color={COLORS.accent}
                        />
                      </View>
                      <View style={styles.eventInfo}>
                        <Text
                          style={styles.eventTitle}
                          numberOfLines={2}
                        >
                          {event.title}
                        </Text>
                        <View style={styles.codeRow}>
                          <Ionicons
                            name="qr-code-outline"
                            size={13}
                            color={COLORS.primary}
                          />
                          <Text style={styles.eventCode}>
                            {event.event_code}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.detailsBox}>
                      <DetailRow
                        icon={event.status === 'closed' ? 'lock-closed-outline' : 'lock-open-outline'}
                        color={event.status === 'closed' ? COLORS.danger : COLORS.success}
                        label="STATUS"
                        value={event.status === 'closed' ? 'Closed' : 'Open'}
                      />
                      <View style={styles.detailDivider} />
                      <DetailRow
                        icon="location-outline"
                        color={COLORS.accent}
                        label="VENUE"
                        value={event.venue || 'Not specified'}
                      />
                      <View style={styles.detailDivider} />
                      <DetailRow
                        icon="document-text-outline"
                        color={COLORS.accent}
                        label="DESCRIPTION"
                        value={event.description || 'No description'}
                      />
                      <View style={styles.detailDivider} />
                      <DetailRow
                        icon="play-outline"
                        color={COLORS.accent}
                        label="START"
                        value={formatDate(event.start_time)}
                      />
                      <View style={styles.detailDivider} />
                      <DetailRow
                        icon="stop-outline"
                        color={COLORS.warning}
                        label="END"
                        value={formatDate(event.end_time)}
                      />
                      <View style={styles.detailDivider} />
                      <DetailRow
                        icon="time-outline"
                        color={COLORS.accent}
                        label="CREATED"
                        value={formatDate(event.created_at)}
                      />
                    </View>

                    <View style={styles.actions}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.editButton,
                          pressed && styles.pressedEditButton,
                          (isClosing || !!closingId || saving) &&
                            styles.disabledButton,
                        ]}
                        onPress={() => startEditing(event)}
                        disabled={!!closingId || saving}
                      >
                        <Ionicons
                          name="create-outline"
                          size={17}
                          color={COLORS.primary}
                        />
                        <Text style={styles.editText}>Edit Event</Text>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [
                          styles.closeButton,
                          pressed && styles.pressedCloseButton,
                          (isClosing || !!closingId || saving ||
                            event.status === 'closed') &&
                            styles.disabledButton,
                        ]}
                        onPress={() => confirmClose(event)}
                        disabled={!!closingId || saving || event.status === 'closed'}
                      >
                        {isClosing ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.danger}
                          />
                        ) : (
                          <Ionicons
                            name="lock-closed-outline"
                            size={17}
                            color={event.status === 'closed' ? COLORS.textSecondary : COLORS.danger}
                          />
                        )}
                        <Text style={styles.closeText}>
                          {isClosing ? 'Closing...' : event.status === 'closed' ? 'Closed' : 'Close Event'}
                        </Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            );
          })
        )}

        {events.length > 0 && (
          <View style={styles.securityCard}>
            <View style={styles.securityIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={COLORS.gold}
              />
            </View>
            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>
                Administrator Controls
              </Text>
              <Text style={styles.securityText}>
                Event changes are restricted to authorized administrators.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

type DetailRowProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  value: string;
};

function DetailRow({ icon, color, label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailText}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 10,
  },
  fixedHeader: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  recordsScroll: {
    flex: 1,
  },
  recordsContent: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: 22,
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
  loadingSpinner: { marginTop: 16 },
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 14,
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
  heroContent: { flex: 1, marginLeft: 11 },
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
  sectionText: { flex: 1, marginRight: 8 },
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
    letterSpacing: 0.8,
    color: COLORS.gold,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 13,
    marginBottom: 8,
  },
  searchIconContainer: {
    width: 35,
    height: 35,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  searchInput: {
    flex: 1,
    height: 48,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    padding: 18,
    marginBottom: 15,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eventInfo: { flex: 1, marginLeft: 12 },
  eventTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 5,
  },
  eventCode: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  detailsBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },
  detailIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  detailContent: { flex: 1, marginLeft: 9 },
  detailLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
  },
  detailText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textPrimary,
  },
  detailDivider: { height: 1, backgroundColor: COLORS.border },
  actions: { flexDirection: 'row', gap: 9, marginTop: 14 },
  editButton: {
    flex: 1,
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
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
  closeButton: {
    flex: 1,
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.surface,
  },
  closeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.danger,
  },
  pressedEditButton: {
    opacity: 0.7,
    backgroundColor: COLORS.surface,
  },
  pressedCloseButton: {
    opacity: 0.7,
    backgroundColor: COLORS.surface,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },
  editIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editHeaderText: { flex: 1, marginLeft: 10 },
  editTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  editSubtitle: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
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
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 11,
  },
  editActions: { flexDirection: 'row', gap: 9, marginTop: 3 },
  cancelButton: {
    flex: 1,
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
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
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  saveText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },
  disabledButton: { opacity: 0.5 },
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
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    marginBottom: 10,
    padding: 13,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  errorContent: { flex: 1 },
  errorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  descriptionInput: {
    minHeight: 88,
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
  securityIcon: {
    width: 39,
    height: 39,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  securityContent: { flex: 1 },
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