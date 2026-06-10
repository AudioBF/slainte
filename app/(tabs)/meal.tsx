import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Header } from '../../src/components/Header';
import { LoadingState } from '../../src/components/LoadingState';
import { Screen } from '../../src/components/Screen';
import { isMealSlot, MEAL_SLOTS, SLOT_SHORT } from '../../src/constants/meals';
import { useMealAnalysis } from '../../src/features/meal';
import { createId } from '../../src/lib/id';
import { useAppStore } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { MealSlot } from '../../src/types';

export default function MealScreen() {
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

  const totals = useMemo(
    () =>
      photoDraft?.reduce(
        (acc, c) => ({
          calories: acc.calories + c.calories,
          protein: acc.protein + c.protein,
          carbs: acc.carbs + c.carbs,
          fat: acc.fat + c.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [photoDraft],
  );

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
  }

  return (
    <Screen>
      <Header
        title="Refeição"
        subtitle="Fotografe o prato — a IA estima calorias e macros"
      />

      {plannedName ? (
        <Card style={styles.planHint}>
          <Text style={typography.label}>Do cardápio</Text>
          <Text style={typography.subtitle}>{plannedName}</Text>
          <Text style={typography.caption}>
            Slot pré-selecionado: {SLOT_SHORT[slot]}
          </Text>
        </Card>
      ) : null}

      <Card>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>◉</Text>
            <Text style={typography.body}>Tire uma foto ou escolha da galeria</Text>
          </View>
        )}
        <View style={styles.photoActions}>
          <Button label="Câmera" onPress={takePhoto} variant="outline" style={styles.halfBtn} />
          <Button label="Galeria" onPress={pickImage} variant="outline" style={styles.halfBtn} />
        </View>
        {imageUri && !photoDraft && (
          <Button
            label={analyzing ? 'Analisando...' : 'Analisar com IA'}
            onPress={handleAnalyze}
            disabled={analyzing || !imageBase64}
            style={{ marginTop: 12 }}
          />
        )}
        {analyzing && <LoadingState message="Identificando componentes do prato..." />}
        {analyzeError ? (
          <Text style={[typography.caption, styles.error]}>{analyzeError}</Text>
        ) : null}
      </Card>

      {photoDraft && (
        <>
          <Text style={[typography.subtitle, styles.section]}>Componentes detectados</Text>
          <Text style={[typography.caption, styles.hint]}>
            Ajuste o peso de cada item — os valores recalculam automaticamente.
          </Text>

          {photoDraft.map((comp) => (
            <Card key={comp.id}>
              <View style={styles.compHeader}>
                <Text style={[typography.subtitle, styles.compTitle]}>{comp.name}</Text>
                <Pressable
                  onPress={() => removePhotoComponent(comp.id)}
                  hitSlop={8}
                  style={styles.removeBtn}
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
              <Text style={typography.caption}>
                {comp.calories} kcal · P {comp.protein}g · C {comp.carbs}g · G {comp.fat}g
              </Text>
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
            <Card>
              <Text style={typography.subtitle}>Total estimado</Text>
              <Text style={styles.totalValue}>{totals.calories} kcal</Text>
              <Text style={typography.caption}>
                P {totals.protein}g · C {totals.carbs}g · G {totals.fat}g
              </Text>
            </Card>
          )}

          <Text style={[typography.label, styles.section]}>Registrar como</Text>
          <View style={styles.slotRow}>
            {MEAL_SLOTS.map((s) => (
              <Pressable
                key={s}
                onPress={() => setSlot(s)}
                style={[styles.slotChip, slot === s && styles.slotChipActive]}
              >
                <Text style={[styles.slotLabel, slot === s && styles.slotLabelActive]}>
                  {SLOT_SHORT[s]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button label="Registrar no dia" onPress={handleConfirm} />
        </>
      )}

      <Card style={styles.disclaimer}>
        <Text style={typography.caption}>
          Estimativas por IA — boas para tendências, mas editáveis. Para precisão máxima, use uma balança.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  planHint: {
    backgroundColor: colors.cream,
    marginBottom: 4,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
  },
  placeholder: {
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  placeholderIcon: {
    fontSize: 40,
    color: colors.sage,
    marginBottom: 8,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  halfBtn: {
    flex: 1,
  },
  section: {
    marginBottom: 8,
    marginTop: 4,
  },
  hint: {
    marginBottom: 12,
  },
  compHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  compTitle: {
    flex: 1,
  },
  removeBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
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
    marginVertical: 8,
  },
  weightInput: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 18,
    color: colors.forest,
    backgroundColor: colors.cream,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 80,
    textAlign: 'center',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  addInput: {
    flex: 1,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    backgroundColor: colors.cream,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  totalValue: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: colors.forest,
    marginVertical: 4,
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.border,
  },
  slotChipActive: {
    backgroundColor: colors.forest,
  },
  slotLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.textMuted,
  },
  slotLabelActive: {
    color: colors.white,
  },
  disclaimer: {
    marginTop: 8,
    backgroundColor: colors.cream,
  },
  error: {
    color: colors.orange,
    marginTop: 8,
    textAlign: 'center',
  },
});
