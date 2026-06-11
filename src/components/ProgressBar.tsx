import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';
import { typography } from '../theme/typography';

type Props = {
  current: number;
  total: number;
  label?: string;
};

export function ProgressBar({ current, total, label }: Props) {
  const ratio = total > 0 ? Math.min(current / total, 1) : 0;

  return (
    <View style={styles.wrap}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={typography.caption}>{label}</Text>
          <Text style={styles.count}>
            {current}/{total}
          </Text>
        </View>
      ) : null}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: colors.forest,
  },
  track: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.forest,
    borderRadius: radius.sm,
  },
});
