import { satMathBank, type SatMathQuestion } from "./satMathBank";

const LS_KEY = "satMathBankOverrides:v1";

type OverridePayload = {
  // map by id; presence means add or override
  byId: Record<string, SatMathQuestion>;
  // ids to delete from the effective bank
  deleted: string[];
};

function readOverrides(): OverridePayload {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { byId: {}, deleted: [] };
    const parsed = JSON.parse(raw);
    return { byId: parsed.byId ?? {}, deleted: parsed.deleted ?? [] };
  } catch {
    return { byId: {}, deleted: [] };
  }
}

function writeOverrides(payload: OverridePayload) {
  localStorage.setItem(LS_KEY, JSON.stringify(payload));
}

// Public API

export function getEffectiveSatMathBank(): SatMathQuestion[] {
  const { byId, deleted } = readOverrides();
  // start with base that isn’t deleted
  const base = satMathBank.filter((q) => !deleted.includes(q.id));
  // overlay / add overrides
  const overlayed = base.map((q) => byId[q.id] ?? q);
  // add new items that aren’t in base
  const newOnes = Object.keys(byId)
    .filter((id) => !satMathBank.some((q) => q.id === id))
    .map((id) => byId[id]);
  return [...overlayed, ...newOnes];
}

export function upsertQuestion(q: SatMathQuestion) {
  const o = readOverrides();
  // if it was marked deleted, un-delete it
  o.deleted = o.deleted.filter((id) => id !== q.id);
  o.byId[q.id] = q;
  writeOverrides(o);
}

export function deleteQuestion(id: string) {
  const o = readOverrides();
  // remove override if exists
  delete o.byId[id];
  // mark deleted if it exists in base or was added previously
  if (!o.deleted.includes(id)) o.deleted.push(id);
  writeOverrides(o);
}

export function exportOverrides(): string {
  return JSON.stringify(readOverrides(), null, 2);
}

export function importOverrides(json: string) {
  const parsed = JSON.parse(json) as OverridePayload;
  if (!parsed || typeof parsed !== "object") throw new Error("Bad JSON");
  writeOverrides({
    byId: parsed.byId ?? {},
    deleted: parsed.deleted ?? [],
  });
}
