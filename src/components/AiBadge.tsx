import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

type Props = {
  compact?: boolean;
};

export function AiBadge({ compact }: Props) {
  return (
    <View style={[styles.badge, compact && styles.badgeCompact]} accessibilityLabel="Estimativa gerada por IA">
      <Text style={[styles.text, compact && styles.textCompact]}>Estimativa IA</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cream,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    color: colors.sage,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textCompact: {
    fontSize: 9,
  },
});
