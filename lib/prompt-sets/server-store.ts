import { randomUUID } from "crypto";
import type { CustomPromptSet, CreateCustomPromptSet } from "./types";

const store = new Map<string, CustomPromptSet>();

export function createCustomPromptSet(data: CreateCustomPromptSet): CustomPromptSet {
  const set: CustomPromptSet = {
    ...data,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  store.set(set.id, set);
  return set;
}

export function getCustomPromptSet(id: string): CustomPromptSet | undefined {
  return store.get(id);
}

export function updateCustomPromptSet(
  id: string,
  data: CreateCustomPromptSet
): CustomPromptSet | undefined {
  const existing = store.get(id);
  if (!existing) return undefined;
  const updated: CustomPromptSet = { ...existing, ...data };
  store.set(id, updated);
  return updated;
}

export function deleteCustomPromptSet(id: string): boolean {
  return store.delete(id);
}

export function listCustomPromptSets(): CustomPromptSet[] {
  return Array.from(store.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
