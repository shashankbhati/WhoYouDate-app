import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
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
  }, []);
  return null;
}

export default function DatingMap({ entries, currencySymbol }: { entries: Entry[]; currencySymbol: string }) {
  const pins = useMemo<CityPin[]>(() => {
    const map: Record<string, CityPin & { moods: number[] }> = {};
    entries.forEach((e) => {
      if (e.lat == null || e.lon == null) return;
      const key = `${e.lat.toFixed(2)}_${e.lon.toFixed(2)}`;
      if (!map[key]) map[key] = { lat: e.lat, lon: e.lon, city: e.city, count: 0, totalCents: 0, avgMood: 0, moods: [] };
      map[key].count++;
      map[key].totalCents += e.amountCents;
      map[key].moods.push(e.mood);
    });
    return Object.values(map).map(({ moods, ...pin }) => ({
      ...pin,
      avgMood: moods.reduce((a, b) => a + b, 0) / moods.length,
    }));
  }, [entries]);

  if (pins.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ height: 320 }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <AutoFit pins={pins} />
        {pins.map((pin, i) => (
          <CircleMarker
            key={i}
            center={[pin.lat, pin.lon]}
            radius={Math.max(10, Math.min(26, 8 + pin.count * 4))}
            pathOptions={{
              fillColor: "hsl(330 81% 60%)",
              color: "hsl(330 81% 80%)",
              fillOpacity: 0.8,
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
    </div>
  );
}
