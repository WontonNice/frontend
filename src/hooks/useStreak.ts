// src/hooks/useStreak.ts
import { useEffect, useMemo, useState } from "react";

type StreakSnapshot = { current: number; best: number };

function load(key: string): StreakSnapshot {
  try {
    const raw = localStorage.getItem(`streak:${key}`);
    if (!raw) return { current: 0, best: 0 };
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed &&
      typeof parsed.current === "number" &&
      typeof parsed.best === "number"
    ) {
      return { current: parsed.current, best: parsed.best };
    }
  } catch {}
  return { current: 0, best: 0 };
}

function save(key: string, snap: StreakSnapshot) {
  try {
    localStorage.setItem(`streak:${key}`, JSON.stringify(snap));
  } catch {}
}

export function useStreak(key: string) {
  const initial = useMemo(() => load(key), [key]);
  const [current, setCurrent] = useState<number>(initial.current);
  const [best, setBest] = useState<number>(initial.best);

  useEffect(() => {
    save(key, { current, best });
  }, [key, current, best]);

  // Call with true if the submitted answer is correct; false otherwise.
  function record(correct: boolean) {
    if (correct) {
      setCurrent((c) => {
        const next = c + 1;
        setBest((b) => (next > b ? next : b));
        return next;
      });
    } else {
      setCurrent(0);
    }
  }

  function reset() {
    setCurrent(0);
  }

  function clearAll() {
    setCurrent(0);
    setBest(0);
    save(key, { current: 0, best: 0 });
  }

  return { current, best, record, reset, clearAll };
}
