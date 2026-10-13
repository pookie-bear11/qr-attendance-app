import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getEventsByTeacher, type CloudEvent } from '@/lib/events';
import { getProfile } from '@/lib/profiles';
import { buildQRPayload } from '@/lib/qr';

type Role = 'student' | 'teacher' | 'admin';
type Filter = 'all' | 'upcoming' | 'past';

function formatDate(value: string | null) {
  if (!value) return 'Not set';

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

function isUpcoming(event: CloudEvent) {
  if (!event.start_time) return false;

  return new Date(event.start_time).getTime() >= Date.now();
}

export default function TeacherEventsScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [payload, setPayload] = useState<string | null>(null);
  const [qrEvent, setQrEvent] = useState<CloudEvent | null>(null);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!user?.id) {
        setEvents([]);
        setRole(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage(null);

      try {
        const profile = await getProfile(user.id);
        const currentRole = profile?.role ?? null;

        setRole(currentRole as Role | null);

        if (currentRole !== 'teacher' && currentRole !== 'admin') {
          setEvents([]);
          return;
        }

        const data = await getEventsByTeacher(user.id);
        setEvents(data);
      } catch (error) {
        console.log('TEACHER EVENTS ERROR:', error);
        setErrorMessage('Unable to load your events. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !query ||
        event.title.toLowerCase().includes(query) ||
        event.event_code.toLowerCase().includes(query);

      if (!matchesSearch) return false;
      if (filter === 'upcoming') return isUpcoming(event);
      if (filter === 'past') return !isUpcoming(event);

      return true;
    });
  }, [events, search, filter]);

  const handleShowQR = (event: CloudEvent) => {
    if (event.status === 'closed') return;

    const qrData = {
      eventId: event.event_code,
      title: event.title,
      start: event.start_time ?? '',
      end: event.end_time ?? '',
    };

    setQrEvent(event);
    setPayload(buildQRPayload(qrData));
  };

  const handleCloseQR = () => {
    setPayload(null);
    setQrEvent(null);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingIcon}>
          <Ionicons
            name="calendar-outline"
            size={32}
            color={COLORS.primary}
          />
        </View>

        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={styles.loadingSpinner}
        />

        <Text style={styles.loadingText}>Loading your events...</Text>
      </View>
    );
  }

  if (role !== 'teacher' && role !== 'admin') {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.lockIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={38}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.lockTitle}>Staff Only</Text>

        <Text style={styles.lockSubtitle}>
          Only teacher and administrator accounts can view events.
        </Text>

        <Pressable
          style={styles.backAccessButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Ionicons
            name="arrow-back-outline"
            size={18}
            color={COLORS.textOnPrimary}
          />
          <Text style={styles.backAccessText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* FIXED HEADER */}
      <View style={styles.fixedArea}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.replace('/teacher')}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={COLORS.textPrimary}
            />
          </Pressable>

          <View style={styles.headerText}>
            <View style={styles.sectionLabelRow}>
              <View style={styles.sectionLabelDot} />
              <Text style={styles.sectionLabel}>
                {role === 'admin'
                  ? 'ADMIN EVENT MANAGEMENT'
                  : 'TEACHER PORTAL'}
              </Text>
            </View>

            <Text style={styles.title}>My Events</Text>

            <Text style={styles.subtitle}>
              Manage your events and attendance QR codes.
            </Text>
          </View>
        </View>

        {/* FIXED SEARCH */}
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
            placeholder="Search events or event code..."
            placeholderTextColor={COLORS.textSecondary}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />

          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              style={styles.clearSearchButton}
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={COLORS.textSecondary}
              />
            </Pressable>
          )}
        </View>

        {/* FIXED FILTERS */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>FILTER EVENTS</Text>

          <View style={styles.filterRow}>
            <FilterButton
              label="All"
              active={filter === 'all'}
              onPress={() => setFilter('all')}
            />

            <FilterButton
              label="Upcoming"
              active={filter === 'upcoming'}
              onPress={() => setFilter('upcoming')}
            />

            <FilterButton
              label="Past"
              active={filter === 'past'}
              onPress={() => setFilter('past')}
            />
          </View>
        </View>

        {/* FIXED EVENT COUNT - NO REFRESH BUTTON */}
        <View style={styles.countRow}>
          <View>
            <Text style={styles.countNumber}>
              {filteredEvents.length}
            </Text>

            <Text style={styles.countText}>
              {filteredEvents.length === 1 ? 'event found' : 'events found'}
            </Text>
          </View>

          <Text style={styles.pullHint}>
            <Ionicons name="arrow-down-outline" size={13} color={COLORS.textSecondary} />
            {' '}Pull down to refresh
          </Text>
        </View>
      </View>

      {/* ONLY THE EVENT LIST SCROLLS */}
      <ScrollView
        style={styles.eventScroll}
        contentContainerStyle={styles.eventScrollContent}
        showsVerticalScrollIndicator
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {errorMessage ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="cloud-offline-outline"
                size={30}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>Unable to load events</Text>
            <Text style={styles.emptyText}>{errorMessage}</Text>

            <Pressable
              style={styles.createEventButton}
              onPress={() => loadData()}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={COLORS.textOnPrimary}
              />
              <Text style={styles.createEventText}>Try Again</Text>
            </Pressable>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={search ? 'search-outline' : 'calendar-outline'}
                size={30}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {search ? 'No matching events' : 'No events found'}
            </Text>

            <Text style={styles.emptyText}>
              {search
                ? 'Try a different event name or code.'
                : 'Create an event from the Teacher dashboard.'}
            </Text>

            {!search && (
              <Pressable
                style={styles.createEventButton}
                onPress={() => router.replace('/teacher')}
              >
                <Ionicons
                  name="add-outline"
                  size={18}
                  color={COLORS.textOnPrimary}
                />
                <Text style={styles.createEventText}>Create Event</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.eventList}>
            {filteredEvents.map((event) => {
              const upcoming = isUpcoming(event);

              return (
                <View key={event.id} style={styles.eventCard}>
                  <View style={styles.eventTop}>
                    <View style={styles.eventIcon}>
                      <Ionicons
                        name="calendar-outline"
                        size={23}
                        color={COLORS.accent}
                      />
                    </View>

                    <View style={styles.eventMain}>
                      <View style={styles.statusRow}>
                        <View
                          style={[
                            styles.statusDot,
                            upcoming ? styles.upcomingDot : styles.pastDot,
                          ]}
                        />

                        <Text
                          style={[
                            styles.statusText,
                            upcoming ? styles.upcomingText : styles.pastText,
                          ]}
                        >
                          {event.status === 'closed'
                            ? 'CLOSED'
                            : upcoming
                              ? 'UPCOMING'
                              : 'PAST'}
                        </Text>
                      </View>

                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {event.title}
                      </Text>

                      <View style={styles.codeRow}>
                        <Ionicons
                          name="qr-code-outline"
                          size={14}
                          color={COLORS.textSecondary}
                        />
                        <Text style={styles.eventCode}>
                          {event.event_code}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.infoContainer}>
                    <View style={styles.infoRow}>
                      <View style={styles.infoIcon}>
                        <Ionicons
                          name="play-circle-outline"
                          size={17}
                          color={COLORS.accent}
                        />
                      </View>

                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>START</Text>
                        <Text style={styles.infoText}>
                          {formatDate(event.start_time)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoRow}>
                      <View style={styles.infoIcon}>
                        <Ionicons
                          name="stop-circle-outline"
                          size={17}
                          color={COLORS.orange}
                        />
                      </View>

                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>END</Text>
                        <Text style={styles.infoText}>
                          {formatDate(event.end_time)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.showQRButton,
                      pressed && styles.showQRPressed,
                      event.status === 'closed' && styles.showQRDisabled,
                    ]}
                    onPress={() => handleShowQR(event)}
                    disabled={event.status === 'closed'}
                  >
                    <View style={styles.qrButtonIcon}>
                      <Ionicons
                        name="qr-code-outline"
                        size={18}
                        color={COLORS.textOnPrimary}
                      />
                    </View>

                    <Text style={styles.showQRText}>
                      {event.status === 'closed' ? 'Event Closed' : 'Show QR Code'}
                    </Text>

                    {event.status !== 'closed' && (
                      <Ionicons
                        name="chevron-forward"
                        size={17}
                        color={COLORS.textOnPrimary}
                      />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerTitle}>QRPass</Text>
          <Text style={styles.footerText}>
            Manage your events. Make attendance easier.
          </Text>
        </View>
      </ScrollView>

      {/* QR CODE MODAL */}
      <Modal
        visible={!!payload}
        transparent
        animationType="fade"
        onRequestClose={handleCloseQR}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIcon}>
                  <Ionicons
                    name="qr-code-outline"
                    size={23}
                    color={COLORS.accent}
                  />
                </View>

                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Event QR Code</Text>
                  <Text
                    style={styles.modalSubtitle}
                    numberOfLines={1}
                  >
                    {qrEvent?.title ?? 'Event'}
                  </Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}
                onPress={handleCloseQR}
              >
                <Ionicons
                  name="close"
                  size={23}
                  color={COLORS.textPrimary}
                />
              </Pressable>
            </View>

            <View style={styles.modalCodeBox}>
              <Ionicons
                name="key-outline"
                size={15}
                color={COLORS.accent}
              />
              <Text style={styles.modalCode}>
                {qrEvent?.event_code ?? ''}
              </Text>
            </View>

            <View style={styles.qrBoxOuter}>
              <View style={styles.qrBox}>
                {payload && <QRCode value={payload} size={230} />}
              </View>
            </View>

            <View style={styles.qrInfoCard}>
              <View style={styles.qrInfoIcon}>
                <Ionicons
                  name="scan-outline"
                  size={19}
                  color={COLORS.accent}
                />
              </View>

              <View style={styles.qrInfoTextContainer}>
                <Text style={styles.qrInfoTitle}>Ready to Scan</Text>
                <Text style={styles.qrInfoText}>
                  Students can scan this QR using the Scan tab to record
                  attendance.
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.closeQRButton,
                pressed && styles.showQRPressed,
              ]}
              onPress={handleCloseQR}
            >
              <Ionicons
                name="close-circle-outline"
                size={19}
                color={COLORS.textOnPrimary}
              />
              <Text style={styles.closeQRText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type FilterButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function FilterButton({
  label,
  active,
  onPress,
}: FilterButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.filterButton,
        active && styles.filterButtonActive,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterText,
          active && styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fixedArea: {
    flexShrink: 0,
    paddingHorizontal: 22,
    paddingTop: 21,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
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
    width: 84,
    height: 84,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  lockSubtitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  backAccessButton: {
    marginTop: 20,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backAccessText: {
    marginLeft: 7,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 19,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionLabelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginRight: 6,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: COLORS.accent,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  searchBox: {
    minHeight: 48,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 9,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  clearSearchButton: {
    padding: 5,
  },
  filterSection: {
    marginTop: 17,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 9,
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.textOnPrimary,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 12,
  },
  countNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  countText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  pullHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  eventScroll: {
    flex: 1,
    minHeight: 0,
  },
  eventScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 24,
  },
  eventList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.16)',
  },
  eventTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eventIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  eventMain: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  upcomingDot: {
    backgroundColor: COLORS.success,
  },
  pastDot: {
    backgroundColor: COLORS.textSecondary,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  upcomingText: {
    color: COLORS.success,
  },
  pastText: {
    color: COLORS.textSecondary,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 21,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  eventCode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 5,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textPrimary,
  },
  showQRButton: {
    marginTop: 14,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
  },
  showQRDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.7,
  },
  qrButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  showQRText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 30,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  createEventButton: {
    marginTop: 17,
    height: 43,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createEventText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 10,
  },
  footerLine: {
    width: 35,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginBottom: 10,
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: COLORS.textPrimary,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 10, 18, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  modalIcon: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderText: {
    flex: 1,
    marginLeft: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCodeBox: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    marginBottom: 16,
  },
  modalCode: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  qrBoxOuter: {
    alignSelf: 'center',
    padding: 3,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
  },
  qrInfoCard: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrInfoTextContainer: {
    flex: 1,
    marginLeft: 9,
  },
  qrInfoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  qrInfoText: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  closeQRButton: {
    marginTop: 15,
    height: 45,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeQRText: {
    marginLeft: 7,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },
  pressed: {
    opacity: 0.72,
  },
  showQRPressed: {
    opacity: 0.78,
  },
});