import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { InputField } from '../../src/components/InputField';
import { LoadingState } from '../../src/components/LoadingState';
import { ProgressBar } from '../../src/components/ProgressBar';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Section, SectionAction } from '../../src/components/Section';
import { ShoppingListItem } from '../../src/components/ShoppingListItem';
import { SHOPPING_LIST_MESSAGES } from '../../src/constants/ai-messages';
import { useShoppingListGenerator } from '../../src/features/shopping';
import { hapticLight } from '../../src/lib/haptics';
import { useAppStore } from '../../src/store/useAppStore';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/tokens';
import { typography } from '../../src/theme/typography';

export default function ShoppingScreen() {
  const shopping = useAppStore((s) => s.shopping);
  const plannedMeals = useAppStore((s) => s.plannedMeals);
  const toggleShoppingItem = useAppStore((s) => s.toggleShoppingItem);
  const addShoppingItem = useAppStore((s) => s.addShoppingItem);
  const removeShoppingItem = useAppStore((s) => s.removeShoppingItem);
  const clearCheckedShopping = useAppStore((s) => s.clearCheckedShopping);
  const { generate, loading: generating, error } = useShoppingListGenerator();

  const [showAdd, setShowAdd] = useState(false);
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
    setShowAdd(false);
  }

  return (
    <Screen>
      <ScreenHeader title="Compras" subtitle="Lista gerada do seu cardápio" />

      <Card>
        <ProgressBar
          current={checked}
          total={shopping.length}
          label="Progresso do carrinho"
        />
        <View style={styles.actions}>
          <Button
            label={generating ? 'Gerando...' : 'Do cardápio'}
            onPress={handleGenerate}
            variant="outline"
            style={styles.genBtn}
            disabled={generating || !hasPlan}
          />
          {checked > 0 ? (
            <Button
              label="Limpar marcados"
              onPress={clearCheckedShopping}
              variant="outline"
              style={styles.genBtn}
            />
          ) : null}
        </View>
        {!hasPlan ? (
          <Text style={styles.hint}>Gere um cardápio na aba Dieta para usar &quot;Do cardápio&quot;.</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {generating ? (
          <LoadingState messages={SHOPPING_LIST_MESSAGES} active={generating} />
        ) : null}
      </Card>

      <Section
        title="Lista da semana"
        subtitle={shopping.length ? `${shopping.length - checked} itens restantes` : undefined}
        action={
          <SectionAction
            label={showAdd ? 'Cancelar' : '+ Item'}
            onPress={() => setShowAdd((v) => !v)}
          />
        }
      />

      {showAdd ? (
        <Card style={styles.addCard}>
          <InputField
            label="Alimento"
            placeholder="Ex: peito de frango"
            value={newName}
            onChangeText={setNewName}
          />
          <InputField
            label="Quantidade"
            placeholder="Ex: 500 g"
            value={newQty}
            onChangeText={setNewQty}
          />
          <Button label="Adicionar à lista" onPress={handleAdd} style={{ marginTop: spacing.md }} />
        </Card>
      ) : null}

      {shopping.length === 0 ? (
        <Card>
          <EmptyState
            title="Lista vazia"
            message={
              hasPlan
                ? 'Toque em "Do cardápio" para gerar a lista da semana.'
                : 'Gere um cardápio na Dieta ou adicione itens manualmente.'
            }
          />
        </Card>
      ) : (
        <Card flat>
          {shopping.map((item, index) => (
            <View
              key={item.id}
              style={index < shopping.length - 1 ? styles.listDivider : undefined}
            >
              <ShoppingListItem
                name={item.name}
                quantity={item.quantity}
                checked={item.checked}
                fromPlan={item.fromPlan}
                onToggle={() => handleToggle(item.id)}
                onRemove={() => removeShoppingItem(item.id)}
              />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  genBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  hint: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  error: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.orange,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  addCard: {
    backgroundColor: colors.cream,
  },
  listDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
