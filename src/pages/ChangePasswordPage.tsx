import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';

function validate(pwd: string): string[] {
  const errors: string[] = [];
  if (pwd.length < 8)             errors.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(pwd))         errors.push('Uma letra maiúscula');
  if (!/[a-z]/.test(pwd))         errors.push('Uma letra minúscula');
  if (!/\d/.test(pwd))            errors.push('Um número');
  if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('Um caractere especial (!@#$%...)');
  return errors;
}

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useGameStore();

  const [newPwd, setNewPwd]       = useState('');
  const [confirmPwd, setConfirm]  = useState('');
  const [showNew, setShowNew]     = useState(false);
  const [showConfirm, setShowConf] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const errors = validate(newPwd);
  const allOk  = errors.length === 0 && newPwd === confirmPwd && newPwd.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (errors.length > 0)      { setError('A senha não atende aos requisitos.'); return; }
    if (newPwd !== confirmPwd)  { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    setError('');

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPwd });
    if (updateErr) {
      setError('Erro ao atualizar senha. Tente novamente.');
      setLoading(false);
      return;
    }

    await updateProfile({ mustChangePassword: false });

    const role = user.role;
    navigate(role === 'admin' || role === 'trainer' ? '/trainer' : '/', { replace: true });
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#060913',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🔐</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#f1f5f9' }}>Crie sua senha</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748b' }}>
            Por segurança, defina uma senha pessoal antes de continuar.
          </p>
        </div>

        <div style={{
          background: '#0d1526', border: '1px solid #1e2d4a', borderRadius: 16,
          padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          {error && (
            <div style={{
              background: '#ef444415', border: '1px solid #ef444440',
              borderRadius: 8, padding: '10px 14px', fontSize: 13,
              color: '#ef4444', marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Nova senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="game-input"
                  type={showNew ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowNew(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Confirmar senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="game-input"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repita a nova senha"
                  value={confirmPwd}
                  onChange={e => setConfirm(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowConf(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Requirements */}
            {newPwd && (
              <div style={{ background: '#111827', borderRadius: 10, padding: '12px 14px', display: 'grid', gap: 6 }}>
                {[
                  { label: 'Mínimo 8 caracteres',             ok: newPwd.length >= 8 },
                  { label: 'Uma letra maiúscula',              ok: /[A-Z]/.test(newPwd) },
                  { label: 'Uma letra minúscula',              ok: /[a-z]/.test(newPwd) },
                  { label: 'Um número',                        ok: /\d/.test(newPwd) },
                  { label: 'Um caractere especial (!@#$%...)', ok: /[^A-Za-z0-9]/.test(newPwd) },
                  { label: 'Senhas coincidem',                 ok: newPwd === confirmPwd && confirmPwd.length > 0 },
                ].map(req => (
                  <div key={req.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ color: req.ok ? '#22c55e' : '#475569', flexShrink: 0 }}>
                      {req.ok ? '✓' : '○'}
                    </span>
                    <span style={{ color: req.ok ? '#86efac' : '#475569' }}>{req.label}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !allOk}
              style={{
                marginTop: 4, padding: '12px 20px', borderRadius: 10, border: 'none',
                background: allOk ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#1e2d4a',
                color: allOk ? 'white' : '#475569',
                fontWeight: 700, fontSize: 15, cursor: (loading || !allOk) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              {loading ? (
                <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Salvando...</>
              ) : (
                <><Check size={16} /> Definir senha e entrar</>
              )}
            </button>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
