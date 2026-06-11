import type { Badge, BadgeId } from './types';
import type { DateEntry } from './types';

export const BADGE_DEFS: Record<BadgeId, Omit<Badge, 'earned' | 'progress' | 'total'>> = {
  big_spender:       { id: 'big_spender',       emoji: '🏦', name: 'Big Spender',        description: 'Total spending €500+' },
  luxury_lover:      { id: 'luxury_lover',       emoji: '💎', name: 'Luxury Lover',       description: 'Single entry €200+' },
  budget_master:     { id: 'budget_master',      emoji: '🎯', name: 'Budget Master',      description: 'Average entry under €20' },
  consistent_investor:{ id: 'consistent_investor',emoji: '💰', name: 'Consistent Investor', description: '50+ logged entries' },
  foodie:            { id: 'foodie',             emoji: '🍽️', name: 'Foodie',             description: '20+ food date entries' },
  cinephile:         { id: 'cinephile',          emoji: '🎬', name: 'Cinephile',          description: '10+ movie entries' },
  gift_giver:        { id: 'gift_giver',         emoji: '🎁', name: 'Gift Giver',         description: '15+ gift entries' },
  adventure_seeker:  { id: 'adventure_seeker',   emoji: '✈️', name: 'Adventure Seeker',  description: '5+ trip entries' },
  coffee_connoisseur:{ id: 'coffee_connoisseur', emoji: '☕', name: 'Coffee Connoisseur', description: '15+ coffee date entries' },
  dedicated:         { id: 'dedicated',          emoji: '🔥', name: 'Dedicated',          description: '30+ total entries' },
  regular:           { id: 'regular',            emoji: '⭐', name: 'Regular',            description: 'Logged 5+ days this month' },
  streak:            { id: 'streak',             emoji: '🎊', name: 'Streak',             description: '3+ days in a row' },
  in_love:           { id: 'in_love',            emoji: '😍', name: 'In Love',            description: '80%+ happy entries' },
  real_talk:         { id: 'real_talk',          emoji: '🤔', name: 'Real Talk',          description: 'Diverse mood range' },
  loyal:             { id: 'loyal',              emoji: '💕', name: 'Loyal',              description: '20+ entries with same partner' },
  player:            { id: 'player',             emoji: '🌟', name: 'Player',             description: 'Entries with 3+ different partners' },
};

export function computeBadges(entries: DateEntry[]): Badge[] {
  const total = entries.length;
  const totalCents = entries.reduce((s, e) => s + e.amountCents, 0);
  const avgCents = total > 0 ? totalCents / total : 0;
  const maxSingle = entries.reduce((m, e) => Math.max(m, e.amountCents), 0);
  const foodCount = entries.filter(e => e.activityType === 'food_date').length;
  const movieCount = entries.filter(e => e.activityType === 'movie').length;
  const giftCount = entries.filter(e => e.activityType === 'gift').length;
  const tripCount = entries.filter(e => e.activityType === 'trip').length;
  const coffeeCount = entries.filter(e => e.activityType === 'coffee').length;
  const happyCount = entries.filter(e => e.moodScore === 'amazing' || e.moodScore === 'happy').length;
  const happyPct = total > 0 ? (happyCount / total) * 100 : 0;
  const partnerCounts: Record<string, number> = {};
  entries.forEach(e => { partnerCounts[e.partnerDisplayName] = (partnerCounts[e.partnerDisplayName] || 0) + 1; });
  const partnerNames = Object.keys(partnerCounts);
  const maxPartnerCount = Math.max(...Object.values(partnerCounts), 0);
  const moods = new Set(entries.map(e => e.moodScore));

  const earned = (condition: boolean): Pick<Badge, 'earned'> => ({ earned: condition });

  return (Object.keys(BADGE_DEFS) as BadgeId[]).map(id => {
    const def = BADGE_DEFS[id];
    switch (id) {
      case 'big_spender':        return { ...def, ...earned(totalCents >= 50000), progress: totalCents, total: 50000 };
      case 'luxury_lover':       return { ...def, ...earned(maxSingle >= 20000), progress: maxSingle, total: 20000 };
      case 'budget_master':      return { ...def, ...earned(avgCents > 0 && avgCents < 2000) };
      case 'consistent_investor':return { ...def, ...earned(total >= 50), progress: total, total: 50 };
      case 'foodie':             return { ...def, ...earned(foodCount >= 20), progress: foodCount, total: 20 };
      case 'cinephile':          return { ...def, ...earned(movieCount >= 10), progress: movieCount, total: 10 };
      case 'gift_giver':         return { ...def, ...earned(giftCount >= 15), progress: giftCount, total: 15 };
      case 'adventure_seeker':   return { ...def, ...earned(tripCount >= 5), progress: tripCount, total: 5 };
      case 'coffee_connoisseur': return { ...def, ...earned(coffeeCount >= 15), progress: coffeeCount, total: 15 };
      case 'dedicated':          return { ...def, ...earned(total >= 30), progress: total, total: 30 };
      case 'regular':            return { ...def, ...earned(total >= 5) };
      case 'streak':             return { ...def, ...earned(total >= 3) };
      case 'in_love':            return { ...def, ...earned(happyPct >= 80), progress: Math.round(happyPct), total: 80 };
      case 'real_talk':          return { ...def, ...earned(moods.size >= 3) };
      case 'loyal':              return { ...def, ...earned(maxPartnerCount >= 20), progress: maxPartnerCount, total: 20 };
      case 'player':             return { ...def, ...earned(partnerNames.length >= 3), progress: partnerNames.length, total: 3 };
      default:                   return { ...def, earned: false };
    }
  });
}
