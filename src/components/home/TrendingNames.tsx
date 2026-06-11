import { useState } from 'react';
import { TRENDING_NAMES } from '../../lib/mockData';
import { formatCents } from '../../lib/utils';

type Tab = 'cost' | 'happy' | 'dates';

const TABS: { label: string; value: Tab }[] = [
  { label: '💸 Cost', value: 'cost' },
  { label: '😍 Happy', value: 'happy' },
  { label: '📅 Dates', value: 'dates' },
];

export default function TrendingNames() {
  const [tab, setTab] = useState<Tab>('cost');

  const data = tab === 'cost' ? TRENDING_NAMES.byCost : tab === 'happy' ? TRENDING_NAMES.byHappy : TRENDING_NAMES.byDates;
  const max = data.reduce((m, n) => {
    const val = tab === 'cost' ? n.avgCents : tab === 'happy' ? n.happyPct : n.entryCount;
    return Math.max(m, val);
  }, 0);

  const getValue = (n: typeof data[0]) =>
    tab === 'cost' ? n.avgCents : tab === 'happy' ? n.happyPct : n.entryCount;

  const formatVal = (n: typeof data[0]) => {
    if (tab === 'cost') return formatCents(n.avgCents) + '/date';
    if (tab === 'happy') return `${n.happyPct}% happy`;
    return `${n.entryCount} dates`;
  };

  return (
    <div className="card" style={{ padding: '16px' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📈</span>
          <span className="font-semibold" style={{ color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
            Trending Partner Names
          </span>
        </div>
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className="text-xs px-2 py-1 rounded"
              style={{
                background: tab === t.value ? '#ff3b8b' : '#22272e',
                color: tab === t.value ? 'white' : '#8b949e',
                border: tab === t.value ? 'none' : '1px solid #30363d',
                cursor: 'pointer',
                fontWeight: tab === t.value ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical bar chart */}
      <div className="flex items-end gap-3 justify-center" style={{ height: '100px', paddingBottom: '4px' }}>
        {data.map((n, i) => {
          const val = getValue(n);
          const pct = max > 0 ? (val / max) * 100 : 0;
          const height = Math.max((pct / 100) * 84, 4);
          const isPrimary = i === 0;
          return (
            <div key={n.name} className="flex flex-col items-center gap-1 flex-1" style={{ minWidth: 0 }}>
              <div
                title={formatVal(n)}
                style={{
                  width: '100%',
                  maxWidth: '40px',
                  height: `${height}px`,
                  background: isPrimary ? '#ff3b8b' : '#30363d',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.4s ease-out',
                  alignSelf: 'flex-end',
                }}
              />
              <span style={{ fontSize: '10px', color: isPrimary ? '#e6edf3' : '#6e7681' }} className="truncate w-full text-center">
                {n.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div className="mt-3 flex flex-col gap-1">
        {data.slice(0, 5).map((n, i) => (
          <div key={n.name} className="flex items-center justify-between py-1" style={{ borderBottom: i < 4 ? '1px solid #21262d' : 'none' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: '#6e7681', minWidth: '16px' }}>{i + 1}</span>
              <span className="text-sm" style={{ color: '#e6edf3' }}>{n.name}</span>
            </div>
            <span className="text-xs font-semibold" style={{ color: i === 0 ? '#ff3b8b' : '#8b949e' }}>
              {formatVal(n)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
