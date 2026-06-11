import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { ChipGroup } from '../../src/components/ChipGroup';
import { EmptyState } from '../../src/components/EmptyState';
import { InputField } from '../../src/components/InputField';
import { LoadingState } from '../../src/components/LoadingState';
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

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

const GOAL_OPTIONS = [
  { value: 'lose', label: 'Emagrecimento' },
  { value: 'maintain', label: 'Manutenção' },
  { value: 'gain', label: 'Hipertrofia' },
] as const satisfies readonly { value: ProfileGoal; label: string }[];

const DAY_OPTIONS = DAYS.map((label, i) => ({
  value: String(i),
  label,
}));

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
  const [showRecipes, setShowRecipes] = useState(false);

  const dayMeals = useMemo(
    () => plannedMeals.filter((m) => m.dayIndex === selectedDietDay),
    [plannedMeals, selectedDietDay],
  );

  async function handleGenerate() {
    await generate(restrictions);
  }

  return (
    <Screen>
      <ScreenHeader title="Dieta" subtitle="Cardápio semanal com meal-prep" />

      <Section title="Configurar plano" subtitle="Objetivo e restrições para a IA">
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
            placeholder="Diabetes, sem glúten, intolerâncias..."
          />

          <Button
            label={generating ? 'Gerando cardápio… (~20s)' : 'Gerar cardápio da semana'}
            onPress={handleGenerate}
            disabled={generating}
            style={{ marginTop: spacing.lg }}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {generating ? <LoadingState messages={MEAL_PLAN_MESSAGES} active={generating} /> : null}
        </Card>
      </Section>

      {mealPlanSummary ? (
        <Card style={styles.summaryCard}>
          <Text style={typography.label}>Plano da semana</Text>
          <Text style={typography.body}>{mealPlanSummary}</Text>
        </Card>
      ) : null}

      <Section title="Dias da semana" />
      <ChipGroup
        options={DAY_OPTIONS}
        value={String(selectedDietDay)}
        onChange={(v) => setSelectedDietDay(Number(v))}
        variant="day"
      />

      {dayMeals.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum cardápio ainda"
            message="Defina objetivo e restrições acima e gere o cardápio da semana com IA."
          />
        </Card>
      ) : (
        dayMeals.map((meal) => {
          const logged = isPlannedMealLoggedToday(loggedMeals, meal.id);
          return (
            <Card key={meal.id}>
              <Text style={styles.mealTime}>
                {meal.time} · {SLOT_LABELS[meal.slot]}
              </Text>
              <Text style={typography.subtitle}>{meal.name}</Text>
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

      <Pressable onPress={() => setShowRecipes(!showRecipes)} style={styles.recipeToggle}>
        <Text style={typography.subtitle}>
          Receitas de referência {showRecipes ? '▾' : '▸'}
        </Text>
      </Pressable>

      {showRecipes &&
        recipes.map((recipe) => (
          <Card key={recipe.id}>
            <Text style={typography.subtitle}>{recipe.name}</Text>
            <Text style={typography.caption}>
              {recipe.servings} porções · {recipe.caloriesPerServing} kcal/porção
            </Text>
            <Text style={[typography.label, styles.recipeSection]}>Ingredientes</Text>
            {recipe.ingredients.map((ing) => (
              <Text key={ing.name} style={typography.body}>
                · {ing.name} — {ing.amount}
              </Text>
            ))}
            <Text style={[typography.label, styles.recipeSection]}>Modo de preparo</Text>
            {recipe.steps.map((step, i) => (
              <Text key={i} style={typography.body}>
                {i + 1}. {step}
              </Text>
            ))}
          </Card>
        ))}

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
  mealTime: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.orange,
    marginBottom: spacing.xs,
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
  recipeToggle: {
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  recipeSection: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  disclaimer: {
    backgroundColor: colors.cream,
  },
});
