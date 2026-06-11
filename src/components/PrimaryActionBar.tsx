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
        styles.bar,
        { bottom: tabBarOffset, paddingBottom: Math.max(insets.bottom, spacing.md) },
        style,
      ]}
    >
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
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
    ...elevation.bar,
  },
  primaryBtn: {
    width: '100%',
  },
  secondaryBtn: {
    width: '100%',
  },
});
