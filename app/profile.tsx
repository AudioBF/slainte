import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '../src/components/Avatar';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Header } from '../src/components/Header';
import { Screen } from '../src/components/Screen';
import { signOut, useAuth } from '../src/features/auth';
import { DEFAULT_DAILY_GOALS, type ProfileGoal } from '../src/features/profile';
import { hasSupabase } from '../src/lib/env';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';

const GOAL_LABELS: Record<ProfileGoal, string> = {
  lose: 'Emagrecimento',
  maintain: 'Manutenção',
  gain: 'Hipertrofia',
};

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
    <Screen>
      <Header title="Perfil" subtitle="Seus dados e metas" />

      <Card>
        <View style={styles.avatarRow}>
          <Pressable onPress={pickAvatar}>
            <Avatar uri={profile.avatarUri} name={profile.displayName} size={72} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={typography.subtitle}>
              {profile.displayName || 'Sem nome'}
            </Text>
            <Pressable onPress={pickAvatar}>
              <Text style={styles.changePhoto}>Alterar foto</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[typography.label, styles.fieldLabel]}>Nome</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(t) => {
            setName(t);
            setSaved(false);
          }}
          placeholder="Seu nome"
          placeholderTextColor={colors.textMuted}
        />
      </Card>

      <Card>
        <Text style={typography.label}>Objetivo</Text>
        <View style={styles.goalRow}>
          {(Object.keys(GOAL_LABELS) as ProfileGoal[]).map((g) => (
            <Pressable
              key={g}
              onPress={() => {
                setGoal(g);
                setSaved(false);
              }}
              style={[styles.goalChip, goal === g && styles.goalChipActive]}
            >
              <Text style={[styles.goalText, goal === g && styles.goalTextActive]}>
                {GOAL_LABELS[g]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[typography.label, styles.fieldLabel]}>Metas diárias</Text>
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
          style={{ marginTop: 8 }}
        />
      </Card>

      <Card>
        <Text style={typography.label}>Restrições e preferências</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          value={restrictions}
          onChangeText={(t) => {
            setRestrictions(t);
            setSaved(false);
          }}
          placeholder="Ex: diabetes, sem glúten, intolerâncias..."
          placeholderTextColor={colors.textMuted}
        />
      </Card>

      <Card>
        <Text style={typography.label}>Conta e nuvem</Text>
        {!configured ? (
          <Text style={[typography.caption, styles.cloudHint]}>
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
              style={{ marginTop: 10 }}
            />
            <Button
              label="Sair"
              onPress={() => signOut()}
              variant="outline"
              style={{ marginTop: 8 }}
            />
          </>
        ) : (
          <>
            <Text style={[typography.caption, styles.cloudHint]}>
              Entre para sincronizar cardápio, refeições e lista entre dispositivos.
            </Text>
            <Button
              label="Entrar / Criar conta"
              onPress={() => router.push('/account')}
              style={{ marginTop: 10 }}
            />
          </>
        )}
      </Card>

      <Button label={saved ? 'Salvo ✓' : 'Salvar alterações'} onPress={handleSave} />

      <Button
        label="Rever introdução"
        onPress={handleRedoOnboarding}
        variant="outline"
        style={{ marginTop: 10 }}
      />

      <Button
        label="Privacidade e dados"
        onPress={() => router.push('/privacy')}
        variant="outline"
        style={{ marginTop: 10 }}
      />

      <Button
        label="Voltar"
        onPress={() => router.back()}
        variant="outline"
        style={{ marginTop: 10 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  changePhoto: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.orange,
    marginTop: 4,
  },
  fieldLabel: {
    marginTop: 12,
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
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  macroLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: colors.text,
  },
  macroInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroInput: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: colors.forest,
    backgroundColor: colors.cream,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 80,
    textAlign: 'center',
  },
  macroUnit: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    width: 32,
  },
  cloudHint: {
    marginTop: 8,
  },
});
