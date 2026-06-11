import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DateEntry, UserProfile, Post, Comment } from './types';
import { MOCK_ENTRIES, MOCK_POSTS, MOCK_COMMENTS } from './mockData';

interface AppState {
  profile: UserProfile | null;
  entries: DateEntry[];
  posts: Post[];
  comments: Record<string, Comment[]>;
  votes: Record<string, 'up' | 'down'>;
  isSetup: boolean;

  setProfile: (p: UserProfile) => void;
  addEntry: (e: DateEntry) => void;
  addPost: (p: Post) => void;
  addComment: (postId: string, c: Comment) => void;
  vote: (targetId: string, dir: 'up' | 'down') => void;
  updatePostVotes: (postId: string, upvoteCount: number, downvoteCount: number) => void;
  updateCommentVotes: (postId: string, commentId: string, upvoteCount: number, downvoteCount: number) => void;
  setIsSetup: (v: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      entries: MOCK_ENTRIES,
      posts: MOCK_POSTS,
      comments: MOCK_COMMENTS,
      votes: {},
      isSetup: false,

      setProfile: (p) => set({ profile: p, isSetup: true }),
      addEntry: (e) => set((s) => ({ entries: [e, ...s.entries] })),
      addPost: (p) => set((s) => ({ posts: [p, ...s.posts] })),
      addComment: (postId, c) => set((s) => ({
        comments: {
          ...s.comments,
          [postId]: [...(s.comments[postId] || []), c],
        },
        posts: s.posts.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p),
      })),
      vote: (targetId, dir) => set((s) => ({ votes: { ...s.votes, [targetId]: dir } })),
      updatePostVotes: (postId, upvoteCount, downvoteCount) => set((s) => ({
        posts: s.posts.map(p => p.id === postId ? { ...p, upvoteCount, downvoteCount } : p),
      })),
      updateCommentVotes: (postId, commentId, upvoteCount, downvoteCount) => set((s) => ({
        comments: {
          ...s.comments,
          [postId]: (s.comments[postId] || []).map(c =>
            c.id === commentId ? { ...c, upvoteCount, downvoteCount } : c
          ),
        },
      })),
      setIsSetup: (v) => set({ isSetup: v }),
    }),
    { name: 'whoamidat-store' }
  )
);
