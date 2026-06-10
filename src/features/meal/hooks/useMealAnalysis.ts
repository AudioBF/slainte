import { useCallback, useState } from 'react';
import {
  analyzeMealPhoto,
  mapAnalysisToComponents,
  type MealAnalysisResult,
} from '../../../services/ai';
import { toAiUserMessage } from '../../../services/ai/errors';
import { useAppStore } from '../../../store/useAppStore';

export function useMealAnalysis() {
  const setPhotoDraft = useAppStore((s) => s.setPhotoDraft);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<MealAnalysisResult | null>(null);

  const analyze = useCallback(
    async (imageBase64: string, mimeType: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await analyzeMealPhoto({ imageBase64, mimeType });
        setLastResult(result);
        setPhotoDraft(mapAnalysisToComponents(result));
        return result;
      } catch (e) {
        const message = toAiUserMessage(e);
        setError(message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [setPhotoDraft],
  );

  return { analyze, loading, error, lastResult };
}
