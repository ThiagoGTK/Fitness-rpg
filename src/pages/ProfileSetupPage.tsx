import { useState } from 'react';
import type { Sex } from '../types';
import { useGameStore } from '../store/gameStore';
import { ChevronRight } from 'lucide-react';

const SEX_OPTIONS: { value: Sex; label: string; emoji: string; desc: string }[] = [
  { value: 'male',   label: 'Masculino',          emoji: '♂️', desc: 'Homem' },
  { value: 'female', label: 'Feminino',            emoji: '♀️', desc: 'Mulher' },
  { value: 'other',  label: 'Prefiro não informar', emoji: '🙂', desc: '' },
];

function calcAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function ProfileSetupPage() {
  const { user, updateProfile } = useGameStore();

  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex]             = useState<Sex | ''>('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const age = birthDate ? calcAge(birthDate) : null;
  const canSubmit = birthDate && sex && !saving;

  async function handleSubmit() {
    if (!birthDate) { setError('Informe sua data de nascimento'); return; }
    if (!sex)       { setError('Selecione uma opção de sexo');    return; }

    const a = calcAge(birthDate)!;
    if (a < 10)  { setError('Data de nascimento inválida'); return; }
    if (a > 120) { setError('Data de nascimento inválida'); return; }

    setSaving(true);
    setError('');
    await updateProfile({ birthDate, sex });
    // AuthGuard detecta user.birthDate + user.sex preenchidos e libera o app
  }

  // Max date = today, min date = 120 years ago
  const maxDate = new Date().toISOString().slice(0, 10);
  const minDate = new Date(new Date().getFullYear() - 120, 0, 1).toISOString().slice(0, 10);

  return (
    <div style={{
      minHeight: '100vh', background: '#060913',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes popup { from { opacity: 0; transform: scale(0.95) translateY(12px); } to { opacity: 1; transform: none; } }
        .sex-btn {
          flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 16px 8px; border-radius: 12px; cursor: pointer;
          border: 2px solid #1e2d4a; background: #0d1526;
          transition: border-color 0.15s, background 0.15s;
        }
        .sex-btn:hover  { border-color: #7c3aed50; background: #1a1033; }
        .sex-btn.active { border-color: #7c3aed;   background: #1a0d33; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 440, animation: 'popup 0.35s ease' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>⚔️</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#f1f5f9' }}>
            Bem-vindo(a), {user.name}!
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748b' }}>
            Só mais um passo para começar sua jornada
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#0d1526', border: '1px solid #1e2d4a', borderRadius: 16,
          padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>

          {/* Step indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
            {[0, 1].map(i => (
              <div key={i} style={{
                height: 4, borderRadius: 2, transition: 'all 0.2s',
                width: i === 0 ? (birthDate ? 28 : 20) : (sex ? 28 : 20),
                background: i === 0
                  ? (birthDate ? '#a855f7' : '#1e2d4a')
                  : (sex       ? '#a855f7' : '#1e2d4a'),
              }} />
            ))}
          </div>

          {error && (
            <div style={{
              background: '#ef444415', border: '1px solid #ef444440',
              borderRadius: 8, padding: '10px 14px', fontSize: 13,
              color: '#ef4444', marginBottom: 18,
            }}>
              {error}
            </div>
          )}

          {/* Birth date */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
              📅 Data de nascimento
            </label>
            <input
              className="game-input"
              type="date"
              value={birthDate}
              min={minDate}
              max={maxDate}
              onChange={e => { setBirthDate(e.target.value); setError(''); }}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            {age !== null && age >= 10 && (
              <div style={{ fontSize: 12, color: '#a855f7', marginTop: 6 }}>
                🎂 {age} anos
              </div>
            )}
          </div>

          {/* Sex */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>
              👤 Sexo biológico
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {SEX_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`sex-btn${sex === opt.value ? ' active' : ''}`}
                  onClick={() => { setSex(opt.value); setError(''); }}
                >
                  <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: sex === opt.value ? '#e2e8f0' : '#64748b',
                    textAlign: 'center', lineHeight: 1.3,
                  }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '13px 20px', borderRadius: 10, border: 'none',
              background: canSubmit
                ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                : '#1e2d4a',
              color: canSubmit ? 'white' : '#475569',
              fontWeight: 700, fontSize: 15,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.2s',
            }}
          >
            {saving ? (
              <>
                <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Salvando...
              </>
            ) : (
              <>
                Começar minha jornada
                <ChevronRight size={18} />
              </>
            )}
          </button>

          <p style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: '#334155' }}>
            Esses dados ficam privados e são usados apenas para personalizar sua experiência.
          </p>
        </div>
      </div>
    </div>
  );
}
