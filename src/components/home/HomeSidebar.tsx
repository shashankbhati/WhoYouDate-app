import { Link } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { PLATFORM_STATS } from '../../lib/mockData';
import LiveFeed from './LiveFeed';

export default function HomeSidebar() {
  const profile = useStore(s => s.profile);

  return (
    <div className="flex flex-col gap-3">
      {/* Community info */}
      <div className="card" style={{ padding: '16px' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{ background: 'linear-gradient(135deg, #ff3b8b, #7c3aed)' }}>
            💕
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: '#e6edf3' }}>r/WhoAmIDating</div>
            <div className="text-xs" style={{ color: '#8b949e' }}>Anonymous dating analytics</div>
          </div>
        </div>

        <p className="text-xs mb-3" style={{ color: '#8b949e' }}>
          Anonymous, data-driven dating insights. Log your dates, see trends, compare without sharing who you are.
        </p>

        <div className="flex gap-4 mb-3">
          <div className="text-center">
            <div className="font-bold text-sm" style={{ color: '#e6edf3' }}>{PLATFORM_STATS.totalUsers.toLocaleString()}</div>
            <div className="text-xs" style={{ color: '#8b949e' }}>Members</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-sm" style={{ color: '#3fb950' }}>{PLATFORM_STATS.onlineUsers}</div>
            <div className="text-xs" style={{ color: '#8b949e' }}>Online</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-sm" style={{ color: '#e6edf3' }}>{(PLATFORM_STATS.avgSpendCents / 100).toFixed(0)}</div>
            <div className="text-xs" style={{ color: '#8b949e' }}>Avg €/date</div>
          </div>
        </div>

        <Link to="/log" className="btn-primary w-full flex items-center justify-center gap-2" style={{ borderRadius: '4px', padding: '8px' }}>
          + Log a Date
        </Link>
        {!profile && (
          <Link to="/setup" className="btn-secondary w-full flex items-center justify-center gap-2 mt-2" style={{ borderRadius: '4px', padding: '8px' }}>
            Create Profile
          </Link>
        )}
      </div>

      {/* Community rules */}
      <div className="card" style={{ padding: '12px 16px' }}>
        <div className="text-xs font-bold mb-2" style={{ color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Community Rules
        </div>
        {[
          'No real names or PII',
          'Keep it anonymous',
          'Be respectful',
          'No hate speech',
          'Data stays in the app',
        ].map((rule, i) => (
          <div key={i} className="flex gap-2 py-1 text-xs" style={{ color: '#8b949e', borderBottom: i < 4 ? '1px solid #21262d' : 'none' }}>
            <span style={{ color: '#ff3b8b', fontWeight: 700 }}>{i + 1}.</span>
            {rule}
          </div>
        ))}
      </div>

      {/* Trending activity */}
      <div className="card" style={{ padding: '12px 16px' }}>
        <div className="text-xs font-bold mb-2" style={{ color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Trending Activity
        </div>
        {[
          { emoji: '🍽️', label: 'Dinner', count: '+23%' },
          { emoji: '☕', label: 'Coffee', count: '+18%' },
          { emoji: '🎬', label: 'Movie', count: '+12%' },
        ].map(a => (
          <div key={a.label} className="flex items-center justify-between py-1 text-xs" style={{ borderBottom: '1px solid #21262d' }}>
            <span style={{ color: '#8b949e' }}>{a.emoji} {a.label}</span>
            <span style={{ color: '#3fb950' }}>{a.count}</span>
          </div>
        ))}
      </div>

      {/* Live feed */}
      <LiveFeed />
    </div>
  );
}
