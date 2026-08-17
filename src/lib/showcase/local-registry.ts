"use client";

/**
 * Maps a local pcId -> its published showcase (shareId + ownerToken).
 * ownerToken is the ONLY credential that can update/delete that snapshot —
 * there are no accounts, so losing this localStorage entry means losing
 * the ability to manage that showcase (a fresh "Publish" just creates a
 * new one).
 */
const KEY = "cardstory:showcase-owner:v1";

export interface ShowcaseRegistryEntry {
  shareId: string;
  ownerToken: string;
  publishedAt: string;
}

type Registry = Record<string, ShowcaseRegistryEntry>; // pcId -> entry

function load(): Registry {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Registry) : {};
  } catch {
    return {};
  }
}

function save(registry: Registry) {
  window.localStorage.setItem(KEY, JSON.stringify(registry));
}

export function getShowcaseEntry(pcId: string): ShowcaseRegistryEntry | undefined {
  return load()[pcId];
}

export function setShowcaseEntry(pcId: string, entry: ShowcaseRegistryEntry) {
  const registry = load();
  registry[pcId] = entry;
  save(registry);
}

export function clearShowcaseEntry(pcId: string) {
  const registry = load();
  delete registry[pcId];
  save(registry);
}
