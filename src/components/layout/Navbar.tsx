import { Link, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useStore } from '../../lib/store';

export default function Navbar() {
  const location = useLocation();
  const profile = useStore(s => s.profile);

  const navLinks = [
    { label: 'HOME', to: '/' },
    { label: 'STATS', to: '/stats' },
    { label: 'LOG', to: '/log' },
    { label: 'PROFILE', to: '/profile' },
  ];

  return (
    <nav style={{ background: '#161b22', borderBottom: '1px solid #30363d' }} className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: '#ff3b8b' }}>
            {profile ? profile.displayName[0].toUpperCase() : 'W'}
          </div>
          <span className="font-bold text-white text-base hidden sm:block">WhoAmIDating</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6e7681' }} />
          <input
            type="text"
            placeholder="Search communities..."
            className="w-full pl-9 pr-3 py-1.5 rounded-full text-sm"
            style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', outline: 'none' }}
          />
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1 ml-auto">
          {navLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-colors"
              style={{
                color: location.pathname === l.to ? '#ff3b8b' : '#8b949e',
                background: location.pathname === l.to ? 'rgba(255,59,139,0.1)' : 'transparent',
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
