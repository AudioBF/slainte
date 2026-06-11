import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { GoalPicker, type GoalOption } from '../src/components/GoalPicker';
import { InputField } from '../src/components/InputField';
import { LogoIcon } from '../src/components/LogoIcon';
import { PrimaryActionBar } from '../src/components/PrimaryActionBar';
import { Screen } from '../src/components/Screen';
import { StatPill } from '../src/components/StatPill';
import { StepIndicator } from '../src/components/StepIndicator';
import { APP } from '../src/constants/app';
import { DEFAULT_DAILY_GOALS, type ProfileGoal } from '../src/features/profile';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/colors';
import { radius, spacing } from '../src/theme/tokens';
import { typography } from '../src/theme/typography';

const STEPS = ['Nome', 'Objetivo', 'Preferências'] as const;

const GOALS: GoalOption[] = [
  { value: 'lose', label: 'Emagrecimento', description: 'Déficit calórico moderado' },
  { value: 'maintain', label: 'Manutenção', description: 'Manter o peso atual' },
  { value: 'gain', label: 'Hipertrofia', description: 'Ganho de massa muscular' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<ProfileGoal>('maintain');
  const [restrictions, setRestrictions] = useState('');

  const suggestedGoals = DEFAULT_DAILY_GOALS[goal];
  const canContinue = step === 0 ? name.trim().length > 0 : true;

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    completeOnboarding({
      displayName: name.trim(),
      goal,
      restrictions: restrictions.trim(),
      dailyGoals: DEFAULT_DAILY_GOALS[goal],
    });
    router.replace('/(tabs)');
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  return (
    <View style={styles.root}>
      <Screen footerSpace={88}>
        {step === 0 ? (
          <View style={styles.hero}>
            <View style={styles.logoBadge}>
              <LogoIcon size={56} variant="dark" />
            </View>
            <Text style={styles.title}>{APP.name}</Text>
            <Text style={styles.tagline}>{APP.tagline}</Text>
            <Text style={[typography.body, styles.intro]}>
              Configure seu perfil em 3 passos rápidos.
            </Text>
          </View>
        ) : null}

        <StepIndicator steps={STEPS} currentIndex={step} />

        {step === 0 ? (
          <Card>
            <InputField
              label="Como podemos te chamar?"
              placeholder="Seu nome ou apelido"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoFocus
            />
          </Card>
        ) : null}

        {step === 1 ? (
          <Card>
            <Text style={typography.label}>Qual é o seu objetivo?</Text>
            <GoalPicker options={GOALS} value={goal} onChange={setGoal} />
            <View style={styles.goalsPreview}>
              <Text style={typography.caption}>Metas diárias sugeridas (editáveis no perfil):</Text>
              <StatPill
                calories={suggestedGoals.calories}
                protein={suggestedGoals.protein}
                carbs={suggestedGoals.carbs}
                fat={suggestedGoals.fat}
              />
            </View>
          </Card>
        ) : null}

        {step === 2 ? (
          <>
            <Card>
              <InputField
                label="Restrições e preferências (opcional)"
                multiline
                numberOfLines={4}
                placeholder="Diabetes, sem glúten, vegetariano..."
                value={restrictions}
                onChangeText={setRestrictions}
              />
            </Card>
            <Card style={styles.disclaimer}>
              <Text style={typography.caption}>
                O Sláinte usa estimativas de IA — boas para tendências, mas não substituem
                orientação médica ou nutricional.
              </Text>
            </Card>
          </>
        ) : null}

        {step > 0 ? (
          <Button label="Voltar" onPress={handleBack} variant="outline" style={styles.backBtn} />
        ) : null}
      </Screen>

      <PrimaryActionBar
        label={step === STEPS.length - 1 ? 'Começar' : 'Continuar'}
        onPress={handleNext}
        disabled={!canContinue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
  },
  hero: {
    alignItems: 'center',
    width: '100%',
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 36,
    color: colors.forest,
  },
  tagline: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  intro: {
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  goalsPreview: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  disclaimer: {
    backgroundColor: colors.cream,
  },
  backBtn: {
    marginTop: spacing.sm,
  },
});
