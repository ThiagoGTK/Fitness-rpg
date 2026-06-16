import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { Eye, EyeOff, LogIn, Dumbbell, UserCheck } from 'lucide-react';

type LoginTab = 'student' | 'trainer';

export function LoginPage() {
  const { signIn } = useAuthStore();
  const navigate = useNavigate();

  const [tab, setTab]           = useState<LoginTab>('student');
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
      return;
    }

    // Redirect based on role — gameUser is populated by authStore/gameStore after signIn
    // Use a short poll since gameStore loads async after login
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const role = useGameStore.getState().user.role;
      const initialized = useGameStore.getState().initialized;
      if (initialized || attempts > 20) {
        clearInterval(poll);
        if (role === 'admin' || role === 'trainer') {
          navigate('/trainer');
        } else {
          navigate('/');
        }
      }
    }, 150);
  }

  const isTrainerTab = tab === 'trainer';

  return (
    <div style={{
      minHeight: '100vh', background: '#060913',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>⚔️</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#f1f5f9', letterSpacing: 1 }}>FitRPG</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#64748b' }}>Sua academia, sua jornada RPG</p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
          background: '#0d1526', border: '1px solid #1e2d4a', borderRadius: 12,
          padding: 4, marginBottom: 16,
        }}>
          {([
            { key: 'student', label: 'Sou aluno', icon: <Dumbbell size={15} /> },
            { key: 'trainer', label: 'Sou personal', icon: <UserCheck size={15} /> },
          ] as { key: LoginTab; label: string; icon: React.ReactNode }[]).map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError(''); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 14, transition: 'all 0.15s',
                background: tab === t.key
                  ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                  : 'transparent',
                color: tab === t.key ? '#fff' : '#64748b',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: '#0d1526', border: '1px solid #1e2d4a', borderRadius: 16,
          padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
            {isTrainerTab ? 'Área do Personal Trainer' : 'Entrar na conta'}
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
            {isTrainerTab
              ? 'Acesse o painel para gerenciar seus alunos e treinos.'
              : 'Entre com as credenciais fornecidas pelo seu personal.'}
          </p>

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
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>E-mail</label>
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
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Senha</label>
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
                <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Entrando...</>
              ) : (
                <><LogIn size={16} /> Entrar</>
              )}
            </button>
          </form>

          {tab === 'student' && (
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748b' }}>
              Tem um personal trainer? Ele cria seu login pra você.
              <div style={{ marginTop: 6 }}>
                Treina por conta própria?{' '}
                <Link to="/register" style={{ color: '#a855f7', fontWeight: 600, textDecoration: 'none' }}>
                  Criar conta
                </Link>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#334155' }}>
          Seus dados são privados e protegidos por criptografia.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
