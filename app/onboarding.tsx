import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { LogoIcon } from '../src/components/LogoIcon';
import { Screen } from '../src/components/Screen';
import { APP } from '../src/constants/app';
import { DEFAULT_DAILY_GOALS, type ProfileGoal } from '../src/features/profile';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';

const GOALS: { value: ProfileGoal; label: string; description: string }[] = [
  { value: 'lose', label: 'Emagrecimento', description: 'Déficit calórico moderado' },
  { value: 'maintain', label: 'Manutenção', description: 'Manter o peso atual' },
  { value: 'gain', label: 'Hipertrofia', description: 'Ganho de massa muscular' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [name, setName] = useState('');
  const [goal, setGoal] = useState<ProfileGoal>('maintain');
  const [restrictions, setRestrictions] = useState('');

  const goals = DEFAULT_DAILY_GOALS[goal];
  const canStart = name.trim().length > 0;

  function handleStart() {
    completeOnboarding({
      displayName: name.trim(),
      goal,
      restrictions: restrictions.trim(),
      dailyGoals: DEFAULT_DAILY_GOALS[goal],
    });
    router.replace('/(tabs)');
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logoBadge}>
          <LogoIcon size={56} variant="dark" />
        </View>
        <Text style={styles.title}>{APP.name}</Text>
        <Text style={styles.tagline}>{APP.tagline}</Text>
        <Text style={[typography.body, styles.intro]}>
          Fotografe. Planeje. Compre. Acompanhe. Vamos configurar seu perfil em menos de um
          minuto.
        </Text>
      </View>

      <Card>
        <Text style={typography.label}>Como podemos te chamar?</Text>
        <TextInput
          style={styles.input}
          placeholder="Seu nome ou apelido"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      </Card>

      <Card>
        <Text style={typography.label}>Qual é o seu objetivo?</Text>
        <View style={styles.goalList}>
          {GOALS.map((g) => {
            const active = goal === g.value;
            return (
              <Pressable
                key={g.value}
                onPress={() => setGoal(g.value)}
                style={[styles.goalOption, active && styles.goalOptionActive]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalLabel, active && styles.goalLabelActive]}>
                    {g.label}
                  </Text>
                  <Text style={[styles.goalDescription, active && styles.goalDescriptionActive]}>
                    {g.description}
                  </Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.goalsPreview}>
          <Text style={typography.caption}>Metas diárias sugeridas (editáveis no perfil):</Text>
          <Text style={styles.goalsNumbers}>
            {goals.calories} kcal · P {goals.protein}g · C {goals.carbs}g · G {goals.fat}g
          </Text>
        </View>
      </Card>

      <Card>
        <Text style={typography.label}>Restrições e preferências (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholder="Ex: diabetes, sem glúten, intolerância à lactose, vegetariano..."
          placeholderTextColor={colors.textMuted}
          value={restrictions}
          onChangeText={setRestrictions}
        />
      </Card>

      <Card style={styles.disclaimer}>
        <Text style={typography.caption}>
          O Sláinte trabalha com estimativas de IA — boas para acompanhar tendências, mas não
          substituem balança nem orientação médica ou nutricional.
        </Text>
      </Card>

      <Button label="Começar" onPress={handleStart} disabled={!canStart} />
      {!canStart ? (
        <Text style={styles.hint}>Informe seu nome para continuar.</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    marginTop: 12,
    paddingHorizontal: 8,
  },
  input: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.cream,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  goalList: {
    marginTop: 8,
    gap: 8,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 12,
  },
  goalOptionActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  goalLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: colors.text,
  },
  goalLabelActive: {
    color: colors.white,
  },
  goalDescription: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  goalDescriptionActive: {
    color: colors.textOnDark,
    opacity: 0.85,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.white,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gold,
  },
  goalsPreview: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  goalsNumbers: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: colors.forest,
    marginTop: 4,
  },
  disclaimer: {
    backgroundColor: colors.cream,
  },
  hint: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
});
