import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signOut, useAuth } from '@/lib/auth';
import { getProfile, updateProfile } from '@/lib/profiles';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<
    Awaited<ReturnType<typeof getProfile>>
  >(null);

  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);

    try {
      const result = await getProfile(user.id);

      setProfile(result);
      setDraftName(result?.full_name ?? '');
    } catch (error) {
      console.error('PROFILE LOAD ERROR:', error);
      Alert.alert(
        'Unable to Load Profile',
        'Please check your connection and try again.'
      );
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveName = async () => {
    if (!user || saving) return;

    const name = draftName.trim();

    if (!name) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: name,
      });

      if (error) {
        Alert.alert('Save Failed', error);
        return;
      }

      setProfile((previous) =>
        previous
          ? {
              ...previous,
              full_name: name,
            }
          : previous
      );

      setDraftName(name);
      setEditing(false);

      Alert.alert('Success', 'Your name has been updated.');
    } catch (error) {
      console.error('PROFILE UPDATE ERROR:', error);
      Alert.alert(
        'Save Failed',
        'Unable to update your name. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDraftName(profile?.full_name ?? '');
    setEditing(false);
  };

  const performSignOut = async () => {
    if (loading) return;

    setLoading(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to sign out. Please try again.';

      if (Platform.OS === 'web') {
        window.alert(`Sign Out Failed: ${message}`);
      } else {
        Alert.alert('Sign Out Failed', message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    if (loading || saving) return;

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        void performSignOut();
      }
      return;
    }

    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: performSignOut,
        },
      ]
    );
  };

  const getRoleInfo = () => {
    if (profile?.role === 'admin') {
      return {
        label: 'Administrator',
        icon: 'shield-checkmark' as const,
      };
    }

    if (profile?.role === 'teacher') {
      return {
        label: 'Teacher',
        icon: 'school' as const,
      };
    }

    return {
      label: 'Student',
      icon: 'person' as const,
    };
  };

  const roleInfo = getRoleInfo();

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>

        <Text style={styles.loadingTitle}>Loading profile</Text>
        <Text style={styles.loadingDescription}>
          Please wait while we retrieve your account information.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        Platform.OS === 'web' && styles.webContentContainer,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="person-outline"
            size={25}
            color={COLORS.accent}
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>ACCOUNT SETTINGS</Text>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>
            Manage your account information.
          </Text>
        </View>
      </View>

      {user ? (
        <>
          {/* PROFILE OVERVIEW */}
          <View style={styles.profileCard}>
            <View style={styles.profileTop}>
              <View style={styles.avatar}>
                <Ionicons
                  name="person"
                  size={34}
                  color={COLORS.accent}
                />
              </View>

              <View style={styles.profileIdentity}>
                <Text style={styles.profileName} numberOfLines={2}>
                  {profile?.full_name || 'No name set'}
                </Text>

                <View style={styles.roleBadge}>
                  <Ionicons
                    name={roleInfo.icon}
                    size={13}
                    color={COLORS.accent}
                  />
                  <Text style={styles.roleBadgeText}>
                    {roleInfo.label}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* NAME */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldLabelRow}>
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={COLORS.accent}
                />
                <Text style={styles.label}>Full Name</Text>
              </View>

              {editing ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder="Enter your name"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={!saving}
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={100}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />

                  <View style={styles.editActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.saveButton,
                        pressed && styles.pressedButton,
                        saving && styles.disabledButton,
                      ]}
                      onPress={handleSaveName}
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
                          size={18}
                          color={COLORS.textOnPrimary}
                        />
                      )}

                      <Text style={styles.saveButtonText}>
                        {saving ? 'Saving...' : 'Save'}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.cancelButton,
                        pressed && styles.pressedButton,
                      ]}
                      onPress={handleCancelEdit}
                      disabled={saving}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => setEditing(true)}
                  style={({ pressed }) => [
                    styles.valueRow,
                    pressed && styles.pressedButton,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Edit your name"
                >
                  <Text style={styles.value} numberOfLines={2}>
                    {profile?.full_name || 'Tap to add your name'}
                  </Text>

                  <View style={styles.editButton}>
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={COLORS.accent}
                    />
                    <Text style={styles.editHint}>Edit</Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* EMAIL */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldLabelRow}>
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={COLORS.accent}
                />
                <Text style={styles.label}>Email Address</Text>
              </View>

              <View style={styles.readOnlyField}>
                <Text style={styles.value} selectable>
                  {user.email || 'No email available'}
                </Text>
                <Ionicons
                  name="lock-closed-outline"
                  size={15}
                  color={COLORS.textSecondary}
                />
              </View>
            </View>

            {/* ROLE */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldLabelRow}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color={COLORS.accent}
                />
                <Text style={styles.label}>Account Role</Text>
              </View>

              <View style={styles.roleValue}>
                <View style={styles.roleDot} />
                <Text style={styles.roleValueText}>
                  {roleInfo.label}
                </Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={COLORS.success}
                  />
                  <Text style={styles.verifiedText}>Assigned</Text>
                </View>
              </View>
            </View>

            {/* USER ID */}
            <View style={styles.fieldSectionLast}>
              <View style={styles.fieldLabelRow}>
                <Ionicons
                  name="finger-print-outline"
                  size={16}
                  color={COLORS.accent}
                />
                <Text style={styles.label}>User ID</Text>
              </View>

              <View style={styles.userIdContainer}>
                <Text style={styles.valueSmall} selectable>
                  {user.id}
                </Text>
              </View>
            </View>
          </View>

          {/* SECURITY CARD */}
          <View style={styles.securityCard}>
            <View style={styles.securityIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={COLORS.success}
              />
            </View>

            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>
                Account Security
              </Text>
              <Text style={styles.securityText}>
                Your account is managed through authenticated access.
                Keep your login information private.
              </Text>
            </View>
          </View>

          {/* SIGN OUT */}
          <View style={styles.signOutSection}>
            <View style={styles.signOutDivider} />

            <Text style={styles.signOutLabel}>ACCOUNT ACTION</Text>

            <View style={loading && styles.signOutDisabled}>
              <AppButton
                title={loading ? 'Signing Out...' : 'Sign Out'}
                icon="log-out-outline"
                onPress={handleSignOut}
              />
            </View>

            <Text style={styles.signOutHint}>
              You will be asked to confirm before signing out.
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons
            name="person-circle-outline"
            size={48}
            color={COLORS.accent}
          />
          <Text style={styles.emptyTitle}>No account information</Text>
          <Text style={styles.emptyDescription}>
            Please sign in again to view your profile.
          </Text>
          <Pressable
            style={styles.loginButton}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  contentContainer: {
    paddingHorizontal: 22,
    paddingTop: 23,
    paddingBottom: 48,
  },

  webContentContainer: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  /* LOADING */
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  loadingIcon: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 16,
  },

  loadingDescription: {
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 7,
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
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
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  /* PROFILE CARD */
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 19,
    marginBottom: 15,
    boxShadow: '0px 8px 14px rgba(0, 0, 0, 0.18)',
  },

  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileIdentity: {
    flex: 1,
    marginLeft: 13,
  },

  profileName: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 7,
  },

  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  roleBadgeText: {
    marginLeft: 5,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accent,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 21,
  },

  /* FIELD LABELS */
  fieldSection: {
    marginBottom: 21,
  },

  fieldSectionLast: {
    marginBottom: 0,
  },

  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  label: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginLeft: 7,
    letterSpacing: 0.7,
  },

  value: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  /* NAME EDIT */
  valueRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },

  editHint: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '800',
    marginLeft: 4,
  },

  editContainer: {
    gap: 9,
  },

  nameInput: {
    minHeight: 50,
    backgroundColor: COLORS.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  editActions: {
    flexDirection: 'row',
    gap: 9,
  },

  saveButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    borderRadius: 10,
    gap: 6,
  },

  saveButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textOnPrimary,
  },

  cancelButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 15,
    borderRadius: 10,
  },

  cancelButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  pressedButton: {
    opacity: 0.7,
  },

  disabledButton: {
    opacity: 0.5,
  },

  /* READ-ONLY FIELDS */
  readOnlyField: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  /* ROLE */
  roleValue: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 9,
  },

  roleValueText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
  },

  /* USER ID */
  userIdContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },

  valueSmall: {
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },

  /* SECURITY */
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },

  securityIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  securityContent: {
    flex: 1,
    marginLeft: 11,
  },

  securityTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  securityText: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  /* SIGN OUT */
  signOutSection: {
    marginTop: 22,
    paddingBottom: 20,
  },

  signOutDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 18,
  },

  signOutLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
  },

  signOutDisabled: {
    opacity: 0.55,
  },

  signOutHint: {
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 9,
  },

  /* NO ACCOUNT */
  emptyCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 12,
  },

  emptyDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },

  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 17,
  },

  loginButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: 12,
    fontWeight: '900',
  },
});
