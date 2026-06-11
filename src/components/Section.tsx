import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/tokens';
import { typography } from '../theme/typography';

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
};

export function Section({ title, subtitle, action, children }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={typography.subtitle}>{title}</Text>
          {subtitle ? <Text style={[typography.caption, styles.subtitle]}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

export function SectionAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
      <Text style={styles.action}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    marginTop: 2,
  },
  action: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: colors.orange,
  },
});
