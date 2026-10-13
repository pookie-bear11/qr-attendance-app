import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import { useRef, useState } from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { registerAttendance } from '@/lib/attendance';

export default function ScanScreen() {
  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  const [scanned, setScanned] =
    useState(false);

  const [lastData, setLastData] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const scanInProgress = useRef(false);
  const { user } = useAuth();

  if (!permission) {
    return (
      <View style={styles.container} />
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionIcon}>
          <Ionicons
            name="camera-outline"
            size={42}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.permissionTitle}>
          Camera Permission Needed
        </Text>

        <Text style={styles.permissionSubtitle}>
          QRPass needs access to your camera
          to scan event QR codes and record
          your attendance.
        </Text>

        <View style={styles.permissionButton}>
          <AppButton
            theme="primary"
            title="Grant Permission"
            icon="camera-outline"
            onPress={requestPermission}
          />
        </View>
      </View>
    );
  }

  const handleBarcodeScanned = async ({
    data,
  }: {
    data: string;
  }) => {
    // Ignore repeated camera callbacks while the current scan is processing.
    if (scanInProgress.current) return;
    scanInProgress.current = true;

    setScanned(true);
    setLastData(data);
    setMessage('Please wait while we verify your QR code.');
    setSuccess(false);
    setLoading(true);

    try {
      if (!user?.id) {
        setMessage('Please log in before recording attendance.');
        setSuccess(false);
        return;
      }

      const result = await registerAttendance(data);
      setMessage(result.message);
      setSuccess(result.success);
    } catch (error) {
      console.error('QRPass attendance scan failed:', error);
      setMessage('Unable to process this QR code. Please try again.');
      setSuccess(false);
    } finally {
      scanInProgress.current = false;
      setLoading(false);
    }
  };

  const handleScanAgain = () => {
    if (loading) return;
    setScanned(false);
    setLastData(null);
    setMessage(null);
    setSuccess(false);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={
          scanned
            ? undefined
            : handleBarcodeScanned
        }
      />

      {/* Dark camera overlay */}
      <View
        pointerEvents="none"
        style={styles.cameraOverlay}
      />

      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerBadge}>
          <Ionicons
            name="qr-code-outline"
            size={17}
            color={COLORS.accent}
          />

          <Text style={styles.headerBadgeText}>
            QRPass
          </Text>
        </View>

        <Text style={styles.headerTitle}>
          Scan Attendance QR
        </Text>

        <Text style={styles.headerSubtitle}>
          Scan the QR code provided by your
          teacher or event organizer.
        </Text>
      </View>

      {/* QR Scanner Frame */}
      {!scanned && (
        <View
          pointerEvents="none"
          style={styles.scannerArea}
        >
          <View style={styles.scannerFrame}>
            <View
              style={[
                styles.corner,
                styles.cornerTopLeft,
              ]}
            />

            <View
              style={[
                styles.corner,
                styles.cornerTopRight,
              ]}
            />

            <View
              style={[
                styles.corner,
                styles.cornerBottomLeft,
              ]}
            />

            <View
              style={[
                styles.corner,
                styles.cornerBottomRight,
              ]}
            />
          </View>

          <View style={styles.scanHint}>
            <Ionicons
              name="scan-outline"
              size={18}
              color={COLORS.textOnPrimary}
            />

            <Text style={styles.scanHintText}>
              Align the QR code inside the frame
            </Text>
          </View>
        </View>
      )}

      {/* Result Card */}
      {scanned && (
        <View style={styles.resultContainer}>
          <View
            style={[
              styles.resultIcon,
              loading
                ? styles.loadingIcon
                : success
                  ? styles.successIcon
                  : styles.errorIcon,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.accent} />
            ) : (
              <Ionicons
                name={success ? 'checkmark-circle' : 'close-circle'}
                size={38}
                color={success ? COLORS.success : COLORS.danger}
              />
            )}
          </View>

          <Text style={styles.resultTitle}>
            {loading
              ? 'Recording Attendance…'
              : success
                ? 'Attendance Recorded'
                : 'Attendance Failed'}
          </Text>

          {message && (
            <Text
              style={[
                styles.scanResult,
                loading
                  ? styles.loadingText
                  : success
                    ? styles.success
                    : styles.error,
              ]}
            >
              {message}
            </Text>
          )}

          {lastData && (
            <View style={styles.dataContainer}>
              <Ionicons
                name="qr-code-outline"
                size={16}
                color={COLORS.textSecondary}
              />

              <Text
                style={styles.scanData}
                numberOfLines={2}
              >
                {lastData}
              </Text>
            </View>
          )}

          <View style={styles.resultButton}>
            <AppButton
              theme="primary"
              title={loading ? 'Please wait…' : 'Scan Again'}
              icon={loading ? 'time-outline' : 'refresh-outline'}
              onPress={handleScanAgain}
            />
          </View>
        </View>
      )}

      {/* Bottom Instructions */}
      {!scanned && (
        <View style={styles.bottomInfo}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={COLORS.success}
            />
          </View>

          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>
              Secure Attendance
            </Text>

            <Text style={styles.infoText}>
              Your attendance is recorded only
              after the QR code is validated.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  camera: {
    ...StyleSheet.absoluteFillObject,
  },

  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 12, 24, 0.62)',
  },

  // =========================
  // PERMISSION SCREEN
  // =========================

  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  permissionIcon: {
    width: 92,
    height: 92,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  permissionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },

  permissionSubtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 330,
  },

  permissionButton: {
    width: '100%',
    maxWidth: 340,
  },

  // =========================
  // TOP HEADER
  // =========================

  topHeader: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingVertical: 17,
    borderRadius: 20,
    backgroundColor: 'rgba(7, 19, 33, 0.92)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor:
      'rgba(7, 20, 33, 0.85)',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },

  headerBadgeText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
    textAlign: 'center',
  },

  headerSubtitle: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 19,
    color: '#D5E2EE',
    textAlign: 'center',
    maxWidth: 330,
  },

  // =========================
  // SCANNER
  // =========================

  scannerArea: {
    position: 'absolute',
    top: '36%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  scannerFrame: {
    width: 258,
    height: 258,
    position: 'relative',
  },

  corner: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderColor: COLORS.accent,
  },

  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 15,
  },

  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 15,
  },

  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 15,
  },

  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 15,
  },

  scanHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor:
      'rgba(7, 19, 33, 0.94)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  scanHintText: {
    marginLeft: 7,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textOnPrimary,
  },

  // =========================
  // RESULT
  // =========================

  resultContainer: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 28,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    alignItems: 'center',
    boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.28)',
  },

  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  successIcon: {
    backgroundColor:
      'rgba(34, 197, 94, 0.12)',
  },

  errorIcon: {
    backgroundColor:
      'rgba(239, 68, 68, 0.12)',
  },

  loadingIcon: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },

  resultTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },

  scanResult: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 12,
  },

  success: {
    color: COLORS.success,
  },

  error: {
    color: COLORS.danger,
  },

  loadingText: {
    color: COLORS.textSecondary,
  },

  dataContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 16,
  },

  scanData: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginLeft: 7,
  },

  resultButton: {
    width: '100%',
  },

  // =========================
  // BOTTOM INFO
  // =========================

  bottomInfo: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      'rgba(7, 20, 33, 0.88)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor:
      'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoTextContainer: {
    flex: 1,
    marginLeft: 11,
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
    marginBottom: 2,
  },

  infoText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#B8C8D8',
  },
});