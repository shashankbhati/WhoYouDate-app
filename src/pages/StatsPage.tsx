import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { formatCents, activityLabel, activityEmoji, moodEmoji } from '../lib/utils';
import { computeBadges } from '../lib/badgeDefinitions';
import type { ActivityType } from '../lib/types';
import { PLATFORM_STATS, TRENDING_NAMES } from '../lib/mockData';

function PartnerSearch() {
  const entries = useStore(s => s.entries);
  const [query, setQuery] = useState('');

  const result = useMemo(() => {
    if (!query.trim()) return null;
    const name = query.trim().toLowerCase();
    const matched = entries.filter(e => e.partnerDisplayName.toLowerCase() === name);
    if (matched.length < 3) return { count: matched.length, threshold: 50 };
    const totalCents = matched.reduce((s, e) => s + e.amountCents, 0);
    const happyCount = matched.filter(e => e.moodScore === 'amazing' || e.moodScore === 'happy').length;
    const actCount: Record<string, number> = {};
    matched.forEach(e => { actCount[e.activityType] = (actCount[e.activityType] || 0) + 1; });
    const topActivity = Object.entries(actCount).sort((a, b) => b[1] - a[1])[0];
    return {
      count: matched.length,
      avgCents: totalCents / matched.length,
      happyPct: Math.round((happyCount / matched.length) * 100),
      topActivity: topActivity?.[0] as ActivityType,
    };
  }, [entries, query]);

  return (
    <div className="card" style={{ padding: '16px' }}>
      <div className="font-semibold text-sm mb-3" style={{ color: '#e6edf3' }}>🔍 Partner Name Deep Dive</div>
      <input
        type="text"
        placeholder="Find a name..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="input-base mb-3"
      />
      {result && query && (
        <div className="fade-in">
          {result.threshold ? (
            <div className="text-center py-4" style={{ color: '#8b949e' }}>
              <div className="text-2xl mb-2">🔒</div>
              <p className="text-sm">Found {result.count} entries. Need {result.threshold}+ entries to unlock analytics for this name.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded" style={{ background: '#22272e' }}>
                <div className="text-lg font-bold" style={{ color: '#ff3b8b' }}>{formatCents(result.avgCents!)}</div>
                <div className="text-xs" style={{ color: '#8b949e' }}>avg/date</div>
              </div>
              <div className="text-center p-3 rounded" style={{ background: '#22272e' }}>
                <div className="text-lg font-bold" style={{ color: '#3fb950' }}>{result.happyPct}%</div>
                <div className="text-xs" style={{ color: '#8b949e' }}>happy rate</div>
              </div>
              <div className="text-center p-3 rounded" style={{ background: '#22272e' }}>
                <div className="text-lg">{result.topActivity ? activityEmoji(result.topActivity) : '?'}</div>
                <div className="text-xs" style={{ color: '#8b949e' }}>{result.topActivity ? activityLabel(result.topActivity) : 'N/A'}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PersonalStats() {
  const { entries, profile } = useStore();

  const stats = useMemo(() => {
    const myEntries = entries.filter(e => e.userId === (profile?.id || 'demo'));
    const total = myEntries.length;
    const totalCents = myEntries.reduce((s, e) => s + e.amountCents, 0);
    const avgCents = total > 0 ? totalCents / total : 0;
    const actCount: Record<string, number> = {};
    myEntries.forEach(e => { actCount[e.activityType] = (actCount[e.activityType] || 0) + 1; });
    const topActivity = Object.entries(actCount).sort((a, b) => b[1] - a[1])[0]?.[0] as ActivityType;
    const partnerCount: Record<string, number> = {};
    myEntries.forEach(e => { partnerCount[e.partnerDisplayName] = (partnerCount[e.partnerDisplayName] || 0) + 1; });
    const topPartner = Object.entries(partnerCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const happyCount = myEntries.filter(e => e.moodScore === 'amazing' || e.moodScore === 'happy').length;
    const successCount = myEntries.filter(e => e.wantSecondDate === 'yes' || e.wantSecondDate === 'together').length;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
    const moodDist: Record<string, number> = {};
    myEntries.forEach(e => { moodDist[e.moodScore] = (moodDist[e.moodScore] || 0) + 1; });
    return { total, totalCents, avgCents, topActivity, topPartner, happyCount, successRate, moodDist };
  }, [entries, profile]);

  return (
    <div className="card" style={{ padding: '16px' }}>
      <div className="font-semibold text-sm mb-4" style={{ color: '#e6edf3' }}>📊 Your Stats</div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Total Entries', value: stats.total },
          { label: 'Total Spent', value: formatCents(stats.totalCents) },
          { label: 'Avg Per Date', value: formatCents(stats.avgCents) },
          { label: 'Success Rate', value: `${stats.successRate}%` },
        ].map(s => (
          <div key={s.label} className="p-3 rounded text-center" style={{ background: '#22272e' }}>
            <div className="font-bold text-base" style={{ color: '#ff3b8b' }}>{s.value}</div>
            <div className="text-xs" style={{ color: '#8b949e' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {stats.topActivity && (
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: '#8b949e' }}>Top activity</span>
            <span style={{ color: '#e6edf3' }}>{activityEmoji(stats.topActivity)} {activityLabel(stats.topActivity)}</span>
          </div>
        )}
        {stats.topPartner && (
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: '#8b949e' }}>Most dated</span>
            <span style={{ color: '#e6edf3' }}>💕 {stats.topPartner}</span>
          </div>
        )}
      </div>

      {/* Mood distribution */}
      {stats.total > 0 && (
        <div className="mt-4">
          <div className="text-xs font-medium mb-2" style={{ color: '#6e7681' }}>Mood distribution</div>
          <div className="flex gap-1">
            {Object.entries(stats.moodDist).map(([mood, count]) => (
              <div
                key={mood}
                title={`${mood}: ${count}`}
                className="flex-1 text-center text-xs py-1 rounded"
                style={{ background: '#22272e', color: '#8b949e' }}
              >
                {moodEmoji(mood as any)} {count}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SuccessRate() {
  const { entries, profile } = useStore();

  const data = useMemo(() => {
    const myEntries = entries.filter(e => e.userId === (profile?.id || 'demo'));
    const byActivity: Record<string, { total: number; success: number }> = {};
    const bySource: Record<string, { total: number; success: number }> = {};

    myEntries.forEach(e => {
      const act = e.activityType;
      if (!byActivity[act]) byActivity[act] = { total: 0, success: 0 };
      byActivity[act].total++;
      if (e.wantSecondDate === 'yes' || e.wantSecondDate === 'together') byActivity[act].success++;

      if (e.howMet) {
        if (!bySource[e.howMet]) bySource[e.howMet] = { total: 0, success: 0 };
        bySource[e.howMet].total++;
        if (e.wantSecondDate === 'yes' || e.wantSecondDate === 'together') bySource[e.howMet].success++;
      }
    });

    const actStats = Object.entries(byActivity)
      .map(([act, d]) => ({ act: act as ActivityType, rate: d.total > 0 ? Math.round((d.success / d.total) * 100) : 0, total: d.total }))
      .sort((a, b) => b.rate - a.rate);

    const sourceStats = Object.entries(bySource)
      .map(([src, d]) => ({ src, rate: d.total > 0 ? Math.round((d.success / d.total) * 100) : 0, total: d.total }))
      .sort((a, b) => b.rate - a.rate);

    return { actStats, sourceStats };
  }, [entries, profile]);

  return (
    <div className="card" style={{ padding: '16px' }}>
      <div className="font-semibold text-sm mb-3" style={{ color: '#e6edf3' }}>🎯 Success Formula</div>

      {data.actStats.length === 0 ? (
        <p className="text-xs" style={{ color: '#8b949e' }}>Log dates with second-date responses to see your success formula.</p>
      ) : (
        <>
          <div className="mb-3">
            <div className="text-xs font-medium mb-2" style={{ color: '#6e7681' }}>Success by activity</div>
            <div className="flex items-end gap-2" style={{ height: '60px' }}>
              {data.actStats.slice(0, 5).map((a, i) => (
                <div key={a.act} className="flex flex-col items-center gap-1 flex-1">
                  <div style={{ width: '100%', height: `${Math.max((a.rate / 100) * 48, 2)}px`, background: i === 0 ? '#3fb950' : '#30363d', borderRadius: '2px 2px 0 0', alignSelf: 'flex-end' }} />
                  <span style={{ fontSize: '9px', color: '#6e7681' }}>{activityEmoji(a.act)}</span>
                </div>
              ))}
            </div>
            {data.actStats.slice(0, 3).map(a => (
              <div key={a.act} className="flex items-center justify-between text-xs py-0.5">
                <span style={{ color: '#8b949e' }}>{activityEmoji(a.act)} {activityLabel(a.act)}</span>
                <span style={{ color: '#3fb950' }}>{a.rate}%</span>
              </div>
            ))}
          </div>

          {data.sourceStats.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-2" style={{ color: '#6e7681' }}>Success by source</div>
              {data.sourceStats.slice(0, 3).map(s => (
                <div key={s.src} className="flex items-center justify-between text-xs py-0.5">
                  <span style={{ color: '#8b949e' }}>{s.src}</span>
                  <span style={{ color: '#3fb950' }}>{s.rate}% ({s.total})</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlatformTrends() {
  const entries = useStore(s => s.entries);
  const total = entries.length;
  const threshold = 100;

  if (total < threshold) {
    return (
      <div className="card" style={{ padding: '16px' }}>
        <div className="font-semibold text-sm mb-3" style={{ color: '#e6edf3' }}>🌍 Platform Trends</div>
        <div className="text-center py-4">
          <div className="text-2xl mb-2">🔒</div>
          <p className="text-sm mb-2" style={{ color: '#8b949e' }}>
            Platform trends unlock at {threshold} entries
          </p>
          <div className="rounded-full h-2 mb-2" style={{ background: '#21262d' }}>
            <div className="h-2 rounded-full" style={{ width: `${Math.min((total / threshold) * 100, 100)}%`, background: '#ff3b8b' }} />
          </div>
          <p className="text-xs" style={{ color: '#6e7681' }}>{total}/{threshold} entries — {threshold - total} more needed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '16px' }}>
      <div className="font-semibold text-sm mb-3" style={{ color: '#e6edf3' }}>🌍 Platform Trends</div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Entries', value: PLATFORM_STATS.totalEntries.toLocaleString() },
          { label: 'Avg Spend', value: formatCents(PLATFORM_STATS.avgSpendCents) },
          { label: 'Happy Rate', value: `${PLATFORM_STATS.moodHappyPct}%` },
          { label: 'Top Activity', value: PLATFORM_STATS.topActivity },
        ].map(s => (
          <div key={s.label} className="p-3 rounded" style={{ background: '#22272e' }}>
            <div className="font-bold text-sm" style={{ color: '#e6edf3' }}>{s.value}</div>
            <div className="text-xs" style={{ color: '#8b949e' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { entries, profile } = useStore();
  const myEntries = entries.filter(e => e.userId === (profile?.id || 'demo'));
  const badges = computeBadges(myEntries);
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold" style={{ color: '#e6edf3' }}>Stats & Analytics</h1>
        <p className="text-xs" style={{ color: '#8b949e' }}>Your dating patterns and platform insights</p>
      </div>

      <div className="flex gap-4">
        {/* Left sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-3 hidden lg:flex">
          <div className="card" style={{ padding: '12px' }}>
            <div className="text-xs font-bold mb-2" style={{ color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Stats</div>
            <div className="flex justify-between text-xs py-1" style={{ borderBottom: '1px solid #21262d' }}>
              <span style={{ color: '#8b949e' }}>My entries</span>
              <span style={{ color: '#e6edf3' }}>{myEntries.length}</span>
            </div>
            <div className="flex justify-between text-xs py-1" style={{ borderBottom: '1px solid #21262d' }}>
              <span style={{ color: '#8b949e' }}>Badges earned</span>
              <span style={{ color: '#ff3b8b' }}>{earnedCount}/17</span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span style={{ color: '#8b949e' }}>Platform total</span>
              <span style={{ color: '#e6edf3' }}>{PLATFORM_STATS.totalEntries.toLocaleString()}</span>
            </div>
          </div>
          <PlatformTrends />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <PersonalStats />
          <SuccessRate />
          <PartnerSearch />
        </div>

        {/* Right sidebar */}
        <div className="w-64 shrink-0 hidden xl:block">
          <div className="card" style={{ padding: '12px' }}>
            <div className="text-xs font-bold mb-2" style={{ color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trending Names</div>
            {TRENDING_NAMES.byCost.slice(0, 5).map((n, i) => (
              <div key={n.name} className="flex items-center justify-between text-xs py-1" style={{ borderBottom: i < 4 ? '1px solid #21262d' : 'none' }}>
                <span style={{ color: '#8b949e' }}>{i + 1}. {n.name}</span>
                <span style={{ color: '#ff3b8b' }}>{formatCents(n.avgCents)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
