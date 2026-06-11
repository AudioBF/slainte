import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
  borderRadius?: number;
};

export function SkeletonBox({
  width = '100%',
  height = 16,
  style,
  borderRadius = radius.sm,
}: Props) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.box,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonRow() {
  return (
    <View style={styles.row}>
      <SkeletonBox width={40} height={40} borderRadius={radius.md} />
      <View style={styles.rowText}>
        <SkeletonBox width="70%" height={14} />
        <SkeletonBox width="45%" height={12} style={{ marginTop: spacing.sm }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  rowText: {
    flex: 1,
  },
});
