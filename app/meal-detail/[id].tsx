import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Screen } from '../../src/components/Screen';
import { MEAL_SLOTS, SLOT_LABELS, SLOT_SHORT } from '../../src/constants/meals';
import { createId } from '../../src/lib/id';
import { sumComponentMacros } from '../../src/store/selectors';
import { useAppStore } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import type { MealSlot } from '../../src/types';

export default function MealDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const meal = useAppStore((s) => s.loggedMeals.find((m) => m.id === id));
  const updateLoggedMeal = useAppStore((s) => s.updateLoggedMeal);
  const removeLoggedMeal = useAppStore((s) => s.removeLoggedMeal);
  const updateLoggedComponent = useAppStore((s) => s.updateLoggedComponent);
  const removeLoggedComponent = useAppStore((s) => s.removeLoggedComponent);
  const addLoggedComponent = useAppStore((s) => s.addLoggedComponent);

  const [name, setName] = useState('');
  const [slot, setSlot] = useState<MealSlot>('lunch');
  const [newItemName, setNewItemName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (meal) {
      setName(meal.name);
      setSlot(meal.slot);
    }
  }, [meal?.id, meal?.name, meal?.slot]);

  const totals = useMemo(
    () => (meal ? sumComponentMacros(meal.components) : null),
    [meal],
  );

  if (!meal) {
    return (
      <Screen>
        <ScreenHeader title="Refeição" subtitle="Registro não encontrado" />
        <Card>
          <Text style={typography.body}>Esta refeição não existe mais ou foi removida.</Text>
        </Card>
        <Button label="Voltar" onPress={() => router.back()} variant="outline" />
      </Screen>
    );
  }

  const currentMeal = meal;

  function handleSaveMeta() {
    updateLoggedMeal(currentMeal.id, {
      name: name.trim() || currentMeal.name,
      slot,
    });
    setSaved(true);
  }

  function handleDelete() {
    const doDelete = () => {
      removeLoggedMeal(currentMeal.id);
      router.back();
    };

    if (typeof Alert.alert === 'function') {
      Alert.alert('Remover refeição', 'Tem certeza? Esta ação não pode ser desfeita.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: doDelete },
      ]);
    } else {
      doDelete();
    }
  }

  function handleAddItem() {
    if (!newItemName.trim()) return;
    addLoggedComponent(currentMeal.id, {
      id: createId('comp'),
      name: newItemName.trim(),
      weightGrams: 50,
      calories: 40,
      protein: 2,
      carbs: 5,
      fat: 1,
    });
    setNewItemName('');
    setSaved(false);
  }

  return (
    <Screen>
      <ScreenHeader title="Editar refeição" subtitle={SLOT_LABELS[currentMeal.slot]} />

      <Card>
        <Text style={typography.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(t) => {
            setName(t);
            setSaved(false);
          }}
          placeholder="Nome da refeição"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[typography.label, styles.fieldGap]}>Horário</Text>
        <View style={styles.slotRow}>
          {MEAL_SLOTS.map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                setSlot(s);
                setSaved(false);
              }}
              style={[styles.slotChip, slot === s && styles.slotChipActive]}
            >
              <Text style={[styles.slotLabel, slot === s && styles.slotLabelActive]}>
                {SLOT_SHORT[s]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button
          label={saved ? 'Salvo ✓' : 'Salvar nome e horário'}
          onPress={handleSaveMeta}
          variant="outline"
          style={{ marginTop: 12 }}
        />
      </Card>

      <Text style={[typography.subtitle, styles.section]}>Componentes</Text>
      {currentMeal.components.map((comp) => (
        <Card key={comp.id}>
          <View style={styles.compHeader}>
            <Text style={[typography.subtitle, styles.compTitle]}>{comp.name}</Text>
            <Pressable
              onPress={() => {
                removeLoggedComponent(currentMeal.id, comp.id);
                setSaved(false);
              }}
              hitSlop={8}
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
                  updateLoggedComponent(currentMeal.id, comp.id, { weightGrams: grams });
                  setSaved(false);
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
        <Text style={typography.subtitle}>Adicionar item</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Ex: molho extra"
            placeholderTextColor={colors.textMuted}
            value={newItemName}
            onChangeText={setNewItemName}
          />
          <Button label="+" onPress={handleAddItem} style={styles.addBtn} />
        </View>
      </Card>

      {totals ? (
        <Card>
          <Text style={typography.subtitle}>Total</Text>
          <Text style={styles.totalValue}>{totals.calories} kcal</Text>
          <Text style={typography.caption}>
            P {totals.protein}g · C {totals.carbs}g · G {totals.fat}g
          </Text>
          <Text style={[typography.caption, styles.metaHint]}>
            {currentMeal.fromPlan ? 'Registrado do plano' : 'Registrado por foto'} · {currentMeal.date}
          </Text>
        </Card>
      ) : null}

      <Button label="Remover refeição" onPress={handleDelete} variant="outline" />
      <Button label="Voltar" onPress={() => router.back()} variant="outline" style={{ marginTop: 10 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  fieldGap: {
    marginTop: 12,
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
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
  section: {
    marginBottom: 8,
    marginTop: 4,
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
  metaHint: {
    marginTop: 6,
  },
});
