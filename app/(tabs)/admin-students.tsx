
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
import {
  getAllProfiles,
  getProfile,
  updateUserRole,
  type Profile,
  type Role,
} from '@/lib/profiles';

export default function AdminStudentsScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setError(null);

      if (!user) {
        setRole(null);
        setUsers([]);
        return;
      }

      const currentProfile = await getProfile(user.id);
      setRole(currentProfile?.role ?? null);

      if (currentProfile?.role !== 'admin') {
        setUsers([]);
        return;
      }

      const profiles = await getAllProfiles();
      setUsers(profiles.filter((item) => item.role === 'student'));
    } catch (err) {
      console.error('Failed to load student accounts:', err);
      setError('Unable to load students. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadUsers();
    }, [loadUsers])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
  };

  const students = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return users;

    return users.filter((item) => {
      const name = item.full_name?.toLowerCase() ?? '';
      const email = item.email.toLowerCase();

      return name.includes(query) || email.includes(query);
    });
  }, [users, search]);

  const changeRole = async (
    selectedUser: Profile,
    newRole: Role
  ) => {
    if (selectedUser.role === newRole) return;

    try {
      const result = await updateUserRole(selectedUser.id, newRole);

      if (result.error) {
        Alert.alert('Update Failed', result.error);
        return;
      }

      setUsers((currentUsers) =>
        currentUsers.filter((item) => item.id !== selectedUser.id)
      );

      Alert.alert(
        'Success',
        `${selectedUser.full_name || selectedUser.email} is no longer a Student.`
      );
    } catch (err) {
      console.error('Failed to change user role:', err);
      Alert.alert('Update Failed', 'Unable to change this user role. Please try again.');
    }
  };

  const handleChangeRole = (selectedUser: Profile) => {
    if (!user) return;

    if (selectedUser.id === user.id) {
      Alert.alert(
        'Cannot Change Your Own Role',
        'For safety, you cannot change your own administrator role.'
      );
      return;
    }

    Alert.alert(
      'Change User Role',
      `Select a new role for ${selectedUser.full_name || selectedUser.email}.`,
      [
        {
          text: 'Student',
          onPress: () => void changeRole(selectedUser, 'student'),
        },
        {
          text: 'Teacher',
          onPress: () => void changeRole(selectedUser, 'teacher'),
        },
        {
          text: 'Administrator',
          onPress: () => void changeRole(selectedUser, 'admin'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <View style={styles.loadingIcon}>
            <Ionicons name="school-outline" size={32} color={COLORS.primary} />
          </View>
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={styles.loadingSpinner}
          />
          <Text style={styles.loadingText}>Loading students...</Text>
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
            onPress={() => router.replace('/admin-users')}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color={COLORS.textOnPrimary}
            />
            <Text style={styles.backButtonLargeText}>Back to Users</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed header: stays visible while student results scroll */}
      <View style={styles.fixedHeader}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.replace('/admin-users')}
        >
          <View style={styles.backIcon}>
            <Ionicons
              name="arrow-back"
              size={18}
              color={COLORS.textPrimary}
            />
          </View>
          <Text style={styles.backText}>Manage Users</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="school" size={27} color={COLORS.textOnPrimary} />
          </View>

          <View style={styles.headerText}>
            <View style={styles.labelRow}>
              <View style={styles.labelDot} />
              <Text style={styles.headerLabel}>USER MANAGEMENT</Text>
            </View>
            <Text style={styles.title}>Students</Text>
            <Text style={styles.subtitle}>
              {users.length} registered student{users.length === 1 ? '' : 's'}
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>{users.length}</Text>
          </View>
        </View>

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search students..."
        />

        {search.trim().length > 0 && (
          <View style={styles.resultInfo}>
            <Ionicons
              name="search-outline"
              size={15}
              color={COLORS.accent}
            />
            <Text style={styles.resultInfoText}>
              {students.length} result{students.length === 1 ? '' : 's'} found
            </Text>
          </View>
        )}
      </View>

      {/* Only this area scrolls */}
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
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={24}
              color={COLORS.danger}
            />
            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>Unable to Load Students</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                onPress={() => void loadUsers()}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.pressed,
                ]}
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
        ) : students.length === 0 ? (
          <EmptyCard searching={search.trim().length > 0} />
        ) : (
          students.map((item) => (
            <UserCard
              key={item.id}
              item={item}
              onChangeRole={handleChangeRole}
            />
          ))
        )}

        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerBrand}>QRPass</Text>
          <Text style={styles.footerText}>
            School Event Attendance System
          </Text>
          <Text style={styles.footerSmall}>
            Student Account Management
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SearchBar({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchIcon}>
        <Ionicons name="search-outline" size={19} color={COLORS.primary} />
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.searchInput}
        returnKeyType="search"
      />

      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons
            name="close-circle"
            size={19}
            color={COLORS.textSecondary}
          />
        </Pressable>
      )}
    </View>
  );
}

function UserCard({
  item,
  onChangeRole,
}: {
  item: Profile;
  onChangeRole: (user: Profile) => void;
}) {
  const initials =
    item.full_name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'ST';

  return (
    <View style={styles.userCard}>
      <View style={styles.userTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.full_name || 'No name'}
          </Text>
          <View style={styles.emailRow}>
            <Ionicons
              name="mail-outline"
              size={13}
              color={COLORS.textSecondary}
            />
            <Text style={styles.userEmail} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.userBottom}>
        <View style={styles.roleBadge}>
          <Ionicons
            name="school-outline"
            size={14}
            color={COLORS.primary}
          />
          <Text style={styles.roleText}>Student</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.changeButton,
            pressed && styles.changeButtonPressed,
          ]}
          onPress={() => onChangeRole(item)}
          accessibilityRole="button"
          accessibilityLabel={`Change role for ${item.full_name || item.email}`}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={COLORS.primary}
          />
          <Text style={styles.changeButtonText}>Change Role</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyCard({ searching }: { searching: boolean }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={searching ? 'search-outline' : 'school-outline'}
          size={32}
          color={COLORS.primary}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {searching ? 'No Students Found' : 'No Students'}
      </Text>
      <Text style={styles.emptyText}>
        {searching
          ? 'No student matches your search.'
          : 'There are currently no student accounts.'}
      </Text>
    </View>
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
    paddingBottom: 56,
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
  backButtonLargeText: {
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
    marginBottom: 17,
    padding: 15,
    borderRadius: 19,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
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
    color: COLORS.textSecondary,
  },
  countBadge: {
    minWidth: 48,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  countText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },
  searchContainer: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    marginBottom: 12,
  },
  searchIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  searchInput: {
    flex: 1,
    marginLeft: 9,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  resultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 3,
  },
  resultInfoText: {
    marginLeft: 5,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    padding: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 13,
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
  userCard: {
    marginBottom: 13,
    padding: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  userTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  userEmail: {
    flex: 1,
    marginLeft: 5,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  userBottom: {
    minHeight: 48,
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  changeButtonPressed: {
    opacity: 0.65,
  },
  changeButtonText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  emptyCard: {
    minHeight: 205,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 35,
    paddingHorizontal: 24,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    marginTop: 13,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptyText: {
    maxWidth: 290,
    marginTop: 6,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
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