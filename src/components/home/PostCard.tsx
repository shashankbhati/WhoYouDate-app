import { useState } from 'react';
import { ChevronUp, ChevronDown, MessageSquare, Share2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import { timeAgo, generateId } from '../../lib/utils';
import type { Post, Comment } from '../../lib/types';
import CommentThread from './CommentThread';

interface Props {
  post: Post;
}

export default function PostCard({ post }: Props) {
  const { votes, vote, updatePostVotes, comments: allComments, addComment } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');

  const userVote = votes[post.id];
  const score = post.upvoteCount - post.downvoteCount;
  const comments = allComments[post.id] || [];

  const handleVote = (dir: 'up' | 'down') => {
    if (userVote === dir) return;
    const newUp = post.upvoteCount + (dir === 'up' ? 1 : 0) - (userVote === 'up' ? 1 : 0);
    const newDown = post.downvoteCount + (dir === 'down' ? 1 : 0) - (userVote === 'down' ? 1 : 0);
    vote(post.id, dir);
    updatePostVotes(post.id, newUp, newDown);
  };

  const handleComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    const c: Comment = {
      id: generateId(),
      postId: post.id,
      userId: 'me',
      displayName: 'u/You',
      content: trimmed,
      upvoteCount: 1,
      downvoteCount: 0,
      createdAt: new Date().toISOString(),
    };
    addComment(post.id, c);
    setCommentText('');
  };

  return (
    <div className="card card-hover fade-in" style={{ padding: '12px 16px' }}>
      {/* Vote + content row */}
      <div className="flex gap-3">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
          <button
            className={`vote-btn ${userVote === 'up' ? 'active-up' : ''}`}
            onClick={() => handleVote('up')}
            style={{ padding: '2px 6px' }}
          >
            <ChevronUp size={18} />
          </button>
          <span className="text-xs font-bold" style={{ color: userVote === 'up' ? '#ff3b8b' : userVote === 'down' ? '#58a6ff' : '#e6edf3' }}>
            {score}
          </span>
          <button
            className={`vote-btn ${userVote === 'down' ? 'active-down' : ''}`}
            onClick={() => handleVote('down')}
            style={{ padding: '2px 6px' }}
          >
            <ChevronDown size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-xs" style={{ color: '#e6edf3' }}>{post.displayName}</span>
            {post.ageRange && <span className="tag">{post.ageRange}</span>}
            {post.city && <span className="tag">{post.city}</span>}
            <span style={{ color: '#6e7681' }} className="text-xs">•</span>
            <span style={{ color: '#6e7681' }} className="text-xs">{timeAgo(post.createdAt)}</span>
            {post.tags.map(t => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>

          {/* Content */}
          <p className="text-sm leading-relaxed" style={{ color: '#e6edf3' }}>{post.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="vote-btn"
            >
              <MessageSquare size={13} />
              <span>{post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}</span>
            </button>
            <button className="vote-btn">
              <Share2 size={13} />
              <span>Share</span>
            </button>
          </div>

          {/* Comments */}
          {expanded && (
            <div className="mt-3">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleComment()}
                  className="input-base"
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                  maxLength={300}
                />
                <button className="btn-primary" style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '4px', whiteSpace: 'nowrap' }} onClick={handleComment}>
                  Reply
                </button>
              </div>
              <CommentThread comments={comments} postId={post.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
