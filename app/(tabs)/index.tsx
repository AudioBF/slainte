import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { CalorieRing } from '../../src/components/CalorieRing';
import { Card } from '../../src/components/Card';
import { ComparisonBars } from '../../src/components/ComparisonBars';
import { MacroBar } from '../../src/components/MacroBar';
import { Screen } from '../../src/components/Screen';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { TrendChart } from '../../src/components/TrendChart';
import { SLOT_LABELS } from '../../src/constants/meals';
import {
  formatDateLabel,
  offsetDate,
  selectActualForDate,
  selectMealsForDate,
  selectRecentDates,
  selectTodayActual,
  selectWeekCalorieTrend,
  selectWeekComparison,
  sumComponentMacros,
  todayISO,
} from '../../src/store/selectors';
import { useAppStore } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

function DateNavigator({
  date,
  onChange,
}: {
  date: string;
  onChange: (next: string) => void;
}) {
  const today = todayISO();
  const canGoForward = date < today;

  return (
    <View style={styles.dateNav}>
      <Pressable onPress={() => onChange(offsetDate(date, -1))} style={styles.dateArrow}>
        <Text style={styles.dateArrowLabel}>‹</Text>
      </Pressable>
      <Text style={styles.dateLabel}>{formatDateLabel(date)}</Text>
      <Pressable
        onPress={() => canGoForward && onChange(offsetDate(date, 1))}
        style={[styles.dateArrow, !canGoForward && styles.dateArrowDisabled]}
        disabled={!canGoForward}
      >
        <Text style={[styles.dateArrowLabel, !canGoForward && styles.dateArrowLabelDisabled]}>
          ›
        </Text>
      </Pressable>
    </View>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const loggedMeals = useAppStore((s) => s.loggedMeals);
  const plannedMeals = useAppStore((s) => s.plannedMeals);
  const selectedHistoryDate = useAppStore((s) => s.selectedHistoryDate);
  const setSelectedHistoryDate = useAppStore((s) => s.setSelectedHistoryDate);

  const isToday = selectedHistoryDate === todayISO();
  const dayMeals = useMemo(
    () => selectMealsForDate(loggedMeals, selectedHistoryDate),
    [loggedMeals, selectedHistoryDate],
  );
  const dayActual = useMemo(
    () =>
      isToday
        ? selectTodayActual(loggedMeals)
        : selectActualForDate(loggedMeals, selectedHistoryDate),
    [loggedMeals, selectedHistoryDate, isToday],
  );
  const weekComparison = useMemo(
    () => selectWeekComparison(loggedMeals, plannedMeals),
    [loggedMeals, plannedMeals],
  );
  const weekTrend = useMemo(
    () => selectWeekCalorieTrend(loggedMeals),
    [loggedMeals],
  );
  const weekDays = useMemo(() => selectRecentDates(7), []);
  const weekSummaries = useMemo(
    () =>
      weekDays.map((date) => ({
        date,
        actual: selectActualForDate(loggedMeals, date),
        meals: selectMealsForDate(loggedMeals, date),
      })),
    [loggedMeals, weekDays],
  );

  return (
    <Screen>
      <AppHeader
        showGreeting
        displayName={profile.displayName || undefined}
        avatarUri={profile.avatarUri}
        onAvatarPress={() => router.push('/profile')}
      />

      <SegmentedControl
        options={[
          { value: 'today', label: 'Hoje' },
          { value: 'week', label: 'Semana' },
        ]}
        value={viewMode}
        onChange={setViewMode}
      />

      {viewMode === 'today' ? (
        <>
          <DateNavigator date={selectedHistoryDate} onChange={setSelectedHistoryDate} />

          <Card>
            <CalorieRing current={dayActual.calories} goal={profile.dailyGoals.calories} />
            <View style={styles.macros}>
              <MacroBar
                label="Proteína"
                current={dayActual.protein}
                goal={profile.dailyGoals.protein}
                color={colors.protein}
              />
              <MacroBar
                label="Carboidrato"
                current={dayActual.carbs}
                goal={profile.dailyGoals.carbs}
                color={colors.carbs}
              />
              <MacroBar
                label="Gordura"
                current={dayActual.fat}
                goal={profile.dailyGoals.fat}
                color={colors.fat}
              />
            </View>
          </Card>

          <View style={styles.sectionHeader}>
            <Text style={[typography.subtitle, styles.section]}>
              Refeições {isToday ? 'de hoje' : `de ${formatDateLabel(selectedHistoryDate).toLowerCase()}`}
            </Text>
            {isToday ? (
              <Pressable onPress={() => router.push('/meal')}>
                <Text style={styles.addLink}>+ Nova</Text>
              </Pressable>
            ) : null}
          </View>

          {dayMeals.length === 0 ? (
            <Card>
              <Text style={typography.body}>Nenhuma refeição registrada neste dia.</Text>
              {isToday ? (
                <Pressable onPress={() => router.push('/meal')} style={styles.emptyAction}>
                  <Text style={styles.addLink}>Fotografar refeição</Text>
                </Pressable>
              ) : null}
            </Card>
          ) : (
            dayMeals.map((meal) => {
              const total = sumComponentMacros(meal.components);
              return (
                <Pressable key={meal.id} onPress={() => router.push(`/meal-detail/${meal.id}`)}>
                  <Card>
                    <View style={styles.mealRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mealSlot}>{SLOT_LABELS[meal.slot]}</Text>
                        <Text style={typography.subtitle}>{meal.name}</Text>
                        <Text style={typography.caption}>
                          {meal.fromPlan ? 'Do plano' : 'Por foto'} · {total.calories} kcal · P{' '}
                          {total.protein}g
                        </Text>
                      </View>
                      <Text style={styles.editHint}>Editar</Text>
                    </View>
                  </Card>
                </Pressable>
              );
            })
          )}
        </>
      ) : (
        <>
          <Card>
            <TrendChart data={weekTrend} goal={profile.dailyGoals.calories} />
          </Card>
          <Card>
            <ComparisonBars planned={weekComparison.planned} actual={weekComparison.actual} />
          </Card>

          <Text style={[typography.subtitle, styles.section]}>Histórico da semana</Text>
          {weekSummaries
            .slice()
            .reverse()
            .map(({ date, actual, meals }) => (
              <Pressable
                key={date}
                onPress={() => {
                  setSelectedHistoryDate(date);
                  setViewMode('today');
                }}
              >
                <Card style={date === todayISO() ? styles.todayCard : undefined}>
                  <View style={styles.weekRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={typography.subtitle}>{formatDateLabel(date)}</Text>
                      <Text style={typography.caption}>
                        {meals.length} refeiç{meals.length === 1 ? 'ão' : 'ões'} · {actual.calories}{' '}
                        kcal
                      </Text>
                    </View>
                    <Text style={styles.weekCalories}>{actual.calories}</Text>
                  </View>
                </Card>
              </Pressable>
            ))}

          <Card>
            <Text style={typography.caption}>
              Toque em um dia para ver detalhes. Comparativo: o que você planejou versus o que registrou.
            </Text>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateArrowDisabled: {
    opacity: 0.4,
  },
  dateArrowLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 22,
    color: colors.forest,
    lineHeight: 24,
  },
  dateArrowLabelDisabled: {
    color: colors.textMuted,
  },
  dateLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: colors.forest,
    textTransform: 'capitalize',
  },
  macros: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  section: {
    marginBottom: 0,
  },
  addLink: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: colors.orange,
  },
  emptyAction: {
    marginTop: 12,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealSlot: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.orange,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  editHint: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.sage,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weekCalories: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: colors.forest,
  },
  todayCard: {
    borderWidth: 1.5,
    borderColor: colors.forest,
  },
});
