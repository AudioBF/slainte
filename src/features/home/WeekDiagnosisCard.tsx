import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/tokens';
import { typography } from '../../theme/typography';
import type { WeeklyInsight } from './selectWeeklyInsights';

type Props = {
  insights: WeeklyInsight[];
};

export function WeekDiagnosisCard({ insights }: Props) {
  const lines =
    insights.length > 0
      ? insights
      : [
          {
            id: 'fallback',
            message: 'Registre refeições durante a semana para ver um resumo aqui.',
          },
        ];

  return (
    <Card style={styles.card}>
      <Text style={typography.subtitle}>Resumo da semana</Text>
      <View style={styles.bullets}>
        {lines.map((insight) => (
          <Text key={insight.id} style={[typography.body, styles.bullet]}>
            • {insight.message}
          </Text>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cream,
  },
  bullets: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  bullet: {
    color: colors.textMuted,
  },
});
