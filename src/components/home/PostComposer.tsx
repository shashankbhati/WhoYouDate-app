import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '../../lib/store';
import { generateId } from '../../lib/utils';
import { detectPii } from '../../lib/piiDetection';
import type { Post, PostType } from '../../lib/types';

const POST_TYPES: { label: string; value: PostType }[] = [
  { label: 'Experience', value: 'experience' },
  { label: 'Advice', value: 'advice' },
  { label: 'Story', value: 'story' },
  { label: 'Question', value: 'question' },
  { label: 'Observation', value: 'observation' },
];

export default function PostComposer() {
  const { profile, addPost } = useStore();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('experience');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const pii = detectPii(trimmed);
    if (pii) { setError(`Looks like you included a ${pii}. Please remove and try again.`); return; }
    if (trimmed.length > 500) { setError('Max 500 characters.'); return; }

    const post: Post = {
      id: generateId(),
      userId: profile?.id || 'anon',
      displayName: `u/${profile?.displayName || 'Anonymous'}`,
      ageRange: profile?.ageRange,
      city: profile?.city,
      postType,
      content: trimmed,
      tags: [POST_TYPES.find(t => t.value === postType)?.label || 'Experience'],
      upvoteCount: 1,
      downvoteCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
    };
    addPost(post);
    setContent('');
    setError('');
    setExpanded(false);
  };

  return (
    <div className="card" style={{ padding: '12px 16px' }}>
      <div className="flex gap-3 items-start">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: '#ff3b8b' }}>
          {profile ? profile.displayName[0].toUpperCase() : '?'}
        </div>
        <div className="flex-1">
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-left text-sm px-3 py-2 rounded"
              style={{ background: '#0d1117', border: '1px solid #30363d', color: '#6e7681' }}
            >
              Share your dating experience...
            </button>
          ) : (
            <>
              <div className="flex gap-2 mb-2">
                {POST_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setPostType(t.value)}
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      background: postType === t.value ? '#ff3b8b' : '#30363d',
                      color: postType === t.value ? 'white' : '#8b949e',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea
                value={content}
                onChange={e => { setContent(e.target.value); setError(''); }}
                placeholder="Share your dating experience..."
                rows={3}
                className="input-base"
                style={{ resize: 'vertical', fontSize: '13px' }}
                maxLength={500}
              />
              <div className="flex items-center justify-between mt-1">
                <div>
                  {error && <span className="text-xs" style={{ color: '#ff3b8b' }}>{error}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#6e7681' }}>{content.length}/500</span>
                  <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => setExpanded(false)}>Cancel</button>
                  <button className="btn-primary" style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '4px' }} onClick={handleSubmit}>
                    Post
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        {!expanded && (
          <button className="btn-primary" style={{ padding: '6px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setExpanded(true)}>
            <Plus size={14} />
            <span className="text-xs">Post</span>
          </button>
        )}
      </div>
    </div>
  );
}
