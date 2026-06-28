import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../src/components/Avatar';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { GoalPicker, type GoalOption } from '../src/components/GoalPicker';
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

const GOAL_OPTIONS: GoalOption[] = [
  { value: 'lose', label: 'Emagrecimento', description: 'Déficit calórico moderado' },
  { value: 'maintain', label: 'Manutenção', description: 'Manter o peso atual' },
  { value: 'gain', label: 'Hipertrofia', description: 'Ganho de massa muscular' },
];

type MacroField = 'calories' | 'protein' | 'carbs' | 'fat';

const MACRO_FIELDS: {
  key: MacroField;
  label: string;
  a11yLabel: string;
  unit: string;
  color: string;
}[] = [
  { key: 'calories', label: 'Calorias', a11yLabel: 'Calorias', unit: 'kcal', color: colors.forest },
  { key: 'protein', label: 'Proteína', a11yLabel: 'Proteína', unit: 'g', color: colors.protein },
  { key: 'carbs', label: 'Carbs', a11yLabel: 'Carboidrato', unit: 'g', color: colors.carbs },
  { key: 'fat', label: 'Gordura', a11yLabel: 'Gordura', unit: 'g', color: colors.fat },
];

const MORE_OPTIONS = [
  { key: 'onboarding', label: 'Rever introdução' },
  { key: 'privacy', label: 'Privacidade e dados' },
  { key: 'back', label: 'Voltar' },
] as const;

/** PrimaryActionBar body (padding + button); safe-area inset is on the bar itself. */
const SAVE_ACTION_HEIGHT = spacing.md + 44 + spacing.md;

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const footerSpace =
    SAVE_ACTION_HEIGHT + Math.max(insets.bottom, spacing.md) + spacing.lg;

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

  function handleMoreOption(key: (typeof MORE_OPTIONS)[number]['key']) {
    if (key === 'onboarding') handleRedoOnboarding();
    else if (key === 'privacy') router.push('/privacy');
    else router.back();
  }

  return (
    <View style={styles.root}>
      <Screen footerSpace={footerSpace}>
        <ScreenHeader title="Perfil" subtitle="Seus dados e metas" />

        <Section title="Identidade">
          <Card flat style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <Pressable onPress={pickAvatar} accessibilityRole="button">
                <Avatar uri={profile.avatarUri} name={profile.displayName} size={72} />
              </Pressable>
              <View style={styles.avatarMeta}>
                <Text style={typography.subtitle}>{profile.displayName || 'Sem nome'}</Text>
                <Pressable onPress={pickAvatar} hitSlop={8}>
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
          <Card flat style={styles.profileCard}>
            <Text style={typography.label}>Objetivo</Text>
            <GoalPicker
              options={GOAL_OPTIONS}
              value={goal}
              onChange={(g) => {
                setGoal(g);
                setSaved(false);
              }}
            />

            <View style={styles.macroDivider} />
            <Text style={typography.label}>Metas diárias</Text>
            <View style={styles.macroGrid}>
              {MACRO_FIELDS.map((field) => (
                <View key={field.key} style={styles.macroCell}>
                  <Text style={[styles.macroCellLabel, { color: field.color }]}>{field.label}</Text>
                  <View style={styles.macroInputBox}>
                    <TextInput
                      style={styles.macroInput}
                      keyboardType="numeric"
                      value={String(dailyGoals[field.key])}
                      onChangeText={(t) => setMacro(field.key, t)}
                      accessibilityLabel={`${field.a11yLabel}, ${dailyGoals[field.key]} ${field.unit}`}
                    />
                    <Text style={styles.macroSuffix}>{field.unit}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Pressable
              onPress={applyGoalDefaults}
              style={styles.defaultsLink}
              accessibilityRole="button"
            >
              <Text style={styles.defaultsLinkText}>Aplicar metas padrão do objetivo</Text>
            </Pressable>
          </Card>
        </Section>

        <Section title="Preferências alimentares">
          <Card flat style={styles.profileCard}>
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
          <Card flat style={styles.profileCard}>
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
                <View style={styles.inlineActions}>
                  <Pressable
                    onPress={() => router.push('/account')}
                    style={styles.inlineActionRow}
                    accessibilityRole="button"
                  >
                    <Text style={styles.inlineActionLabel}>Gerenciar conta</Text>
                    <Text style={styles.optionChevron}>›</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => signOut()}
                    style={[styles.inlineActionRow, styles.inlineActionRowLast]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.inlineActionLabel, styles.signOutLabel]}>Sair</Text>
                    <Text style={styles.optionChevron}>›</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={typography.caption}>
                  Entre para sincronizar cardápio, refeições e lista entre dispositivos.
                </Text>
                <Button
                  label="Entrar / Criar conta"
                  onPress={() => router.push('/account')}
                  style={{ marginTop: spacing.md }}
                />
              </>
            )}
          </Card>
        </Section>

        <Section title="Mais opções">
          <Card flat style={styles.optionsCard}>
            {MORE_OPTIONS.map((opt, index) => (
              <Pressable
                key={opt.key}
                onPress={() => handleMoreOption(opt.key)}
                style={[
                  styles.optionRow,
                  index < MORE_OPTIONS.length - 1 && styles.optionRowBorder,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionChevron}>›</Text>
              </Pressable>
            ))}
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
    width: '100%',
  },
  profileCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xs,
  },
  avatarMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  changePhoto: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.orange,
  },
  macroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  macroCell: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
  },
  macroCellLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
  },
  macroInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    minHeight: 44,
  },
  macroInput: {
    flex: 1,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: colors.forest,
    paddingVertical: spacing.sm,
    textAlign: 'right',
  },
  macroSuffix: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: spacing.xs,
    minWidth: 28,
    textAlign: 'right',
  },
  defaultsLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  defaultsLinkText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.orange,
  },
  cloudHint: {
    marginTop: spacing.xs,
  },
  inlineActions: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  inlineActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  inlineActionRowLast: {
    borderBottomWidth: 0,
  },
  inlineActionLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.forest,
  },
  signOutLabel: {
    color: colors.orange,
  },
  optionsCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  optionChevron: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 22,
    color: colors.textMuted,
    lineHeight: 24,
    marginLeft: spacing.sm,
  },
});
