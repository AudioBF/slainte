import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/tokens';

type Props = {
  steps: readonly string[];
  currentIndex: number;
};

export function StepIndicator({ steps, currentIndex }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {steps.map((label, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <View key={label} style={styles.step} accessibilityRole="tab">
            <View style={styles.track}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  active && styles.dotActive,
                ]}
              >
                {done ? <Text style={styles.check}>✓</Text> : null}
              </View>
              {index < steps.length - 1 ? (
                <View style={[styles.line, done && styles.lineDone]} />
              ) : null}
            </View>
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  step: {
    flex: 1,
    alignItems: 'center',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    borderColor: colors.forest,
    backgroundColor: colors.forest,
  },
  dotDone: {
    borderColor: colors.forest,
    backgroundColor: colors.forest,
  },
  check: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 2,
    maxWidth: 40,
  },
  lineDone: {
    backgroundColor: colors.sage,
  },
  label: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.forest,
    fontFamily: 'Outfit_600SemiBold',
  },
});
