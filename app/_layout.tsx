import {
  Redirect,
  Stack,
  useSegments,
} from 'expo-router';

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';

import {
  restoreAuthSession,
  useAuth,
} from '@/lib/auth';

import { getProfile } from '@/lib/profiles';

import { useEffect, useState } from 'react';

type Role =
  | 'student'
  | 'teacher'
  | 'admin';

export default function RootLayout() {
  const {
    session,
    loading: authLoading,
    error: authError,
  } = useAuth();

  const segments = useSegments();

  const [role, setRole] =
    useState<Role | null>(null);

  const [roleLoading, setRoleLoading] =
    useState(false);

  const [roleError, setRoleError] =
    useState<string | null>(null);

  const [roleRetry, setRoleRetry] =
    useState(0);

  /*
   * Load the user's role whenever
   * the authenticated user changes.
   */
  useEffect(() => {
    let mounted = true;

    const loadRole = async () => {
      if (!session?.user?.id) {
        if (mounted) {
          setRole(null);
          setRoleError(null);
          setRoleLoading(false);
        }

        return;
      }

      setRoleLoading(true);
      setRoleError(null);

      try {
        const profile = await getProfile(
          session.user.id
        );

        if (mounted) {
          setRole(profile?.role ?? null);
        }
      } catch (error) {
        if (mounted) {
          setRole(null);
          setRoleError(
            error instanceof Error
              ? error.message
              : String(error)
          );
        }
      } finally {
        if (mounted) {
          setRoleLoading(false);
        }
      }
    };

    loadRole();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id, roleRetry]);

  /*
   * Wait for authentication first.
   */
  if (authLoading) {
    return (
      <View
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </View>
    );
  }

  if (authError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.authError}>
          Unable to restore your session: {authError}
        </Text>
        <Pressable
          onPress={() => void restoreAuthSession()}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }

  if (session && roleError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.authError}>
          Unable to load your profile: {roleError}
        </Text>
        <Pressable
          onPress={() => setRoleRetry((current) => current + 1)}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }

  const path = segments?.[0];

  const inAuthGroup =
    path === 'login' ||
    path === 'register';

  /*
   * No session:
   * only Login/Register are allowed.
   */
  if (!session && !inAuthGroup) {
    return (
      <Redirect href="/login" />
    );
  }

  /*
   * If there is a session, wait until
   * the user's role is loaded before
   * deciding where to redirect.
   */
  if (
    session &&
    inAuthGroup &&
    roleLoading
  ) {
    return (
      <View
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </View>
    );
  }

  /*
   * User is logged in and currently
   * inside Login/Register.
   *
   * Send each role to the correct
   * starting screen.
   */
  if (session && inAuthGroup) {
    if (role === 'admin') {
      return (
        <Redirect href="/admin" />
      );
    }

    return (
      <Redirect href="/(tabs)" />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="login"
      />

      <Stack.Screen
        name="register"
      />

      <Stack.Screen
        name="(tabs)"
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      COLORS.background,
  },
  authError: {
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginHorizontal: 24,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: '600',
  },
});