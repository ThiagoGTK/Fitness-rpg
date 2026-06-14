import { useEffect, useRef } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useWeeklyStore } from '../store/weeklyStore';
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
  const { initialized: gameInitialized, loading: gameLoading, initData, clearData, user: gameUser } = useGameStore();
  const { initialized: weeklyInitialized, loading: weeklyLoading, initWeekly, clearWeekly } = useWeeklyStore();

  // Track which user's data is currently loaded
  const loadedUserId = useRef<string | null>(null);

  useEffect(() => {
    // 1. User logged out → wipe game + weekly state
    if (!authUser) {
      if (gameInitialized)   clearData();
      if (weeklyInitialized) clearWeekly();
      loadedUserId.current = null;
      return;
    }

    // 2. User ID changed (different account logged in) → wipe first, re-init next render
    if (loadedUserId.current !== null && loadedUserId.current !== authUser.id) {
      clearData();    // sets gameInitialized = false → triggers another render
      clearWeekly();  // sets weeklyInitialized = false
      loadedUserId.current = null;
      return;
    }

    // 3. Same user (or first login), data not yet loaded → fetch from DB
    if (!gameInitialized && !gameLoading) {
      loadedUserId.current = authUser.id;
      initData(authUser.id);
    }
    if (!weeklyInitialized && !weeklyLoading) {
      initWeekly(authUser.id);
    }
  }, [authUser, gameInitialized, gameLoading, weeklyInitialized, weeklyLoading]);

  // 1. Still establishing session
  if (!authInitialized || authLoading) return <LoadingScreen />;

  // 2. No session → go to login
  if (!authUser) return <Navigate to="/login" replace />;

  // 3. Game data loading
  if (!gameInitialized || gameLoading) return <LoadingScreen />;

  // 4. Force password change for accounts created by admin/trainer
  if (gameUser.mustChangePassword) return <Navigate to="/change-password" replace />;

  // 5. Profile incomplete → onboarding (birth date + sex) — skip for admin/trainer
  if (gameUser.role === 'student' && (!gameUser.birthDate || !gameUser.sex)) return <ProfileSetupPage />;

  // 6. All good — render app shell
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
