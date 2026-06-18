import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import type { Entry } from "@/lib/datedata/types";

interface CityPin {
  lat: number;
  lon: number;
  city: string;
  count: number;
  totalCents: number;
  avgMood: number;
}

function AutoFit({ pins }: { pins: CityPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lon], 9);
    } else {
      map.fitBounds(
        pins.map((p) => [p.lat, p.lon] as [number, number]),
        { padding: [40, 40] }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins.length]);
  return null;
}

export default function DatingMap({ entries, currencySymbol }: { entries: Entry[]; currencySymbol: string }) {
  const [geocoded, setGeocoded] = useState<Record<string, { lat: number; lon: number }>>({});
  const [geocoding, setGeocoding] = useState(false);

  // Find unique city names that have no stored lat/lon
  const missingCities = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => { if (e.lat == null) set.add(e.city); });
    return [...set];
  }, [entries]);

  // Geocode missing cities via Nominatim (sequential, ~400ms apart)
  useEffect(() => {
    if (missingCities.length === 0) return;
    let cancelled = false;
    setGeocoding(true);
    (async () => {
      for (let i = 0; i < missingCities.length; i++) {
        if (cancelled) break;
        const city = missingCities[i];
        if (geocoded[city]) continue;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`
          );
          const data = await res.json();
          if (data[0] && !cancelled) {
            setGeocoded((prev) => ({ ...prev, [city]: { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } }));
          }
        } catch { /* skip */ }
        if (i < missingCities.length - 1) await new Promise((r) => setTimeout(r, 420));
      }
      if (!cancelled) setGeocoding(false);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingCities.join(",")]);

  const pins = useMemo<CityPin[]>(() => {
    const map: Record<string, CityPin & { moods: number[] }> = {};
    entries.forEach((e) => {
      const lat = e.lat ?? geocoded[e.city]?.lat;
      const lon = e.lon ?? geocoded[e.city]?.lon;
      if (lat == null || lon == null) return;
      const key = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
      if (!map[key]) map[key] = { lat, lon, city: e.city, count: 0, totalCents: 0, avgMood: 0, moods: [] };
      map[key].count++;
      map[key].totalCents += e.amountCents;
      map[key].moods.push(e.mood);
    });
    return Object.values(map).map(({ moods, ...pin }) => ({
      ...pin,
      avgMood: moods.reduce((a, b) => a + b, 0) / moods.length,
    }));
  }, [entries, geocoded]);

  if (pins.length === 0 && geocoding) {
    return <div className="h-64 rounded-xl bg-muted animate-pulse flex items-center justify-center text-sm text-muted-foreground">Locating your cities…</div>;
  }
  if (pins.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden relative" style={{ height: 320 }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <AutoFit pins={pins} />
        {pins.map((pin, i) => (
          <CircleMarker
            key={i}
            center={[pin.lat, pin.lon]}
            radius={Math.max(10, Math.min(26, 8 + pin.count * 4))}
            pathOptions={{
              fillColor: "hsl(330 81% 60%)",
              color: "hsl(330 81% 40%)",
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ minWidth: 130, fontFamily: "inherit" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>📍 {pin.city}</div>
                <div>{pin.count} date{pin.count !== 1 ? "s" : ""}</div>
                <div>avg {currencySymbol}{(pin.totalCents / pin.count / 100).toFixed(0)}/date</div>
                <div>avg mood {pin.avgMood.toFixed(1)} / 5</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <p className="absolute bottom-1 right-1.5 z-[1000] text-[9px] text-gray-400 pointer-events-none">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="pointer-events-auto">OSM</a> © <a href="https://carto.com/attributions" target="_blank" rel="noreferrer" className="pointer-events-auto">CARTO</a>
      </p>
    </div>
  );
}
