import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { elevation, radius, spacing } from '../theme/tokens';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  /** No outer margin — for nested use inside Section */
  flat?: boolean;
};

export function Card({ children, style, flat }: Props) {
  return <View style={[styles.card, flat && styles.flat, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...elevation.card,
  },
  flat: {
    marginBottom: 0,
  },
});
