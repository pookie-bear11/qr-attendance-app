import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  title: string;
};

export default function Header({
  title,
}: Props) {
  return (
    <View style={styles.container}>
      {/* =========================
          BRAND
          ========================= */}

      <View style={styles.brandRow}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.brandTextContainer}>
          <Text style={styles.appName}>
            QRPass
          </Text>

          <Text style={styles.schoolText}>
            SCHOOL EVENT ATTENDANCE
          </Text>
        </View>
      </View>

      {/* =========================
          PAGE TITLE
          ========================= */}

      {title !== 'QRPass' && (
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {title}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 6,
    paddingBottom: 12,
  },

  /* =========================
     BRAND
     ========================= */

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  logo: {
    width: 42,
    height: 42,
  },

  brandTextContainer: {
    marginLeft: 12,
  },

  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },

  schoolText: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.accent,
  },

  /* =========================
     PAGE TITLE
     ========================= */

  titleContainer: {
    marginTop: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});