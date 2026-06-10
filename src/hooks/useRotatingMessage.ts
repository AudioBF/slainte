import { useEffect, useState } from 'react';

/** Cycles through messages while `active` — useful for long AI waits. */
export function useRotatingMessage(
  messages: readonly string[],
  active: boolean,
  intervalMs = 2800,
): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    if (messages.length <= 1) return;

    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, intervalMs);

    return () => clearInterval(id);
  }, [active, messages, intervalMs]);

  return messages[index] ?? messages[0] ?? '';
}
