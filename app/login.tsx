import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signIn } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setError(null);

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await signIn(
        cleanEmail,
        password
      );

      if (authError) {
        setError(authError.message);
        return;
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      setError(
        err?.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <TouchableWithoutFeedback
          onPress={
            Platform.OS === 'web'
              ? undefined
              : Keyboard.dismiss
          }
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + 24,
                paddingBottom: Math.max(
                  insets.bottom + 30,
                  45
                ),
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* BRAND */}

            <View style={styles.brand}>
              <View style={styles.qrIcon}>
                <Ionicons
                  name="qr-code"
                  size={30}
                  color={COLORS.textOnPrimary}
                />
              </View>

              <View style={styles.brandInfo}>
                <Text style={styles.appName}>
                  QRPass
                </Text>

                <Text style={styles.appTagline}>
                  SCHOOL EVENT ATTENDANCE
                </Text>
              </View>
            </View>

            {/* WELCOME */}

            <View style={styles.welcome}>
              <Text style={styles.welcomeSmall}>
                WELCOME BACK
              </Text>

              <Text style={styles.title}>
                Sign in to QRPass
              </Text>

              <Text style={styles.subtitle}>
                Sign in to access your school event
                attendance account.
              </Text>
            </View>

            {/* FORM */}

            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={styles.formHeaderIcon}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                </View>

                <View>
                  <Text style={styles.formTitle}>
                    Account Login
                  </Text>

                  <Text style={styles.formSubtitle}>
                    Enter your credentials
                  </Text>
                </View>
              </View>

              {/* EMAIL */}

              <View style={styles.field}>
                <Text style={styles.label}>
                  EMAIL ADDRESS
                </Text>

                <View style={styles.inputBox}>
                  <Ionicons
                    name="mail-outline"
                    size={19}
                    color={COLORS.textSecondary}
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderTextColor={
                      COLORS.textSecondary
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* PASSWORD */}

              <View style={styles.field}>
                <Text style={styles.label}>
                  PASSWORD
                </Text>

                <View style={styles.inputBox}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={19}
                    color={COLORS.textSecondary}
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={
                      COLORS.textSecondary
                    }
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />

                  <Pressable
                    style={styles.eyeButton}
                    onPress={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    disabled={loading}
                  >
                    <Ionicons
                      name={
                        showPassword
                          ? 'eye-off-outline'
                          : 'eye-outline'
                      }
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>

              {/* ERROR */}

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={19}
                    color={COLORS.danger}
                  />

                  <Text style={styles.errorText}>
                    {error}
                  </Text>
                </View>
              )}

              {/* BUTTON */}

              <View style={styles.buttonWrapper}>
                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator
                      size="small"
                      color={COLORS.primary}
                    />

                    <Text style={styles.loadingText}>
                      Signing in...
                    </Text>
                  </View>
                ) : (
                  <AppButton
                    theme="primary"
                    title="Sign In"
                    icon="arrow-forward"
                    onPress={handleLogin}
                  />
                )}
              </View>
            </View>

            {/* SIGN UP */}

            <View style={styles.signup}>
              <Text style={styles.signupText}>
                Don't have an account?
              </Text>

              <Link
                href="/register"
                style={styles.signupLink}
              >
                Create Account
              </Link>
            </View>

            {/* SECURITY */}

            <View style={styles.security}>
              <View style={styles.securityIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={COLORS.success}
                />
              </View>

              <View style={styles.securityInfo}>
                <Text style={styles.securityTitle}>
                  Secure Attendance System
                </Text>

                <Text style={styles.securityText}>
                  Your account and attendance data
                  are protected.
                </Text>
              </View>
            </View>

            <Text style={styles.footer}>
              QRPass • School Event Attendance System
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  // =========================
  // BRAND
  // =========================

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 38,
  },

  qrIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandInfo: {
    marginLeft: 12,
  },

  appName: {
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },

  appTagline: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: COLORS.accent,
  },

  // =========================
  // WELCOME
  // =========================

  welcome: {
    marginBottom: 28,
  },

  welcomeSmall: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: COLORS.primary,
    marginBottom: 7,
  },

  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    maxWidth: 340,
  },

  // =========================
  // FORM
  // =========================

  formCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 20,
  },

  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  formHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  formSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  field: {
    marginBottom: 16,
  },

  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
    marginBottom: 7,
  },

  inputBox: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
  },

  inputIcon: {
    marginLeft: 14,
    marginRight: 9,
  },

  input: {
    flex: 1,
    minHeight: 54,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  eyeButton: {
    width: 45,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // =========================
  // ERROR
  // =========================

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.22)',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 15,
  },

  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.danger,
  },

  // =========================
  // BUTTON
  // =========================

  buttonWrapper: {
    marginTop: 2,
  },

  loadingBox: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginLeft: 9,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  // =========================
  // SIGN UP
  // =========================

  signup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  signupText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  signupLink: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },

  // =========================
  // SECURITY
  // =========================

  security: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  securityIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  securityInfo: {
    flex: 1,
    marginLeft: 9,
  },

  securityTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  securityText: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 14,
    color: COLORS.textSecondary,
  },

  footer: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 9,
    color: COLORS.textSecondary,
    opacity: 0.55,
  },
});