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
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const handleRegister = async () => {
    setError(null);

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('Please complete all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError(
        'Password must be at least 6 characters.'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signUp(
        email.trim(),
        password,
        {
          full_name: fullName.trim(),
        }
      );

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data?.session) {
        router.replace('/(tabs)');
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.message ||
          'Unexpected error occurred during registration.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SUCCESS SCREEN
  // =========================

  if (success) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.successScroll,
            {
              paddingTop: insets.top + 30,
              paddingBottom: Math.max(
                insets.bottom + 30,
                45
              ),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* BRAND */}

          <View style={styles.successBrand}>
            <View style={styles.successQrIcon}>
              <Ionicons
                name="qr-code"
                size={30}
                color={COLORS.textOnPrimary}
              />
            </View>

            <Text style={styles.appName}>
              QRPass
            </Text>

            <Text style={styles.appDescription}>
              SCHOOL EVENT ATTENDANCE
            </Text>
          </View>

          {/* SUCCESS */}

          <View style={styles.successCard}>
            <View style={styles.successIconBox}>
              <Ionicons
                name="mail-open-outline"
                size={32}
                color={COLORS.success}
              />
            </View>

            <Text style={styles.successTitle}>
              Check Your Email
            </Text>

            <Text style={styles.successText}>
              Your QRPass account has been created.
              Please check your email to confirm your
              account before signing in.
            </Text>

            <View style={styles.successEmailBox}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={COLORS.accent}
              />

              <Text style={styles.successEmail}>
                {email}
              </Text>
            </View>

            <Pressable
              style={styles.backLoginButton}
              onPress={() => router.replace('/login')}
            >
              <Ionicons
                name="arrow-back"
                size={18}
                color={COLORS.textOnPrimary}
              />

              <Text style={styles.backLoginText}>
                Back to Login
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // =========================
  // REGISTER SCREEN
  // =========================

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? 0 : 20
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

                <Text style={styles.appDescription}>
                  SCHOOL EVENT ATTENDANCE
                </Text>
              </View>
            </View>

            {/* HEADER */}

            <View style={styles.headerSection}>
              <Text style={styles.welcomeSmall}>
                GET STARTED
              </Text>

              <Text style={styles.title}>
                Create your account
              </Text>

              <Text style={styles.subtitle}>
                Register for QRPass to access the
                school event attendance system.
              </Text>
            </View>

            {/* FORM */}

            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={styles.formHeaderIcon}>
                  <Ionicons
                    name="person-add-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                </View>

                <View>
                  <Text style={styles.formTitle}>
                    Account Registration
                  </Text>

                  <Text style={styles.formSubtitle}>
                    Enter your information below
                  </Text>
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.label}>
                  ACCOUNT TYPE
                </Text>
                <Text style={styles.formSubtitle}>
                  Student
                </Text>
                <Text style={styles.roleDescription}>
                  Teacher access is assigned by an administrator. Register as a student and contact your administrator if you need teacher access.
                </Text>
              </View>

              {/* FULL NAME */}

              <View style={styles.inputSection}>
                <Text style={styles.label}>
                  FULL NAME
                </Text>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={19}
                    color={COLORS.textSecondary}
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your full name"
                    placeholderTextColor={
                      COLORS.textSecondary
                    }
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* EMAIL */}

              <View style={styles.inputSection}>
                <Text style={styles.label}>
                  EMAIL ADDRESS
                </Text>

                <View style={styles.inputWrapper}>
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

              <View style={styles.inputSection}>
                <Text style={styles.label}>
                  PASSWORD
                </Text>

                <View style={styles.inputWrapper}>
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
                    placeholder="Create a password"
                    placeholderTextColor={
                      COLORS.textSecondary
                    }
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />

                  <Pressable
                    onPress={() =>
                      setShowPassword(
                        (prev) => !prev
                      )
                    }
                    disabled={loading}
                    style={styles.eyeButton}
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

                <Text style={styles.helperText}>
                  Minimum 6 characters
                </Text>
              </View>

              {/* CONFIRM PASSWORD */}

              <View style={styles.inputSection}>
                <Text style={styles.label}>
                  CONFIRM PASSWORD
                </Text>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={19}
                    color={COLORS.textSecondary}
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={
                      setConfirmPassword
                    }
                    placeholder="Confirm your password"
                    placeholderTextColor={
                      COLORS.textSecondary
                    }
                    secureTextEntry={
                      !showConfirmPassword
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />

                  <Pressable
                    onPress={() =>
                      setShowConfirmPassword(
                        (prev) => !prev
                      )
                    }
                    disabled={loading}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword
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
                  <View style={styles.errorIcon}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={19}
                      color={COLORS.danger}
                    />
                  </View>

                  <Text style={styles.errorText}>
                    {error}
                  </Text>
                </View>
              )}

              {/* REGISTER BUTTON */}

              <View style={styles.buttonContainer}>
                {loading ? (
                  <View
                    style={styles.loadingContainer}
                  >
                    <ActivityIndicator
                      size="small"
                      color={COLORS.primary}
                    />

                    <Text
                      style={styles.loadingText}
                    >
                      Creating account...
                    </Text>
                  </View>
                ) : (
                  <AppButton
                    theme="primary"
                    title="Create Account"
                    icon="person-add-outline"
                    onPress={handleRegister}
                  />
                )}
              </View>
            </View>

            {/* LOGIN LINK */}

            <View style={styles.loginSection}>
              <Text style={styles.loginText}>
                Already have an account?
              </Text>

              <Link
                href="/login"
                style={styles.loginLink}
              >
                Sign In
              </Link>
            </View>

            {/* SECURITY */}

            <View style={styles.securitySection}>
              <View style={styles.securityIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={17}
                  color={COLORS.success}
                />
              </View>

              <View>
                <Text style={styles.securityTitle}>
                  Secure Registration
                </Text>

                <Text style={styles.securityText}>
                  Your account information is protected.
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
    marginBottom: 36,
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

  appDescription: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: COLORS.accent,
  },

  // =========================
  // HEADER
  // =========================

  headerSection: {
    marginBottom: 22,
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
    maxWidth: 350,
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

  inputSection: {
    marginBottom: 17,
  },

  label: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 7,
  },

  // =========================
  // INPUT
  // =========================

  inputWrapper: {
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
    paddingRight: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  eyeButton: {
    width: 45,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },

  helperText: {
    marginTop: 5,
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  roleDescription: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.textSecondary,
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

  errorIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.danger,
    fontWeight: '600',
  },

  // =========================
  // BUTTON
  // =========================

  buttonContainer: {
    marginTop: 2,
  },

  loadingContainer: {
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
  // LOGIN LINK
  // =========================

  loginSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  loginText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },

  loginLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '800',
  },

  // =========================
  // SECURITY
  // =========================

  securitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
  },

  securityIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  securityTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  securityText: {
    marginTop: 2,
    fontSize: 9,
    color: COLORS.textSecondary,
  },

  footer: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 9,
    color: COLORS.textSecondary,
    opacity: 0.5,
  },

  // =========================
  // SUCCESS
  // =========================

  successScroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  successBrand: {
    alignItems: 'center',
    marginBottom: 30,
  },

  successQrIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  successCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },

  successIconBox: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  successTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 9,
  },

  successText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  successEmailBox: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    marginTop: 18,
  },

  successEmail: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  backLoginButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },

  backLoginText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },
});