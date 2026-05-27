import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

export function RegisterPage() {
  const { signUp } = useAuthStore();
  const navigate = useNavigate();

  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('As senhas não coincidem'); return; }
    setLoading(true);
    setError('');
    const err = await signUp(email, password, name);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      navigate('/');
    }
  }

  const pwStrength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : 3;
  const pwColors = ['#1e2d4a', '#ef4444', '#eab308', '#10b981'];
  const pwLabels = ['', 'Fraca', 'Média', 'Forte'];

  return (
    <div style={{
      minHeight: '100vh', background: '#060913',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>⚔️</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#f1f5f9', letterSpacing: 1 }}>
            FitRPG
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#64748b' }}>
            Comece sua jornada hoje
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#0d1526', border: '1px solid #1e2d4a', borderRadius: 16,
          padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
            Criar conta
          </h2>

          {error && (
            <div style={{
              background: '#ef444415', border: '1px solid #ef444440',
              borderRadius: 8, padding: '10px 14px', fontSize: 13,
              color: '#ef4444', marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                Nome
              </label>
              <input
                className="game-input"
                type="text"
                placeholder="Seu nome de guerreiro"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                E-mail
              </label>
              <input
                className="game-input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="game-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ width: '100%', boxSizing: 'border-box', paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2,
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Password strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: pwStrength >= i ? pwColors[pwStrength] : '#1e2d4a',
                        transition: 'background 0.2s',
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: pwColors[pwStrength] }}>{pwLabels[pwStrength]}</div>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                Confirmar senha
              </label>
              <input
                className="game-input"
                type={showPass ? 'text' : 'password'}
                placeholder="Repita a senha"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  borderColor: confirm && confirm !== password ? '#ef444460' : '',
                }}
              />
              {confirm && confirm !== password && (
                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Senhas não coincidem</div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4, padding: '12px 20px', borderRadius: 10, border: 'none',
                background: loading ? '#4c1d95' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                color: 'white', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.2s', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Criando conta...
                </>
              ) : (
                <><UserPlus size={16} /> Criar conta</>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' }}>
            Já tem conta?{' '}
            <Link
              to="/login"
              style={{ color: '#a855f7', fontWeight: 600, textDecoration: 'none' }}
            >
              Entrar
            </Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#334155' }}>
          Seus dados são protegidos. Nunca armazenamos sua senha em texto puro.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
