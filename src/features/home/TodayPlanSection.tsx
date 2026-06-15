import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { Section } from '../../components/Section';
import { SLOT_EMOJI, SLOT_LABELS } from '../../constants/meals';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/tokens';
import { typography } from '../../theme/typography';
import type { PlannedMeal } from '../../types';
import type { TodayPlanStatus } from './selectTodayPlanStatus';

type Props = {
  status: TodayPlanStatus;
  onRegister: (meal: PlannedMeal) => void;
};

export function TodayPlanSection({ status, onRegister }: Props) {
  const { loggedCount, totalCount, nextUnlogged, allLogged } = status;
  const subtitle = `${loggedCount} de ${totalCount} refeições registradas`;

  return (
    <>
      <Section title="Cardápio de hoje" subtitle={subtitle} />
      <Card style={styles.card}>
        <ProgressBar current={loggedCount} total={totalCount} />

        {allLogged ? (
          <Text style={[typography.body, styles.complete]}>
            Todas as refeições do plano de hoje foram registradas.
          </Text>
        ) : nextUnlogged ? (
          <View style={styles.nextMeal}>
            <View style={styles.mealRow}>
              <View style={styles.iconWrap}>
                <Text style={styles.icon}>{SLOT_EMOJI[nextUnlogged.slot]}</Text>
              </View>
              <View style={styles.mealBody}>
                <Text style={styles.eyebrow}>
                  {nextUnlogged.time} · {SLOT_LABELS[nextUnlogged.slot]}
                </Text>
                <Text style={typography.subtitle} numberOfLines={2}>
                  {nextUnlogged.name}
                </Text>
                <Text style={typography.caption}>~{Math.round(nextUnlogged.calories)} kcal</Text>
              </View>
            </View>
            <Button
              label="Registrar"
              onPress={() => onRegister(nextUnlogged)}
              variant="outline"
              style={styles.registerBtn}
            />
          </View>
        ) : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cream,
  },
  complete: {
    marginTop: spacing.md,
    color: colors.textMuted,
  },
  nextMeal: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  mealBody: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.orange,
    marginBottom: spacing.xs,
  },
  registerBtn: {
    alignSelf: 'stretch',
    paddingVertical: 10,
  },
});
