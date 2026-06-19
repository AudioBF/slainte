import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { AiBadge } from '../../src/components/AiBadge';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { StatPill } from '../../src/components/StatPill';
import { formatServingsPt } from '../../src/lib/strings';
import { useAppStore } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/tokens';
import { typography } from '../../src/theme/typography';

function formatRecipeSubtitle(servings: number): string {
  const label = formatServingsPt(servings);
  if (Math.round(servings) === 1) return `${label} · receita prática`;
  return `${label} · meal-prep`;
}

export default function RecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = useAppStore((s) => s.recipes.find((r) => r.id === id));
  const linkedMeal = useAppStore((s) =>
    id ? s.plannedMeals.find((meal) => meal.recipeId === id) : undefined,
  );

  if (!recipe) {
    return (
      <Screen>
        <ScreenHeader title="Receita" subtitle="Não encontrada" />
        <Card>
          <Text style={typography.body}>Esta receita não está mais no seu plano.</Text>
        </Card>
        <Button label="Voltar" onPress={() => router.back()} variant="outline" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={recipe.name} subtitle={formatRecipeSubtitle(recipe.servings)} />

      <Card>
        <Text style={typography.body}>Receita sugerida a partir do seu cardápio.</Text>
        {linkedMeal ? (
          <Text style={[typography.caption, styles.contextLine]}>
            Baseado em: {linkedMeal.name}
          </Text>
        ) : null}
        <Text style={[typography.caption, styles.contextLine]}>
          Sugestão automática — não substitui orientação médica ou nutricional.
        </Text>
      </Card>

      <Card style={styles.macrosCard}>
        <View style={styles.macrosHeader}>
          <Text style={typography.label}>Estimativa por porção</Text>
          <AiBadge compact />
        </View>
        <StatPill
          calories={recipe.caloriesPerServing}
          protein={recipe.proteinPerServing}
          carbs={recipe.carbsPerServing}
          fat={recipe.fatPerServing}
        />
        <Text style={[typography.caption, styles.macroHint]}>
          Valores aproximados para acompanhar sua meta — não precisa ser exato.
        </Text>
      </Card>

      <Card>
        <Text style={typography.label}>Ingredientes</Text>
        {recipe.ingredients.map((ing) => (
          <View key={ing.name} style={styles.ingredientRow}>
            <Text style={styles.bullet}>·</Text>
            <Text style={[typography.body, styles.ingredientText]}>
              {ing.name} — {ing.amount}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={typography.label}>Passo a passo</Text>
        {recipe.steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={[typography.body, styles.stepText]}>{step}</Text>
          </View>
        ))}
      </Card>

      <Button label="Voltar ao cardápio" onPress={() => router.back()} variant="outline" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  contextLine: {
    marginTop: spacing.sm,
  },
  macrosCard: {
    backgroundColor: colors.cream,
  },
  macrosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  macroHint: {
    marginTop: spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  bullet: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: colors.forest,
  },
  ingredientText: {
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    color: colors.white,
  },
  stepText: {
    flex: 1,
    paddingTop: 4,
  },
});
