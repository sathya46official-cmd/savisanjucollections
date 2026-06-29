"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Lightweight client-side wishlist backed by localStorage.
 *
 * No backend or auth required — wishlist IDs live in the browser. Multiple
 * components stay in sync via a custom "wishlist:change" event plus the native
 * "storage" event (for changes from other tabs). SSR-safe: never touches
 * `window` during render.
 */
const STORAGE_KEY = "savisanju:wishlist";
const CHANGE_EVENT = "wishlist:change";

function readWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeWishlist(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    // Notify listeners in the same tab (storage event only fires cross-tab).
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // Quota or privacy mode — fail silently; wishlist is non-critical.
  }
}

export function useWishlist() {
  const [ids, setIds] = useState<string[]>([]);

  // Hydrate after mount to avoid SSR/client mismatch.
  useEffect(() => {
    setIds(readWishlist());

    const sync = () => setIds(readWishlist());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isWishlisted = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    if (!id) return;
    const current = readWishlist();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    writeWishlist(next);
    setIds(next);
  }, []);

  return { ids, isWishlisted, toggle, count: ids.length };
}
