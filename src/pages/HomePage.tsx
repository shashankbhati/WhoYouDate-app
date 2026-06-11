import { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { hotScore } from '../lib/utils';
import type { SortMode } from '../lib/types';
import PostCard from '../components/home/PostCard';
import PostComposer from '../components/home/PostComposer';
import HomeSidebar from '../components/home/HomeSidebar';
import CostliestNames from '../components/home/CostliestNames';
import TrendingNames from '../components/home/TrendingNames';

type FeedTab = 'feed' | 'community';

const SORT_TABS: { label: string; value: SortMode }[] = [
  { label: '🔥 Hot', value: 'hot' },
  { label: '🆕 New', value: 'new' },
  { label: '⭐ Top', value: 'top' },
];

export default function HomePage() {
  const posts = useStore(s => s.posts);
  const [feedTab, setFeedTab] = useState<FeedTab>('feed');
  const [sort, setSort] = useState<SortMode>('hot');
  const [topPeriod, setTopPeriod] = useState<'week' | 'all'>('all');

  const sorted = useMemo(() => {
    let filtered = [...posts];
    if (sort === 'top' && topPeriod === 'week') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(p => new Date(p.createdAt).getTime() > weekAgo);
    }
    if (sort === 'hot') return filtered.sort((a, b) => hotScore(b.upvoteCount, b.downvoteCount, b.createdAt) - hotScore(a.upvoteCount, a.downvoteCount, a.createdAt));
    if (sort === 'new') return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sort === 'top') return filtered.sort((a, b) => (b.upvoteCount - b.downvoteCount) - (a.upvoteCount - a.downvoteCount));
    return filtered;
  }, [posts, sort, topPeriod]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Subreddit banner */}
      <div className="card mb-4" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(255,59,139,0.1), rgba(124,58,237,0.1))', borderColor: '#30363d' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{ background: 'linear-gradient(135deg, #ff3b8b, #7c3aed)' }}>
              💕
            </div>
            <div>
              <h1 className="font-bold text-lg" style={{ color: '#e6edf3' }}>r/WhoAmIDating</h1>
              <p className="text-xs" style={{ color: '#8b949e' }}>Anonymous dating analytics</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href="/log" className="btn-primary" style={{ borderRadius: '4px', padding: '8px 16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              + Log a Date
            </a>
            <a href="/setup" className="btn-secondary" style={{ borderRadius: '4px', padding: '8px 16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Create Post
            </a>
          </div>
        </div>
      </div>

      {/* Analytics sections - full width */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <CostliestNames />
        <TrendingNames />
      </div>

      {/* Main layout */}
      <div className="flex gap-4">
        {/* Left: feed */}
        <div className="flex-1 min-w-0">
          {/* Tabs row */}
          <div className="flex items-center gap-1 mb-3 flex-wrap">
            {(['feed', 'community'] as FeedTab[]).map(t => (
              <button
                key={t}
                onClick={() => setFeedTab(t)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium"
                style={{
                  background: feedTab === t ? '#22272e' : 'transparent',
                  color: feedTab === t ? '#e6edf3' : '#8b949e',
                  border: feedTab === t ? '1px solid #30363d' : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {t === 'feed' ? '📋' : '💬'} {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}

            <div style={{ width: '1px', height: '20px', background: '#30363d', margin: '0 4px' }} />

            {SORT_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setSort(t.value)}
                className="px-3 py-1.5 rounded text-sm font-medium"
                style={{
                  background: sort === t.value ? '#ff3b8b' : 'transparent',
                  color: sort === t.value ? 'white' : '#8b949e',
                  border: sort === t.value ? 'none' : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}

            {sort === 'top' && (
              <div className="flex gap-1 ml-1">
                {(['week', 'all'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setTopPeriod(p)}
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      background: topPeriod === p ? '#22272e' : 'transparent',
                      color: topPeriod === p ? '#e6edf3' : '#6e7681',
                      border: '1px solid #30363d',
                      cursor: 'pointer',
                    }}
                  >
                    {p === 'week' ? 'This Week' : 'All Time'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="mb-3">
            <PostComposer />
          </div>

          {/* Posts */}
          <div className="flex flex-col gap-2">
            {sorted.length === 0 ? (
              <div className="card" style={{ padding: '32px', textAlign: 'center', color: '#6e7681' }}>
                No posts yet. Be the first to share!
              </div>
            ) : (
              sorted.map(p => <PostCard key={p.id} post={p} />)
            )}
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="w-72 shrink-0 hidden lg:block">
          <HomeSidebar />
        </div>
      </div>
    </div>
  );
}
