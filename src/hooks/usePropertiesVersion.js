import { useEffect, useState } from "react";
import { subscribeToProperties } from "../data/properties";

/**
 * Listings now load asynchronously (real backend fetch, see
 * data/properties.js) instead of being available synchronously from a
 * static array. Any component that reads getSaleProperties()/
 * getPropertyById()/etc needs to re-render once that fetch resolves (or a
 * listing is later added/edited/deleted) — this returns a number that
 * changes on every such event, so it can go straight into a `useMemo`/
 * `useEffect` dependency array to trigger a recompute.
 */
export function usePropertiesVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeToProperties(() => setVersion((v) => v + 1)), []);
  return version;
}
