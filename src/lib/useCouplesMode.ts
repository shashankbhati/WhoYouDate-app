import { useCallback, useEffect, useState } from "react";
import { useStore, getProfile, saveProfile } from "@/lib/datedata/store";

// Couples mode reuses the real profile `relationshipStage` ("In a relationship"
// or "Married" == couples). localStorage mirrors it for an instant toggle, and we
// best-effort persist to the profile. SSR-safe: `couples` is false until mounted,
// so server + first client render match (no hydration mismatch).
const KEY = "wid_relationship_stage";
const COUPLES = "In a relationship";
const DATING = "Dating";

function isCouple(stage?: string): boolean {
  return stage === "In a relationship" || stage === "Married";
}

export function useCouplesMode() {
  const { profile } = useStore();
  const [mounted, setMounted] = useState(false);
  const [couples, setCouplesState] = useState(false);

  useEffect(() => {
    setMounted(true);
    let val = false;
    if (profile) {
      val = isCouple(profile.relationshipStage);
    } else {
      try {
        val = localStorage.getItem(KEY) === COUPLES;
      } catch {
        /* ignore */
      }
    }
    setCouplesState(val);
  }, [profile]);

  const setCouples = useCallback((on: boolean) => {
    setCouplesState(on);
    try {
      localStorage.setItem(KEY, on ? COUPLES : DATING);
    } catch {
      /* ignore */
    }
    const p = getProfile();
    if (p && isCouple(p.relationshipStage) !== on) {
      void saveProfile({ ...p, relationshipStage: on ? COUPLES : DATING }).catch(() => {});
    }
  }, []);

  const toggle = useCallback(() => setCouples(!couples), [couples, setCouples]);

  return { couples: mounted && couples, mounted, toggle, setCouples };
}
