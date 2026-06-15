export type Activity = "food_date" | "movie" | "gift" | "trip" | "coffee" | "other";
export type Mood = 1 | 2 | 3 | 4 | 5; // 5 = amazing, 1 = bad
export type AgeRange = "18-24" | "25-34" | "35-44" | "45+";

export interface Entry {
  id: string;
  userId: string;
  activity: Activity;
  amountCents: number;
  currency: string;
  partnerName: string;
  mood: Mood;
  meetVia?: string;
  secondDate?: "yes" | "no" | "together";
  note?: string;
  city: string;
  entryDate: string; // ISO
  createdAt: string;
}

export interface Profile {
  id: string;
  displayName: string;
  partnerDisplayName?: string;
  ageRange: AgeRange;
  city: string;
  country: string;
  relationshipStage: string;
  ethnicityBackground?: string;
}

export interface Post {
  id: string;
  userId?: string;
  author: string;
  type: "experience" | "advice" | "story" | "question" | "observation";
  content: string;
  tags: string[];
  upvotes: number;
  downvotes: number;
  comments: Comment[];
  createdAt: string;
}

export interface Comment {
  id: string;
  userId?: string;
  author: string;
  content: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
}

export const ACTIVITY_META: Record<Activity, { label: string; emoji: string }> = {
  food_date: { label: "Food Date", emoji: "🍽️" },
  movie: { label: "Movie", emoji: "🎬" },
  gift: { label: "Gift", emoji: "🎁" },
  trip: { label: "Trip", emoji: "✈️" },
  coffee: { label: "Coffee", emoji: "☕" },
  other: { label: "Other", emoji: "💫" },
};

export const MOOD_META: Record<Mood, { label: string; emoji: string }> = {
  5: { label: "Amazing", emoji: "😍" },
  4: { label: "Happy", emoji: "😊" },
  3: { label: "Fun", emoji: "😂" },
  2: { label: "Meh", emoji: "😕" },
  1: { label: "Bad", emoji: "😤" },
};