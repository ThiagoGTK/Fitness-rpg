import { TrendingUp, Hammer, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { calcVolume } from '../services/xpCalculator';
import type { Exercise, WorkoutSession } from '../types';

// Temporary: this area is being built out for paid plans later.
// For now only the owner account can see real content.
const OWNER_EMAIL = 'thiago.gaitkoski@gmail.com';

interface ExerciseProgress {
  exerciseName: string;
  firstDate: string; firstWeight: number; firstReps: number; firstSets: number;
  lastDate: string;  lastWeight: number;  lastReps: number;  lastSets: number;
}

function buildExerciseProgress(workouts: WorkoutSession[], exercises: Exercise[]): ExerciseProgress[] {
  const byExercise = new Map<string, { date: string; weight: number; reps: number; sets: number }[]>();

  for (const w of workouts) {
    for (const e of w.entries) {
      if (e.sets.length === 0) continue;
      const weight = Math.max(...e.sets.map(s => s.weight));
      const reps = Math.round(e.sets.reduce((sum, s) => sum + s.reps, 0) / e.sets.length);
      const arr = byExercise.get(e.exerciseId) ?? [];
      arr.push({ date: w.date, weight, reps, sets: e.sets.length });
      byExercise.set(e.exerciseId, arr);
    }
  }

  const result: ExerciseProgress[] = [];
  byExercise.forEach((entries, exerciseId) => {
    if (entries.length < 2) return;
    entries.sort((a, b) => a.date.localeCompare(b.date));
    const first = entries[0];
    const last = entries[entries.length - 1];
    const exerciseName = exercises.find(ex => ex.id === exerciseId)?.name ?? 'Exercício';
    result.push({
      exerciseName,
      firstDate: first.date, firstWeight: first.weight, firstReps: first.reps, firstSets: first.sets,
      lastDate: last.date,   lastWeight: last.weight,   lastReps: last.reps,   lastSets: last.sets,
    });
  });

  return result.sort((a, b) => (b.lastWeight - b.firstWeight) - (a.lastWeight - a.firstWeight));
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function WeightDelta({ first, last }: { first: number; last: number }) {
  const diff = last - first;
  if (diff === 0) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: '#64748b' }}><Minus size={12} /> 0kg</span>;
  }
  const up = diff > 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: up ? '#10b981' : '#ef4444' }}>
      {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {up ? '+' : ''}{diff}kg
    </span>
  );
}

export function EvolutionPage() {
  const { user: authUser } = useAuthStore();
  const { workouts, exercises } = useGameStore();
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
  const exerciseProgress = buildExerciseProgress(workouts, exercises);

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

      <div className="game-card" style={{ padding: 20, marginTop: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Evolução de força por exercício</h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
          Comparando o primeiro registro com o mais recente — carga, repetições e séries.
        </p>

        {exerciseProgress.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 14 }}>
            Registre o mesmo exercício em pelo menos 2 treinos diferentes para ver a evolução aqui.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 0.8fr', gap: 10, fontSize: 11, color: '#64748b', padding: '0 4px' }}>
              <span>Exercício</span>
              <span>Primeiro registro</span>
              <span>Mais recente</span>
              <span>Δ Carga</span>
            </div>

            {exerciseProgress.map((p, i) => (
              <div key={i} className="game-card" style={{
                padding: '12px 14px', display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1fr 0.8fr', gap: 10, alignItems: 'center',
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{p.exerciseName}</div>
                <div>
                  <div style={{ fontSize: 13, color: '#e2e8f0' }}>{p.firstWeight}kg × {p.firstReps} reps · {p.firstSets} séries</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{formatShortDate(p.firstDate)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{p.lastWeight}kg × {p.lastReps} reps · {p.lastSets} séries</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{formatShortDate(p.lastDate)}</div>
                </div>
                <WeightDelta first={p.firstWeight} last={p.lastWeight} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
