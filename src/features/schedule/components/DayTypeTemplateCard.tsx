import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DayTypeTemplate } from '../../../domain/day-targets';
import { colors } from '../../../theme/colors';
import { radius, spacing, touch } from '../../../theme/tokens';
import { dayTypeCodeLabel } from '../scheduleLogic';

type Props = {
  template: DayTypeTemplate;
  onEdit: () => void;
  onRemove: () => void;
};

export function DayTypeTemplateCard({ template, onEdit, onRemove }: Props) {
  const { dailyGoals } = template;
  return (
    <View style={styles.card} accessibilityLabel={`Tipo de dia ${template.label}`}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.title}>{template.label}</Text>
          <Text style={styles.meta}>
            {dayTypeCodeLabel(template.code)}
            {template.isActive ? ' · Ativo' : ' · Inativo'}
          </Text>
        </View>
        <Text style={styles.kcal}>{dailyGoals.calories} kcal</Text>
      </View>
      {template.description ? (
        <Text style={styles.description}>{template.description}</Text>
      ) : null}
      <Text style={styles.macros}>
        P {dailyGoals.protein} g · C {dailyGoals.carbs} g · G {dailyGoals.fat} g
      </Text>
      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={`Editar ${template.label}`}
        >
          <Text style={styles.actionText}>Editar</Text>
        </Pressable>
        <Pressable
          onPress={onRemove}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${template.label}`}
        >
          <Text style={[styles.actionText, styles.remove]}>Remover</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: colors.text,
  },
  meta: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
  kcal: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: colors.forest,
  },
  description: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.text,
  },
  macros: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.sage,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  actionBtn: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.orange,
  },
  remove: {
    color: colors.navy,
  },
});
