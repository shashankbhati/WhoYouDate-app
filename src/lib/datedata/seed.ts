import type { Entry, Post } from "./types";

const FEMALE_NAMES = ["Sabrina", "Laura", "Mia", "Julia", "Emma", "Lena", "Anna", "Sophie", "Hannah", "Katharina", "Lisa", "Marie", "Sarah", "Nina", "Lea", "Jana", "Monika", "Petra", "Sandra", "Stefanie", "Lina", "Johanna", "Franziska", "Klara", "Luise"];
const MALE_NAMES = ["Sven", "Klaus", "Robert", "Maximilian", "Jens", "Jan", "Tim", "Felix", "Lukas", "Paul", "Noah", "Leon", "Tobias", "Stefan", "Michael", "Florian", "Patrick", "Christian", "Andreas", "Markus", "Thomas", "Hannes", "Moritz", "Benedikt"];
const ALL_NAMES = [...FEMALE_NAMES, ...MALE_NAMES];
const CITIES = ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt", "Dresden"];

// Export name sets so UI can categorize entries by gender
export const FEMALE_NAMES_ALL = new Set([
  ...FEMALE_NAMES,
  "Tabea", "Leoni",
  "Priya", "Neha", "Aditi", "Anjali", "Pooja", "Riya", "Sneha", "Ananya", "Kavya", "Divya", "Ishita", "Simran", "Nisha", "Ayesha", "Sana",
  "Ashley", "Jessica", "Emily", "Olivia", "Emma", "Megan", "Sarah", "Chloe", "Madison", "Brittany", "Taylor", "Amanda", "Lauren", "Kayla", "Samantha",
]);
export const MALE_NAMES_ALL = new Set([
  ...MALE_NAMES,
  "Shashank",
  "Rahul", "Amit", "Suresh", "Raj", "Dev", "Aarav", "Rohit", "Arjun", "Karan", "Aditya", "Akash", "Varun", "Nikhil", "Siddharth", "Vivek",
  "Tyler", "Ryan", "Jake", "Brandon", "Chase", "Noah", "Michael", "Chris", "Alex", "Josh", "Kevin", "Matt", "Derek", "Ethan", "Jordan",
]);
const ACTS: Entry["activity"][] = ["food_date", "movie", "gift", "trip", "coffee", "other"];
const MEET_VIA = ["bumble", "hinge", "tinder", "friends", "work_school", "in_person", "other_app"] as const;
const SECOND_DATE = ["yes", "no", "together"] as const;

const IN_FEMALE = ["Priya", "Neha", "Aditi", "Anjali", "Pooja", "Riya", "Sneha", "Ananya", "Kavya", "Divya", "Ishita", "Simran", "Nisha", "Ayesha", "Sana"];
const IN_MALE = ["Rahul", "Amit", "Suresh", "Raj", "Dev", "Aarav", "Rohit", "Arjun", "Karan", "Aditya", "Akash", "Varun", "Nikhil", "Siddharth", "Vivek"];
const IN_NAMES = [...IN_FEMALE, ...IN_MALE];
const IN_CITIES = ["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Pune", "Chennai"];

const US_FEMALE = ["Ashley", "Jessica", "Emily", "Olivia", "Emma", "Megan", "Sarah", "Chloe", "Madison", "Brittany", "Taylor", "Amanda", "Lauren", "Kayla", "Samantha"];
const US_MALE = ["Tyler", "Ryan", "Jake", "Brandon", "Chase", "Noah", "Michael", "Chris", "Alex", "Josh", "Kevin", "Matt", "Derek", "Ethan", "Jordan"];
const US_NAMES = [...US_FEMALE, ...US_MALE];
const US_CITIES = ["New York", "Los Angeles", "Chicago", "Austin", "Miami"];

// Weighted random to make distributions more realistic
function weightedRand<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
function rand<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function uid() { return Math.random().toString(36).slice(2, 10); }

export function seedEntries(): Entry[] {
  const out: Entry[] = [];
  const now = Date.now();

  const CITY_WEIGHTS = [35, 25, 18, 12, 10]; // Berlin most entries
  const ACTIVITY_WEIGHTS = [30, 15, 10, 8, 25, 12]; // food_date & coffee most common
  const MOOD_WEIGHTS = [20, 25, 25, 20, 10]; // moods 1-5, skewed positive

  // --- 600 general entries ---
  for (let i = 0; i < 600; i++) {
    const activity = weightedRand(ACTS, ACTIVITY_WEIGHTS);
    const city = weightedRand(CITIES, CITY_WEIGHTS);
    const baseAmount =
      activity === "trip" ? 35000 :
      activity === "gift" ? 9000 :
      activity === "food_date" ? 7200 :
      activity === "movie" ? 2800 :
      activity === "coffee" ? 900 :
      4500;
    const amount = Math.max(300, Math.round(baseAmount * (0.5 + Math.random() * 1.5)));
    const partnerName = rand(ALL_NAMES);
    const mood = (weightedRand([1, 2, 3, 4, 5], MOOD_WEIGHTS)) as Entry["mood"];
    const meetVia = rand(MEET_VIA);
    // Success more likely with higher mood
    const secondDateProb = mood >= 4 ? 0.65 : mood === 3 ? 0.40 : 0.15;
    const secondDate: Entry["secondDate"] = Math.random() < secondDateProb ? (mood === 5 && Math.random() < 0.3 ? "together" : "yes") : "no";
    const daysAgo = Math.floor(Math.random() * 90);
    out.push({
      id: uid(), userId: "seed_" + uid(), activity, amountCents: amount, currency: "EUR",
      partnerName, mood, meetVia, secondDate, city,
      entryDate: new Date(now - daysAgo * 86400000).toISOString(),
      createdAt: new Date(now - daysAgo * 86400000).toISOString(),
    });
  }

  // --- Boost Sven to be costliest in Berlin (10+ entries with high amounts) ---
  for (let i = 0; i < 12; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: i % 2 === 0 ? "trip" : "food_date", amountCents: 42000 + Math.floor(Math.random() * 18000), currency: "EUR", partnerName: "Sven", mood: 5, meetVia: "hinge", secondDate: "together", city: "Berlin", entryDate: new Date(now - i * 86400000* 2).toISOString(), createdAt: new Date(now - i * 86400000 * 2).toISOString() });
  }
  // --- Sabrina trending (high spend, Munich) ---
  for (let i = 0; i < 10; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: "food_date", amountCents: 13000 + Math.floor(Math.random() * 4000), currency: "EUR", partnerName: "Sabrina", mood: 5, meetVia: "bumble", secondDate: "yes", city: "Munich", entryDate: new Date(now - i * 86400000).toISOString(), createdAt: new Date(now - i * 86400000).toISOString() });
  }
  // --- Klaus expensive in Munich ---
  for (let i = 0; i < 8; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: i % 3 === 0 ? "trip" : "food_date", amountCents: 11000 + Math.floor(Math.random() * 3000), currency: "EUR", partnerName: "Klaus", mood: (Math.floor(Math.random() * 2) + 3) as Entry["mood"], meetVia: "tinder", secondDate: "no", city: "Munich", entryDate: new Date(now - i * 86400000 * 3).toISOString(), createdAt: new Date(now - i * 86400000 * 3).toISOString() });
  }
  // --- Sophie pricey in Frankfurt ---
  for (let i = 0; i < 9; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: i % 2 === 0 ? "food_date" : "gift", amountCents: 12500 + Math.floor(Math.random() * 2500), currency: "EUR", partnerName: "Sophie", mood: (Math.floor(Math.random() * 2) + 4) as Entry["mood"], meetVia: "hinge", secondDate: "yes", city: "Frankfurt", entryDate: new Date(now - i * 86400000 * 2).toISOString(), createdAt: new Date(now - i * 86400000 * 2).toISOString() });
  }
  // --- Emma high happy rate in Hamburg ---
  for (let i = 0; i < 8; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: "coffee", amountCents: 1100 + Math.floor(Math.random() * 400), currency: "EUR", partnerName: "Emma", mood: 5, meetVia: "bumble", secondDate: "together", city: "Hamburg", entryDate: new Date(now - i * 86400000 * 3).toISOString(), createdAt: new Date(now - i * 86400000 * 3).toISOString() });
  }
  // --- Laura popular in Berlin ---
  for (let i = 0; i < 10; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: rand(["food_date", "movie", "coffee"]), amountCents: 9500 + Math.floor(Math.random() * 2000), currency: "EUR", partnerName: "Laura", mood: (Math.floor(Math.random() * 2) + 3) as Entry["mood"], meetVia: "tinder", secondDate: Math.random() > 0.5 ? "yes" : "no", city: "Berlin", entryDate: new Date(now - i * 86400000 * 2).toISOString(), createdAt: new Date(now - i * 86400000 * 2).toISOString() });
  }
  // --- Robert expensive Cologne ---
  for (let i = 0; i < 7; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: "food_date", amountCents: 10500 + Math.floor(Math.random() * 2500), currency: "EUR", partnerName: "Robert", mood: 4, meetVia: "friends", secondDate: "yes", city: "Cologne", entryDate: new Date(now - i * 86400000 * 4).toISOString(), createdAt: new Date(now - i * 86400000 * 4).toISOString() });
  }
  // --- Jan mid-range Berlin ---
  for (let i = 0; i < 8; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: i % 2 === 0 ? "movie" : "coffee", amountCents: 8000 + Math.floor(Math.random() * 2000), currency: "EUR", partnerName: "Jan", mood: 4, meetVia: "bumble", secondDate: "yes", city: "Berlin", entryDate: new Date(now - i * 86400000 * 3).toISOString(), createdAt: new Date(now - i * 86400000 * 3).toISOString() });
  }
  // --- Jens Munich ---
  for (let i = 0; i < 6; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: "trip", amountCents: 9000 + Math.floor(Math.random() * 4000), currency: "EUR", partnerName: "Jens", mood: 3, meetVia: "other_app", secondDate: "no", city: "Munich", entryDate: new Date(now - i * 86400000 * 5).toISOString(), createdAt: new Date(now - i * 86400000 * 5).toISOString() });
  }
  // --- Maximilian trending ---
  for (let i = 0; i < 8; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: i % 3 === 0 ? "gift" : "food_date", amountCents: 10000 + Math.floor(Math.random() * 3000), currency: "EUR", partnerName: "Maximilian", mood: (Math.floor(Math.random() * 2) + 3) as Entry["mood"], meetVia: "hinge", secondDate: Math.random() > 0.4 ? "yes" : "no", city: rand(["Berlin", "Munich"]), entryDate: new Date(now - i * 86400000 * 2).toISOString(), createdAt: new Date(now - i * 86400000 * 2).toISOString() });
  }

  // --- Sophie: 52 entries — expensive foodie, Hinge-heavy, Frankfurt/Berlin ---
  for (let i = 0; i < 52; i++) {
    const city = weightedRand(CITIES, [25, 10, 10, 10, 45]);
    const activity = weightedRand(ACTS, [45, 10, 20, 10, 10, 5]);
    const base = activity === "trip" ? 36000 : activity === "gift" ? 14000 : activity === "food_date" ? 9200 : activity === "movie" ? 2900 : activity === "coffee" ? 1100 : 4800;
    const amount = Math.max(500, Math.round(base * (0.65 + Math.random() * 0.85)));
    const mood = weightedRand([1, 2, 3, 4, 5], [5, 8, 20, 35, 32]) as Entry["mood"];
    const sd = mood >= 4 ? 0.7 : mood === 3 ? 0.4 : 0.15;
    const daysAgo = Math.floor(Math.random() * 120);
    out.push({ id: uid(), userId: "seed_" + uid(), activity, amountCents: amount, currency: "EUR", partnerName: "Sophie", mood, meetVia: weightedRand([...MEET_VIA], [10, 45, 15, 12, 8, 5, 5]), secondDate: (Math.random() < sd ? (mood === 5 && Math.random() < 0.35 ? "together" : "yes") : "no") as Entry["secondDate"], city, entryDate: new Date(now - daysAgo * 86400000).toISOString(), createdAt: new Date(now - daysAgo * 86400000).toISOString() });
  }
  // --- Lina: 52 entries — coffee & cinema, Bumble-heavy, Hamburg/Berlin, mixed moods ---
  for (let i = 0; i < 52; i++) {
    const city = weightedRand(CITIES, [30, 10, 40, 10, 10]);
    const activity = weightedRand(ACTS, [20, 30, 5, 5, 35, 5]);
    const base = activity === "trip" ? 28000 : activity === "gift" ? 7000 : activity === "food_date" ? 7500 : activity === "movie" ? 2600 : activity === "coffee" ? 950 : 4000;
    const amount = Math.max(300, Math.round(base * (0.6 + Math.random() * 0.9)));
    const mood = weightedRand([1, 2, 3, 4, 5], [12, 18, 30, 25, 15]) as Entry["mood"];
    const sd = mood >= 4 ? 0.65 : mood === 3 ? 0.35 : 0.12;
    const daysAgo = Math.floor(Math.random() * 120);
    out.push({ id: uid(), userId: "seed_" + uid(), activity, amountCents: amount, currency: "EUR", partnerName: "Lina", mood, meetVia: weightedRand([...MEET_VIA], [40, 20, 20, 8, 5, 3, 4]), secondDate: (Math.random() < sd ? (mood === 5 && Math.random() < 0.25 ? "together" : "yes") : "no") as Entry["secondDate"], city, entryDate: new Date(now - daysAgo * 86400000).toISOString(), createdAt: new Date(now - daysAgo * 86400000).toISOString() });
  }
  // --- Thomas: 52 entries — trips & dinners, work/school meets, Munich-heavy, medium mood ---
  for (let i = 0; i < 52; i++) {
    const city = weightedRand(CITIES, [15, 45, 15, 15, 10]);
    const activity = weightedRand(ACTS, [35, 10, 10, 25, 10, 10]);
    const base = activity === "trip" ? 42000 : activity === "gift" ? 9500 : activity === "food_date" ? 8500 : activity === "movie" ? 2700 : activity === "coffee" ? 900 : 5000;
    const amount = Math.max(400, Math.round(base * (0.7 + Math.random() * 0.8)));
    const mood = weightedRand([1, 2, 3, 4, 5], [10, 20, 35, 25, 10]) as Entry["mood"];
    const sd = mood >= 4 ? 0.6 : mood === 3 ? 0.38 : 0.14;
    const daysAgo = Math.floor(Math.random() * 120);
    out.push({ id: uid(), userId: "seed_" + uid(), activity, amountCents: amount, currency: "EUR", partnerName: "Thomas", mood, meetVia: weightedRand([...MEET_VIA], [15, 20, 25, 15, 20, 3, 2]), secondDate: (Math.random() < sd ? (mood === 5 && Math.random() < 0.3 ? "together" : "yes") : "no") as Entry["secondDate"], city, entryDate: new Date(now - daysAgo * 86400000).toISOString(), createdAt: new Date(now - daysAgo * 86400000).toISOString() });
  }
  // --- Anna: 52 entries — gifts & dinners, Hinge/friends, Cologne/Berlin, high mood ---
  for (let i = 0; i < 52; i++) {
    const city = weightedRand(CITIES, [30, 10, 10, 35, 15]);
    const activity = weightedRand(ACTS, [30, 10, 30, 10, 15, 5]);
    const base = activity === "trip" ? 32000 : activity === "gift" ? 16000 : activity === "food_date" ? 8000 : activity === "movie" ? 2800 : activity === "coffee" ? 1000 : 4500;
    const amount = Math.max(400, Math.round(base * (0.7 + Math.random() * 0.8)));
    const mood = weightedRand([1, 2, 3, 4, 5], [5, 8, 15, 40, 32]) as Entry["mood"];
    const sd = mood >= 4 ? 0.75 : mood === 3 ? 0.45 : 0.2;
    const daysAgo = Math.floor(Math.random() * 120);
    out.push({ id: uid(), userId: "seed_" + uid(), activity, amountCents: amount, currency: "EUR", partnerName: "Anna", mood, meetVia: weightedRand([...MEET_VIA], [15, 35, 15, 20, 12, 2, 1]), secondDate: (Math.random() < sd ? (mood === 5 && Math.random() < 0.4 ? "together" : "yes") : "no") as Entry["secondDate"], city, entryDate: new Date(now - daysAgo * 86400000).toISOString(), createdAt: new Date(now - daysAgo * 86400000).toISOString() });
  }
  // --- Johanna: 52 entries — coffee dates, Hinge queen, Berlin-heavy, highest happy rate ---
  for (let i = 0; i < 52; i++) {
    const city = weightedRand(CITIES, [55, 15, 15, 8, 7]);
    const activity = weightedRand(ACTS, [20, 10, 5, 5, 50, 10]);
    const base = activity === "trip" ? 30000 : activity === "gift" ? 8000 : activity === "food_date" ? 7500 : activity === "movie" ? 2500 : activity === "coffee" ? 950 : 4200;
    const amount = Math.max(300, Math.round(base * (0.65 + Math.random() * 0.8)));
    const mood = weightedRand([1, 2, 3, 4, 5], [3, 7, 15, 35, 40]) as Entry["mood"];
    const sd = mood >= 4 ? 0.78 : mood === 3 ? 0.5 : 0.18;
    const daysAgo = Math.floor(Math.random() * 120);
    out.push({ id: uid(), userId: "seed_" + uid(), activity, amountCents: amount, currency: "EUR", partnerName: "Johanna", mood, meetVia: weightedRand([...MEET_VIA], [10, 50, 15, 10, 10, 3, 2]), secondDate: (Math.random() < sd ? (mood === 5 && Math.random() < 0.45 ? "together" : "yes") : "no") as Entry["secondDate"], city, entryDate: new Date(now - daysAgo * 86400000).toISOString(), createdAt: new Date(now - daysAgo * 86400000).toISOString() });
  }

  return out;
}

export function seedEntriesDresden(): Entry[] {
  const out: Entry[] = [];
  const now = Date.now();
  const ACTS: Entry["activity"][] = ["food_date", "movie", "gift", "trip", "coffee", "other"];
  const MEET_VIA_D = ["bumble", "hinge", "tinder", "friends", "work_school", "in_person", "other_app"] as const;
  const ACT_W = [32, 18, 10, 8, 28, 4];
  const MOOD_W = [15, 22, 28, 22, 13];

  // ~80 random Dresden entries
  for (let i = 0; i < 80; i++) {
    const partnerName = ALL_NAMES[Math.floor(Math.random() * ALL_NAMES.length)];
    const activity = weightedRand(ACTS, ACT_W);
    const base = activity === "trip" ? 32000 : activity === "gift" ? 8500 : activity === "food_date" ? 7000 : activity === "movie" ? 2500 : activity === "coffee" ? 850 : 4000;
    const amount = Math.max(300, Math.round(base * (0.55 + Math.random() * 1.2)));
    const mood = weightedRand([1, 2, 3, 4, 5], MOOD_W) as Entry["mood"];
    const sd = mood >= 4 ? 0.62 : mood === 3 ? 0.38 : 0.13;
    const daysAgo = Math.floor(Math.random() * 90);
    out.push({ id: uid(), userId: "seed_" + uid(), activity, amountCents: amount, currency: "EUR", partnerName, mood, meetVia: MEET_VIA_D[Math.floor(Math.random() * MEET_VIA_D.length)], secondDate: (Math.random() < sd ? "yes" : "no") as Entry["secondDate"], city: "Dresden", entryDate: new Date(now - daysAgo * 86400000).toISOString(), createdAt: new Date(now - daysAgo * 86400000).toISOString() });
  }
  // Franziska — costliest girl in Dresden (trips + expensive dinners)
  for (let i = 0; i < 12; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: i % 3 === 0 ? "trip" : "food_date", amountCents: 38000 + Math.floor(Math.random() * 14000), currency: "EUR", partnerName: "Franziska", mood: 5, meetVia: "hinge", secondDate: "together", city: "Dresden", entryDate: new Date(now - i * 86400000 * 2).toISOString(), createdAt: new Date(now - i * 86400000 * 2).toISOString() });
  }
  // Hannes — costliest guy in Dresden
  for (let i = 0; i < 10; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: i % 2 === 0 ? "trip" : "gift", amountCents: 29000 + Math.floor(Math.random() * 12000), currency: "EUR", partnerName: "Hannes", mood: 4, meetVia: "bumble", secondDate: "yes", city: "Dresden", entryDate: new Date(now - i * 86400000 * 3).toISOString(), createdAt: new Date(now - i * 86400000 * 3).toISOString() });
  }
  // Klara — frequently dated, coffee + movies, high happiness
  for (let i = 0; i < 9; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: i % 2 === 0 ? "coffee" : "movie", amountCents: 1200 + Math.floor(Math.random() * 600), currency: "EUR", partnerName: "Klara", mood: (Math.floor(Math.random() * 2) + 4) as Entry["mood"], meetVia: "tinder", secondDate: "yes", city: "Dresden", entryDate: new Date(now - i * 86400000 * 2).toISOString(), createdAt: new Date(now - i * 86400000 * 2).toISOString() });
  }
  // Moritz — mid-range, lots of food dates
  for (let i = 0; i < 8; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: "food_date", amountCents: 9500 + Math.floor(Math.random() * 3000), currency: "EUR", partnerName: "Moritz", mood: 3, meetVia: "friends", secondDate: Math.random() > 0.5 ? "yes" : "no", city: "Dresden", entryDate: new Date(now - i * 86400000 * 4).toISOString(), createdAt: new Date(now - i * 86400000 * 4).toISOString() });
  }
  return out;
}

// Leoni — costliest name to date in Berlin (tops everyone incl. Sven)
export function seedEntriesLeoni(): Entry[] {
  const out: Entry[] = [];
  const now = Date.now();
  for (let i = 0; i < 12; i++) {
    out.push({
      id: uid(), userId: "seed_" + uid(),
      activity: i % 2 === 0 ? "trip" : "food_date",
      amountCents: 72000 + Math.floor(Math.random() * 26000), // €720–980/date
      currency: "EUR", partnerName: "Leoni", mood: 5, meetVia: "hinge",
      secondDate: "together", city: "Berlin",
      entryDate: new Date(now - i * 86400000 * 2).toISOString(),
      createdAt: new Date(now - i * 86400000 * 2).toISOString(),
    });
  }
  return out;
}

export function seedEntriesTabeaShashank(): Entry[] {
  const out: Entry[] = [];
  const now = Date.now();

  // Tabea — German girl, Berlin/Hamburg heavy, Hinge meets, foodie + gifts, high spend, very high happy rate
  for (let i = 0; i < 18; i++) {
    const cities = ["Berlin", "Hamburg", "Berlin", "Berlin", "Munich", "Hamburg"];
    const city = cities[i % cities.length];
    const acts: Entry["activity"][] = ["food_date", "food_date", "gift", "trip", "coffee", "food_date"];
    const activity = acts[i % acts.length];
    const base = activity === "trip" ? 44000 : activity === "gift" ? 18000 : activity === "food_date" ? 11500 : 1400;
    const amount = Math.max(800, Math.round(base * (0.75 + Math.random() * 0.6)));
    const mood = (i < 12 ? weightedRand([3, 4, 5], [10, 40, 50]) : weightedRand([2, 3, 4], [20, 45, 35])) as Entry["mood"];
    const sd: Entry["secondDate"] = mood >= 4 ? (Math.random() < 0.7 ? "yes" : "together") : "no";
    const daysAgo = Math.floor(i * 6 + Math.random() * 5);
    out.push({ id: uid(), userId: "seed_" + uid(), activity, amountCents: amount, currency: "EUR", partnerName: "Tabea", mood, meetVia: i % 3 === 0 ? "bumble" : "hinge", secondDate: sd, city, entryDate: new Date(now - daysAgo * 86400000).toISOString(), createdAt: new Date(now - daysAgo * 86400000).toISOString() });
  }

  // Shashank — Indian guy, Delhi/Mumbai/Bangalore, Tinder/Hinge, dinners + trips, mixed moods
  for (let i = 0; i < 18; i++) {
    const cities = ["Delhi", "Mumbai", "Delhi", "Bangalore", "Delhi", "Mumbai"];
    const city = cities[i % cities.length];
    const acts: Entry["activity"][] = ["food_date", "coffee", "food_date", "trip", "movie", "food_date"];
    const activity = acts[i % acts.length];
    const base = activity === "trip" ? 38000 : activity === "food_date" ? 4500 : activity === "movie" ? 1800 : 900;
    const amount = Math.max(400, Math.round(base * (0.7 + Math.random() * 0.7)));
    const mood = (i < 10 ? weightedRand([2, 3, 4, 5], [10, 30, 35, 25]) : weightedRand([1, 2, 3, 4], [15, 30, 35, 20])) as Entry["mood"];
    const sd: Entry["secondDate"] = mood >= 4 ? "yes" : mood === 3 && Math.random() > 0.5 ? "yes" : "no";
    const daysAgo = Math.floor(i * 5 + Math.random() * 4);
    out.push({ id: uid(), userId: "seed_" + uid(), activity, amountCents: amount, currency: "INR", partnerName: "Shashank", mood, meetVia: i % 2 === 0 ? "tinder" : "hinge", secondDate: sd, city, entryDate: new Date(now - daysAgo * 86400000).toISOString(), createdAt: new Date(now - daysAgo * 86400000).toISOString() });
  }

  return out;
}

export function seedEntriesIndia(): Entry[] {
  const out: Entry[] = [];
  const now = Date.now();
  const CITY_W = [30, 28, 20, 10, 7, 5]; // Delhi > Mumbai > Bangalore > Hyderabad > Pune > Chennai
  const ACT_W = [28, 15, 12, 6, 30, 9];  // coffee & food dominant
  const MOOD_W = [12, 20, 28, 25, 15];

  for (let i = 0; i < 500; i++) {
    const activity = weightedRand(ACTS, ACT_W);
    const city = weightedRand(IN_CITIES, CITY_W);
    const base =
      activity === "trip" ? 500000 :
      activity === "gift" ? 80000 :
      activity === "food_date" ? 80000 :
      activity === "movie" ? 35000 :
      activity === "coffee" ? 15000 :
      45000;
    const amount = Math.max(5000, Math.round(base * (0.5 + Math.random() * 1.5)));
    const mood = weightedRand([1, 2, 3, 4, 5], MOOD_W) as Entry["mood"];
    const secondDateProb = mood >= 4 ? 0.62 : mood === 3 ? 0.38 : 0.14;
    const secondDate: Entry["secondDate"] = Math.random() < secondDateProb ? (mood === 5 && Math.random() < 0.3 ? "together" : "yes") : "no";
    const daysAgo = Math.floor(Math.random() * 90);
    out.push({ id: uid(), userId: "seed_" + uid(), activity, amountCents: amount, currency: "INR", partnerName: rand(IN_NAMES), mood, meetVia: rand(MEET_VIA), secondDate, city, entryDate: new Date(now - daysAgo * 86400000).toISOString(), createdAt: new Date(now - daysAgo * 86400000).toISOString() });
  }

  // Priya — expensive Mumbai foodie (Hinge-heavy, high mood)
  for (let i = 0; i < 14; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: i % 3 === 0 ? "trip" : "food_date", amountCents: 160000 + Math.floor(Math.random() * 60000), currency: "INR", partnerName: "Priya", mood: 5, meetVia: "hinge", secondDate: "together", city: "Mumbai", entryDate: new Date(now - i * 86400000 * 2).toISOString(), createdAt: new Date(now - i * 86400000 * 2).toISOString() });
  }
  // Rahul — Delhi big spender (mix of apps)
  for (let i = 0; i < 12; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: i % 4 === 0 ? "trip" : "food_date", amountCents: 120000 + Math.floor(Math.random() * 50000), currency: "INR", partnerName: "Rahul", mood: (Math.floor(Math.random() * 2) + 4) as Entry["mood"], meetVia: weightedRand([...MEET_VIA], [20, 30, 25, 10, 5, 5, 5]), secondDate: Math.random() > 0.4 ? "yes" : "no", city: "Delhi", entryDate: new Date(now - i * 86400000 * 3).toISOString(), createdAt: new Date(now - i * 86400000 * 3).toISOString() });
  }
  // Anjali — Bangalore gift-giver
  for (let i = 0; i < 10; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: i % 2 === 0 ? "gift" : "food_date", amountCents: 90000 + Math.floor(Math.random() * 40000), currency: "INR", partnerName: "Anjali", mood: (Math.floor(Math.random() * 2) + 3) as Entry["mood"], meetVia: "bumble", secondDate: "yes", city: "Bangalore", entryDate: new Date(now - i * 86400000 * 2).toISOString(), createdAt: new Date(now - i * 86400000 * 2).toISOString() });
  }
  // Ananya — Bangalore coffee dates, high happy rate
  for (let i = 0; i < 10; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: "coffee", amountCents: 18000 + Math.floor(Math.random() * 8000), currency: "INR", partnerName: "Ananya", mood: 5, meetVia: "hinge", secondDate: "together", city: "Bangalore", entryDate: new Date(now - i * 86400000 * 3).toISOString(), createdAt: new Date(now - i * 86400000 * 3).toISOString() });
  }
  // Neha — Mumbai trending
  for (let i = 0; i < 8; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: rand(["food_date", "movie", "coffee"]), amountCents: 70000 + Math.floor(Math.random() * 30000), currency: "INR", partnerName: "Neha", mood: (Math.floor(Math.random() * 2) + 3) as Entry["mood"], meetVia: "tinder", secondDate: Math.random() > 0.5 ? "yes" : "no", city: "Mumbai", entryDate: new Date(now - i * 86400000 * 2).toISOString(), createdAt: new Date(now - i * 86400000 * 2).toISOString() });
  }

  return out;
}

export function seedEntriesUS(): Entry[] {
  const out: Entry[] = [];
  const now = Date.now();
  const CITY_W = [35, 25, 18, 12, 10]; // NY > LA > Chicago > Austin > Miami
  const ACT_W = [30, 15, 10, 8, 27, 10];
  const MOOD_W = [10, 18, 28, 28, 16];

  for (let i = 0; i < 400; i++) {
    const activity = weightedRand(ACTS, ACT_W);
    const city = weightedRand(US_CITIES, CITY_W);
    const base =
      activity === "trip" ? 35000 :
      activity === "gift" ? 5500 :
      activity === "food_date" ? 7500 :
      activity === "movie" ? 3000 :
      activity === "coffee" ? 850 :
      4500;
    const amount = Math.max(200, Math.round(base * (0.5 + Math.random() * 1.5)));
    const mood = weightedRand([1, 2, 3, 4, 5], MOOD_W) as Entry["mood"];
    const secondDateProb = mood >= 4 ? 0.63 : mood === 3 ? 0.40 : 0.15;
    const secondDate: Entry["secondDate"] = Math.random() < secondDateProb ? (mood === 5 && Math.random() < 0.3 ? "together" : "yes") : "no";
    const daysAgo = Math.floor(Math.random() * 90);
    out.push({ id: uid(), userId: "seed_" + uid(), activity, amountCents: amount, currency: "USD", partnerName: rand(US_NAMES), mood, meetVia: rand(MEET_VIA), secondDate, city, entryDate: new Date(now - daysAgo * 86400000).toISOString(), createdAt: new Date(now - daysAgo * 86400000).toISOString() });
  }

  // Ashley — expensive NYC diner
  for (let i = 0; i < 12; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: i % 3 === 0 ? "trip" : "food_date", amountCents: 14000 + Math.floor(Math.random() * 6000), currency: "USD", partnerName: "Ashley", mood: 5, meetVia: "hinge", secondDate: "together", city: "New York", entryDate: new Date(now - i * 86400000 * 2).toISOString(), createdAt: new Date(now - i * 86400000 * 2).toISOString() });
  }
  // Tyler — Austin coffee scene
  for (let i = 0; i < 10; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: "coffee", amountCents: 1000 + Math.floor(Math.random() * 500), currency: "USD", partnerName: "Tyler", mood: 5, meetVia: "bumble", secondDate: "together", city: "Austin", entryDate: new Date(now - i * 86400000 * 3).toISOString(), createdAt: new Date(now - i * 86400000 * 3).toISOString() });
  }
  // Emma — LA trendy
  for (let i = 0; i < 10; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: i % 2 === 0 ? "food_date" : "gift", amountCents: 9000 + Math.floor(Math.random() * 3000), currency: "USD", partnerName: "Emma", mood: (Math.floor(Math.random() * 2) + 4) as Entry["mood"], meetVia: "tinder", secondDate: "yes", city: "Los Angeles", entryDate: new Date(now - i * 86400000 * 2).toISOString(), createdAt: new Date(now - i * 86400000 * 2).toISOString() });
  }
  // Jordan — Chicago mid-range
  for (let i = 0; i < 8; i++) {
    out.push({ id: uid(), userId: "seed_" + uid(), activity: rand(["food_date", "movie"]), amountCents: 6500 + Math.floor(Math.random() * 2000), currency: "USD", partnerName: "Jordan", mood: 4, meetVia: "hinge", secondDate: Math.random() > 0.5 ? "yes" : "no", city: "Chicago", entryDate: new Date(now - i * 86400000 * 3).toISOString(), createdAt: new Date(now - i * 86400000 * 3).toISOString() });
  }

  return out;
}

export function seedPosts(): Post[] {
  const now = Date.now();
  const t = (d: number) => new Date(now - d * 86400000).toISOString();
  const COMMENT_AUTHORS = ["berlindater92", "hingemüde_", "stadtmensch", "kaffeemensch", "swipemüde", "neuköllner_", "app_müde", "bln_single", "prenzlhügel", "friedrianer", "bumbler99", "tinderveteran", "datingstudie", "münchen_exit", "kiezliebe", "delhidater_", "bk_dater", "mchn_alex"];
  const c = (content: string, daysAgo = 2) => ({ id: uid(), author: rand(COMMENT_AUTHORS), content, upvotes: Math.floor(Math.random() * 55) + 2, downvotes: 0, createdAt: t(daysAgo) });

  return [
    {
      id: uid(), author: "berlindater92", type: "experience", tags: ["Experience", "Berlin"],
      content: "alter ich hab gerade €87 für pasta ausgegeben und sie hat danach 2h lang nicht mehr geantwortet. nicht mal ein danke text. ich stehe so dumm da rn 💀",
      upvotes: 312, downvotes: 14, createdAt: t(2), comments: [
        c("€87 für pasta?? warst du in mitte oder was 😭", 2),
        c("been there. das tut weh ngl. ich hoffe wenigstens die pasta war gut", 2),
        c("nächstes mal kaffee zuerst. €8 risiko statt €87", 1),
        c("das ghosting danach macht es noch viel schlimmer als wenn sie direkt nein gesagt hätte", 1),
      ],
    },
    {
      id: uid(), author: "kaffeemensch_bln", type: "advice", tags: ["Advice", "Coffee"],
      content: "hot take: kaffee dates sind die beste erfindung der modernen dating szene. €9, kein awkward schweigen wenn das essen kommt, und wenn es shit ist kannst du nach 30min weg. warum macht das nicht jeder so",
      upvotes: 428, downvotes: 11, createdAt: t(3), comments: [
        c("hard agree. hab so viel geld dadurch gespart 😭", 3),
        c("gegenargument: wenn es gut läuft willst du gar nicht gehen. letzten monat 4h in einem café versessen", 2),
        c("ja aber dann kannst du trotzdem zum essen verlängern. keine verpflichtung am anfang. das ist der punkt", 2),
        c("mein letztes date fand kaffee \"nicht richtig genug\" als erstes date... andere zeiten 💀", 1),
      ],
    },
    {
      id: uid(), author: "hingemüde2024", type: "experience", tags: ["Experience", "Hinge"],
      content: "diesen monat 4 hinge dates gemacht. 3 davon haben einfach aufgehört zu schreiben danach, ohne grund, ohne ankündigung. hab zusammen ca €140 ausgegeben. ich glaub ich brauch eine pause",
      upvotes: 267, downvotes: 9, createdAt: t(1), comments: [
        c("das ghosting bei hinge wird echt schlimmer ngl. früher war das anders", 1),
        c("bumble mal versuchen? da müssen frauen anfangen, irgendwie seriösere leute meiner erfahrung nach", 1),
        c("€140 in einem monat ist auch nicht wenig alter... ich set mir jetzt ein budget lol", 1),
      ],
    },
    {
      id: uid(), author: "wer_zahlt_wtf", type: "question", tags: ["Question"],
      content: "echte frage wer zahlt beim ersten date? ich bin ein typ und ich zahle immer aber neulich hat mein date fast drüber gestritten, meinte es sei \"weird und old fashioned\"... bin ich der einzige der das noch so macht",
      upvotes: 389, downvotes: 41, createdAt: t(5), comments: [
        c("splitten ist die einzige antwort die 2025 noch sinn ergibt digga", 5),
        c("ich find es nice wenn einer zahlt aber ich würd mich auch nicht beschweren lol", 4),
        c("wer vorschlägt zahlt oder beide zahlen gleich. alles andere ist theater", 3),
        c("ich (w) zahle immer selbst für das erste date. will niemandem was schulden bevor ich die person kenne", 2),
      ],
    },
    {
      id: uid(), author: "impulsiv_aber_froh", type: "experience", tags: ["Experience", "Trip"],
      content: "hab spontan ein wochenende nach amsterdam gebucht mit meinem date, 3. treffen, €280 zusammen für hotel + zug. war das dumm? ja. war es das wert? auch ja. update folgt wenn ich zurück bin",
      upvotes: 521, downvotes: 8, createdAt: t(4), comments: [
        c("BRO UPDATE??? ich brauche das für meine seelische gesundheit 😭", 4),
        c("3. date amsterdam ist entweder die beste oder schlechteste entscheidung, kein mittelweg", 3),
        c("das ist der move. ich respektiere das sehr", 2),
        c("wie war esssss", 1),
      ],
    },
    {
      id: uid(), author: "stadtmensch_BE", type: "observation", tags: ["Observation", "Berlin"],
      content: "berliner dating preise sind in 2 jahren so krass gestiegen. 2022 waren restaurants in mitte noch okay, jetzt zahlst du €25 für pasta die nix besonderes ist. ich date inzwischen nur noch in friedrichshain oder neukölln",
      upvotes: 298, downvotes: 16, createdAt: t(7), comments: [
        c("neukölln is die antwort. bessere vibes, bessere preise, irgendwie auch bessere gespräche", 7),
        c("prenzlauer berg auch nicht mehr billig lol. kreuzberg geht noch so", 5),
        c("das liegt auch daran dass überall touristenrestaurants aufgemacht haben in mitte seitdem", 3),
      ],
    },
    {
      id: uid(), author: "kaffeemensch_bln", type: "experience", tags: ["Experience"],
      content: "UPDATE: das kaffee date von montag... heute ist unser 3. date und sie wollte nach 2h gar nicht aufhören. ich glaube daran leute 😭",
      upvotes: 634, downvotes: 3, createdAt: t(0), comments: [
        c("LETS GOOO ❤️", 0),
        c("siehste!! kaffee dates sind der weg wenn die chemie stimmt", 0),
        c("community win 🥹", 0),
      ],
    },
    {
      id: uid(), author: "kino_lover_bln", type: "advice", tags: ["Advice", "Movie"],
      content: "kino dates sind so underrated digga. €22 zusammen, ihr müsst nicht die ganze zeit reden, danach habt ihr direkt ein thema. und wenn der film scheiße war habt ihr was gemeinsam worüber ihr lachen könnt",
      upvotes: 183, downvotes: 22, createdAt: t(6), comments: [
        c("problem ist man lernt sich beim kino nicht wirklich kennen ngl", 6),
        c("stimmt aber das ist auch nicht das ziel beim ersten date. vibe check first", 5),
        c("und gute kinos in berlin haben auch eine bar danach. perfekter abend flow", 3),
      ],
    },
    {
      id: uid(), author: "münchen_armut", type: "observation", tags: ["Observation"],
      content: "münchen vs berlin dating mal ehrlich verglichen: gleicher restauranttyp, münchen locker 30% teurer. ich versteh münchen leute nicht wie ihr das schafft. respekt aber auch bitte helft mir",
      upvotes: 241, downvotes: 5, createdAt: t(8), comments: [
        c("münchen dater hier. wir schreiben es als investition ab 😭", 8),
        c("warum glaubt ihr geht münchen in gruppen aus. economy of scale bei split bills lol", 6),
        c("ich bin aus münchen nach berlin gezogen teilweise wegen dating kosten, nicht mal im spaß", 3),
      ],
    },
    {
      id: uid(), author: "geschenke_reue", type: "experience", tags: ["Experience", "Gift"],
      content: "hab in 3 monaten €180 in geschenken für sie ausgegeben. sie hat dann mit jemand anderem angefangen. ich sitz hier und lerne gerade eine lektion die ich mir selbst hätte sparen können 🤡",
      upvotes: 445, downvotes: 6, createdAt: t(9), comments: [
        c("geschenke früh in einer beziehung sind immer ein gamble. sorry das ist passiert", 9),
        c("\"ich lerne eine lektion\" bro du hattest genug für einen roman 💀", 7),
        c("€180 in 3 monate... alter... ich hoffe es waren wenigstens gute geschenke", 4),
      ],
    },
    {
      id: uid(), author: "data_dater_", type: "observation", tags: ["Observation"],
      content: "informelle statistik aus eigenen dates: hinge dates geben am meisten aus (~€65 avg), tinder am wenigsten (~€28), bumble irgendwo dazwischen. macht für mich sinn – die app bestimmt die erwartungen. stimmt das bei euch auch so?",
      upvotes: 356, downvotes: 12, createdAt: t(3), comments: [
        c("macht sinn. hinge vermarktet sich als beziehungs-app, andere erwartungen", 3),
        c("irl begegnungen > alle apps bei mir. die leute sind echter wenn man sich zufällig trifft", 2),
        c("bumble dates sind bei mir immer die entspanntesten, keine ahnung warum eigentlich", 2),
      ],
    },
    {
      id: uid(), author: "delhidater_cp", type: "experience", tags: ["Experience"],
      content: "first date at connaught place, started with coffee ₹480, she suggested dinner after. total ₹2200. best ₹2200 i ever spent ngl, we're meeting again saturday 🙏",
      upvotes: 167, downvotes: 4, createdAt: t(2), comments: [
        c("CP first date is always the right call bhai", 2),
        c("₹2200 total for CP dinner is actually solid value man 👍", 1),
        c("saturday update mandatory yaar 👀", 1),
      ],
    },
    {
      id: uid(), author: "bk_dater", type: "observation", tags: ["Observation"],
      content: "NYC dinner date is $140+ now if you're going anywhere decent. we're all just out here bleeding money to find love lmao. anyway how are we all holding up",
      upvotes: 289, downvotes: 7, createdAt: t(5), comments: [
        c("$140 is tuesday in midtown unfortunately 💀", 5),
        c("brooklyn is still manageable if you know where to go. DM me lmao", 3),
        c("i have genuinely considered moving cities for cheaper dates at this point", 2),
      ],
    },
    {
      id: uid(), author: "erstes_date_win", type: "experience", tags: ["Experience", "Coffee"],
      content: "erstes date heute: kaffee, 45min. dann spaziergehen, 2h. dann spontan essen, €34 zusammen. dann noch ein bier. gesamt 5h, sie hat sich mit \"bis bald\" verabschiedet. ich glaub das ist ein gutes zeichen oder??",
      upvotes: 478, downvotes: 4, createdAt: t(1), comments: [
        c("\"bis bald\" ist eindeutig positiv. 5h erstes date ist auch sehr gut 👍", 1),
        c("alter das klingt perfekt, drück dir die daumen 🤞", 1),
        c("5h für €34 ist außerdem krasses preis-leistungs-verhältnis lol", 0),
        c("update bitte wenn das zweite date klappt", 0),
      ],
    },
  ];
}
