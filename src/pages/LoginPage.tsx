import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export function LoginPage() {
  const { signIn } = useAuthStore();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Preencha todos os campos'); return; }
    setLoading(true);
    setError('');
    const err = await signIn(email, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      navigate('/');
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#060913',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>⚔️</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#f1f5f9', letterSpacing: 1 }}>
            FitRPG
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#64748b' }}>
            Sua academia, sua jornada RPG
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#0d1526', border: '1px solid #1e2d4a', borderRadius: 16,
          padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
            Entrar na conta
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
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
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
                  Entrando...
                </>
              ) : (
                <><LogIn size={16} /> Entrar</>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' }}>
            Não tem conta?{' '}
            <Link
              to="/register"
              style={{ color: '#a855f7', fontWeight: 600, textDecoration: 'none' }}
            >
              Cadastre-se
            </Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#334155' }}>
          Seus dados são privados e protegidos por criptografia.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
