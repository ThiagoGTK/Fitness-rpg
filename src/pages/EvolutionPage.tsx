import { TrendingUp, Hammer } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { calcVolume } from '../services/xpCalculator';

// Temporary: this area is being built out for paid plans later.
// For now only the owner account can see real content.
const OWNER_EMAIL = 'thiago.gaitkoski@gmail.com';

export function EvolutionPage() {
  const { user: authUser } = useAuthStore();
  const { workouts } = useGameStore();
  const isOwner = authUser?.email === OWNER_EMAIL;

  if (!isOwner) {
    return (
      <div className="page-wrap fade-in-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="game-card" style={{ padding: 40, textAlign: 'center', maxWidth: 420 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: '#7c3aed20',
            display: 'grid', placeItems: 'center', margin: '0 auto 18px', color: '#a855f7',
          }}>
            <Hammer size={28} />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: '#f1f5f9' }}>
            Funcionalidade em construção
          </h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
            Estamos preparando gráficos de evolução e desempenho para você acompanhar seu progresso de pertinho. Em breve por aqui!
          </p>
        </div>
      </div>
    );
  }

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = Date.now() - i * 7 * 86400000;
    const start = end - 7 * 86400000;
    const inRange = workouts.filter(w => {
      const t = new Date(w.date).getTime();
      return t > start && t <= end;
    });
    const volume = inRange.reduce((sum, w) => sum + w.entries.reduce((s, e) => s + calcVolume(e.sets), 0), 0);
    const xp = inRange.reduce((sum, w) => sum + w.totalXP, 0);
    return { label: i === 0 ? 'Atual' : `-${i}sem`, volume, xp };
  }).reverse();

  const maxVolume = Math.max(...weeks.map(w => w.volume), 1);
  const maxXP = Math.max(...weeks.map(w => w.xp), 1);

  return (
    <div className="page-wrap fade-in-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={24} color="#a855f7" /> Evolução
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
          Acompanhe seu desempenho e progresso ao longo do tempo
        </p>
      </div>

      <div className="grid-cards">
        <div className="game-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Volume por semana (kg)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
            {weeks.map((w, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: '100%', borderRadius: '6px 6px 0 0',
                    background: 'linear-gradient(180deg, #a855f7, #7c3aed)',
                    height: `${Math.max((w.volume / maxVolume) * 130, 2)}px`,
                  }}
                  title={`${w.volume.toLocaleString()} kg`}
                />
                <span style={{ fontSize: 10, color: '#64748b' }}>{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="game-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>XP por semana</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
            {weeks.map((w, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: '100%', borderRadius: '6px 6px 0 0',
                    background: 'linear-gradient(180deg, #eab308, #f97316)',
                    height: `${Math.max((w.xp / maxXP) * 130, 2)}px`,
                  }}
                  title={`${w.xp} XP`}
                />
                <span style={{ fontSize: 10, color: '#64748b' }}>{w.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
