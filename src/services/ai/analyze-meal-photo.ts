import { mockPhotoAnalysis } from '../../data/mock';
import { createId } from '../../lib/id';
import { env } from '../../lib/env';
import type { MealComponent } from '../../types';
import { invokeAnalyzeMeal } from './edge-client';
import { mealAnalysisSchema, type MealAnalysisResult } from './schemas/meal-analysis.schema';

export type AnalyzeMealPhotoInput = {
  imageBase64: string;
  mimeType: string;
};

function mockAnalyze(): MealAnalysisResult {
  const components = mockPhotoAnalysis.components;
  return {
    mealName: components.map((c) => c.name).slice(0, 2).join(' + '),
    components: components.map(({ name, weightGrams, calories, protein, carbs, fat }) => ({
      name,
      weightGrams,
      calories,
      protein,
      carbs,
      fat,
    })),
    confidence: 'medium',
    notes: 'Resultado simulado — configure EXPO_PUBLIC_GEMINI_API_KEY para análise real.',
  };
}

export function mapAnalysisToComponents(result: MealAnalysisResult): MealComponent[] {
  return result.components.map((c) => ({
    id: createId('comp'),
    ...c,
  }));
}

export async function analyzeMealPhoto(input: AnalyzeMealPhotoInput): Promise<MealAnalysisResult> {
  if (env.aiMock) {
    await new Promise((r) => setTimeout(r, 800));
    return mockAnalyze();
  }

  const raw = await invokeAnalyzeMeal(input);

  return mealAnalysisSchema.parse(raw);
}
