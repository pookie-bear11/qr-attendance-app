
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
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

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getAllProfiles, getProfile, type Role } from '@/lib/profiles';

export default function AdminUsersScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);

  const loadUsers = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setError(null);

      try {
        if (!user) {
          setRole(null);
          setStudentCount(0);
          setTeacherCount(0);
          setAdminCount(0);
          return;
        }

        const currentProfile = await getProfile(user.id);
        const currentRole = currentProfile?.role ?? null;

        setRole(currentRole);

        if (currentRole !== 'admin') {
          setStudentCount(0);
          setTeacherCount(0);
          setAdminCount(0);
          return;
        }

        const profiles = await getAllProfiles();

        setStudentCount(
          profiles.filter((item) => item.role === 'student').length
        );
        setTeacherCount(
          profiles.filter((item) => item.role === 'teacher').length
        );
        setAdminCount(
          profiles.filter((item) => item.role === 'admin').length
        );
      } catch (err) {
        console.error('Failed to load admin users:', err);
        setError(
          'Unable to load user accounts. Check your connection and try again.'
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
      void loadUsers();
    }, [loadUsers])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers(false);
  };

  const handleRetry = () => {
    void loadUsers();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <View style={styles.loadingIcon}>
            <Ionicons
              name="people-outline"
              size={32}
              color={COLORS.primary}
            />
          </View>
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={styles.loadingSpinner}
          />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </View>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <View style={styles.accessIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={34}
              color={COLORS.danger}
            />
          </View>
          <Text style={styles.accessTitle}>Access Denied</Text>
          <Text style={styles.accessText}>
            Administrator access is required to manage users.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.backButtonLarge,
              pressed && styles.pressed,
            ]}
            onPress={() => router.replace('/admin')}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color={COLORS.textOnPrimary}
            />
            <Text style={styles.backButtonText}>Back to Admin</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed header area: this part does not scroll */}
      <View style={styles.fixedHeader}>
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

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="people"
              size={27}
              color={COLORS.textOnPrimary}
            />
          </View>

          <View style={styles.headerText}>
            <View style={styles.labelRow}>
              <View style={styles.labelDot} />
              <Text style={styles.headerLabel}>USER MANAGEMENT</Text>
            </View>
            <Text style={styles.title}>Manage Users</Text>
            <Text style={styles.subtitle}>
              Manage student, teacher, and administrator accounts.
            </Text>
          </View>
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewIcon}>
            <Ionicons
              name="people-outline"
              size={23}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.overviewContent}>
            <Text style={styles.overviewLabel}>REGISTERED USERS</Text>
            <Text style={styles.overviewValue}>
              {studentCount + teacherCount + adminCount}
            </Text>
            <Text style={styles.overviewText}>
              Total accounts currently registered in QRPass
            </Text>
          </View>
        </View>
      </View>

      {/* Only this content area scrolls */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {error && (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={23}
                color={COLORS.danger}
              />
            </View>

            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>Unable to Load Users</Text>
              <Text style={styles.errorText}>{error}</Text>

              <Pressable
                onPress={handleRetry}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color={COLORS.textOnPrimary}
                />
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>User Categories</Text>
            <Text style={styles.sectionSubtitle}>
              Select a category to manage accounts
            </Text>
          </View>
          <View style={styles.sectionAccent} />
        </View>

        <UserCategoryCard
          icon="school-outline"
          title="Students"
          description="View and manage registered student accounts."
          count={studentCount}
          accent={COLORS.primary}
          onPress={() => router.push('/admin-students')}
        />

        <UserCategoryCard
          icon="person-outline"
          title="Teachers"
          description="View and manage registered teacher accounts."
          count={teacherCount}
          accent={COLORS.accent}
          onPress={() => router.push('/admin-teachers')}
        />

        <UserCategoryCard
          icon="shield-checkmark-outline"
          title="Administrators"
          description="View and manage administrator accounts."
          count={adminCount}
          accent={COLORS.gold}
          onPress={() => router.push('/admin-admins')}
        />

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="information-circle-outline"
              size={21}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>User Management</Text>
            <Text style={styles.infoText}>
              Choose a category above to view accounts and search for specific
              users.
            </Text>
          </View>
        </View>

        <View style={styles.securityCard}>
          <View style={styles.securityIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={COLORS.accent}
            />
          </View>

          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>Protected Admin Area</Text>
            <Text style={styles.securityText}>
              Only authorized administrators can access and manage user
              accounts.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerBrand}>QRPass</Text>
          <Text style={styles.footerText}>
            School Event Attendance System
          </Text>
          <Text style={styles.footerSmall}>User Management</Text>
        </View>
      </ScrollView>
    </View>
  );
}

type UserCategoryCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  count: number;
  accent: string;
  onPress: () => void;
};

function UserCategoryCard({
  icon,
  title,
  description,
  count,
  accent,
  onPress,
}: UserCategoryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryCard,
        pressed && styles.categoryCardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count} accounts`}
    >
      <View style={[styles.categoryIcon, { borderColor: accent }]}>
        <Ionicons name={icon} size={26} color={accent} />
      </View>

      <View style={styles.categoryInfo}>
        <Text style={styles.categoryTitle}>{title}</Text>
        <Text style={styles.categoryDescription}>{description}</Text>
      </View>

      <View style={styles.categoryRight}>
        <View style={[styles.countBadge, { borderColor: accent }]}>
          <Text style={[styles.countText, { color: accent }]}>{count}</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={COLORS.textSecondary}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fixedHeader: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    flexShrink: 0,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 90,
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
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingSpinner: {
    marginTop: 18,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  accessIcon: {
    width: 76,
    height: 76,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accessTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  accessText: {
    marginTop: 7,
    maxWidth: 300,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  backButtonLarge: {
    minHeight: 46,
    marginTop: 22,
    paddingHorizontal: 18,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  backButtonText: {
    marginLeft: 7,
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
    marginBottom: 18,
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
    marginBottom: 19,
    padding: 16,
    borderRadius: 20,
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
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
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
    marginBottom: 20,
    padding: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 13,
  },
  errorIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
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
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  retryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
  },
  retryText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  overviewCard: {
    minHeight: 124,
    marginBottom: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
  },
  overviewIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  overviewContent: {
    flex: 1,
    marginLeft: 13,
  },
  overviewLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: COLORS.accent,
  },
  overviewValue: {
    marginTop: 2,
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  overviewText: {
    marginTop: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sectionAccent: {
    width: 5,
    height: 24,
    borderRadius: 99,
    backgroundColor: COLORS.primary,
  },
  categoryCard: {
    minHeight: 96,
    marginBottom: 13,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  categoryCardPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  categoryIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  categoryDescription: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  countBadge: {
    minWidth: 35,
    height: 35,
    paddingHorizontal: 8,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
  },
  countText: {
    fontSize: 13,
    fontWeight: '800',
  },
  infoCard: {
    marginTop: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  infoContent: {
    flex: 1,
    marginLeft: 10,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  infoText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  securityCard: {
    marginTop: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
  },
  securityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  securityContent: {
    flex: 1,
    marginLeft: 10,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  securityText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 28,
  },
  footerLine: {
    width: 42,
    height: 3,
    borderRadius: 99,
    backgroundColor: COLORS.primary,
    marginBottom: 12,
  },
  footerBrand: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: COLORS.textPrimary,
  },
  footerText: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  footerSmall: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
});