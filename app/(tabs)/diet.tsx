import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { InputField } from '../../src/components/InputField';
import { ListRow } from '../../src/components/ListRow';
import { LoadingState } from '../../src/components/LoadingState';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Section } from '../../src/components/Section';
import { StatPill } from '../../src/components/StatPill';
import { ChipGroup } from '../../src/components/ChipGroup';
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

  const dayMeals = plannedMeals.filter((m) => m.dayIndex === selectedDietDay);

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

      {recipes.length > 0 ? (
        <>
          <Section
            title="Receitas de referência"
            subtitle="Toque para ver ingredientes e preparo"
          />
          <Card flat>
            {recipes.map((recipe, index) => (
              <View
                key={recipe.id}
                style={index < recipes.length - 1 ? styles.listDivider : undefined}
              >
                <ListRow
                  title={recipe.name}
                  subtitle={`${recipe.servings} porções · ${recipe.caloriesPerServing} kcal/porção`}
                  onPress={() => router.push(`/recipe/${recipe.id}`)}
                />
              </View>
            ))}
          </Card>
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
  listDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
  disclaimer: {
    backgroundColor: colors.cream,
  },
});
