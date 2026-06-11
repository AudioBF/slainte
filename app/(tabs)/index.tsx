import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AiBadge } from '../../src/components/AiBadge';
import { CalorieRing } from '../../src/components/CalorieRing';
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
import { SLOT_EMOJI, SLOT_LABELS } from '../../src/constants/meals';
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
import { radius, spacing } from '../../src/theme/tokens';
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
  const showFab = isToday && viewMode === 'today';

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
                <Text style={typography.body}>Nenhuma refeição registrada neste dia.</Text>
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
                        subtitle={`${total.calories} kcal · P ${total.protein}g`}
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
            <Card>
              <TrendChart data={weekTrend} goal={profile.dailyGoals.calories} />
            </Card>
            <Card>
              <ComparisonBars planned={weekComparison.planned} actual={weekComparison.actual} />
            </Card>

            <Section title="Histórico da semana" subtitle="Toque em um dia para ver detalhes" />

            <Card flat>
              {weekSummaries
                .slice()
                .reverse()
                .map(({ date, actual, meals }, index, arr) => (
                  <View
                    key={date}
                    style={index < arr.length - 1 ? styles.listDivider : undefined}
                  >
                    <ListRow
                      title={formatDateLabel(date)}
                      subtitle={`${meals.length} refeiç${meals.length === 1 ? 'ão' : 'ões'} · ${actual.calories} kcal`}
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
});
