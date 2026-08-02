import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DayTypeTemplate } from '../../../domain/day-targets';
import { colors } from '../../../theme/colors';
import { radius, spacing, touch } from '../../../theme/tokens';

type Props = {
  weekdayLabel: string;
  template: DayTypeTemplate | null;
  usingProfileDefault: boolean;
  orphaned?: boolean;
  onPress: () => void;
};

export function WeeklyScheduleRow({
  weekdayLabel,
  template,
  usingProfileDefault,
  orphaned,
  onPress,
}: Props) {
  const subtitle = orphaned
    ? 'Template ausente — toque para corrigir'
    : usingProfileDefault || !template
      ? 'Usar meta padrão do perfil'
      : template.label;

  const trailing =
    template && !orphaned ? `${template.dailyGoals.calories} kcal` : 'Padrão';

  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`${weekdayLabel}. ${subtitle}. ${trailing}`}
    >
      <View style={[styles.dot, template && !orphaned ? styles.dotActive : styles.dotMuted]} />
      <View style={styles.body}>
        <Text style={styles.title}>{weekdayLabel}</Text>
        <Text style={[styles.subtitle, orphaned && styles.orphan]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Text style={styles.trailing}>{trailing}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  dotActive: {
    backgroundColor: colors.orange,
  },
  dotMuted: {
    backgroundColor: colors.border,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
  orphan: {
    color: colors.orange,
  },
  trailing: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.forest,
  },
  chevron: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 22,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
});
