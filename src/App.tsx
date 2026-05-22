import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { LevelUpModal } from './components/ui/LevelUpModal';
import { Dashboard } from './pages/Dashboard';
import { MusclesPage } from './pages/MusclesPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { WorkoutLogPage } from './pages/WorkoutLogPage';
import { HistoryPage } from './pages/HistoryPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { RecordsPage } from './pages/RecordsPage';

export default function App() {
  return (
    <BrowserRouter>
      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .mobile-nav { display: none !important; }
          .app-layout { flex-direction: row !important; }
          .main-content { padding-bottom: 0 !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .mobile-nav { display: flex !important; }
        }
      `}</style>

      <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navigation />
        <main className="main-content" style={{
          flex: 1, overflowY: 'auto', paddingBottom: 70,
          background: '#060913',
        }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/muscles" element={<MusclesPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/log" element={<WorkoutLogPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/records" element={<RecordsPage />} />
          </Routes>
        </main>
      </div>

      <LevelUpModal />
    </BrowserRouter>
  );
}
