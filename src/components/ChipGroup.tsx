import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing, touch } from '../theme/tokens';

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** chip = pill tags, day = compact circles for weekdays */
  variant?: 'chip' | 'day';
};

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  variant = 'chip',
}: Props<T>) {
  return (
    <View style={[styles.row, variant === 'day' && styles.dayRow]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              variant === 'day' ? styles.dayChip : styles.chip,
              active && styles.chipActive,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                variant === 'day' ? styles.dayLabel : styles.chipLabel,
                active && styles.chipLabelActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dayRow: {
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: touch.min,
    justifyContent: 'center',
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  chipLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.text,
  },
  dayLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: colors.textMuted,
  },
  chipLabelActive: {
    color: colors.white,
  },
});
