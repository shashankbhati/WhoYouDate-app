import { useState, useEffect } from "react";
import { COUNTRY_CONFIG, type CountryCode } from "./datedata/countries";

const STORAGE_KEY = "wyd_country";

function detectFromTimezone(): CountryCode {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "IN";
    if (tz.startsWith("America/")) return "US";
    if (tz.startsWith("Europe/")) return "DE";
  } catch {}
  return "all";
}

let _country: CountryCode = "all";
if (typeof window !== "undefined") {
  const saved = localStorage.getItem(STORAGE_KEY) as CountryCode | null;
  _country = (saved && saved in COUNTRY_CONFIG) ? saved : detectFromTimezone();
}

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export function getCountry(): CountryCode { return _country; }
export function getCountryConfig() { return COUNTRY_CONFIG[_country]; }

export function setCountry(code: CountryCode) {
  _country = code;
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, code);
  emit();
}

export function useCountry() {
  const [, force] = useState(0);
  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  return { country: _country, config: COUNTRY_CONFIG[_country] };
}
