import { StyleSheet, Text, View } from 'react-native';
import { useRotatingMessage } from '../hooks/useRotatingMessage';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';
import { typography } from '../theme/typography';
import { SkeletonBox, SkeletonRow } from './Skeleton';

type Variant = 'meal' | 'mealPlan' | 'shopping';

type Props = {
  variant: Variant;
  messages?: readonly string[];
  active?: boolean;
};

export function AiLoadingSkeleton({ variant, messages, active = true }: Props) {
  const fallback = variant === 'meal'
    ? 'Analisando foto...'
    : variant === 'mealPlan'
      ? 'Gerando cardápio...'
      : 'Montando lista...';
  const rotating = useRotatingMessage(messages ?? [fallback], active && !!messages?.length);
  const display = messages?.length ? rotating : fallback;

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      {variant === 'meal' ? (
        <View style={styles.mealLayout}>
          <SkeletonBox height={120} borderRadius={radius.md} />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : null}

      {variant === 'mealPlan' ? (
        <View style={styles.planLayout}>
          <SkeletonBox height={48} borderRadius={radius.md} />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : null}

      {variant === 'shopping' ? (
        <View style={styles.shoppingLayout}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : null}

      <Text style={[typography.caption, styles.message]}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealLayout: {
    gap: spacing.sm,
  },
  planLayout: {
    gap: spacing.xs,
  },
  shoppingLayout: {
    gap: 0,
  },
  message: {
    textAlign: 'center',
    marginTop: spacing.md,
    color: colors.textMuted,
  },
});
