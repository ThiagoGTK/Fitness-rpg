import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Dashboard } from './pages/Dashboard';
import { MusclesPage } from './pages/MusclesPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { WorkoutLogPage } from './pages/WorkoutLogPage';
import { HistoryPage } from './pages/HistoryPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { RecordsPage } from './pages/RecordsPage';
import { useAuthStore } from './store/authStore';

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <BrowserRouter>
      <style>{`
        /* ── Breakpoints ─────────────────────────────────── */
        @media (min-width: 768px) {
          .desktop-nav    { display: flex !important; }
          .mobile-nav     { display: none !important; }
          .mobile-header  { display: none !important; }
          .app-layout     { flex-direction: row !important; }
          .main-content   { padding-bottom: 0 !important; padding-top: 0 !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav    { display: none !important; }
          .mobile-nav     { display: flex !important; }
          .mobile-header  { display: flex !important; }
          .main-content   { padding-top: 52px !important; }
        }

        /* ── Mobile top header ───────────────────────────── */
        .mobile-header {
          position: fixed; top: 0; left: 0; right: 0; height: 52px;
          background: #0d1526; border-bottom: 1px solid #1e2d4a;
          z-index: 60; align-items: center; padding: 0 14px;
          justify-content: space-between;
        }

        /* ── Page wrapper ────────────────────────────────── */
        .page-wrap {
          padding: 16px;
          max-width: 1100px;
          margin: 0 auto;
        }
        @media (min-width: 640px)  { .page-wrap { padding: 20px; } }
        @media (min-width: 1024px) { .page-wrap { padding: 24px 20px; } }

        /* ── Stats row: 2-col mobile → 4-col sm ─────────── */
        .grid-stat {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        @media (min-width: 540px) {
          .grid-stat { grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
        }

        /* ── Summary: 2-col mobile → auto sm ─────────────── */
        .grid-summary {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        @media (min-width: 540px) {
          .grid-summary { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
        }

        /* ── Main cards: 1-col mobile → 2-col sm → auto lg ─ */
        .grid-cards {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 640px) {
          .grid-cards { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .grid-cards { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        }

        /* ── Item grids (achievements, exercises) ─────────── */
        .grid-items {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 480px) {
          .grid-items { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
        }

        .grid-exercises {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 480px) {
          .grid-exercises { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
        }

        /* ── Filter row ──────────────────────────────────── */
        .filter-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .filter-row .game-input { min-width: 0; flex: 1; }
        @media (min-width: 640px) { .filter-row { margin-bottom: 20px; } }

        /* ── Body map: stacked mobile → side-by-side sm ──── */
        .bodymap-views {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        @media (min-width: 520px) {
          .bodymap-views { flex-direction: row; justify-content: center; gap: 24px; }
        }
        .bodymap-divider { display: none; }
        @media (min-width: 520px) {
          .bodymap-divider {
            display: block; width: 1px;
            background: #1e2d4a; align-self: stretch; flex-shrink: 0;
          }
        }
        .bodymap-svg { width: 140px; height: 287px; }
        @media (min-width: 400px) { .bodymap-svg { width: 160px; height: 328px; } }
        @media (min-width: 520px) { .bodymap-svg { width: 170px; height: 349px; } }

        /* ── Records responsive row ──────────────────────── */
        .records-stats { display: flex; gap: 10px; flex-wrap: wrap; flex: 1; }
        .records-stat  { text-align: center; min-width: 64px; }

        /* ── Level card inner layout ─────────────────────── */
        .level-card-inner { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }

        /* ── Muscle body overview wrap ───────────────────── */
        .muscle-overview { display: flex; flex-wrap: wrap; gap: 8px; }

        /* ── Touch targets ───────────────────────────────── */
        @media (max-width: 767px) {
          .btn-primary, .btn-secondary, .btn-danger {
            padding: 11px 18px;
            font-size: 15px;
          }
          .game-input {
            padding: 11px 14px;
            font-size: 16px; /* prevents iOS zoom */
          }
        }

        /* ── Spin animation (used in auth forms) ─────────── */
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <Routes>
        {/* Public routes — no navigation */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes — wrapped in AuthGuard (handles auth check + app shell) */}
        <Route element={<AuthGuard />}>
          <Route path="/"             element={<Dashboard />} />
          <Route path="/muscles"      element={<MusclesPage />} />
          <Route path="/exercises"    element={<ExercisesPage />} />
          <Route path="/log"          element={<WorkoutLogPage />} />
          <Route path="/history"      element={<HistoryPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/records"      element={<RecordsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
