import { useCallback, useState } from 'react';
import { generateShoppingList, mapShoppingListToItems } from '../../../services/ai';
import { toAiUserMessage } from '../../../services/ai/errors';
import { useAppStore } from '../../../store/useAppStore';

export function useShoppingListGenerator() {
  const setShopping = useAppStore((s) => s.setShopping);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { recipes, plannedMeals } = useAppStore.getState();
      const result = await generateShoppingList({ recipes, plannedMeals });
      setShopping(mapShoppingListToItems(result));
      return result;
    } catch (e) {
      const message = toAiUserMessage(e);
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [setShopping]);

  return { generate, loading, error };
}
