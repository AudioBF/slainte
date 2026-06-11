import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ProfileGoal } from '../features/profile';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

export type GoalOption = {
  value: ProfileGoal;
  label: string;
  description: string;
};

type Props = {
  options: readonly GoalOption[];
  value: ProfileGoal;
  onChange: (value: ProfileGoal) => void;
};

export function GoalPicker({ options, value, onChange }: Props) {
  return (
    <View style={styles.list}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.option, active && styles.optionActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <View style={styles.textBlock}>
              <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
              <Text style={[styles.description, active && styles.descriptionActive]}>
                {option.description}
              </Text>
            </View>
            <View style={[styles.radio, active && styles.radioActive]}>
              {active ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.md,
  },
  optionActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: colors.text,
  },
  labelActive: {
    color: colors.white,
  },
  description: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  descriptionActive: {
    color: colors.textOnDark,
    opacity: 0.85,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.white,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gold,
  },
});
