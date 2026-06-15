import { StyleSheet, Text, View } from 'react-native';
import type { DailyInsight, InsightSeverity } from '../features/home/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/tokens';
import { typography } from '../theme/typography';
import { Button } from './Button';
import { Card } from './Card';

type Props = {
  insight: DailyInsight;
  onAction?: () => void;
};

const SEVERITY_ACCENT: Record<InsightSeverity, string> = {
  info: colors.sage,
  success: colors.success,
  warning: colors.orange,
};

export function InsightCard({ insight, onAction }: Props) {
  const accent = SEVERITY_ACCENT[insight.severity];

  return (
    <Card style={{ ...styles.card, borderLeftColor: accent }}>
      <Text style={typography.subtitle}>{insight.title}</Text>
      <Text style={[typography.body, styles.message]}>{insight.message}</Text>
      {insight.actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={insight.actionLabel} onPress={onAction} variant="outline" />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cream,
    borderLeftWidth: 4,
    borderLeftColor: colors.sage,
  },
  message: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  action: {
    marginTop: spacing.md,
  },
});
