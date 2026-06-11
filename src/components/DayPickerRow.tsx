import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';
import { typography } from '../theme/typography';
import { ListRow } from './ListRow';

export const WEEKDAY_LABELS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
] as const;

export const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

type Props = {
  value: number;
  onChange: (dayIndex: number) => void;
  mealCount?: number;
};

export function DayPickerRow({ value, onChange, mealCount }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ListRow
        title="Dia da semana"
        subtitle={WEEKDAY_LABELS[value]}
        trailing={mealCount !== undefined ? `${mealCount} refeições` : undefined}
        onPress={() => setOpen(true)}
      />

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>Escolher dia</Text>
            {WEEKDAY_LABELS.map((label, index) => {
              const selected = index === value;
              return (
                <Pressable
                  key={label}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => {
                    onChange(index);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {label}
                  </Text>
                  {selected ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 67, 50, 0.45)',
    justifyContent: 'flex-end',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  sheetTitle: {
    ...typography.subtitle,
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  optionSelected: {
    backgroundColor: colors.cream,
  },
  optionText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.forest,
    fontFamily: 'Outfit_600SemiBold',
  },
  check: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: colors.forest,
  },
});
