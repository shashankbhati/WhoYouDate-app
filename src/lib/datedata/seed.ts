import type { Entry, Post } from "./types";

const FEMALE_NAMES = ["Sabrina", "Laura", "Mia", "Julia", "Emma", "Lena", "Anna", "Sophie", "Hannah", "Katharina", "Lisa", "Marie", "Sarah", "Nina", "Lea", "Jana", "Monika", "Petra", "Sandra", "Stefanie", "Lina", "Johanna"];
const MALE_NAMES = ["Sven", "Klaus", "Robert", "Maximilian", "Jens", "Jan", "Tim", "Felix", "Lukas", "Paul", "Noah", "Leon", "Tobias", "Stefan", "Michael", "Florian", "Patrick", "Christian", "Andreas", "Markus", "Thomas"];
const ALL_NAMES = [...FEMALE_NAMES, ...MALE_NAMES];
const CITIES = ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt"];
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
  const comment = (content: string, daysAgo = 2) => ({ id: uid(), author: "anon", content, upvotes: Math.floor(Math.random() * 40) + 1, downvotes: 0, createdAt: t(daysAgo) });
  return [
    {
      id: uid(), author: "CaféLover", type: "advice", tags: ["Advice", "Coffee"], content: "Pro tip: Coffee dates are underrated. €8 and you actually get to talk, unlike a noisy restaurant. Best dates I've had were over espresso ☕",
      upvotes: 247, downvotes: 12, comments: [
        comment("Totally agree. Coffee dates filter out people who aren't really interested in you."),
        comment("Disagree. Nothing says 'I'm serious' like a proper dinner 🤷", 1),
        comment("Coffee is 100% the move for first dates. Low pressure, easy to extend or cut short."),
      ], createdAt: t(3),
    },
    {
      id: uid(), author: "BerlinDater", type: "experience", tags: ["Experience", "Berlin"], content: "Just had an amazing dinner date in Berlin, but wow, €95 is a lot for pasta! 🍝 Worth it though — the vibe was perfect.",
      upvotes: 183, downvotes: 8, comments: [
        comment("€95 for pasta 😭 which restaurant? need to know what to avoid lol"),
        comment("That's normal for nice places in Mitte tbh. You get what you pay for."),
      ], createdAt: t(3),
    },
    {
      id: uid(), author: "overthinkr99", type: "question", tags: ["Question", "Trip"], content: "Is spending €400 on a weekend trip for an anniversary normal? My friends say I'm overspending but it felt right 🤷",
      upvotes: 156, downvotes: 34, comments: [
        comment("Totally normal! Experiences > things every time."),
        comment("Depends on your income tbh. If it didn't strain you then it's fine."),
        comment("€400 for a full trip? That's actually pretty reasonable."),
      ], createdAt: t(5),
    },
    {
      id: uid(), author: "observant_dater", type: "observation", tags: ["Observation", "Gift"], content: "Noticed everyone's spending more on gifts lately. Is it just me or has dating become way more expensive in 2026?",
      upvotes: 312, downvotes: 21, comments: [
        comment("Inflation hit dating HARD. Even coffee dates feel pricier."),
        comment("Dating apps also make expectations higher I think.", 1),
      ], createdAt: t(7),
    },
    {
      id: uid(), author: "HingeHopeful", type: "experience", tags: ["Experience", "Coffee", "Hinge"], content: "Met someone on Hinge for coffee, ended up talking for 4 hours. €9 has never felt so worth it 😍 Third date next week!",
      upvotes: 428, downvotes: 6, comments: [
        comment("This is the dream 🥹"),
        comment("Hinge dates hit different fr"),
        comment("4 hours over coffee? That's a good sign 👌"),
      ], createdAt: t(2),
    },
    {
      id: uid(), author: "MovieNightFan", type: "advice", tags: ["Advice", "Movie"], content: "Movie dates are criminally underrated. €25 for two tickets, shared popcorn, and you have something to talk about after. Perfect formula.",
      upvotes: 274, downvotes: 18, comments: [
        comment("The post-movie discussion is literally the best part of the date."),
        comment("Only works if you actually talk afterwards. Some people just say bye 💀"),
      ], createdAt: t(4),
    },
  ];
}
