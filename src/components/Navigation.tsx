import { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Dumbbell, List, PlusCircle, History,
  Trophy, Target, CalendarDays, Zap, LogOut, User, UserPlus, Shield, TrendingUp,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { LevelBadge } from './ui/LevelBadge';

const NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/muscles',     icon: Dumbbell,        label: 'Músculos'  },
  { to: '/exercises',   icon: List,            label: 'Exercícios'},
  { to: '/log',         icon: PlusCircle,      label: 'Treinar'   },
  { to: '/history',     icon: History,         label: 'Histórico' },
  { to: '/achievements',icon: Trophy,          label: 'Conquistas'},
  { to: '/records',     icon: Target,          label: 'Recordes'  },
  { to: '/weekly',      icon: CalendarDays,    label: 'Semanal'   },
  { to: '/evolution',   icon: TrendingUp,      label: 'Evolução'  },
];

export function Navigation() {
  const { user, clearData } = useGameStore();
  const { signOut } = useAuthStore();
  const location    = useLocation();
  const trainerItem = { to: '/trainer', icon: UserPlus, label: 'Personal' };
  const adminItem   = { to: '/admin',   icon: Shield,   label: 'Admin' };
  const navItems =
    user.role === 'admin'   ? [...NAV, trainerItem, adminItem] :
    user.role === 'trainer' ? [...NAV, trainerItem] :
    NAV;
  // Mobile bottom bar drops less-frequent items (moved into the Profile page)
  // to keep the icons from getting cramped on small screens.
  const mobileNavItems = navItems.filter(item => item.to !== '/achievements' && item.to !== '/records' && item.to !== '/muscles');

  const [showLogout,   setShowLogout]   = useState(false);
  const [loggingOut,   setLoggingOut]   = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    clearData();
    await signOut();
    // AuthGuard will redirect to /login automatically
  }

  return (
    <>
      {/* ── Mobile top header ─────────────────────────────────────── */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>⚔️</span>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#e2e8f0' }}>FitRPG</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user.name && (
            <Link
              to="/profile"
              style={{
                fontSize: 12, color: '#e2e8f0', maxWidth: 100,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textDecoration: 'none',
              }}
            >
              {user.name}
            </Link>
          )}
          <Link
            to="/profile"
            style={{
              background: 'none', border: '1px solid #1e2d4a', borderRadius: 8,
              padding: '5px 8px', color: '#64748b',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
            }}
            title="Meu Perfil"
          >
            <User size={14} />
          </Link>
          <button
            onClick={() => setShowLogout(true)}
            style={{
              background: 'none', border: '1px solid #1e2d4a', borderRadius: 8,
              padding: '5px 8px', cursor: 'pointer', color: '#64748b',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
            }}
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* ── Desktop sidebar ───────────────────────────────────────── */}
      <nav
        className="desktop-nav"
        style={{
          width: 220, flexShrink: 0, background: '#0d1526',
          borderRight: '1px solid #1e2d4a', display: 'flex', flexDirection: 'column',
          position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
        }}
      >
        {/* Logo + user profile */}
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #1e2d4a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>⚔️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#e2e8f0' }}>FitRPG</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Gym Level Up</div>
            </div>
          </div>

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
            <Link
              to="/profile"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                marginTop: 8, fontSize: 11, color: '#7c3aed',
                textDecoration: 'none', fontWeight: 600,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#a855f7')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#7c3aed')}
            >
              <User size={11} /> Ver perfil →
            </Link>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ padding: '8px 10px', flex: 1 }}>
          {navItems.map(({ to, icon: Icon, label }) => {
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
              </NavLink>
            );
          })}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e2d4a', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => setShowLogout(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: '1px solid #1e2d4a', borderRadius: 8,
              padding: '7px 10px', cursor: 'pointer', color: '#64748b', fontSize: 12,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1e2d4a20'; (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
          >
            <LogOut size={13} /> Sair da conta
          </button>

          <div style={{ marginTop: 4, fontSize: 10, color: '#1e2d4a', textAlign: 'center' }}>v1.0.0 · FitRPG</div>
        </div>
      </nav>

      {/* ── Logout confirm modal ──────────────────────────────────── */}
      {showLogout && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#111827', border: '1px solid #1e2d4a', borderRadius: 16,
            padding: 28, maxWidth: 340, width: '100%', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>👋</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>
              Sair da conta?
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b' }}>
              Seu progresso fica salvo na nuvem. É só entrar de novo!
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  color: 'white', fontWeight: 700, fontSize: 14,
                  cursor: loggingOut ? 'not-allowed' : 'pointer', opacity: loggingOut ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {loggingOut
                  ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Saindo...</>
                  : <><LogOut size={14} /> Sim, sair</>
                }
              </button>
              <button
                onClick={() => setShowLogout(false)}
                disabled={loggingOut}
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

      {/* ── Mobile bottom nav ─────────────────────────────────────── */}
      <nav
        className="mobile-nav"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#0d1526', borderTop: '1px solid #1e2d4a',
          display: 'flex', zIndex: 50, padding: '4px 0',
          overflowX: 'auto',
        }}
      >
        {mobileNavItems.map(({ to, icon: Icon, label }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to} to={to}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 1, textDecoration: 'none', fontSize: 9, fontWeight: active ? 700 : 400,
                color: active ? '#a855f7' : '#475569',
                padding: '5px 2px',
                borderTop: active ? '2px solid #a855f7' : '2px solid transparent',
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
