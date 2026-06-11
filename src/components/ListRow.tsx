import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';
import { typography } from '../theme/typography';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Right side — e.g. kcal number or chevron */
  trailing?: string;
  showChevron?: boolean;
  onPress?: () => void;
  highlighted?: boolean;
  icon?: string;
};

export function ListRow({
  eyebrow,
  title,
  subtitle,
  trailing,
  showChevron = true,
  onPress,
  highlighted,
  icon,
}: Props) {
  const content = (
    <View style={[styles.row, highlighted && styles.rowHighlighted]}>
      {icon ? (
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      ) : null}
      <View style={styles.body}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={typography.subtitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[typography.caption, styles.subtitle]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {trailing ? <Text style={styles.trailingText}>{trailing}</Text> : null}
        {showChevron && onPress ? <Text style={styles.chevron}>›</Text> : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  rowHighlighted: {
    borderLeftWidth: 3,
    borderLeftColor: colors.forest,
    paddingLeft: spacing.sm,
    marginLeft: -spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.orange,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  subtitle: {
    marginTop: 2,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 2,
  },
  trailingText: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 18,
    color: colors.forest,
  },
  chevron: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 22,
    color: colors.sage,
    lineHeight: 24,
  },
});
