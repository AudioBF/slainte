import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { LoadingState } from '../../src/components/LoadingState';
import { Screen } from '../../src/components/Screen';
import { MEAL_PLAN_MESSAGES } from '../../src/constants/ai-messages';
import { useMealPlanGenerator } from '../../src/features/diet';
import { isPlannedMealLoggedToday } from '../../src/store/selectors';
import { useAppStore } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const SLOT_LABELS: Record<string, string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
};

const GOAL_LABELS = {
  lose: 'Emagrecimento',
  maintain: 'Manutenção',
  gain: 'Hipertrofia',
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

  const dayMeals = plannedMeals.filter((m) => m.dayIndex === selectedDietDay);

  async function handleGenerate() {
    await generate(restrictions);
  }

  return (
    <Screen>
      <ScreenHeader title="Dieta" subtitle="Cardápio semanal com meal-prep" />

      <Card>
        <Text style={typography.label}>Objetivo</Text>
        <View style={styles.goalRow}>
          {(['lose', 'maintain', 'gain'] as const).map((g) => (
            <Pressable
              key={g}
              onPress={() => updateProfile({ goal: g })}
              style={[styles.goalChip, profile.goal === g && styles.goalChipActive]}
            >
              <Text style={[styles.goalText, profile.goal === g && styles.goalTextActive]}>
                {GOAL_LABELS[g]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[typography.label, { marginTop: 16 }]}>Restrições e preferências</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={3}
          value={restrictions}
          onChangeText={setRestrictions}
          placeholder="Descreva em texto livre: diabetes, sem glúten, intolerâncias..."
          placeholderTextColor={colors.textMuted}
        />

        <Button
          label={generating ? 'Gerando cardápio… (~20s)' : 'Gerar cardápio da semana'}
          onPress={handleGenerate}
          disabled={generating}
          style={{ marginTop: 12 }}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {generating ? <LoadingState messages={MEAL_PLAN_MESSAGES} active={generating} /> : null}
      </Card>

      {mealPlanSummary ? (
        <Card style={styles.summaryCard}>
          <Text style={typography.label}>Plano da semana</Text>
          <Text style={typography.body}>{mealPlanSummary}</Text>
        </Card>
      ) : null}

      <Text style={[typography.subtitle, styles.section]}>Dias da semana</Text>
      <View style={styles.dayRow}>
        {DAYS.map((day, i) => (
          <Pressable
            key={day}
            onPress={() => setSelectedDietDay(i)}
            style={[styles.dayChip, selectedDietDay === i && styles.dayChipActive]}
          >
            <Text style={[styles.dayText, selectedDietDay === i && styles.dayTextActive]}>
              {day}
            </Text>
          </Pressable>
        ))}
      </View>

      {dayMeals.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum cardápio ainda"
            message="Defina seu objetivo e restrições acima e gere o cardápio da semana com IA."
          />
        </Card>
      ) : (
        dayMeals.map((meal) => {
          const logged = isPlannedMealLoggedToday(loggedMeals, meal.id);
          return (
            <Card key={meal.id}>
              <View style={styles.mealHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealTime}>{meal.time} · {SLOT_LABELS[meal.slot]}</Text>
                  <Text style={typography.subtitle}>{meal.name}</Text>
                  <Text style={typography.caption}>
                    {meal.calories} kcal · P {meal.protein}g · C {meal.carbs}g · G {meal.fat}g
                  </Text>
                </View>
              </View>
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

      <Pressable onPress={() => setShowRecipes(!showRecipes)}>
        <Text style={[typography.subtitle, styles.section]}>
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
            <Text style={[typography.label, { marginTop: 12, marginBottom: 6 }]}>Ingredientes</Text>
            {recipe.ingredients.map((ing) => (
              <Text key={ing.name} style={typography.body}>
                · {ing.name} — {ing.amount}
              </Text>
            ))}
            <Text style={[typography.label, { marginTop: 12, marginBottom: 6 }]}>Modo de preparo</Text>
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
  goalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  goalChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalChipActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  goalText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.text,
  },
  goalTextActive: {
    color: colors.white,
  },
  textArea: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.cream,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  section: {
    marginBottom: 8,
    marginTop: 4,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  dayChipActive: {
    backgroundColor: colors.forest,
  },
  dayText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: colors.textMuted,
  },
  dayTextActive: {
    color: colors.white,
  },
  mealHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  mealTime: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.orange,
    marginBottom: 4,
  },
  mealActions: {
    flexDirection: 'row',
    gap: 8,
  },
  mealBtn: {
    flex: 1,
    paddingVertical: 10,
  },
  disclaimer: {
    backgroundColor: colors.cream,
  },
  summaryCard: {
    backgroundColor: colors.cream,
  },
  error: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.orange,
    marginTop: 10,
    textAlign: 'center',
  },
});
