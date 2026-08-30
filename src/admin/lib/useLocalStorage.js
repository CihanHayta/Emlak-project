import { useEffect, useState } from "react";

/**
 * A `useState` that persists to localStorage, so admin panel data (customer
 * cards, appointments, admin-created listings) survives page reloads
 * without needing a real backend yet. `initialValue` is only used the very
 * first time a key is seen (e.g. to seed demo data).
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
