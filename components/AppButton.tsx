import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  theme?: 'primary';
  onPress: () => void;
  disabled?: boolean;
};

export default function AppButton({
  title,
  icon,
  theme,
  onPress,
  disabled,
}: Props) {
  const isPrimary = theme === 'primary';

  return (
    <View style={styles.buttonOuter}>
      <Pressable
        style={({ pressed }) => [
          styles.buttonInner,

          isPrimary
            ? styles.primaryButton
            : styles.secondaryButton,

          disabled && styles.disabledButton,

          pressed &&
            !disabled &&
            styles.pressedButton,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <View
          style={[
            styles.iconContainer,
            isPrimary
              ? styles.primaryIconContainer
              : styles.secondaryIconContainer,
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={
              isPrimary
                ? COLORS.textOnPrimary
                : COLORS.accent
            }
          />
        </View>

        <Text
          style={[
            styles.label,
            isPrimary
              ? styles.primaryLabel
              : styles.secondaryLabel,
            disabled && styles.disabledLabel,
          ]}
        >
          {title}
        </Text>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={
            isPrimary
              ? COLORS.textOnPrimary
              : COLORS.textSecondary
          }
          style={styles.arrow}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonOuter: {
    width: '100%',
    marginBottom: 14,
  },

  buttonInner: {
    minHeight: 54,
    borderRadius: 14,

    paddingVertical: 10,
    paddingHorizontal: 14,

    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1,
  },

  // =========================
  // PRIMARY BUTTON
  // =========================

  primaryButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  // =========================
  // SECONDARY BUTTON
  // =========================

  secondaryButton: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },

  // =========================
  // ICON
  // =========================

  iconContainer: {
    width: 38,
    height: 38,

    borderRadius: 11,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 11,
  },

  primaryIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  secondaryIconContainer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // =========================
  // TEXT
  // =========================

  label: {
    flex: 1,

    fontSize: 15,
    fontWeight: '700',
  },

  primaryLabel: {
    color: COLORS.textOnPrimary,
  },

  secondaryLabel: {
    color: COLORS.textPrimary,
  },

  // =========================
  // ARROW
  // =========================

  arrow: {
    marginLeft: 8,
  },

  // =========================
  // PRESS EFFECT
  // =========================

  pressedButton: {
    opacity: 0.78,
  },

  // =========================
  // DISABLED
  // =========================

  disabledButton: {
    opacity: 0.45,
  },

  disabledLabel: {
    color: COLORS.textSecondary,
  },
});