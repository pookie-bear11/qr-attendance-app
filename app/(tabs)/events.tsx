
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
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { getAllEvents, type CloudEvent } from '@/lib/events';

export default function EventsScreen() {
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [search, setSearch] = useState('');

  const loadEvents = useCallback(async () => {
    setErrorMessage(null);

    try {
      const result = await getAllEvents();
      setEvents(result);
    } catch (error) {
      console.log('EVENTS SCREEN ERROR:', error);
      setErrorMessage('Unable to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadEvents();
    } finally {
      setRefreshing(false);
    }
  }, [loadEvents]);

  const now = new Date();

  const upcomingEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            !event.start_time || new Date(event.start_time) >= now
        )
        .sort((a, b) => {
          if (!a.start_time) return 1;
          if (!b.start_time) return -1;
          return (
            new Date(a.start_time).getTime() -
            new Date(b.start_time).getTime()
          );
        }),
    [events]
  );

  const pastEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            event.start_time && new Date(event.start_time) < now
        )
        .sort((a, b) => {
          if (!a.start_time) return 1;
          if (!b.start_time) return -1;
          return (
            new Date(b.start_time).getTime() -
            new Date(a.start_time).getTime()
          );
        }),
    [events]
  );

  const displayedEvents = useMemo(() => {
    const source = showPast ? pastEvents : upcomingEvents;
    const query = search.trim().toLowerCase();

    if (!query) return source;

    return source.filter(
      (event) =>
        event.title.toLowerCase().includes(query) ||
        event.event_code.toLowerCase().includes(query)
    );
  }, [showPast, search, pastEvents, upcomingEvents]);

  return (
    <View style={styles.container}>
      {/* FIXED AREA: dili apil sa scrolling */}
      <View style={styles.fixedArea}>
        <View style={styles.header}>
          <Header title="QRPass" />
        </View>

        <View style={styles.intro}>
          <View style={styles.eyebrow}>
            <Ionicons
              name="calendar-outline"
              size={15}
              color={COLORS.accent}
            />
            <Text style={styles.eyebrowText}>CAMPUS ACTIVITIES</Text>
          </View>

          <Text style={styles.title}>
            School <Text style={styles.titleAccent}>Events.</Text>
          </Text>

          <Text style={styles.subtitle}>
            Find your next school activity and check its schedule.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="calendar"
              size={25}
              color={COLORS.accent}
            />
          </View>

          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>TOTAL EVENTS</Text>
            <Text style={styles.summaryNumber}>{events.length}</Text>
            <Text style={styles.summaryCaption}>
              Events available in QRPass
            </Text>
          </View>

          <Ionicons
            name="qr-code-outline"
            size={48}
            color={COLORS.accent}
          />
        </View>

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

        <View style={styles.filterHeader}>
          <Text style={styles.sectionTitle}>Browse Events</Text>
          <Text style={styles.filterHint}>SELECT PERIOD</Text>
        </View>

        <View style={styles.filterContainer}>
          <Pressable
            style={[
              styles.filterButton,
              !showPast && styles.filterButtonActive,
            ]}
            onPress={() => setShowPast(false)}
          >
            <Ionicons
              name="calendar-outline"
              size={17}
              color={
                !showPast
                  ? COLORS.textOnPrimary
                  : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.filterText,
                !showPast && styles.filterTextActive,
              ]}
            >
              Upcoming
            </Text>
            <View
              style={[
                styles.filterCount,
                !showPast && styles.filterCountActive,
              ]}
            >
              <Text
                style={[
                  styles.filterCountText,
                  !showPast && styles.filterCountTextActive,
                ]}
              >
                {upcomingEvents.length}
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              showPast && styles.filterButtonActive,
            ]}
            onPress={() => setShowPast(true)}
          >
            <Ionicons
              name="time-outline"
              size={17}
              color={
                showPast
                  ? COLORS.textOnPrimary
                  : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.filterText,
                showPast && styles.filterTextActive,
              ]}
            >
              Past
            </Text>
            <View
              style={[
                styles.filterCount,
                showPast && styles.filterCountActive,
              ]}
            >
              <Text
                style={[
                  styles.filterCountText,
                  showPast && styles.filterCountTextActive,
                ]}
              >
                {pastEvents.length}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {showPast ? 'Previous Events' : 'Upcoming Events'}
          </Text>
          <Text style={styles.listCount}>
            {displayedEvents.length} found
          </Text>
        </View>
      </View>

      {/* ONLY THIS AREA SCROLLS */}
      <ScrollView
        style={styles.eventScroll}
        contentContainerStyle={styles.eventScrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.stateTitle}>Loading events...</Text>
            <Text style={styles.stateDescription}>
              Please wait while we get the latest events.
            </Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons
                name="cloud-offline-outline"
                size={30}
                color={COLORS.danger}
              />
            </View>
            <Text style={styles.stateTitle}>Unable to load events</Text>
            <Text style={styles.stateDescription}>
              {errorMessage}
            </Text>
            <Pressable
              style={styles.retryButton}
              onPress={loadEvents}
            >
              <Ionicons
                name="refresh-outline"
                size={17}
                color={COLORS.textOnPrimary}
              />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : displayedEvents.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons
                name={
                  search
                    ? 'search-outline'
                    : showPast
                      ? 'time-outline'
                      : 'calendar-outline'
                }
                size={30}
                color={COLORS.accent}
              />
            </View>
            <Text style={styles.stateTitle}>
              {search
                ? 'No matching events'
                : showPast
                  ? 'No past events'
                  : 'No upcoming events'}
            </Text>
            <Text style={styles.stateDescription}>
              {search
                ? 'Try searching with another event name or code.'
                : showPast
                  ? 'Previous school events will appear here.'
                  : 'New school events will appear here when available.'}
            </Text>
            {search.length > 0 && (
              <Pressable
                style={styles.clearSearchButton}
                onPress={() => setSearch('')}
              >
                <Text style={styles.clearSearchText}>
                  Clear Search
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.eventList}>
            {displayedEvents.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventCardTop}>
                  <View
                    style={[
                      styles.eventIcon,
                      showPast && styles.pastEventIcon,
                    ]}
                  >
                    <Ionicons
                      name={
                        showPast
                          ? 'checkmark-circle-outline'
                          : 'calendar-outline'
                      }
                      size={25}
                      color={
                        showPast
                          ? COLORS.textSecondary
                          : COLORS.accent
                      }
                    />
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      showPast
                        ? styles.pastBadge
                        : styles.upcomingBadge,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        showPast
                          ? styles.pastDot
                          : styles.upcomingDot,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        showPast
                          ? styles.pastText
                          : styles.upcomingText,
                      ]}
                    >
                      {event.status === 'closed'
                        ? 'CLOSED'
                        : showPast
                          ? 'PAST EVENT'
                          : 'UPCOMING'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.eventTitle} numberOfLines={3}>
                  {event.title}
                </Text>

                <View style={styles.eventCode}>
                  <Ionicons
                    name="qr-code-outline"
                    size={15}
                    color={COLORS.accent}
                  />
                  <Text style={styles.eventCodeText}>
                    {event.event_code}
                  </Text>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.dateRow}>
                  <View style={styles.dateIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={17}
                      color={COLORS.textSecondary}
                    />
                  </View>
                  <View style={styles.dateInfo}>
                    <Text style={styles.dateLabel}>START DATE</Text>
                    <Text style={styles.dateValue}>
                      {formatEventDate(event.start_time)}
                    </Text>
                  </View>
                </View>

                {event.end_time && (
                  <View style={styles.dateRow}>
                    <View style={styles.dateIcon}>
                      <Ionicons
                        name="time-outline"
                        size={17}
                        color={COLORS.textSecondary}
                      />
                    </View>
                    <View style={styles.dateInfo}>
                      <Text style={styles.dateLabel}>END DATE</Text>
                      <Text style={styles.dateValue}>
                        {formatEventDate(event.end_time)}
                      </Text>
                    </View>
                  </View>
                )}

                {event.venue && (
                  <View style={styles.dateRow}>
                    <View style={styles.dateIcon}>
                      <Ionicons
                        name="location-outline"
                        size={17}
                        color={COLORS.textSecondary}
                      />
                    </View>
                    <View style={styles.dateInfo}>
                      <Text style={styles.dateLabel}>VENUE</Text>
                      <Text style={styles.dateValue}>{event.venue}</Text>
                    </View>
                  </View>
                )}

                {event.description && (
                  <View style={styles.dateRow}>
                    <View style={styles.dateIcon}>
                      <Ionicons
                        name="document-text-outline"
                        size={17}
                        color={COLORS.textSecondary}
                      />
                    </View>
                    <View style={styles.dateInfo}>
                      <Text style={styles.dateLabel}>DESCRIPTION</Text>
                      <Text style={styles.dateValue}>{event.description}</Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerTitle}>QRPass</Text>
          <Text style={styles.footerText}>
            Stay updated. Never miss an event.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function formatEventDate(value: string | null): string {
  if (!value) return 'Schedule not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-US', {
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
  },
  fixedArea: {
    flexShrink: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 13,
  },
  intro: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 21,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: COLORS.accent,
  },
  title: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  titleAccent: {
    color: COLORS.accent,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 18,
    padding: 16,
    borderRadius: 19,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  summaryIcon: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
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
    fontSize: 27,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  summaryCaption: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  searchContainer: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  filterHint: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.textSecondary,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 7,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.textOnPrimary,
  },
  filterCount: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  filterCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  filterCountTextActive: {
    color: COLORS.textOnPrimary,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  listCount: {
    flexShrink: 0,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  eventScroll: {
    flex: 1,
    minHeight: 0,
  },
  eventScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  eventList: {
    gap: 12,
  },
  eventCard: {
    padding: 18,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.16)',
  },
  eventCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  },
  pastEventIcon: {
    opacity: 0.8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  upcomingBadge: {
    backgroundColor: 'rgba(22,140,255,0.12)',
  },
  pastBadge: {
    backgroundColor: COLORS.surface,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  upcomingDot: {
    backgroundColor: COLORS.accent,
  },
  pastDot: {
    backgroundColor: COLORS.textSecondary,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  upcomingText: {
    color: COLORS.accent,
  },
  pastText: {
    color: COLORS.textSecondary,
  },
  eventTitle: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 9,
  },
  eventCode: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
  },
  eventCodeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: COLORS.accent,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 13,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },
  dateIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginRight: 9,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 31,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stateIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 8,
  },
  stateDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },
  clearSearchButton: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearSearchText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accent,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 25,
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
  },
});