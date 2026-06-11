import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing, touch } from '../theme/tokens';
import { typography } from '../theme/typography';

type Props = {
  name: string;
  quantity: string;
  checked: boolean;
  fromPlan?: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function ShoppingListItem({
  name,
  quantity,
  checked,
  fromPlan,
  onToggle,
  onRemove,
}: Props) {
  return (
    <View style={[styles.row, checked && styles.rowChecked]}>
      <Pressable
        onPress={onToggle}
        style={styles.checkArea}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`${name}, ${quantity}`}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
      </Pressable>

      <Pressable onPress={onToggle} style={styles.body}>
        <Text style={[typography.subtitle, checked && styles.nameChecked]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={typography.caption}>{quantity}</Text>
      </Pressable>

      {fromPlan ? <Text style={styles.badge}>plano</Text> : null}

      <Pressable
        onPress={onRemove}
        hitSlop={8}
        style={styles.removeBtn}
        accessibilityRole="button"
        accessibilityLabel={`Remover ${name}`}
      >
        <Text style={styles.removeLabel}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  rowChecked: {
    opacity: 0.65,
  },
  checkArea: {
    minWidth: touch.min,
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  checkmark: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  nameChecked: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  badge: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 10,
    color: colors.orange,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  removeBtn: {
    minWidth: touch.min,
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 22,
    color: colors.textMuted,
    lineHeight: 24,
  },
});
