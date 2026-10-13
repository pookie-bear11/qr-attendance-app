import { View, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { COLORS } from '@/constants/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops! Not Found' }} />
      <View style={styles.container}>
        <Link href="/" style={styles.button}>
          Go back to Home screen!
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  button: {
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    color: COLORS.textOnPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
});
