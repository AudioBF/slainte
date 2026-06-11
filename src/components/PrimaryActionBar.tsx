import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { colors } from '../theme/colors';
import { elevation, spacing } from '../theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  style?: ViewStyle;
  /** Lift above bottom tab bar (tab screens) */
  aboveTabBar?: boolean;
};

export function PrimaryActionBar({
  label,
  onPress,
  disabled,
  secondaryLabel,
  onSecondaryPress,
  style,
  aboveTabBar = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const tabBarOffset = aboveTabBar ? 64 : 0;

  return (
    <View
      style={[
        styles.outer,
        { bottom: tabBarOffset, paddingBottom: Math.max(insets.bottom, spacing.md) },
        style,
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {secondaryLabel && onSecondaryPress ? (
          <Button
            label={secondaryLabel}
            onPress={onSecondaryPress}
            variant="outline"
            style={styles.secondaryBtn}
          />
        ) : null}
        <Button label={label} onPress={onPress} disabled={disabled} style={styles.primaryBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  bar: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    ...elevation.bar,
  },
  primaryBtn: {
    width: '100%',
  },
  secondaryBtn: {
    width: '100%',
  },
});
