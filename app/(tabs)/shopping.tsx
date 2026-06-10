import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { LoadingState } from '../../src/components/LoadingState';
import { Screen } from '../../src/components/Screen';
import { SHOPPING_LIST_MESSAGES } from '../../src/constants/ai-messages';
import { useShoppingListGenerator } from '../../src/features/shopping';
import { hapticLight } from '../../src/lib/haptics';
import { useAppStore } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function ShoppingScreen() {
  const shopping = useAppStore((s) => s.shopping);
  const plannedMeals = useAppStore((s) => s.plannedMeals);
  const toggleShoppingItem = useAppStore((s) => s.toggleShoppingItem);
  const addShoppingItem = useAppStore((s) => s.addShoppingItem);
  const removeShoppingItem = useAppStore((s) => s.removeShoppingItem);
  const clearCheckedShopping = useAppStore((s) => s.clearCheckedShopping);
  const { generate, loading: generating, error } = useShoppingListGenerator();

  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');

  const checked = shopping.filter((i) => i.checked).length;
  const hasPlan = plannedMeals.length > 0;

  function handleToggle(id: string) {
    hapticLight();
    toggleShoppingItem(id);
  }

  async function handleGenerate() {
    await generate();
  }

  function handleAdd() {
    if (!newName.trim()) return;
    addShoppingItem(newName.trim(), newQty.trim() || '1 un');
    setNewName('');
    setNewQty('');
  }

  return (
    <Screen>
      <ScreenHeader title="Compras" subtitle="Lista gerada do seu cardápio" />

      <Card>
        <View style={styles.summaryRow}>
          <Text style={typography.subtitle}>
            {checked}/{shopping.length} no carrinho
          </Text>
          <Button
            label={generating ? '...' : 'Do cardápio'}
            onPress={handleGenerate}
            variant="outline"
            style={styles.genBtn}
            disabled={generating || !hasPlan}
          />
        </View>
        {!hasPlan ? (
          <Text style={styles.hint}>Gere um cardápio na aba Dieta para usar esta opção.</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {generating ? (
          <LoadingState messages={SHOPPING_LIST_MESSAGES} active={generating} />
        ) : null}
        {checked > 0 ? (
          <Button
            label="Limpar itens marcados"
            onPress={clearCheckedShopping}
            variant="outline"
            style={{ marginTop: 10 }}
          />
        ) : null}
      </Card>

      {shopping.length === 0 ? (
        <Card>
          <EmptyState
            title="Lista vazia"
            message={
              hasPlan
                ? 'Toque em "Do cardápio" para gerar a lista da semana, ou adicione itens manualmente.'
                : 'Gere um cardápio na Dieta ou adicione itens manualmente abaixo.'
            }
          />
        </Card>
      ) : (
        shopping.map((item) => (
          <Card key={item.id} style={item.checked ? styles.checkedCard : undefined}>
            <View style={styles.itemRow}>
              <Pressable
                onPress={() => handleToggle(item.id)}
                style={styles.checkArea}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.checked }}
                accessibilityLabel={`${item.name}, ${item.quantity}`}
              >
                <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                  {item.checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </Pressable>
              <Pressable onPress={() => handleToggle(item.id)} style={{ flex: 1 }}>
                <Text style={[typography.subtitle, item.checked && styles.checkedText]}>
                  {item.name}
                </Text>
                <Text style={typography.caption}>{item.quantity}</Text>
              </Pressable>
              {item.fromPlan ? <Text style={styles.badge}>plano</Text> : null}
              <Pressable onPress={() => removeShoppingItem(item.id)} hitSlop={8} style={styles.removeBtn}>
                <Text style={styles.removeLabel}>×</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}

      <Card>
        <Text style={typography.subtitle}>Adicionar item</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="Alimento"
            placeholderTextColor={colors.textMuted}
            value={newName}
            onChangeText={setNewName}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Qtd"
            placeholderTextColor={colors.textMuted}
            value={newQty}
            onChangeText={setNewQty}
          />
        </View>
        <Button label="Adicionar" onPress={handleAdd} variant="outline" style={{ marginTop: 10 }} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  hint: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 10,
  },
  error: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.orange,
    marginTop: 10,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkArea: {
    padding: 2,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  checkedCard: {
    opacity: 0.6,
  },
  checkedText: {
    textDecorationLine: 'line-through',
  },
  badge: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 10,
    color: colors.orange,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  removeBtn: {
    paddingHorizontal: 4,
  },
  removeLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 20,
    color: colors.textMuted,
    lineHeight: 22,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  input: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    backgroundColor: colors.cream,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
});
