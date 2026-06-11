import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Share2, Edit2, MapPin } from 'lucide-react';
import { useStore } from '../lib/store';
import { computeBadges } from '../lib/badgeDefinitions';
import { formatCents, activityEmoji, moodEmoji } from '../lib/utils';
import type { Badge } from '../lib/types';

function BadgeCard({ badge }: { badge: Badge }) {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div
      className="relative flex flex-col items-center gap-1 p-3 rounded cursor-default"
      style={{
        background: badge.earned ? 'rgba(255,59,139,0.08)' : '#22272e',
        border: badge.earned ? '1px solid rgba(255,59,139,0.3)' : '1px solid #30363d',
        opacity: badge.earned ? 1 : 0.5,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="text-2xl">{badge.emoji}</span>
      <span className="text-xs font-medium text-center" style={{ color: badge.earned ? '#e6edf3' : '#6e7681', fontSize: '10px' }}>{badge.name}</span>
      {badge.earned && <span className="text-xs" style={{ color: '#3fb950', fontSize: '9px' }}>✓ Earned</span>}
      {!badge.earned && badge.progress !== undefined && badge.total && (
        <span style={{ fontSize: '9px', color: '#6e7681' }}>{badge.progress}/{badge.total}</span>
      )}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-40 p-2 rounded text-xs z-10" style={{ background: '#1c2128', border: '1px solid #30363d', color: '#8b949e' }}>
          {badge.description}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { profile, entries } = useStore();
  const [shareMsg, setShareMsg] = useState('');

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#e6edf3' }}>No profile yet</h2>
        <p className="mb-4" style={{ color: '#8b949e' }}>Create an anonymous profile to track your dating journey.</p>
        <Link to="/setup" className="btn-primary" style={{ borderRadius: '6px', padding: '10px 24px', textDecoration: 'none' }}>
          Create Profile
        </Link>
      </div>
    );
  }

  const myEntries = entries.filter(e => e.userId === profile.id || e.userId === 'demo');
  const badges = computeBadges(myEntries);
  const earnedBadges = badges.filter(b => b.earned);
  const totalSpent = myEntries.reduce((s, e) => s + e.amountCents, 0);
  const successCount = myEntries.filter(e => e.wantSecondDate === 'yes' || e.wantSecondDate === 'together').length;
  const successRate = myEntries.length > 0 ? Math.round((successCount / myEntries.length) * 100) : 0;

  const byActivity: Record<string, { total: number; success: number }> = {};
  myEntries.forEach(e => {
    if (!byActivity[e.activityType]) byActivity[e.activityType] = { total: 0, success: 0 };
    byActivity[e.activityType].total++;
    if (e.wantSecondDate === 'yes' || e.wantSecondDate === 'together') byActivity[e.activityType].success++;
  });

  const handleShare = () => {
    const text = `My dating stats: ${successRate}% success rate 💕\n${myEntries.length} dates logged • ${formatCents(totalSpent)} total\n${earnedBadges.map(b => b.emoji + ' ' + b.name).join(' • ')}\n\n#WhoAmIDating #DatingAnalytics`;
    navigator.clipboard.writeText(text).catch(() => {});
    setShareMsg('Stats copied!');
    setTimeout(() => setShareMsg(''), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex gap-4">
        {/* Left sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-3 hidden lg:flex">
          {/* Recent dates */}
          <div className="card" style={{ padding: '12px' }}>
            <div className="text-xs font-bold mb-2" style={{ color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recent Dates
            </div>
            {myEntries.slice(0, 6).map(e => (
              <div key={e.id} className="flex items-center gap-2 py-1.5" style={{ borderBottom: '1px solid #21262d' }}>
                <span className="text-base">{activityEmoji(e.activityType)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: '#e6edf3' }}>{e.partnerDisplayName}</div>
                  <div className="text-xs" style={{ color: '#6e7681' }}>{formatCents(e.amountCents, e.currency)}</div>
                </div>
                <span className="text-sm">{moodEmoji(e.moodScore)}</span>
              </div>
            ))}
            {myEntries.length === 0 && <p className="text-xs" style={{ color: '#6e7681' }}>No dates logged yet.</p>}
          </div>

          {/* Badges earned */}
          <div className="card" style={{ padding: '12px' }}>
            <div className="text-xs font-bold mb-2" style={{ color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Badges ({earnedBadges.length}/17)
            </div>
            {earnedBadges.length === 0 ? (
              <p className="text-xs" style={{ color: '#6e7681' }}>Log dates to earn badges!</p>
            ) : (
              <div className="flex flex-col gap-1">
                {earnedBadges.map(b => (
                  <div key={b.id} className="flex items-center gap-2 text-xs">
                    <span>{b.emoji}</span>
                    <span style={{ color: '#e6edf3' }}>{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Profile card */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg, #ff3b8b, #7c3aed)', color: 'white', flexShrink: 0 }}>
                {profile.displayName[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold" style={{ color: '#e6edf3' }}>{profile.displayName}</h2>
                <div className="flex items-center gap-1 text-xs mt-1" style={{ color: '#8b949e' }}>
                  <MapPin size={11} />
                  {profile.city}, {profile.country}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="tag">{profile.ageRange}</span>
                  <span className="tag">· {profile.relationshipStage}</span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Entries', value: myEntries.length },
                { label: 'Total Spent', value: formatCents(totalSpent) },
                { label: 'Badges', value: earnedBadges.length },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded" style={{ background: '#22272e' }}>
                  <div className="font-bold text-base" style={{ color: '#e6edf3' }}>{s.value}</div>
                  <div className="text-xs" style={{ color: '#8b949e' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={handleShare} className="btn-secondary flex items-center gap-2">
                <Share2 size={13} />
                {shareMsg || 'Share Stats'}
              </button>
              <Link to="/setup" className="btn-secondary flex items-center gap-2" style={{ textDecoration: 'none' }}>
                <Edit2 size={13} />
                Edit Profile
              </Link>
            </div>
          </div>

          {/* Badge collection */}
          <div className="card" style={{ padding: '20px' }}>
            <div className="font-semibold text-sm mb-4" style={{ color: '#e6edf3' }}>
              Badge Collection
            </div>
            <div className="grid grid-cols-4 gap-2">
              {badges.map(b => <BadgeCard key={b.id} badge={b} />)}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-3 hidden lg:flex">
          {/* Success by activity */}
          <div className="card" style={{ padding: '12px' }}>
            <div className="text-xs font-bold mb-2" style={{ color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Success by Activity
            </div>
            {Object.entries(byActivity).length === 0 ? (
              <p className="text-xs" style={{ color: '#6e7681' }}>Log dates with 2nd-date answers to see this.</p>
            ) : (
              Object.entries(byActivity).map(([act, d]) => {
                const rate = d.total > 0 ? Math.round((d.success / d.total) * 100) : 0;
                return (
                  <div key={act} className="flex items-center justify-between text-xs py-1" style={{ borderBottom: '1px solid #21262d' }}>
                    <span style={{ color: '#8b949e' }}>{activityEmoji(act as any)} {act.replace('_', ' ')}</span>
                    <span style={{ color: rate >= 70 ? '#3fb950' : rate >= 40 ? '#d29922' : '#f85149' }}>{rate}%</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick stats */}
          <div className="card" style={{ padding: '12px' }}>
            <div className="text-xs font-bold mb-2" style={{ color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quick Stats
            </div>
            {[
              { label: 'Avg spend', value: myEntries.length > 0 ? formatCents(totalSpent / myEntries.length) : '—' },
              { label: 'Happy dates', value: myEntries.length > 0 ? `${Math.round((myEntries.filter(e => e.moodScore === 'amazing' || e.moodScore === 'happy').length / myEntries.length) * 100)}%` : '—' },
              { label: 'Success rate', value: `${successRate}%` },
            ].map(s => (
              <div key={s.label} className="flex justify-between text-xs py-1" style={{ borderBottom: '1px solid #21262d' }}>
                <span style={{ color: '#8b949e' }}>{s.label}</span>
                <span style={{ color: '#e6edf3' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
