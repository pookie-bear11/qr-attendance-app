import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';

type Role = 'student' | 'teacher' | 'admin';

export default function TabLayout() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleRetry, setRoleRetry] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let mounted = true;

    const loadRole = async () => {
      if (!user) {
        if (mounted) {
          setRole(null);
          setRoleError(null);
        }
        return;
      }

      setRoleError(null);

      try {
        const profile = await getProfile(user.id);

        if (mounted) {
          setRole(profile?.role ?? null);
        }
      } catch (error) {
        console.error('Failed to load user role:', error);

        if (mounted) {
          setRole(null);
          setRoleError(
            error instanceof Error
              ? error.message
              : String(error)
          );
        }
      }
    };

    loadRole();

    return () => {
      mounted = false;
    };
  }, [user, roleRetry]);

  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';
  const isStudent = role === 'student';

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      edges={['top', 'left', 'right']}
    >
      {roleError && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: COLORS.surface,
          }}
        >
          <Text style={{ color: COLORS.textPrimary }}>
            Unable to load role-based navigation: {roleError}
          </Text>
          <Pressable
            onPress={() => setRoleRetry((current) => current + 1)}
            accessibilityRole="button"
          >
            <Text style={{ color: COLORS.accent, marginTop: 4 }}>
              Try again
            </Text>
          </Pressable>
        </View>
      )}
      <Tabs
        backBehavior="history"
        screenOptions={{
          // Screens manage their own page titles.
          headerShown: false,

          // Tab bar colors
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.textSecondary,

          // Bottom navigation
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            height: 68 + insets.bottom,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            elevation: 0,
            boxShadow: 'none',
            ...Platform.select({
              web: {
                alignSelf: 'stretch',
                flexDirection: 'row',
                width: '100%',
                minWidth: '100%',
              },
            }),
          },

          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            ...Platform.select({
              web: {
                fontSize: 12,
                lineHeight: 16,
              },
            }),
          },

          tabBarItemStyle: {
            paddingVertical: 4,
            flex: 1,
            minWidth: 0,
            alignItems: 'center',
            justifyContent: 'center',
            ...Platform.select({
              web: {
                flexBasis: 0,
              },
            }),
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            href: isAdmin ? null : '/',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />

      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          href: isAdmin ? null : '/scan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'qr-code' : 'qr-code-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          href: isAdmin ? null : '/history',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          href: isStudent ? '/events' : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="teacher"
        options={{
          title: 'Teacher',
          href: isTeacher ? '/teacher' : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'clipboard' : 'clipboard-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? '/admin' : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? 'shield-checkmark'
                  : 'shield-checkmark-outline'
              }
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* Hidden routes */}
      <Tabs.Screen
        name="teacher-events"
        options={{ href: null, title: 'My Events' }}
      />

      <Tabs.Screen
        name="admin-users"
        options={{ href: null, title: 'Manage Users' }}
      />

      <Tabs.Screen
        name="admin-students"
        options={{ href: null, title: 'Students' }}
      />

      <Tabs.Screen
        name="admin-teachers"
        options={{ href: null, title: 'Teachers' }}
      />

      <Tabs.Screen
        name="admin-admins"
        options={{ href: null, title: 'Administrators' }}
      />

      <Tabs.Screen
        name="admin-events"
        options={{ href: null, title: 'Manage Events' }}
      />

      <Tabs.Screen
        name="admin-attendance"
        options={{ href: null, title: 'Attendance' }}
      />

      <Tabs.Screen
        name="admin-reports"
        options={{ href: null, title: 'Reports' }}
      />

      <Tabs.Screen
        name="admin-report-events"
        options={{ href: null, title: 'Attendance by Event' }}
      />
      </Tabs>
    </SafeAreaView>
  );
}