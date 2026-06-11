import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { detectPii } from '../lib/piiDetection';
import { generateId } from '../lib/utils';
import type { ActivityType, MoodType, HowMet, SecondDate, DateEntry } from '../lib/types';

const ACTIVITIES: { emoji: string; label: string; value: ActivityType }[] = [
  { emoji: '🍽️', label: 'Food Date', value: 'food_date' },
  { emoji: '🎬', label: 'Movie', value: 'movie' },
  { emoji: '🎁', label: 'Gift', value: 'gift' },
  { emoji: '✈️', label: 'Trip', value: 'trip' },
  { emoji: '☕', label: 'Coffee', value: 'coffee' },
  { emoji: '💫', label: 'Other', value: 'other' },
];

const MOODS: { emoji: string; label: string; value: MoodType }[] = [
  { emoji: '😍', label: 'Amazing', value: 'amazing' },
  { emoji: '😊', label: 'Happy', value: 'happy' },
  { emoji: '😂', label: 'Fun', value: 'fun' },
  { emoji: '😕', label: 'Meh', value: 'meh' },
  { emoji: '😤', label: 'Bad', value: 'bad' },
];

const HOW_MET: { emoji: string; label: string; value: HowMet }[] = [
  { emoji: '🐝', label: 'Bumble', value: 'bumble' },
  { emoji: '⬛', label: 'Hinge', value: 'hinge' },
  { emoji: '🔥', label: 'Tinder', value: 'tinder' },
  { emoji: '👥', label: 'Through friends', value: 'friends' },
  { emoji: '🏫', label: 'Work / School', value: 'work_school' },
  { emoji: '🤝', label: 'Met in person', value: 'in_person' },
  { emoji: '📱', label: 'Other app', value: 'other_app' },
  { emoji: '💫', label: 'Other', value: 'other' },
];

const SECOND_DATE: { emoji: string; label: string; value: SecondDate }[] = [
  { emoji: '✅', label: 'Yes!', value: 'yes' },
  { emoji: '❌', label: 'No', value: 'no' },
  { emoji: '💞', label: 'Together', value: 'together' },
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK'];

export default function LogPage() {
  const navigate = useNavigate();
  const { profile, addEntry } = useStore();

  const [activity, setActivity] = useState<ActivityType | ''>('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [partner, setPartner] = useState(profile?.partnerDisplayName || '');
  const [note, setNote] = useState('');
  const [mood, setMood] = useState<MoodType | ''>('');
  const [howMet, setHowMet] = useState<HowMet | ''>('');
  const [secondDate, setSecondDate] = useState<SecondDate | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!activity) e.activity = 'Select an activity';
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = 'Enter a valid amount';
    if (!partner.trim()) e.partner = 'Partner display name is required';
    if (!mood) e.mood = 'Select your overall vibe';
    const pii = detectPii(partner);
    if (pii) e.partner = `Looks like you included a ${pii}. Please remove.`;
    if (note) {
      const notePii = detectPii(note);
      if (notePii) e.note = `Note contains a ${notePii}. Please remove.`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const entry: DateEntry = {
      id: generateId(),
      userId: profile?.id || 'anon',
      activityType: activity as ActivityType,
      amountCents: Math.round(parseFloat(amount) * 100),
      currency,
      partnerDisplayName: partner.trim(),
      note: note.trim() || undefined,
      moodScore: mood as MoodType,
      howMet: howMet || undefined,
      wantSecondDate: secondDate || undefined,
      entryDate: date,
      city: profile?.city || 'Unknown',
      country: profile?.country || 'Unknown',
      createdAt: new Date().toISOString(),
    };
    addEntry(entry);
    setSuccess(true);
    setTimeout(() => navigate('/stats'), 1800);
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#e6edf3' }}>Date logged!</h2>
        <p style={{ color: '#8b949e' }}>Checking your badges...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: '#e6edf3' }}>Log a Date</h1>
        <p className="text-sm" style={{ color: '#8b949e' }}>Record your dating activity anonymously</p>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        {/* Activity */}
        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2" style={{ color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Activity *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITIES.map(a => (
              <button
                key={a.value}
                onClick={() => setActivity(a.value)}
                className="flex items-center gap-2 px-3 py-2.5 rounded text-sm"
                style={{
                  background: activity === a.value ? 'rgba(255,59,139,0.15)' : '#22272e',
                  border: activity === a.value ? '1px solid #ff3b8b' : '1px solid #30363d',
                  color: activity === a.value ? '#ff3b8b' : '#8b949e',
                  cursor: 'pointer',
                }}
              >
                <span>{a.emoji}</span> {a.label}
              </button>
            ))}
          </div>
          {errors.activity && <p className="text-xs mt-1" style={{ color: '#f85149' }}>{errors.activity}</p>}
        </div>

        {/* Amount + Currency */}
        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2" style={{ color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Amount *
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="input-base flex-1"
              min={0}
              step={0.01}
            />
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="input-base"
              style={{ width: '100px' }}
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {errors.amount && <p className="text-xs mt-1" style={{ color: '#f85149' }}>{errors.amount}</p>}
        </div>

        {/* Partner name */}
        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2" style={{ color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Partner Display Name *
          </label>
          <input
            type="text"
            placeholder="Nickname only, e.g. Sam, Luna..."
            value={partner}
            onChange={e => setPartner(e.target.value)}
            className="input-base"
            maxLength={50}
          />
          {errors.partner && <p className="text-xs mt-1" style={{ color: '#f85149' }}>{errors.partner}</p>}
        </div>

        {/* How did you meet */}
        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2" style={{ color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            How did you meet? (optional)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {HOW_MET.map(h => (
              <button
                key={h.value}
                onClick={() => setHowMet(howMet === h.value ? '' : h.value)}
                className="flex flex-col items-center gap-1 px-2 py-2 rounded text-xs"
                style={{
                  background: howMet === h.value ? 'rgba(255,59,139,0.15)' : '#22272e',
                  border: howMet === h.value ? '1px solid #ff3b8b' : '1px solid #30363d',
                  color: howMet === h.value ? '#ff3b8b' : '#8b949e',
                  cursor: 'pointer',
                }}
              >
                <span className="text-base">{h.emoji}</span>
                <span style={{ fontSize: '10px', textAlign: 'center' }}>{h.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mood */}
        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2" style={{ color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Overall Vibe *
          </label>
          <div className="flex gap-2">
            {MOODS.map(m => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded"
                style={{
                  background: mood === m.value ? 'rgba(255,59,139,0.15)' : '#22272e',
                  border: mood === m.value ? '1px solid #ff3b8b' : '1px solid #30363d',
                  cursor: 'pointer',
                }}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="text-xs" style={{ color: mood === m.value ? '#ff3b8b' : '#6e7681' }}>{m.label}</span>
              </button>
            ))}
          </div>
          {errors.mood && <p className="text-xs mt-1" style={{ color: '#f85149' }}>{errors.mood}</p>}
        </div>

        {/* Second date */}
        <div className="mb-5">
          <label className="block text-xs font-semibold mb-2" style={{ color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Want a second date? (optional)
          </label>
          <div className="flex gap-2">
            {SECOND_DATE.map(s => (
              <button
                key={s.value}
                onClick={() => setSecondDate(secondDate === s.value ? '' : s.value)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded text-sm"
                style={{
                  background: secondDate === s.value ? 'rgba(255,59,139,0.15)' : '#22272e',
                  border: secondDate === s.value ? '1px solid #ff3b8b' : '1px solid #30363d',
                  color: secondDate === s.value ? '#ff3b8b' : '#8b949e',
                  cursor: 'pointer',
                }}
              >
                <span>{s.emoji}</span> {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note + Date */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Note (optional)
            </label>
            <input
              type="text"
              placeholder="Quick note..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="input-base"
              maxLength={200}
            />
            {errors.note && <p className="text-xs mt-1" style={{ color: '#f85149' }}>{errors.note}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="input-base"
            />
          </div>
        </div>

        <button
          className="btn-primary w-full"
          style={{ borderRadius: '6px', padding: '12px', fontSize: '15px' }}
          onClick={handleSubmit}
        >
          Log Date 🎉
        </button>
      </div>
    </div>
  );
}
