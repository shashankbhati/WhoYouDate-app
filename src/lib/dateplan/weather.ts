import type { TimeOfDay } from "./types";

// ── Weather (Open-Meteo — free, no API key) ──────────────────────────────────
// Used to decide whether outdoor roadmap stops stay outdoors or swap indoors.

export interface WeatherHint {
  outdoorOk: boolean;
  summary: string; // short human line, e.g. "12°C, light rain expected"
  emoji: string;
}

const HOUR_BY_TOD: Record<TimeOfDay, number> = {
  morning: 9,
  afternoon: 15,
  evening: 19,
  night: 22,
};

// WMO weather codes → outdoor-friendliness + label. (subset we care about)
function describeCode(code: number): { bad: boolean; label: string; emoji: string } {
  if (code === 0) return { bad: false, label: "clear", emoji: "☀️" };
  if (code <= 2) return { bad: false, label: "mostly sunny", emoji: "🌤️" };
  if (code === 3) return { bad: false, label: "cloudy", emoji: "☁️" };
  if (code >= 45 && code <= 48) return { bad: true, label: "foggy", emoji: "🌫️" };
  if (code >= 51 && code <= 67) return { bad: true, label: "rain", emoji: "🌧️" };
  if (code >= 71 && code <= 77) return { bad: true, label: "snow", emoji: "🌨️" };
  if (code >= 80 && code <= 82) return { bad: true, label: "rain showers", emoji: "🌦️" };
  if (code >= 95) return { bad: true, label: "storms", emoji: "⛈️" };
  return { bad: false, label: "mixed", emoji: "🌥️" };
}

// Returns null when the date is out of forecast range or the fetch fails — the
// engine then just skips weather-based swaps.
export async function getWeather(
  lat: number,
  lon: number,
  isoDate: string,
  timeOfDay: TimeOfDay,
): Promise<WeatherHint | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,weathercode&start_date=${isoDate}&end_date=${isoDate}&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const times: string[] = data?.hourly?.time ?? [];
    const temps: number[] = data?.hourly?.temperature_2m ?? [];
    const codes: number[] = data?.hourly?.weathercode ?? [];
    if (times.length === 0) return null;

    const targetHour = HOUR_BY_TOD[timeOfDay];
    let idx = times.findIndex((t) => new Date(t).getHours() === targetHour);
    if (idx === -1) idx = Math.min(targetHour, times.length - 1);

    const temp = Math.round(temps[idx]);
    const { bad, label, emoji } = describeCode(codes[idx] ?? 0);
    const cold = temp <= 4;
    const outdoorOk = !bad && !cold;
    const summary = `${temp}°C, ${label}${cold ? " (chilly)" : ""}`;
    return { outdoorOk, summary, emoji };
  } catch {
    return null;
  }
}
