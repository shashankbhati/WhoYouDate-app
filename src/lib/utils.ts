import type { ActivityType, MoodType, HowMet } from './types';

export function formatCents(cents: number, currency = 'EUR'): string {
  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
  const val = cents / 100;
  return `${symbol}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)}`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export function activityLabel(type: ActivityType): string {
  const map: Record<ActivityType, string> = {
    food_date: 'Food Date',
    movie: 'Movie',
    gift: 'Gift',
    trip: 'Trip',
    coffee: 'Coffee',
    other: 'Other',
  };
  return map[type];
}

export function activityEmoji(type: ActivityType): string {
  const map: Record<ActivityType, string> = {
    food_date: '🍽️',
    movie: '🎬',
    gift: '🎁',
    trip: '✈️',
    coffee: '☕',
    other: '💫',
  };
  return map[type];
}

export function moodEmoji(mood: MoodType): string {
  const map: Record<MoodType, string> = {
    amazing: '😍',
    happy: '😊',
    fun: '😂',
    meh: '😕',
    bad: '😤',
  };
  return map[mood];
}

export function howMetLabel(h: HowMet): string {
  const map: Record<HowMet, string> = {
    bumble: 'Bumble',
    hinge: 'Hinge',
    tinder: 'Tinder',
    friends: 'Through friends',
    work_school: 'Work / School',
    in_person: 'Met in person',
    other_app: 'Other app',
    other: 'Other',
  };
  return map[h];
}

export function hotScore(upvotes: number, downvotes: number, createdAt: string): number {
  const score = upvotes - downvotes;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
  const seconds = (new Date(createdAt).getTime() - new Date('2026-01-01').getTime()) / 1000;
  return sign * order + seconds / 45000;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
