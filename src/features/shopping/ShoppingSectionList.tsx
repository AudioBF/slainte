import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ShoppingListItem } from '../../components/ShoppingListItem';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/tokens';
import { typography } from '../../theme/typography';
import type { ShoppingItem } from '../../types';
import { groupShoppingBySection } from './shoppingSections';

type Props = {
  items: ShoppingItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
};

export function ShoppingSectionList({ items, onToggle, onRemove }: Props) {
  const sections = useMemo(() => groupShoppingBySection(items), [items]);

  return (
    <Card flat>
      {sections.map((section, sectionIndex) => (
        <View
          key={section.sectionId}
          style={sectionIndex < sections.length - 1 ? styles.sectionBlock : undefined}
        >
          <Text style={styles.sectionHeader}>
            {section.label} · {section.items.length}
          </Text>
          {section.items.map((item, itemIndex) => (
            <View
              key={item.id}
              style={
                itemIndex < section.items.length - 1 ? styles.listDivider : undefined
              }
            >
              <ShoppingListItem
                name={item.name}
                quantity={item.quantity}
                checked={item.checked}
                fromPlan={item.fromPlan}
                onToggle={() => onToggle(item.id)}
                onRemove={() => onRemove(item.id)}
              />
            </View>
          ))}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    ...typography.label,
    color: colors.forest,
    marginBottom: spacing.sm,
  },
  listDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
