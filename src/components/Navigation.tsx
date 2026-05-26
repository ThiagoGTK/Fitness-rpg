import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, List, PlusCircle, History, Trophy, Target, Zap, Trash2, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { LevelBadge } from './ui/LevelBadge';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/muscles', icon: Dumbbell, label: 'Músculos' },
  { to: '/exercises', icon: List, label: 'Exercícios' },
  { to: '/log', icon: PlusCircle, label: 'Treinar' },
  { to: '/history', icon: History, label: 'Histórico' },
  { to: '/achievements', icon: Trophy, label: 'Conquistas' },
  { to: '/records', icon: Target, label: 'Recordes' },
];

export function Navigation() {
  const { user, cleanReset } = useGameStore();
  const location = useLocation();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleReset() {
    cleanReset();
    setShowConfirm(false);
  }

  return (
    <>
      {/* Sidebar (desktop) */}
      <nav style={{
        width: 220, flexShrink: 0, background: '#0d1526',
        borderRight: '1px solid #1e2d4a', display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}
        className="desktop-nav"
      >
        {/* Logo */}
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #1e2d4a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>⚔️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#e2e8f0' }}>FitRPG</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Gym Level Up</div>
            </div>
          </div>

          {/* User profile summary */}
          <div style={{
            marginTop: 14, padding: '10px 12px',
            background: '#111827', borderRadius: 10, border: '1px solid #1e2d4a',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <LevelBadge level={user.level} size="sm" />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{user.name}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Nível {user.level}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#eab308' }}>
              <Zap size={12} />
              <span>{user.weeklyXP.toLocaleString()} XP essa semana</span>
            </div>
            {user.streak > 0 && (
              <div style={{ fontSize: 11, color: '#f97316', marginTop: 2 }}>
                🔥 {user.streak} dia{user.streak > 1 ? 's' : ''} seguidos
              </div>
            )}
          </div>
        </div>

        {/* Links */}
        <div style={{ padding: '8px 10px', flex: 1 }}>
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to} to={to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, marginBottom: 2,
                  textDecoration: 'none', fontSize: 14, fontWeight: active ? 700 : 500,
                  color: active ? '#e2e8f0' : '#64748b',
                  background: active ? '#1e2d4a' : 'transparent',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <Icon size={16} color={active ? '#a855f7' : '#64748b'} />
                {label}
                {to === '/log' && (
                  <span style={{
                    marginLeft: 'auto', background: '#7c3aed', color: 'white',
                    fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 10,
                  }}>NOVO</span>
                )}
              </NavLink>
            );
          })}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e2d4a' }}>
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: '1px solid #ef444430', borderRadius: 8,
              padding: '8px 10px', cursor: 'pointer', color: '#64748b', fontSize: 12,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ef444415'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
          >
            <Trash2 size={13} />
            Zerar dados
          </button>
          <div style={{ marginTop: 8, fontSize: 10, color: '#1e2d4a', textAlign: 'center' }}>v1.0.0 · FitRPG</div>
        </div>
      </nav>

      {/* Confirm modal */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#111827', border: '1px solid #ef444440', borderRadius: 16,
            padding: 28, maxWidth: 360, width: '100%', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <button
              onClick={() => setShowConfirm(false)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
            >
              <X size={16} />
            </button>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>
              Zerar todos os dados?
            </h3>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: '#94a3b8' }}>
              Isso vai apagar <strong style={{ color: '#f1f5f9' }}>todos os treinos, recordes, XP e conquistas</strong>.
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b' }}>
              Os exercícios cadastrados serão mantidos, mas com nível e XP zerados.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={handleReset}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none',
                  background: '#ef4444', color: 'white', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Trash2 size={14} /> Sim, zerar tudo
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 8,
                  border: '1px solid #1e2d4a', background: 'transparent',
                  color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav (mobile) */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#0d1526', borderTop: '1px solid #1e2d4a',
        display: 'flex', zIndex: 50, padding: '6px 0',
      }}
        className="mobile-nav"
      >
        {NAV.slice(0, 5).map(({ to, icon: Icon, label }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to} to={to}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, textDecoration: 'none', fontSize: 10,
                color: active ? '#a855f7' : '#64748b',
                padding: '4px 0',
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
