import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { MacroTotals } from '../types';

type Props = {
  planned: MacroTotals;
  actual: MacroTotals;
};

const MACROS = [
  { key: 'protein' as const, label: 'Proteína', color: colors.protein },
  { key: 'carbs' as const, label: 'Carboidrato', color: colors.carbs },
  { key: 'fat' as const, label: 'Gordura', color: colors.fat },
];

export function ComparisonBars({ planned, actual }: Props) {
  return (
    <View>
      <Text style={[typography.subtitle, styles.title]}>Plano × Real</Text>
      {MACROS.map(({ key, label, color }) => {
        const p = planned[key];
        const a = actual[key];
        const max = Math.max(p, a, 1);
        return (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.bars}>
              <View style={styles.barRow}>
                <Text style={styles.barLabel}>Plano</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${(p / max) * 100}%`, backgroundColor: color, opacity: 0.5 }]} />
                </View>
                <Text style={styles.value}>{Math.round(p)}g</Text>
              </View>
              <View style={styles.barRow}>
                <Text style={styles.barLabel}>Real</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${(a / max) * 100}%`, backgroundColor: color }]} />
                </View>
                <Text style={styles.value}>{Math.round(a)}g</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 12,
  },
  row: {
    marginBottom: 14,
  },
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
  },
  bars: {
    gap: 6,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    width: 36,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  value: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.textMuted,
    width: 36,
    textAlign: 'right',
  },
});
