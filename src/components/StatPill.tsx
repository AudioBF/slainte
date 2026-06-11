import { StyleSheet, Text, View } from 'react-native';
import { AiBadge } from './AiBadge';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

type Props = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  compact?: boolean;
  aiEstimate?: boolean;
};

export function StatPill({ calories, protein, carbs, fat, compact, aiEstimate }: Props) {
  const parts: string[] = [];
  if (calories !== undefined) parts.push(`${calories} kcal`);
  if (protein !== undefined) parts.push(`P ${protein}g`);
  if (carbs !== undefined) parts.push(`C ${carbs}g`);
  if (fat !== undefined) parts.push(`G ${fat}g`);

  if (compact) {
    return (
      <View>
        {aiEstimate ? <AiBadge compact /> : null}
        <Text style={styles.compact}>{parts.join(' · ')}</Text>
      </View>
    );
  }

  const items: { key: string; value: string; color: string }[] = [];
  if (calories !== undefined) items.push({ key: 'kcal', value: String(calories), color: colors.forest });
  if (protein !== undefined) items.push({ key: 'p', value: `${protein}g`, color: colors.protein });
  if (carbs !== undefined) items.push({ key: 'c', value: `${carbs}g`, color: colors.carbs });
  if (fat !== undefined) items.push({ key: 'g', value: `${fat}g`, color: colors.fat });

  return (
    <View>
      {aiEstimate ? <AiBadge compact /> : null}
      <View style={styles.row}>
      {items.map((item) => (
        <View key={item.key} style={styles.pill}>
          <Text style={[styles.value, { color: item.color }]}>{item.value}</Text>
          <Text style={[styles.label, { color: item.color }]}>
            {item.key === 'kcal' ? 'kcal' : item.key.toUpperCase()}
          </Text>
        </View>
      ))}
      </View>
    </View>
  );
}

export function formatMacroLine(m: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): string {
  return `${m.calories} kcal · P ${m.protein}g · C ${m.carbs}g · G ${m.fat}g`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pill: {
    backgroundColor: colors.cream,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    minWidth: 52,
  },
  value: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
  },
  label: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  compact: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
