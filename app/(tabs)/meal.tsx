import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { ChipGroup } from '../../src/components/ChipGroup';
import { LogoIcon } from '../../src/components/LogoIcon';
import { AiBadge } from '../../src/components/AiBadge';
import { AiLoadingSkeleton } from '../../src/components/AiLoadingSkeleton';
import { PrimaryActionBar } from '../../src/components/PrimaryActionBar';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Section } from '../../src/components/Section';
import { StatPill } from '../../src/components/StatPill';
import { StepIndicator } from '../../src/components/StepIndicator';
import { MEAL_ANALYSIS_MESSAGES } from '../../src/constants/ai-messages';
import { isMealSlot, MEAL_SLOTS, SLOT_SHORT } from '../../src/constants/meals';
import { useMealAnalysis } from '../../src/features/meal';
import { createId } from '../../src/lib/id';
import { useAppStore } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/tokens';
import { typography } from '../../src/theme/typography';
import { MealSlot } from '../../src/types';

const MEAL_STEPS = ['Foto', 'Análise', 'Revisar'] as const;

const SLOT_OPTIONS = MEAL_SLOTS.map((s) => ({
  value: s,
  label: SLOT_SHORT[s],
}));

/** PrimaryActionBar body above tab bar (padding + button); safe-area inset is on the bar itself. */
const REVIEW_PRIMARY_ACTION_HEIGHT = spacing.md + 44 + spacing.md;
/** Matches PrimaryActionBar aboveTabBar offset. */
const TAB_BAR_OFFSET = 64;
/** Scroll clearance: action bar + tab bar + small buffer (matches prior 88 + 64). */
const REVIEW_FOOTER_SPACE =
  REVIEW_PRIMARY_ACTION_HEIGHT + TAB_BAR_OFFSET + spacing.xl;

export default function MealScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slot?: string; name?: string; plannedId?: string }>();
  const photoDraft = useAppStore((s) => s.photoDraft);
  const updatePhotoComponent = useAppStore((s) => s.updatePhotoComponent);
  const addPhotoComponent = useAppStore((s) => s.addPhotoComponent);
  const removePhotoComponent = useAppStore((s) => s.removePhotoComponent);
  const confirmPhotoMeal = useAppStore((s) => s.confirmPhotoMeal);
  const setPhotoDraft = useAppStore((s) => s.setPhotoDraft);
  const { analyze, loading: analyzing, error: analyzeError } = useMealAnalysis();

  const plannedName = typeof params.name === 'string' ? params.name : undefined;
  const plannedId = typeof params.plannedId === 'string' ? params.plannedId : undefined;
  const initialSlot: MealSlot = isMealSlot(params.slot) ? params.slot : 'lunch';

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    if (isMealSlot(params.slot)) setSlot(params.slot);
  }, [params.slot]);

  const stepIndex = !imageUri ? 0 : !photoDraft ? 1 : 2;

  const totals = useMemo(() => {
    if (!photoDraft?.length) return null;
    const raw = photoDraft.reduce(
      (acc, c) => ({
        calories: acc.calories + c.calories,
        protein: acc.protein + c.protein,
        carbs: acc.carbs + c.carbs,
        fat: acc.fat + c.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    return {
      calories: Math.round(raw.calories),
      protein: Math.round(raw.protein),
      carbs: Math.round(raw.carbs),
      fat: Math.round(raw.fat),
    };
  }, [photoDraft]);

  function applyAsset(asset: ImagePicker.ImagePickerAsset) {
    setImageUri(asset.uri);
    setImageBase64(asset.base64 ?? null);
    setMimeType(asset.mimeType ?? 'image/jpeg');
    setPhotoDraft(null);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      applyAsset(result.assets[0]);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Câmera necessária',
        'Permita o acesso à câmera nas configurações do dispositivo para fotografar refeições.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: true });
    if (!result.canceled && result.assets[0]) {
      applyAsset(result.assets[0]);
    }
  }

  async function handleAnalyze() {
    if (!imageBase64) return;
    await analyze(imageBase64, mimeType);
  }

  function handleAddItem() {
    if (!newItemName.trim()) return;
    addPhotoComponent({
      id: createId('comp'),
      name: newItemName.trim(),
      weightGrams: 50,
      calories: 40,
      protein: 2,
      carbs: 5,
      fat: 1,
    });
    setNewItemName('');
  }

  function handleConfirm() {
    if (!photoDraft?.length) return;
    const defaultName = photoDraft
      .map((c) => c.name)
      .slice(0, 2)
      .join(' + ');
    confirmPhotoMeal(slot, plannedName ?? defaultName, { plannedMealId: plannedId });
    setImageUri(null);
    setImageBase64(null);
    router.replace('/(tabs)');
  }

  const isReviewStep = !!photoDraft;
  const keyboardAvoidingEnabled = isReviewStep && Platform.OS === 'ios';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={keyboardAvoidingEnabled ? 'padding' : undefined}
      enabled={keyboardAvoidingEnabled}
      keyboardVerticalOffset={keyboardAvoidingEnabled ? TAB_BAR_OFFSET : 0}
    >
      <Screen footerSpace={isReviewStep ? REVIEW_FOOTER_SPACE : 0}>
        <ScreenHeader
          title="Refeição"
          subtitle="Fotografe o prato — a IA estima calorias e macros"
        />

        <StepIndicator steps={MEAL_STEPS} currentIndex={stepIndex} />

        {plannedName ? (
          <Card style={styles.planHint}>
            <Text style={typography.label}>Do cardápio</Text>
            <Text style={typography.subtitle}>{plannedName}</Text>
          </Card>
        ) : null}

        {!photoDraft ? (
          <>
            <Section title="Tipo de refeição" subtitle="Selecione antes de analisar">
              <ChipGroup options={SLOT_OPTIONS} value={slot} onChange={setSlot} />
            </Section>

            <Card>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.preview} />
              ) : (
                <View style={styles.placeholder}>
                  <LogoIcon size={56} variant="light" />
                  <Text style={[typography.body, styles.placeholderText]}>
                    Tire uma foto ou escolha da galeria
                  </Text>
                </View>
              )}
              <View style={styles.photoActions}>
                <Button label="Câmera" onPress={takePhoto} variant="outline" style={styles.halfBtn} />
                <Button label="Galeria" onPress={pickImage} variant="outline" style={styles.halfBtn} />
              </View>
              {imageUri && (
                <Button
                  label={analyzing ? 'Analisando...' : 'Analisar com IA'}
                  onPress={handleAnalyze}
                  disabled={analyzing || !imageBase64}
                  style={{ marginTop: spacing.md }}
                />
              )}
              {analyzing && (
                <AiLoadingSkeleton variant="meal" messages={MEAL_ANALYSIS_MESSAGES} active={analyzing} />
              )}
              {analyzeError ? (
                <Text style={[typography.caption, styles.error]}>{analyzeError}</Text>
              ) : null}
            </Card>
          </>
        ) : (
          <>
            <Section
              title="Componentes detectados"
              subtitle="Ajuste o peso — os valores recalculam automaticamente"
              action={<AiBadge compact />}
            />

            {photoDraft.map((comp) => (
              <Card key={comp.id}>
                <View style={styles.compHeader}>
                  <Text style={[typography.subtitle, styles.compTitle]}>{comp.name}</Text>
                  <Pressable
                    onPress={() => removePhotoComponent(comp.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                  >
                    <Text style={styles.removeLabel}>Remover</Text>
                  </Pressable>
                </View>
                <View style={styles.weightRow}>
                  <Text style={typography.caption}>Peso (g)</Text>
                  <TextInput
                    style={styles.weightInput}
                    keyboardType="numeric"
                    value={String(comp.weightGrams)}
                    onChangeText={(t) => {
                      const grams = parseInt(t, 10);
                      if (!isNaN(grams) && grams > 0) {
                        updatePhotoComponent(comp.id, { weightGrams: grams });
                      }
                    }}
                  />
                </View>
                <StatPill
                  compact
                  calories={comp.calories}
                  protein={comp.protein}
                  carbs={comp.carbs}
                  fat={comp.fat}
                />
              </Card>
            ))}

            <Card>
              <Text style={typography.subtitle}>Adicionar item esquecido</Text>
              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  placeholder="Ex: cebola caramelizada"
                  placeholderTextColor={colors.textMuted}
                  value={newItemName}
                  onChangeText={setNewItemName}
                />
                <Button label="+" onPress={handleAddItem} style={styles.addBtn} />
              </View>
            </Card>

            {totals && (
              <Card style={styles.totalCard}>
                <View style={styles.totalHeader}>
                  <Text style={typography.label}>Total estimado</Text>
                  <AiBadge compact />
                </View>
                <Text style={styles.totalValue}>{totals.calories} kcal</Text>
                <StatPill
                  protein={totals.protein}
                  carbs={totals.carbs}
                  fat={totals.fat}
                />
              </Card>
            )}

            <Section title="Registrar como">
              <ChipGroup options={SLOT_OPTIONS} value={slot} onChange={setSlot} />
            </Section>
          </>
        )}

        <Card style={styles.disclaimer}>
          <Text style={typography.caption}>
            Estimativas por IA — boas para tendências, mas editáveis. Para precisão máxima, use uma balança.
          </Text>
        </Card>
      </Screen>

      {photoDraft ? (
        <PrimaryActionBar label="Registrar no dia" onPress={handleConfirm} aboveTabBar />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
  },
  planHint: {
    backgroundColor: colors.cream,
    marginBottom: spacing.xs,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  placeholder: {
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.md,
  },
  placeholderText: {
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfBtn: {
    flex: 1,
  },
  compHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  compTitle: {
    flex: 1,
  },
  removeLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.orange,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  weightInput: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 18,
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
  addRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  addInput: {
    flex: 1,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  totalCard: {
    backgroundColor: colors.cream,
  },
  totalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  totalValue: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    color: colors.forest,
    marginVertical: spacing.xs,
  },
  disclaimer: {
    marginTop: spacing.sm,
    backgroundColor: colors.cream,
  },
  error: {
    color: colors.orange,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
