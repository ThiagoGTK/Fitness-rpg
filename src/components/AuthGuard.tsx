import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { Navigation } from './Navigation';
import { LevelUpModal } from './ui/LevelUpModal';
import { ProfileSetupPage } from '../pages/ProfileSetupPage';

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#060913', flexDirection: 'column', gap: 10,
    }}>
      <style>{`
        @keyframes auth-bar {
          0%   { transform: translateX(-150%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
      <div style={{ fontSize: 52 }}>⚔️</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: 1 }}>FitRPG</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Carregando dados...</div>
      <div style={{
        width: 160, height: 3, background: '#1e2d4a', borderRadius: 2,
        overflow: 'hidden', marginTop: 12,
      }}>
        <div style={{
          height: '100%', width: '50%',
          background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
          borderRadius: 2,
          animation: 'auth-bar 1.2s ease-in-out infinite',
        }} />
      </div>
    </div>
  );
}

export function AuthGuard() {
  const { user: authUser, loading: authLoading, initialized: authInitialized } = useAuthStore();
  const { initialized: gameInitialized, loading: gameLoading, initData, user: gameUser } = useGameStore();

  // Load game data when a user is authenticated
  useEffect(() => {
    if (authUser && !gameInitialized && !gameLoading) {
      initData(authUser.id);
    }
  }, [authUser, gameInitialized, gameLoading]);

  // 1. Still establishing session
  if (!authInitialized || authLoading) return <LoadingScreen />;

  // 2. No session → go to login
  if (!authUser) return <Navigate to="/login" replace />;

  // 3. Game data loading
  if (!gameInitialized || gameLoading) return <LoadingScreen />;

  // 4. Profile incomplete → onboarding (birth date + sex)
  if (!gameUser.birthDate || !gameUser.sex) return <ProfileSetupPage />;

  // 5. All good — render app shell
  return (
    <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navigation />
      <main
        className="main-content"
        style={{ flex: 1, overflowY: 'auto', paddingBottom: 70, background: '#060913' }}
      >
        <Outlet />
      </main>
      <LevelUpModal />
    </div>
  );
}
