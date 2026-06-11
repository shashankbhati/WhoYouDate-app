import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import type { UserProfile } from '../lib/types';
import { generateId } from '../lib/utils';

const AGE_RANGES = ['18-24', '25-34', '35-44', '45+'];
const RELATIONSHIP_STAGES = ['Dating', 'In a relationship', 'Married', 'Other'];
const COUNTRIES = ['Germany', 'United Kingdom', 'France', 'Netherlands', 'Austria', 'Switzerland', 'United States', 'Other'];

export default function SetupPage() {
  const navigate = useNavigate();
  const setProfile = useStore(s => s.setProfile);

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Germany');
  const [relationshipStage, setRelationshipStage] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [hasPrimary, setHasPrimary] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate1 = () => {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.displayName = 'Display name is required';
    if (!ageRange) e.ageRange = 'Age range is required';
    if (!city.trim()) e.city = 'City is required';
    if (!country) e.country = 'Country is required';
    if (!relationshipStage) e.relationshipStage = 'Relationship stage is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validate1()) setStep(2);
  };

  const handleFinish = () => {
    const profile: UserProfile = {
      id: generateId(),
      anonymousId: generateId(),
      displayName: displayName.trim(),
      partnerDisplayName: hasPrimary && partnerName.trim() ? partnerName.trim() : undefined,
      ageRange,
      city: city.trim(),
      country,
      relationshipStage,
      totalSpentCents: 0,
      entryCount: 0,
      showAgeOnPosts: false,
      showRelationshipStage: false,
      showCountry: false,
      createdAt: new Date().toISOString(),
    };
    setProfile(profile);
    navigate('/');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">💕</div>
        <h1 className="text-2xl font-bold" style={{ color: '#e6edf3' }}>Create Your Anonymous Profile</h1>
        <p className="text-sm mt-2" style={{ color: '#8b949e' }}>
          Your profile is completely anonymous. We never store real names or personal info.
        </p>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {[1, 2].map(s => (
          <div key={s} className="flex-1 h-1 rounded-full" style={{ background: s <= step ? '#ff3b8b' : '#30363d' }} />
        ))}
      </div>

      {step === 1 && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 className="font-semibold mb-4" style={{ color: '#e6edf3' }}>Step 1: Basic Info</h2>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Display Name (nickname only)</label>
              <input
                type="text"
                placeholder="e.g. Alex, Luna, Sam..."
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input-base"
                maxLength={50}
              />
              {errors.displayName && <p className="text-xs mt-1" style={{ color: '#f85149' }}>{errors.displayName}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Age Range</label>
              <div className="flex gap-2 flex-wrap">
                {AGE_RANGES.map(r => (
                  <button
                    key={r}
                    onClick={() => setAgeRange(r)}
                    className="px-4 py-2 rounded text-sm"
                    style={{
                      background: ageRange === r ? '#ff3b8b' : '#22272e',
                      color: ageRange === r ? 'white' : '#8b949e',
                      border: ageRange === r ? 'none' : '1px solid #30363d',
                      cursor: 'pointer',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {errors.ageRange && <p className="text-xs mt-1" style={{ color: '#f85149' }}>{errors.ageRange}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>City</label>
                <input
                  type="text"
                  placeholder="Berlin, Munich..."
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="input-base"
                  maxLength={100}
                />
                {errors.city && <p className="text-xs mt-1" style={{ color: '#f85149' }}>{errors.city}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Country</label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="input-base"
                >
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Relationship Stage</label>
              <div className="flex gap-2 flex-wrap">
                {RELATIONSHIP_STAGES.map(r => (
                  <button
                    key={r}
                    onClick={() => setRelationshipStage(r)}
                    className="px-3 py-2 rounded text-sm"
                    style={{
                      background: relationshipStage === r ? '#ff3b8b' : '#22272e',
                      color: relationshipStage === r ? 'white' : '#8b949e',
                      border: relationshipStage === r ? 'none' : '1px solid #30363d',
                      cursor: 'pointer',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {errors.relationshipStage && <p className="text-xs mt-1" style={{ color: '#f85149' }}>{errors.relationshipStage}</p>}
            </div>

            <div className="mt-2 p-3 rounded text-xs" style={{ background: 'rgba(88, 166, 255, 0.08)', border: '1px solid rgba(88,166,255,0.2)', color: '#8b949e' }}>
              ⚠️ Use nicknames/display names only. Do not enter real names, phone numbers, addresses, emails, or social media handles.
            </div>

            <button className="btn-primary w-full" style={{ borderRadius: '6px', padding: '10px' }} onClick={handleNext}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 className="font-semibold mb-2" style={{ color: '#e6edf3' }}>Step 2: Are you dating someone specific?</h2>
          <p className="text-xs mb-4" style={{ color: '#8b949e' }}>This lets you track and explore analytics for your partner's display name.</p>

          <div className="flex gap-3 mb-4">
            {[{ label: '💕 Yes, add their nickname', value: true }, { label: '⏭️ Skip for now', value: false }].map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => setHasPrimary(opt.value)}
                className="flex-1 px-3 py-3 rounded text-sm text-center"
                style={{
                  background: hasPrimary === opt.value ? '#ff3b8b' : '#22272e',
                  color: hasPrimary === opt.value ? 'white' : '#8b949e',
                  border: hasPrimary === opt.value ? 'none' : '1px solid #30363d',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {hasPrimary && (
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1" style={{ color: '#8b949e' }}>Their display name (nickname only)</label>
              <input
                type="text"
                placeholder="e.g. Sam, Jamie..."
                value={partnerName}
                onChange={e => setPartnerName(e.target.value)}
                className="input-base"
                maxLength={50}
              />
            </div>
          )}

          <div className="flex gap-3">
            <button className="btn-secondary flex-1" style={{ borderRadius: '6px', padding: '10px' }} onClick={() => setStep(1)}>
              ← Back
            </button>
            <button className="btn-primary flex-1" style={{ borderRadius: '6px', padding: '10px' }} onClick={handleFinish}>
              Create Profile 🎉
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
