import { useEffect, useState } from "react";
import { subscribeToVehicles } from "../data/vehicles";

/** usePropertiesVersion.js ile birebir aynı desen — bkz. o dosyanın yorumu. */
export function useVehiclesVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeToVehicles(() => setVersion((v) => v + 1)), []);
  return version;
}
