import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { StatPill } from '../../src/components/StatPill';
import { useAppStore } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/tokens';
import { typography } from '../../src/theme/typography';

export default function RecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = useAppStore((s) => s.recipes.find((r) => r.id === id));

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
      <ScreenHeader title={recipe.name} subtitle={`${recipe.servings} porções · meal-prep`} />

      <Card style={styles.macrosCard}>
        <Text style={typography.label}>Por porção</Text>
        <StatPill
          calories={recipe.caloriesPerServing}
          protein={recipe.proteinPerServing}
          carbs={recipe.carbsPerServing}
          fat={recipe.fatPerServing}
        />
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
        <Text style={typography.label}>Modo de preparo</Text>
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
  macrosCard: {
    backgroundColor: colors.cream,
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
