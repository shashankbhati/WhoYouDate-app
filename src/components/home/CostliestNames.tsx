import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { COSTLIEST_BY_CITY } from '../../lib/mockData';
import { formatCents } from '../../lib/utils';

const CITIES = Object.keys(COSTLIEST_BY_CITY);

export default function CostliestNames() {
  const [activeCity, setActiveCity] = useState(CITIES[0]);
  const [shareMsg, setShareMsg] = useState('');

  const names = COSTLIEST_BY_CITY[activeCity] || [];
  const max = names.reduce((m, n) => Math.max(m, n.avgCents), 0);

  const handleShare = (name: string, avgCents: number) => {
    const text = `${name} is the most expensive name to date in ${activeCity} — avg ${formatCents(avgCents)}/date 💸👑\n\n#WhoAmIDating #DatingAnalytics`;
    navigator.clipboard.writeText(text).catch(() => {});
    setShareMsg(`Copied stats for ${name}!`);
    setTimeout(() => setShareMsg(''), 2000);
  };

  return (
    <div className="card" style={{ padding: '16px' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">💸</span>
          <span className="font-semibold text-sm" style={{ color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
            Costliest Names to Date
          </span>
        </div>
        {shareMsg && <span className="text-xs" style={{ color: '#3fb950' }}>{shareMsg}</span>}
      </div>

      {/* City tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {CITIES.map(c => (
          <button
            key={c}
            onClick={() => setActiveCity(c)}
            className="text-xs px-3 py-1 rounded-full"
            style={{
              background: c === activeCity ? '#ff3b8b' : '#22272e',
              color: c === activeCity ? 'white' : '#8b949e',
              border: c === activeCity ? 'none' : '1px solid #30363d',
              cursor: 'pointer',
              fontWeight: c === activeCity ? 600 : 400,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Vertical bar chart */}
      <div className="flex items-end gap-3 justify-center" style={{ height: '120px', paddingBottom: '4px' }}>
        {names.slice(0, 6).map((n, i) => {
          const pct = max > 0 ? (n.avgCents / max) * 100 : 0;
          const height = Math.max((pct / 100) * 100, 4);
          const isPrimary = i === 0;
          return (
            <div key={n.name} className="flex flex-col items-center gap-1 flex-1" style={{ minWidth: 0 }}>
              <div
                title={`${n.name}: ${formatCents(n.avgCents)}/date (${n.entryCount} entries)`}
                style={{
                  width: '100%',
                  maxWidth: '40px',
                  height: `${height}px`,
                  background: isPrimary ? '#ff3b8b' : '#30363d',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.4s ease-out',
                  cursor: 'default',
                  alignSelf: 'flex-end',
                }}
              />
              <span className="text-center truncate w-full" style={{ fontSize: '10px', color: isPrimary ? '#e6edf3' : '#6e7681' }}>
                {n.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="mt-3 flex flex-col gap-1">
        {names.slice(0, 5).map((n, i) => (
          <div key={n.name} className="flex items-center justify-between py-1" style={{ borderBottom: i < 4 ? '1px solid #21262d' : 'none' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: '#6e7681', minWidth: '16px' }}>{i + 1}</span>
              <span className="text-sm" style={{ color: '#e6edf3' }}>{n.name}</span>
              <span className="text-xs" style={{ color: '#6e7681' }}>({n.entryCount} dates)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: i === 0 ? '#ff3b8b' : '#e6edf3' }}>
                {formatCents(n.avgCents)}/date
              </span>
              <button
                onClick={() => handleShare(n.name, n.avgCents)}
                className="vote-btn"
                title="Share to Instagram"
                style={{ padding: '2px 4px' }}
              >
                <Share2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
