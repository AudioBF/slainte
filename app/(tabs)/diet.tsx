import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AiBadge } from '../../src/components/AiBadge';
import { AiLoadingSkeleton } from '../../src/components/AiLoadingSkeleton';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { ChipGroup } from '../../src/components/ChipGroup';
import { DayPickerRow } from '../../src/components/DayPickerRow';
import { InputField } from '../../src/components/InputField';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Section } from '../../src/components/Section';
import { StatPill } from '../../src/components/StatPill';
import { MEAL_PLAN_MESSAGES } from '../../src/constants/ai-messages';
import { useMealPlanGenerator } from '../../src/features/diet';
import type { ProfileGoal } from '../../src/features/profile';
import { isPlannedMealLoggedToday } from '../../src/store/selectors';
import { useAppStore } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/tokens';
import { typography } from '../../src/theme/typography';
import type { PlannedMeal } from '../../src/types';

const GOAL_OPTIONS = [
  { value: 'lose', label: 'Emagrecimento' },
  { value: 'maintain', label: 'Manutenção' },
  { value: 'gain', label: 'Hipertrofia' },
] as const satisfies readonly { value: ProfileGoal; label: string }[];

const SLOT_LABELS: Record<string, string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
};

export default function DietScreen() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const logPlannedMeal = useAppStore((s) => s.logPlannedMeal);
  const loggedMeals = useAppStore((s) => s.loggedMeals);
  const plannedMeals = useAppStore((s) => s.plannedMeals);
  const recipes = useAppStore((s) => s.recipes);
  const selectedDietDay = useAppStore((s) => s.selectedDietDay);
  const setSelectedDietDay = useAppStore((s) => s.setSelectedDietDay);
  const { generate, loading: generating, error } = useMealPlanGenerator();
  const mealPlanSummary = useAppStore((s) => s.mealPlanSummary);

  const [restrictions, setRestrictions] = useState(profile.restrictions);

  const hasPlan = plannedMeals.length > 0;
  const dayMeals = plannedMeals.filter((m) => m.dayIndex === selectedDietDay);

  async function handleGenerate() {
    await generate(restrictions);
  }

  function openRecipe(meal: PlannedMeal) {
    if (meal.recipeId) {
      router.push(`/recipe/${meal.recipeId}`);
      return;
    }
    const match = recipes.find(
      (r) => r.name.trim().toLowerCase() === meal.name.trim().toLowerCase(),
    );
    if (match) {
      router.push(`/recipe/${match.id}`);
    }
  }

  function hasRecipe(meal: PlannedMeal) {
    if (meal.recipeId) return true;
    return recipes.some((r) => r.name.trim().toLowerCase() === meal.name.trim().toLowerCase());
  }

  return (
    <Screen>
      <ScreenHeader title="Dieta" subtitle="Cardápio semanal com meal-prep" />

      <Section
        title={hasPlan ? 'Gerar novo plano' : 'Seu plano semanal'}
        subtitle={
          hasPlan
            ? 'Ajuste objetivo ou restrições e gere outra versão'
            : 'Defina objetivo e preferências — a IA monta o cardápio'
        }
      >
        <Card flat>
          <Text style={typography.label}>Objetivo</Text>
          <ChipGroup
            options={GOAL_OPTIONS}
            value={profile.goal}
            onChange={(g) => updateProfile({ goal: g as ProfileGoal })}
          />

          <InputField
            label="Restrições e preferências"
            multiline
            numberOfLines={3}
            value={restrictions}
            onChangeText={setRestrictions}
            placeholder="4 refeições no dia, sem glúten, intolerâncias..."
          />

          <Button
            label={generating ? 'Gerando cardápio… (até 2 min)' : 'Gerar cardápio da semana'}
            onPress={handleGenerate}
            disabled={generating}
            style={{ marginTop: spacing.lg }}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {generating ? (
            <AiLoadingSkeleton variant="mealPlan" messages={MEAL_PLAN_MESSAGES} active={generating} />
          ) : null}
        </Card>
      </Section>

      {hasPlan ? (
        <>
          {mealPlanSummary ? (
            <Card style={styles.summaryCard}>
              <Text style={typography.label}>Resumo do plano</Text>
              <Text style={typography.body}>{mealPlanSummary}</Text>
            </Card>
          ) : null}

          <Section title="Cardápio" subtitle="Escolha o dia e toque na refeição para ver a receita" />

          <Card flat>
            <DayPickerRow
              value={selectedDietDay}
              onChange={setSelectedDietDay}
              mealCount={dayMeals.length}
            />
          </Card>

          {dayMeals.length === 0 ? (
            <Card>
              <Text style={typography.body}>Nenhuma refeição planejada para este dia.</Text>
            </Card>
          ) : (
            dayMeals.map((meal) => {
              const logged = isPlannedMealLoggedToday(loggedMeals, meal.id);
              const recipeAvailable = hasRecipe(meal);
              return (
                <Card key={meal.id}>
                  <Pressable
                    onPress={() => recipeAvailable && openRecipe(meal)}
                    disabled={!recipeAvailable}
                    accessibilityRole={recipeAvailable ? 'button' : undefined}
                    accessibilityLabel={
                      recipeAvailable ? `Ver receita de ${meal.name}` : undefined
                    }
                  >
                    <View style={styles.mealHeader}>
                      <View style={styles.mealTitleBlock}>
                        <Text style={styles.mealTime}>
                          {meal.time} · {SLOT_LABELS[meal.slot]}
                        </Text>
                        <Text style={typography.subtitle}>{meal.name}</Text>
                        {recipeAvailable ? (
                          <Text style={styles.recipeHint}>Toque para ver receita e preparo ›</Text>
                        ) : null}
                      </View>
                      {recipeAvailable ? <Text style={styles.chevron}>›</Text> : null}
                    </View>
                  </Pressable>

                  <AiBadge compact />
                  <StatPill
                    calories={meal.calories}
                    protein={meal.protein}
                    carbs={meal.carbs}
                    fat={meal.fat}
                  />
                  <View style={styles.mealActions}>
                    <Button
                      label={logged ? 'Registrado ✓' : 'Registrar'}
                      onPress={() => logPlannedMeal(meal)}
                      variant="outline"
                      style={styles.mealBtn}
                      disabled={logged}
                    />
                    <Button
                      label="Fotografar"
                      onPress={() =>
                        router.push({
                          pathname: '/meal',
                          params: {
                            slot: meal.slot,
                            name: meal.name,
                            plannedId: meal.id,
                          },
                        })
                      }
                      variant="secondary"
                      style={styles.mealBtn}
                    />
                  </View>
                </Card>
              );
            })
          )}
        </>
      ) : null}

      <Card style={styles.disclaimer}>
        <Text style={typography.caption}>
          Sugestão automática — não substitui orientação médica ou nutricional.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.cream,
  },
  error: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.orange,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  mealTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  mealTime: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.orange,
    marginBottom: spacing.xs,
  },
  recipeHint: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.sage,
    marginTop: spacing.xs,
  },
  chevron: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 24,
    color: colors.sage,
    lineHeight: 28,
  },
  mealActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  mealBtn: {
    flex: 1,
    paddingVertical: 10,
  },
  disclaimer: {
    backgroundColor: colors.cream,
  },
});
