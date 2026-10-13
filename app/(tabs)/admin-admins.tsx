
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

export default function AdminAdminsScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadUsers = useCallback(async () => {
    if (!user) {
      setRole(null);
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const currentProfile = await getProfile(user.id);
      const currentRole = currentProfile?.role ?? null;

      setRole(currentRole);

      if (currentRole !== 'admin') {
        setUsers([]);
        return;
      }

      const profiles = await getAllProfiles();

      setUsers(profiles.filter((item) => item.role === 'admin'));
    } catch (error) {
      console.error('Failed to load administrators:', error);
      Alert.alert(
        'Loading Failed',
        'Unable to load administrator accounts. Please try again.'
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
    try {
      await loadUsers();
    } finally {
      setRefreshing(false);
    }
  };

  const administrators = useMemo(() => {
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
    if (!user || selectedUser.id === user.id) {
      return;
    }

    if (selectedUser.role === newRole) {
      return;
    }

    const result = await updateUserRole(selectedUser.id, newRole);

    if (result.error) {
      Alert.alert('Update Failed', result.error);
      return;
    }

    // This screen only displays administrator accounts.
    if (newRole !== 'admin') {
      setUsers((currentUsers) =>
        currentUsers.filter((item) => item.id !== selectedUser.id)
      );
    }

    Alert.alert(
      'Role Updated',
      `${selectedUser.full_name || selectedUser.email} is now ${
        newRole === 'admin'
          ? 'an Administrator'
          : newRole === 'teacher'
            ? 'a Teacher'
            : 'a Student'
      }.`
    );
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
      `Select a new role for ${
        selectedUser.full_name || selectedUser.email
      }.`,
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
        <Text style={styles.loadingTitle}>Loading Administrators</Text>
        <Text style={styles.loadingText}>
          Please wait while we load administrator accounts...
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
          Administrator access is required to manage administrator accounts.
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
      {/* FIXED AREA: header, stats, security notice and search */}
      <View style={styles.fixedArea}>
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
              name="shield-checkmark"
              size={28}
              color={COLORS.textOnPrimary}
            />
          </View>

          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Administrators</Text>
              <View style={styles.roleLabel}>
                <Text style={styles.roleLabelText}>ADMIN</Text>
              </View>
            </View>

            <Text style={styles.subtitle}>
              Manage system administrator accounts
            </Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={COLORS.gold}
            />
          </View>

          <View style={styles.statsInfo}>
            <Text style={styles.statsLabel}>
              SYSTEM ADMINISTRATORS
            </Text>
            <Text style={styles.statsValue}>{users.length}</Text>
          </View>

          <View style={styles.statsRight}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={COLORS.accent}
            />
            <Text style={styles.statsRightText}>Protected</Text>
          </View>
        </View>

        <View style={styles.securityCard}>
          <View style={styles.securityIcon}>
            <Ionicons
              name="warning-outline"
              size={18}
              color={COLORS.gold}
            />
          </View>

          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>
              Administrator Security
            </Text>
            <Text style={styles.securityText}>
              You cannot change your own administrator role. This helps
              prevent accidental loss of administrator access.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Administrator Accounts
          </Text>

          {search.length > 0 && (
            <Text style={styles.resultCount}>
              {administrators.length} result
              {administrators.length === 1 ? '' : 's'}
            </Text>
          )}
        </View>

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email..."
        />
      </View>

      {/* ONLY THE ADMINISTRATOR LIST SCROLLS */}
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
        {administrators.length === 0 ? (
          <EmptyCard searching={search.length > 0} />
        ) : (
          administrators.map((item) => (
            <UserCard
              key={item.id}
              item={item}
              currentUserId={user.id}
              onChangeRole={handleChangeRole}
            />
          ))
        )}

        {administrators.length > 0 && (
          <View style={styles.footer}>
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={COLORS.textSecondary}
            />
            <Text style={styles.footerText}>
              Administrator accounts have full access to the attendance
              management system.
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
  currentUserId,
  onChangeRole,
}: {
  item: Profile;
  currentUserId: string;
  onChangeRole: (user: Profile) => void;
}) {
  const isCurrentUser = item.id === currentUserId;
  const initials = getInitials(item.full_name || item.email);

  return (
    <View style={styles.userCard}>
      <View style={styles.userTop}>
        <View
          style={[
            styles.avatar,
            isCurrentUser && styles.currentAvatar,
          ]}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.full_name || 'No name'}
            </Text>

            {isCurrentUser && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>YOU</Text>
              </View>
            )}
          </View>

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
            name="shield-checkmark"
            size={14}
            color={COLORS.gold}
          />
          <Text style={styles.roleText}>ADMINISTRATOR</Text>
        </View>

        {isCurrentUser ? (
          <View style={styles.currentBadge}>
            <Ionicons
              name="lock-closed-outline"
              size={14}
              color={COLORS.textSecondary}
            />
            <Text style={styles.currentBadgeText}>Protected</Text>
          </View>
        ) : (
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
        )}
      </View>
    </View>
  );
}

function EmptyCard({ searching }: { searching: boolean }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={searching ? 'search-outline' : 'shield-outline'}
          size={35}
          color={COLORS.textSecondary}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {searching ? 'No Administrators Found' : 'No Administrators'}
      </Text>

      <Text style={styles.emptyText}>
        {searching
          ? 'No administrator matches your search.'
          : 'There are currently no administrator accounts.'}
      </Text>
    </View>
  );
}

function getInitials(name: string) {
  const cleanName = name.trim();

  if (!cleanName) {
    return 'A';
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

  fixedArea: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    flexShrink: 0,
    paddingHorizontal: 22,
    paddingTop: 22,
  },

  listScroll: {
    flex: 1,
    minHeight: 0,
  },

  listContent: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 56,
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
    flexWrap: 'wrap',
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
    color: COLORS.gold,
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
    marginBottom: 16,
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

  securityCard: {
    flexDirection: 'row',
    padding: 14,
    marginBottom: 24,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  securityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },

  securityInfo: {
    flex: 1,
    marginLeft: 10,
  },

  securityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  securityText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
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
    borderLeftColor: COLORS.gold,
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

  currentAvatar: {
    borderColor: COLORS.gold,
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

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  userName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  youBadge: {
    marginLeft: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: COLORS.surface,
  },

  youBadgeText: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: COLORS.gold,
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
    flexWrap: 'wrap',
    gap: 8,
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
    color: COLORS.gold,
  },

  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  currentBadgeText: {
    marginLeft: 6,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
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