import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { AiBadge } from '../../src/components/AiBadge';
import { CalorieRing } from '../../src/components/CalorieRing';
import { InsightCard } from '../../src/components/InsightCard';
import { Card } from '../../src/components/Card';
import { ComparisonBars } from '../../src/components/ComparisonBars';
import { ListRow } from '../../src/components/ListRow';
import { MacroBar } from '../../src/components/MacroBar';
import { PrimaryActionBar } from '../../src/components/PrimaryActionBar';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Section, SectionAction } from '../../src/components/Section';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { TrendChart } from '../../src/components/TrendChart';
import {
  selectPrimaryDailyInsight,
  selectTodayPlanStatus,
  selectWeeklyInsights,
  shouldShowWeekComparison,
  TodayPlanSection,
  WeekDiagnosisCard,
} from '../../src/features/home';
import { SLOT_EMOJI, SLOT_LABELS } from '../../src/constants/meals';
import { env } from '../../src/lib/env';
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
import {
  selectEffectiveNutritionTargetForDate,
  selectHomeTodayISO,
  selectWeekDiagnosisInsightsFromComparison,
  selectWeekNutritionComparison,
} from '../../src/store/selectors/dayTargets';
import { useAppStore } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/tokens';
import { typography } from '../../src/theme/typography';

function DateNavigator({
  date,
  today,
  onChange,
}: {
  date: string;
  today: string;
  onChange: (next: string) => void;
}) {
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

function dayListSubtitle(input: {
  status: 'future' | 'no_log' | 'logged';
  mealCount: number;
  calories: number | null;
  flagOn: boolean;
}): string {
  if (!input.flagOn) {
    return `${input.mealCount} refeiç${input.mealCount === 1 ? 'ão' : 'ões'} · ${input.calories ?? 0} kcal`;
  }
  if (input.status === 'future') return 'Dia futuro';
  if (input.status === 'no_log') return 'Sem registro';
  return `${input.mealCount} refeiç${input.mealCount === 1 ? 'ão' : 'ões'} · ${input.calories ?? 0} kcal`;
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
  const logPlannedMeal = useAppStore((s) => s.logPlannedMeal);
  const dayTypeTemplates = useAppStore((s) => s.dayTypeTemplates);
  const weeklySchedule = useAppStore((s) => s.weeklySchedule);
  const dailyTargetOverrides = useAppStore((s) => s.dailyTargetOverrides);

  const flagOn = env.useDayTargets;
  const displayToday = useMemo(() => selectHomeTodayISO(flagOn), [flagOn]);
  const isToday = selectedHistoryDate === displayToday;

  const effectiveTarget = useMemo(
    () =>
      selectEffectiveNutritionTargetForDate({
        profile,
        dayTypeTemplates,
        weeklySchedule,
        dailyTargetOverrides,
        dateISO: selectedHistoryDate,
        flagEnabled: flagOn,
      }),
    [
      profile,
      dayTypeTemplates,
      weeklySchedule,
      dailyTargetOverrides,
      selectedHistoryDate,
      flagOn,
    ],
  );
  const dayGoals = effectiveTarget.dailyGoals;

  const dayMeals = useMemo(
    () => selectMealsForDate(loggedMeals, selectedHistoryDate),
    [loggedMeals, selectedHistoryDate],
  );
  const dayActual = useMemo(
    () =>
      isToday && !flagOn
        ? selectTodayActual(loggedMeals)
        : selectActualForDate(loggedMeals, selectedHistoryDate),
    [loggedMeals, selectedHistoryDate, isToday, flagOn],
  );
  const weekComparison = useMemo(
    () => selectWeekComparison(loggedMeals, plannedMeals),
    [loggedMeals, plannedMeals],
  );

  const weekNutrition = useMemo(() => {
    if (!flagOn || viewMode !== 'week') return null;
    return selectWeekNutritionComparison({
      profile,
      dayTypeTemplates,
      weeklySchedule,
      dailyTargetOverrides,
      loggedMeals,
      referenceDateISO: displayToday,
      todayISO: displayToday,
      flagEnabled: true,
    });
  }, [
    flagOn,
    viewMode,
    profile,
    dayTypeTemplates,
    weeklySchedule,
    dailyTargetOverrides,
    loggedMeals,
    displayToday,
  ]);

  const weekTrend = useMemo(() => {
    if (flagOn && weekNutrition) {
      return weekNutrition.perDay.map((d) =>
        d.status === 'logged' ? (d.actual?.calories ?? 0) : 0,
      );
    }
    return selectWeekCalorieTrend(loggedMeals);
  }, [flagOn, weekNutrition, loggedMeals]);

  const weekTrendGoals = useMemo(() => {
    if (flagOn && weekNutrition) {
      return weekNutrition.perDay.map((d) => d.target.dailyGoals.calories);
    }
    return profile.dailyGoals.calories;
  }, [flagOn, weekNutrition, profile.dailyGoals.calories]);

  const weekDays = useMemo(() => selectRecentDates(7), []);
  const weekSummariesLegacy = useMemo(
    () =>
      weekDays.map((date) => ({
        date,
        actual: selectActualForDate(loggedMeals, date),
        meals: selectMealsForDate(loggedMeals, date),
      })),
    [loggedMeals, weekDays],
  );

  const todayPlanStatus = useMemo(() => {
    if (!isToday || viewMode !== 'today') return null;
    return selectTodayPlanStatus(loggedMeals, plannedMeals);
  }, [isToday, viewMode, loggedMeals, plannedMeals]);

  const dailyInsight = useMemo(() => {
    if (!isToday || viewMode !== 'today') return null;
    return selectPrimaryDailyInsight({
      loggedMeals,
      plannedMeals,
      dailyGoals: dayGoals,
      profileGoal: profile.goal,
      dayMeals,
      dayActual,
      skipPlanPending: Boolean(todayPlanStatus?.nextUnlogged),
    });
  }, [
    isToday,
    viewMode,
    loggedMeals,
    plannedMeals,
    dayGoals,
    profile.goal,
    dayMeals,
    dayActual,
    todayPlanStatus,
  ]);

  const showFab =
    isToday &&
    viewMode === 'today' &&
    dayMeals.length === 0 &&
    !dailyInsight?.actionRoute;

  const weeklyInsights = useMemo(() => {
    if (viewMode !== 'week') return [];
    if (flagOn && weekNutrition) {
      return selectWeekDiagnosisInsightsFromComparison(weekNutrition);
    }
    return selectWeeklyInsights({
      loggedMeals,
      plannedMeals,
      dailyGoals: profile.dailyGoals,
    });
  }, [viewMode, flagOn, weekNutrition, loggedMeals, plannedMeals, profile.dailyGoals]);

  const showWeekComparison = useMemo(
    () => viewMode === 'week' && shouldShowWeekComparison(plannedMeals),
    [viewMode, plannedMeals],
  );

  const mealSectionTitle = isToday
    ? 'Refeições de hoje'
    : `Refeições de ${formatDateLabel(selectedHistoryDate).toLowerCase()}`;

  return (
    <View style={styles.root}>
      <Screen footerSpace={showFab ? 80 + 64 : 0}>
        <ScreenHeader
          home
          title="Hoje"
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
            <DateNavigator
              date={selectedHistoryDate}
              today={displayToday}
              onChange={setSelectedHistoryDate}
            />

            {!isToday ? (
              <Card style={styles.pastHint}>
                <Text style={typography.caption}>
                  Você está vendo um dia anterior. Refeições novas aparecem em Hoje.
                </Text>
                <Button
                  label="Ir para hoje"
                  onPress={() => setSelectedHistoryDate(displayToday)}
                  variant="outline"
                  style={{ marginTop: spacing.sm }}
                />
              </Card>
            ) : null}

            {isToday && dailyInsight ? (
              <InsightCard
                insight={dailyInsight}
                onAction={
                  dailyInsight.actionRoute
                    ? () => router.push(dailyInsight.actionRoute!)
                    : undefined
                }
              />
            ) : null}

            <Card>
              <CalorieRing current={dayActual.calories} goal={dayGoals.calories} />
              {flagOn && effectiveTarget.label ? (
                <Text
                  style={styles.targetLabel}
                  accessibilityLabel={effectiveTarget.label}
                >
                  {effectiveTarget.label}
                </Text>
              ) : null}
              <View style={styles.macros}>
                <MacroBar
                  label="Proteína"
                  current={dayActual.protein}
                  goal={dayGoals.protein}
                  color={colors.protein}
                />
                <MacroBar
                  label="Carboidrato"
                  current={dayActual.carbs}
                  goal={dayGoals.carbs}
                  color={colors.carbs}
                />
                <MacroBar
                  label="Gordura"
                  current={dayActual.fat}
                  goal={dayGoals.fat}
                  color={colors.fat}
                />
                <Text style={typography.caption}>
                  Valores somam o que você registrou hoje.
                </Text>
              </View>
            </Card>

            {todayPlanStatus ? (
              <TodayPlanSection status={todayPlanStatus} onRegister={logPlannedMeal} />
            ) : null}

            <Section
              title={mealSectionTitle}
              action={
                isToday ? (
                  <SectionAction label="+ Nova" onPress={() => router.push('/meal')} />
                ) : undefined
              }
            />

            {dayMeals.length === 0 ? (
              <Card>
                <Text style={typography.body}>
                  Nada registrado ainda. Use Registrar no cardápio de hoje ou Fotografar uma
                  refeição.
                </Text>
              </Card>
            ) : (
              <Card flat>
                {dayMeals.map((meal, index) => {
                  const total = sumComponentMacros(meal.components);
                  const isLast = index === dayMeals.length - 1;
                  return (
                    <View key={meal.id} style={!isLast ? styles.listDivider : undefined}>
                      <ListRow
                        icon={SLOT_EMOJI[meal.slot]}
                        eyebrow={meal.fromPlan ? SLOT_LABELS[meal.slot] : 'Por foto'}
                        title={meal.name}
                        subtitle={`${total.calories} kcal · P ${Math.round(total.protein)}g`}
                        onPress={() => router.push(`/meal-detail/${meal.id}`)}
                      />
                      {!meal.fromPlan ? (
                        <View style={styles.aiBadgeRow}>
                          <AiBadge compact />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </Card>
            )}
          </>
        ) : (
          <>
            <WeekDiagnosisCard insights={weeklyInsights} />
            <Card>
              <TrendChart data={weekTrend} goal={weekTrendGoals} />
            </Card>
            {showWeekComparison ? (
              <Card>
                <ComparisonBars planned={weekComparison.planned} actual={weekComparison.actual} />
              </Card>
            ) : null}

            <Section title="Histórico da semana" subtitle="Toque em um dia para ver detalhes" />

            <Card flat>
              {flagOn && weekNutrition
                ? weekNutrition.perDay.map((day, index, arr) => (
                    <View
                      key={day.dateISO}
                      style={index < arr.length - 1 ? styles.listDivider : undefined}
                    >
                      <ListRow
                        title={formatDateLabel(day.dateISO)}
                        subtitle={dayListSubtitle({
                          status: day.status,
                          mealCount: day.mealCount,
                          calories: day.actual?.calories ?? null,
                          flagOn: true,
                        })}
                        trailing={
                          day.status === 'logged'
                            ? String(day.actual?.calories ?? 0)
                            : day.status === 'future'
                              ? '—'
                              : '—'
                        }
                        showChevron={day.status !== 'future'}
                        highlighted={day.dateISO === displayToday}
                        onPress={
                          day.status === 'future'
                            ? undefined
                            : () => {
                                setSelectedHistoryDate(day.dateISO);
                                setViewMode('today');
                              }
                        }
                      />
                    </View>
                  ))
                : weekSummariesLegacy
                    .slice()
                    .reverse()
                    .map(({ date, actual, meals }, index, arr) => (
                      <View
                        key={date}
                        style={index < arr.length - 1 ? styles.listDivider : undefined}
                      >
                        <ListRow
                          title={formatDateLabel(date)}
                          subtitle={dayListSubtitle({
                            status: 'logged',
                            mealCount: meals.length,
                            calories: actual.calories,
                            flagOn: false,
                          })}
                          trailing={String(actual.calories)}
                          showChevron
                          highlighted={date === todayISO()}
                          onPress={() => {
                            setSelectedHistoryDate(date);
                            setViewMode('today');
                          }}
                        />
                      </View>
                    ))}
            </Card>
          </>
        )}
      </Screen>

      {showFab ? (
        <PrimaryActionBar
          label="Fotografar refeição"
          onPress={() => router.push('/meal')}
          aboveTabBar
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
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
    marginTop: spacing.xl,
  },
  targetLabel: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
    color: colors.textMuted,
  },
  listDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
  aiBadgeRow: {
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
    paddingLeft: 52,
  },
  pastHint: {
    backgroundColor: colors.cream,
    marginBottom: spacing.md,
  },
});
