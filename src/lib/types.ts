export type ActivityType = 'food_date' | 'movie' | 'gift' | 'trip' | 'coffee' | 'other';
export type MoodType = 'amazing' | 'happy' | 'fun' | 'meh' | 'bad';
export type HowMet = 'bumble' | 'hinge' | 'tinder' | 'friends' | 'work_school' | 'in_person' | 'other_app' | 'other';
export type SecondDate = 'yes' | 'no' | 'together';
export type PostType = 'experience' | 'advice' | 'story' | 'question' | 'observation';
export type SortMode = 'hot' | 'new' | 'top';
export type BadgeId =
  | 'big_spender' | 'luxury_lover' | 'budget_master' | 'consistent_investor'
  | 'foodie' | 'cinephile' | 'gift_giver' | 'adventure_seeker' | 'coffee_connoisseur'
  | 'dedicated' | 'regular' | 'streak'
  | 'in_love' | 'real_talk'
  | 'loyal' | 'player';

export interface DateEntry {
  id: string;
  userId: string;
  activityType: ActivityType;
  amountCents: number;
  currency: string;
  category?: string;
  note?: string;
  partnerDisplayName: string;
  moodScore: MoodType;
  entryDate: string;
  howMet?: HowMet;
  wantSecondDate?: SecondDate;
  city: string;
  country: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  anonymousId: string;
  displayName: string;
  partnerDisplayName?: string;
  ageRange: string;
  city: string;
  country: string;
  relationshipStage: string;
  ethnicityBackground?: string;
  totalSpentCents: number;
  entryCount: number;
  showAgeOnPosts: boolean;
  showRelationshipStage: boolean;
  showCountry: boolean;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  displayName: string;
  ageRange?: string;
  city?: string;
  postType: PostType;
  content: string;
  tags: string[];
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  displayName: string;
  content: string;
  upvoteCount: number;
  downvoteCount: number;
  createdAt: string;
}

export interface Badge {
  id: BadgeId;
  emoji: string;
  name: string;
  description: string;
  earned: boolean;
  progress?: number;
  total?: number;
}

export interface PartnerNameStat {
  name: string;
  avgCents: number;
  entryCount: number;
  happyPct: number;
  city?: string;
}

export interface TrendingEntry {
  activityType: ActivityType;
  amountCents: number;
  city: string;
  minutesAgo: number;
}
