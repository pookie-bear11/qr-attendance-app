
import Ionicons from '@expo/vector-icons/Ionicons';
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
import { router, useFocusEffect } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getAllProfiles,
  getProfile,
  updateUserRole,
  type Profile,
  type Role,
} from '@/lib/profiles';

export default function AdminTeachersScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadUsers = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const currentProfile = await getProfile(user.id);
      setRole(currentProfile?.role ?? null);

      if (currentProfile?.role !== 'admin') {
        setUsers([]);
        return;
      }

      const profiles = await getAllProfiles();
      setUsers(profiles.filter((item) => item.role === 'teacher'));
    } catch (error) {
      Alert.alert(
        'Loading Failed',
        error instanceof Error
          ? error.message
          : 'Unable to load teacher accounts.'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const teachers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

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
    if (selectedUser.role === newRole) {
      return;
    }

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
        'Role Updated',
        `${selectedUser.full_name || selectedUser.email} is no longer a Teacher.`
      );
    } catch (error) {
      Alert.alert(
        'Update Failed',
        error instanceof Error ? error.message : 'Unable to update the user role.'
      );
    }
  };

  const handleChangeRole = (selectedUser: Profile) => {
    if (!user) {
      return;
    }

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
          onPress: () => changeRole(selectedUser, 'student'),
        },
        {
          text: 'Teacher',
          onPress: () => changeRole(selectedUser, 'teacher'),
        },
        {
          text: 'Administrator',
          onPress: () => changeRole(selectedUser, 'admin'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        <Text style={styles.loadingTitle}>Loading Teachers</Text>
        <Text style={styles.loadingText}>
          Please wait while we load teacher accounts...
        </Text>
      </View>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <View style={styles.center}>
        <View style={styles.accessIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={38}
            color={COLORS.danger}
          />
        </View>

        <Text style={styles.accessTitle}>Access Denied</Text>
        <Text style={styles.accessText}>
          Administrator access is required to manage teacher accounts.
        </Text>

        <Pressable
          style={styles.accessButton}
          onPress={() => router.replace('/admin')}
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color={COLORS.textOnPrimary}
          />
          <Text style={styles.accessButtonText}>Back to Admin</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed header area */}
      <View style={styles.fixedContent}>
        <Pressable
          style={styles.backButton}
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
            <Ionicons
              name="school-outline"
              size={27}
              color={COLORS.textOnPrimary}
            />
          </View>

          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Teachers</Text>
              <View style={styles.roleLabel}>
                <Text style={styles.roleLabelText}>STAFF</Text>
              </View>
            </View>

            <Text style={styles.subtitle}>
              Manage registered teacher accounts
            </Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsIcon}>
            <Ionicons
              name="people-outline"
              size={21}
              color={COLORS.accent}
            />
          </View>

          <View style={styles.statsInfo}>
            <Text style={styles.statsLabel}>REGISTERED TEACHERS</Text>
            <Text style={styles.statsValue}>{users.length}</Text>
          </View>

          <View style={styles.statsRight}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={COLORS.accent}
            />
            <Text style={styles.statsRightText}>Admin managed</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Teacher Accounts</Text>
          {search.length > 0 && (
            <Text style={styles.resultCount}>
              {teachers.length} result{teachers.length === 1 ? '' : 's'}
            </Text>
          )}
        </View>

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email..."
        />
      </View>

      {/* Only the teacher list scrolls */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator
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
        {teachers.length === 0 ? (
          <EmptyCard searching={search.length > 0} />
        ) : (
          teachers.map((item) => (
            <UserCard
              key={item.id}
              item={item}
              onChangeRole={handleChangeRole}
            />
          ))
        )}

        {teachers.length > 0 && (
          <View style={styles.footer}>
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={COLORS.textSecondary}
            />
            <Text style={styles.footerText}>
              Changing a user's role immediately removes them from this teacher list.
            </Text>
          </View>
        )}
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
        <Ionicons
          name="search-outline"
          size={19}
          color={COLORS.accent}
        />
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.searchInput}
      />

      {value.length > 0 && (
        <Pressable
          style={styles.clearButton}
          onPress={() => onChangeText('')}
        >
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
  const initials = getInitials(item.full_name || item.email);

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
              size={14}
              color={COLORS.textSecondary}
            />
            <Text style={styles.userEmail} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.userBottom}>
        <View style={styles.roleBadge}>
          <Ionicons
            name="school-outline"
            size={14}
            color={COLORS.accent}
          />
          <Text style={styles.roleText}>TEACHER</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.changeButton,
            pressed && styles.changeButtonPressed,
          ]}
          onPress={() => onChangeRole(item)}
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
          size={35}
          color={COLORS.textSecondary}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {searching ? 'No Teachers Found' : 'No Teachers'}
      </Text>

      <Text style={styles.emptyText}>
        {searching
          ? 'No teacher matches your search.'
          : 'There are currently no teacher accounts.'}
      </Text>
    </View>
  );
}

function getInitials(name: string) {
  const cleanName = name.trim();

  if (!cleanName) {
    return 'T';
  }

  const parts = cleanName.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fixedContent: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 8,
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
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  loadingText: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  accessIcon: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accessTitle: {
    marginTop: 16,
    fontSize: 21,
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
  accessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
  },
  accessButtonText: {
    marginLeft: 7,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
    marginBottom: 18,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  roleLabel: {
    marginLeft: 9,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleLabelText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.accent,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 17,
    marginBottom: 22,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsInfo: {
    flex: 1,
    marginLeft: 12,
  },
  statsLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.textSecondary,
  },
  statsValue: {
    marginTop: 2,
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statsRight: {
    alignItems: 'flex-end',
  },
  statsRightText: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  resultCount: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
    marginBottom: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  searchIcon: {
    width: 32,
    height: 32,
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
  clearButton: {
    padding: 4,
  },
  userCard: {
    padding: 17,
    marginBottom: 13,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
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
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accent,
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
    marginTop: 5,
  },
  userEmail: {
    flex: 1,
    marginLeft: 5,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    marginTop: 16,
    backgroundColor: COLORS.border,
  },
  userBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleText: {
    marginLeft: 6,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: COLORS.accent,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  changeButtonPressed: {
    opacity: 0.65,
  },
  changeButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  },
  emptyText: {
    marginTop: 7,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  footerText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
});