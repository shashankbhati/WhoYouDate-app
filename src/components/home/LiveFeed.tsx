import { useEffect, useState } from 'react';
import { LIVE_FEED } from '../../lib/mockData';
import { activityEmoji, activityLabel, formatCents } from '../../lib/utils';
import type { TrendingEntry } from '../../lib/types';

export default function LiveFeed() {
  const [entries, setEntries] = useState<TrendingEntry[]>(LIVE_FEED);

  // Simulate new entries every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setEntries(prev => {
        const shifted = [...prev.slice(1), { ...prev[0], minutesAgo: prev[0].minutesAgo + 2 }];
        return shifted;
      });
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="card" style={{ padding: '12px' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="pulse-dot inline-block w-2 h-2 rounded-full" style={{ background: '#f85149' }} />
        <span className="text-xs font-bold" style={{ color: '#f85149', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Live Activity
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {entries.slice(0, 6).map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-xs" style={{ color: '#8b949e' }}>
            <span>{activityEmoji(e.activityType)}</span>
            <span style={{ color: '#e6edf3' }}>{formatCents(e.amountCents)}</span>
            <span>{activityLabel(e.activityType)} in {e.city}</span>
            <span className="ml-auto shrink-0">{e.minutesAgo}m ago</span>
          </div>
        ))}
      </div>
    </div>
  );
}
