import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../src/components/Avatar';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { GoalPicker, type GoalOption } from '../src/components/GoalPicker';
import { InputField } from '../src/components/InputField';
import { Screen } from '../src/components/Screen';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Section } from '../src/components/Section';
import { signOut, useAuth } from '../src/features/auth';
import { DEFAULT_DAILY_GOALS, type ProfileGoal } from '../src/features/profile';
import { hasSupabase } from '../src/lib/env';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/colors';
import { elevation, radius, spacing } from '../src/theme/tokens';
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

const SAVED_FEEDBACK_MS = 2500;

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
  const [pickingPhoto, setPickingPhoto] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), SAVED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  async function pickAvatar() {
    if (pickingPhoto) return;
    setPickingPhoto(true);
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Galeria necessária',
            'Permita o acesso às fotos nas configurações do dispositivo para alterar sua foto de perfil.',
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: Platform.OS !== 'web',
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets[0]) {
        updateProfile({ avatarUri: result.assets[0].uri });
        setSaved(false);
      }
    } finally {
      setPickingPhoto(false);
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

  function handleReturnHome() {
    router.replace('/(tabs)');
  }

  function handleMoreOption(key: (typeof MORE_OPTIONS)[number]['key']) {
    if (key === 'onboarding') handleRedoOnboarding();
    else if (key === 'privacy') router.push('/privacy');
    else handleReturnHome();
  }

  return (
    <View style={styles.root}>
      <Screen>
        <ScreenHeader title="Perfil" subtitle="Seus dados e metas" />

        <Section title="Identidade">
          <Card flat style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <Avatar
                uri={profile.avatarUri}
                name={profile.displayName}
                size={72}
                onPress={pickAvatar}
              />
              <View style={styles.avatarMeta}>
                <Text style={typography.subtitle}>{profile.displayName || 'Sem nome'}</Text>
                <Pressable
                  onPress={pickAvatar}
                  disabled={pickingPhoto}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Alterar foto de perfil"
                >
                  <Text style={styles.changePhoto}>
                    {pickingPhoto ? 'Abrindo galeria…' : 'Alterar foto'}
                  </Text>
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
                <View key={field.key} style={styles.macroBlock}>
                  <Text style={[styles.macroBlockLabel, { color: field.color }]}>{field.label}</Text>
                  <View style={styles.macroBlockRow}>
                    <TextInput
                      style={styles.macroBlockInput}
                      keyboardType="numeric"
                      value={String(dailyGoals[field.key])}
                      onChangeText={(t) => setMacro(field.key, t)}
                      accessibilityLabel={`${field.a11yLabel}, ${dailyGoals[field.key]} ${field.unit}`}
                    />
                    <Text
                      style={[
                        styles.macroBlockUnit,
                        field.unit === 'kcal' ? styles.macroBlockUnitKcal : styles.macroBlockUnitG,
                      ]}
                    >
                      {field.unit}
                    </Text>
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
                accessibilityLabel={opt.key === 'back' ? 'Voltar para Hoje' : opt.label}
              >
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionChevron}>›</Text>
              </Pressable>
            ))}
          </Card>
        </Section>
      </Screen>

      <View
        style={[styles.saveBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
        pointerEvents="box-none"
      >
        <Button
          label={saved ? 'Salvo ✓' : 'Salvar alterações'}
          onPress={handleSave}
          style={styles.saveBarBtn}
        />
      </View>
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
  macroBlock: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '47%',
    maxWidth: '48%',
    minWidth: 0,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    overflow: 'hidden',
  },
  macroBlockLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
  },
  macroBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    overflow: 'hidden',
  },
  macroBlockInput: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: colors.forest,
    paddingVertical: spacing.xs,
    textAlign: 'right',
  },
  macroBlockUnit: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: spacing.xs,
    flexShrink: 0,
    textAlign: 'left',
  },
  macroBlockUnitKcal: {
    width: 30,
  },
  macroBlockUnitG: {
    width: 14,
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
  saveBar: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    ...elevation.bar,
  },
  saveBarBtn: {
    width: '100%',
  },
});
