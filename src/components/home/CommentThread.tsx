import { ChevronUp, ChevronDown } from 'lucide-react';
import { useStore } from '../../lib/store';
import { timeAgo } from '../../lib/utils';
import type { Comment } from '../../lib/types';

interface Props {
  comments: Comment[];
  postId: string;
}

export default function CommentThread({ comments, postId }: Props) {
  const { votes, vote, updateCommentVotes } = useStore();

  const handleVote = (c: Comment, dir: 'up' | 'down') => {
    const key = `comment-${c.id}`;
    if (votes[key] === dir) return;
    const newUp = c.upvoteCount + (dir === 'up' ? 1 : 0) - (votes[key] === 'up' ? 1 : 0);
    const newDown = c.downvoteCount + (dir === 'down' ? 1 : 0) - (votes[key] === 'down' ? 1 : 0);
    vote(key, dir);
    updateCommentVotes(postId, c.id, newUp, newDown);
  };

  if (!comments.length) {
    return <p style={{ color: '#6e7681' }} className="text-xs py-2">No comments yet. Be the first!</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {comments.map(c => {
        const key = `comment-${c.id}`;
        const userVote = votes[key];
        const score = c.upvoteCount - c.downvoteCount;
        return (
          <div key={c.id} className="flex gap-2 pl-2" style={{ borderLeft: '2px solid #30363d' }}>
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <button className={`vote-btn ${userVote === 'up' ? 'active-up' : ''}`} onClick={() => handleVote(c, 'up')} style={{ padding: '1px 4px' }}>
                <ChevronUp size={13} />
              </button>
              <span style={{ fontSize: '10px', color: '#8b949e', fontWeight: 600 }}>{score}</span>
              <button className={`vote-btn ${userVote === 'down' ? 'active-down' : ''}`} onClick={() => handleVote(c, 'down')} style={{ padding: '1px 4px' }}>
                <ChevronDown size={13} />
              </button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold" style={{ color: '#58a6ff' }}>{c.displayName}</span>
                <span className="text-xs" style={{ color: '#6e7681' }}>{timeAgo(c.createdAt)}</span>
              </div>
              <p className="text-xs" style={{ color: '#e6edf3' }}>{c.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
