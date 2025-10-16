// src/components/Exams/Tools/AnswerEliminator.ts
import { useCallback, useState } from "react";

export type Eliminations = Record<string, number[]>;

/** Centralized eliminator state (per-question option crosses) */
export function useEliminator(initial: Eliminations = {}) {
  const [elims, setElims] = useState<Eliminations>(initial);

  const isEliminated = useCallback(
    (gid: string, i: number) => (elims[gid] || []).includes(i),
    [elims]
  );

  const toggleElim = useCallback((gid: string, i: number) => {
    setElims((prev) => {
      const cur = new Set(prev[gid] || []);
      cur.has(i) ? cur.delete(i) : cur.add(i);
      return { ...prev, [gid]: Array.from(cur) };
    });
  }, []);

  const resetElims = useCallback(() => setElims({}), []);

  return { elims, setElims, isEliminated, toggleElim, resetElims };
}
