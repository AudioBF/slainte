import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '../src/components/Avatar';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ChipGroup } from '../src/components/ChipGroup';
import { InputField } from '../src/components/InputField';
import { PrimaryActionBar } from '../src/components/PrimaryActionBar';
import { Screen } from '../src/components/Screen';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Section } from '../src/components/Section';
import { signOut, useAuth } from '../src/features/auth';
import { DEFAULT_DAILY_GOALS, type ProfileGoal } from '../src/features/profile';
import { hasSupabase } from '../src/lib/env';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/colors';
import { radius, spacing } from '../src/theme/tokens';
import { typography } from '../src/theme/typography';

const GOAL_OPTIONS = [
  { value: 'lose', label: 'Emagrecimento' },
  { value: 'maintain', label: 'Manutenção' },
  { value: 'gain', label: 'Hipertrofia' },
] as const satisfies readonly { value: ProfileGoal; label: string }[];

type MacroField = 'calories' | 'protein' | 'carbs' | 'fat';

const MACRO_FIELDS: { key: MacroField; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calorias', unit: 'kcal' },
  { key: 'protein', label: 'Proteína', unit: 'g' },
  { key: 'carbs', label: 'Carboidrato', unit: 'g' },
  { key: 'fat', label: 'Gordura', unit: 'g' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { isSignedIn, user, configured } = useAuth();
  const profile = useAppStore((s) => s.profile);
  const lastSyncedAt = useAppStore((s) => s.lastSyncedAt);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);

  const [name, setName] = useState(profile.displayName);
  const [goal, setGoal] = useState<ProfileGoal>(profile.goal);
  const [restrictions, setRestrictions] = useState(profile.restrictions);
  const [dailyGoals, setDailyGoals] = useState({ ...profile.dailyGoals });
  const [saved, setSaved] = useState(false);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      updateProfile({ avatarUri: result.assets[0].uri });
    }
  }

  function setMacro(key: MacroField, text: string) {
    const value = parseInt(text, 10);
    setDailyGoals((prev) => ({ ...prev, [key]: isNaN(value) ? 0 : value }));
    setSaved(false);
  }

  function applyGoalDefaults() {
    setDailyGoals({ ...DEFAULT_DAILY_GOALS[goal] });
    setSaved(false);
  }

  function handleSave() {
    updateProfile({
      displayName: name.trim() || profile.displayName,
      goal,
      restrictions: restrictions.trim(),
      dailyGoals,
    });
    setSaved(true);
  }

  function handleRedoOnboarding() {
    resetOnboarding();
    router.replace('/onboarding');
  }

  return (
    <View style={styles.root}>
      <Screen footerSpace={88}>
        <ScreenHeader title="Perfil" subtitle="Seus dados e metas" />

        <Section title="Identidade">
          <Card flat>
            <View style={styles.avatarRow}>
              <Pressable onPress={pickAvatar} accessibilityRole="button">
                <Avatar uri={profile.avatarUri} name={profile.displayName} size={72} />
              </Pressable>
              <View style={styles.avatarMeta}>
                <Text style={typography.subtitle}>{profile.displayName || 'Sem nome'}</Text>
                <Pressable onPress={pickAvatar}>
                  <Text style={styles.changePhoto}>Alterar foto</Text>
                </Pressable>
              </View>
            </View>
            <InputField
              label="Nome"
              value={name}
              onChangeText={(t) => {
                setName(t);
                setSaved(false);
              }}
              placeholder="Seu nome"
            />
          </Card>
        </Section>

        <Section title="Objetivo e metas">
          <Card flat>
            <Text style={typography.label}>Objetivo</Text>
            <ChipGroup
              options={GOAL_OPTIONS}
              value={goal}
              onChange={(g) => {
                setGoal(g as ProfileGoal);
                setSaved(false);
              }}
            />

            <Text style={[typography.label, styles.macroSection]}>Metas diárias</Text>
            {MACRO_FIELDS.map((field) => (
              <View key={field.key} style={styles.macroRow}>
                <Text style={styles.macroLabel}>{field.label}</Text>
                <View style={styles.macroInputWrap}>
                  <TextInput
                    style={styles.macroInput}
                    keyboardType="numeric"
                    value={String(dailyGoals[field.key])}
                    onChangeText={(t) => setMacro(field.key, t)}
                  />
                  <Text style={styles.macroUnit}>{field.unit}</Text>
                </View>
              </View>
            ))}
            <Button
              label="Aplicar metas padrão do objetivo"
              onPress={applyGoalDefaults}
              variant="outline"
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        </Section>

        <Section title="Preferências alimentares">
          <Card flat>
            <InputField
              label="Restrições"
              multiline
              numberOfLines={3}
              value={restrictions}
              onChangeText={(t) => {
                setRestrictions(t);
                setSaved(false);
              }}
              placeholder="Diabetes, sem glúten, intolerâncias..."
            />
          </Card>
        </Section>

        <Section title="Conta e nuvem">
          <Card flat>
            {!configured ? (
              <Text style={typography.caption}>
                Supabase não configurado — dados ficam só neste dispositivo.
              </Text>
            ) : isSignedIn ? (
              <>
                <Text style={typography.subtitle}>{user?.email}</Text>
                <Text style={[typography.caption, styles.cloudHint]}>
                  {lastSyncedAt
                    ? `Sync: ${new Date(lastSyncedAt).toLocaleString('pt-BR')}`
                    : 'Aguardando primeira sincronização...'}
                </Text>
                <Button
                  label="Gerenciar conta"
                  onPress={() => router.push('/account')}
                  variant="outline"
                  style={{ marginTop: spacing.sm }}
                />
                <Button
                  label="Sair"
                  onPress={() => signOut()}
                  variant="outline"
                  style={{ marginTop: spacing.sm }}
                />
              </>
            ) : (
              <>
                <Text style={typography.caption}>
                  Entre para sincronizar cardápio, refeições e lista entre dispositivos.
                </Text>
                <Button
                  label="Entrar / Criar conta"
                  onPress={() => router.push('/account')}
                  style={{ marginTop: spacing.sm }}
                />
              </>
            )}
          </Card>
        </Section>

        <Section title="Mais opções">
          <Card flat style={styles.moreCard}>
            <Button label="Rever introdução" onPress={handleRedoOnboarding} variant="outline" />
            <Button
              label="Privacidade e dados"
              onPress={() => router.push('/privacy')}
              variant="outline"
              style={{ marginTop: spacing.sm }}
            />
            <Button
              label="Voltar"
              onPress={() => router.back()}
              variant="outline"
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        </Section>
      </Screen>

      <PrimaryActionBar
        label={saved ? 'Salvo ✓' : 'Salvar alterações'}
        onPress={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  avatarMeta: {
    flex: 1,
  },
  changePhoto: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.orange,
    marginTop: spacing.xs,
  },
  macroSection: {
    marginTop: spacing.lg,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  macroLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.text,
  },
  macroInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  macroInput: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: colors.forest,
    backgroundColor: colors.cream,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    minWidth: 80,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  macroUnit: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    width: 32,
  },
  cloudHint: {
    marginTop: spacing.sm,
  },
  moreCard: {
    gap: 0,
  },
});
