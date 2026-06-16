import { useGameStore } from '../store/gameStore';
import { LevelBadge } from '../components/ui/LevelBadge';
import { XPBar } from '../components/ui/XPBar';
import { xpForMuscleLevel, xpForUserLevel } from '../services/levelCalculator';
import { calcVolume } from '../services/xpCalculator';
import { Zap, Flame, Trophy, Calendar, TrendingUp, Star, Dumbbell, Clock, Trash2, ClipboardList } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { BodyMap } from '../components/BodyMap';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TodayPlanExercise {
  id: string;
  exercise_name: string;
  primary_muscle_id: string;
  secondary_muscles: { muscleId: string; xpPercentage: number }[];
  exercise_type: string;
  sets: number;
  reps: number;
  weight: number;
  rest_seconds: number | null;
  notes: string;
  order_index: number;
}

interface TodayPlan {
  id: string;
  plan_name: string;
  notes: string;
  trainer_plan_exercises: TodayPlanExercise[];
}

function StatCard({ icon, label, value, color = '#a855f7', sub }: {
  icon: React.ReactNode; label: string; value: string | number; color?: string; sub?: string;
}) {
  return (
    <div className="game-card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}20`, border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function Dashboard() {
  const { user, muscles, exercises, workouts, achievements, cleanReset } = useGameStore();
  const navigate = useNavigate();
  const [showReset, setShowReset]   = useState(false);
  const [resetting, setResetting]   = useState(false);
  const [todayPlans, setTodayPlans] = useState<TodayPlan[]>([]);

  useEffect(() => {
    if (user.role !== 'student') return;
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) return;
      const todayIdx = new Date().getDay();
      supabase
        .from('trainer_plans')
        .select('id, plan_name, notes, scheduled_date, trainer_plan_exercises(id, exercise_name, primary_muscle_id, secondary_muscles, exercise_type, sets, reps, weight, rest_seconds, notes, order_index)')
        .eq('student_id', authUser.id)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          if (!data) return;
          const filtered = (data as TodayPlan[]).filter(p => {
            const raw = (p as unknown as { scheduled_date?: string }).scheduled_date;
            if (!raw) return false;
            return raw.split(',').map(Number).includes(todayIdx);
          });
          setTodayPlans(filtered);
        });
    });
  }, [user.role]);

  const sortedMuscles = [...muscles].sort((a, b) => b.totalXPEarned - a.totalXPEarned);
  const topMuscles = sortedMuscles.slice(0, 4);
  const weakestMuscles = [...muscles].sort((a, b) => a.totalXPEarned - b.totalXPEarned).slice(0, 3);
  const topExercises = [...exercises].sort((a, b) => b.level - a.level || b.timesPerformed - a.timesPerformed).slice(0, 4);
  const recentWorkouts = workouts.slice(0, 3);
  const unlockedCount = achievements.filter(a => a.unlockedAt).length;

  const userXPRequired = xpForUserLevel(user.level);
  const userXPCurrent = user.totalXP - (() => {
    let acc = 0; let lv = 1;
    while (lv < user.level) { acc += xpForUserLevel(lv); lv++; }
    return acc;
  })();

  function formatDate(iso: string) {
    try {
      const d = parseISO(iso);
      if (!isValid(d)) return iso;
      return format(d, "dd 'de' MMM", { locale: ptBR });
    } catch { return iso; }
  }

  return (
    <div className="page-wrap fade-in-up">
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, marginBottom: 20,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#f1f5f9' }}>
            Olá, {user.name}! 👋
          </h1>
          <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 13 }}>
            Continue evoluindo seus treinos
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/log')}>
          <Dumbbell size={16} /> Registrar Treino
        </button>
      </div>

      {/* Today's plan — students only */}
      {todayPlans.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {todayPlans.map(plan => (
            <div key={plan.id} className="game-card" style={{
              padding: '18px 20px',
              background: 'linear-gradient(135deg, #111827 0%, #0f1f35 100%)',
              border: '1px solid #0ea5e940',
              marginBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: '#0ea5e920', display: 'grid', placeItems: 'center', color: '#0ea5e9', flexShrink: 0 }}>
                    <ClipboardList size={17} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Treino de hoje</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>{plan.plan_name}</div>
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => navigate('/log', { state: { fromPlan: plan.trainer_plan_exercises } })}
                  style={{ fontSize: 13 }}
                >
                  <Dumbbell size={14} /> Registrar treino
                </button>
              </div>

              {plan.notes && (
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, paddingLeft: 2 }}>{plan.notes}</div>
              )}

              <div style={{ display: 'grid', gap: 8 }}>
                {[...plan.trainer_plan_exercises]
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((ex, i) => (
                    <div key={ex.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 8, background: '#0d1526',
                      border: '1px solid #1e2d4a',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#475569', width: 18, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ex.exercise_name || 'Exercício'}
                        </div>
                        {ex.notes && <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{ex.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, color: '#a855f7', fontWeight: 700, background: '#7c3aed15', padding: '3px 8px', borderRadius: 6 }}>
                          {ex.sets}×{ex.reps}
                        </span>
                        {ex.weight > 0 ? (
                          <span style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 700, background: '#0ea5e915', padding: '3px 8px', borderRadius: 6 }}>
                            {ex.weight}kg
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#f97316', fontWeight: 700, background: '#f9731615', padding: '3px 8px', borderRadius: 6 }}>
                            Peso livre
                          </span>
                        )}
                        {ex.rest_seconds && (
                          <span style={{ fontSize: 11, color: '#64748b', padding: '3px 8px', borderRadius: 6, background: '#1e2d4a' }}>
                            {ex.rest_seconds}s
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User level card */}
      <div className="game-card" style={{
        padding: '16px', marginBottom: 16,
        background: 'linear-gradient(135deg, #111827 0%, #1a1033 100%)',
        border: '1px solid #7c3aed40',
      }}>
        <div className="level-card-inner">
          <LevelBadge level={user.level} size="lg" glow />
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>Nível {user.level}</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{user.totalXP.toLocaleString()} XP</span>
            </div>
            <XPBar current={userXPCurrent} required={userXPRequired} showLabel animated />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
              {userXPRequired - userXPCurrent} XP para nível {user.level + 1}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {user.streak > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20 }}>🔥</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#f97316' }}>{user.streak}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>streak</div>
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20 }}>🏋️</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#a855f7' }}>{workouts.length}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>treinos</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20 }}>🏆</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#eab308' }}>{unlockedCount}/{achievements.length}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>conquistas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid-stat">
        <StatCard icon={<Zap size={16} />} label="XP essa semana" value={`${user.weeklyXP.toLocaleString()} XP`} color="#eab308" />
        <StatCard icon={<Flame size={16} />} label="Maior streak" value={`${user.longestStreak} dias`} color="#f97316" />
        <StatCard icon={<Trophy size={16} />} label="Conquistas" value={`${unlockedCount}/${achievements.length}`} color="#eab308" />
        <StatCard icon={<Calendar size={16} />} label="Treinos" value={workouts.length} color="#06b6d4" />
      </div>

      {/* Body map */}
      <div className="game-card" style={{ padding: '16px', marginBottom: 16 }}>
        <BodyMap />
      </div>

      <div className="grid-cards">
        {/* Top muscles */}
        <div className="game-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
              💪 Músculos mais fortes
            </h3>
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate('/muscles')}>Ver todos</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topMuscles.map(m => {
              const req = xpForMuscleLevel(m.level);
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{m.name}</span>
                      <span style={{ color: '#64748b', fontSize: 12 }}>Lv {m.level}</span>
                    </div>
                    <XPBar current={m.currentXP} required={req} color={m.color} animated={false} />
                  </div>
                  <LevelBadge level={m.level} size="sm" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Top exercises */}
        <div className="game-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
              🏋️ Top Exercícios
            </h3>
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate('/exercises')}>Ver todos</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topExercises.map((ex, i) => (
              <div key={ex.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, background: '#0d1526',
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#64748b', width: 16 }}>#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{ex.timesPerformed}× realizado</div>
                </div>
                <LevelBadge level={ex.level} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent workouts */}
        <div className="game-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
              📋 Treinos recentes
            </h3>
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate('/history')}>Ver todos</button>
          </div>
          {recentWorkouts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 20, fontSize: 14 }}>
              Nenhum treino ainda. <br />
              <button className="btn-primary" style={{ marginTop: 12, fontSize: 13 }} onClick={() => navigate('/log')}>
                Registrar primeiro treino
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentWorkouts.map(w => {
                const totalVol = w.entries.reduce((s, e) => s + calcVolume(e.sets), 0);
                return (
                  <div key={w.id} style={{
                    padding: '10px 12px', borderRadius: 8, background: '#0d1526',
                    border: '1px solid #1e2d4a',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                        {w.entries.length} exercício{w.entries.length !== 1 ? 's' : ''}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {formatDate(w.date)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ fontSize: 11, color: '#eab308' }}>⚡ +{w.totalXP} XP</span>
                      {totalVol > 0 && <span style={{ fontSize: 11, color: '#64748b' }}>📦 {totalVol.toLocaleString()} kg</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weakest muscles */}
        <div className="game-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
              ⚠️ Músculos atrasados
            </h3>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b' }}>
            Treinar esses grupos vai equilibrar seu desenvolvimento.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {weakestMuscles.map(m => {
              const req = xpForMuscleLevel(m.level);
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{m.name}</span>
                      <span style={{ fontSize: 12, color: '#ef4444' }}>Lv {m.level}</span>
                    </div>
                    <XPBar current={m.currentXP} required={req} color="#ef4444" animated={false} />
                  </div>
                </div>
              );
            })}
          </div>
          <button className="btn-primary" style={{ width: '100%', marginTop: 14, justifyContent: 'center' }} onClick={() => navigate('/log')}>
            <TrendingUp size={15} /> Treinar agora
          </button>
        </div>

        {/* Recent achievements */}
        {achievements.filter(a => a.unlockedAt).length > 0 && (
          <div className="game-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
                🏆 Conquistas recentes
              </h3>
              <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate('/achievements')}>Ver todas</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {achievements.filter(a => a.unlockedAt).slice(0, 6).map(a => (
                <div key={a.id} style={{
                  padding: '6px 10px', borderRadius: 8,
                  background: '#1a1a2e', border: '1px solid #eab30840',
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                }}>
                  <span>{a.icon}</span>
                  <span style={{ color: '#e2e8f0', fontSize: 12 }}>{a.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="game-card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
            <Star size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: '#eab308' }} />
            Visão geral
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Total de XP ganho', value: `${user.totalXP.toLocaleString()} XP`, color: '#eab308' },
              { label: 'Exercícios cadastrados', value: exercises.length, color: '#a855f7' },
              { label: 'Músculos treinados', value: muscles.filter(m => m.totalXPEarned > 0).length + '/' + muscles.length, color: '#10b981' },
              { label: 'Nível médio dos músculos', value: (muscles.reduce((s, m) => s + m.level, 0) / muscles.length).toFixed(1), color: '#06b6d4' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reset button */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <button
          onClick={() => setShowReset(true)}
          style={{
            background: 'none', border: '1px solid #ef444430', borderRadius: 8,
            padding: '8px 16px', cursor: 'pointer', color: '#475569', fontSize: 12,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <Trash2 size={12} /> Zerar dados
        </button>
      </div>

      {/* Reset confirm modal */}
      {showReset && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: '#111827', border: '1px solid #ef444440', borderRadius: 16,
            padding: 28, maxWidth: 360, width: '100%', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>
              Zerar todos os dados?
            </h3>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: '#94a3b8' }}>
              Apaga <strong style={{ color: '#f1f5f9' }}>treinos, recordes, XP e conquistas</strong>.
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b' }}>
              Os exercícios são mantidos, mas com nível e XP zerados.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={async () => {
                  setResetting(true);
                  await cleanReset();
                  setResetting(false);
                  setShowReset(false);
                }}
                disabled={resetting}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8, border: 'none',
                  background: '#ef4444', color: 'white', fontWeight: 700, fontSize: 14,
                  cursor: resetting ? 'not-allowed' : 'pointer', opacity: resetting ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {resetting
                  ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Zerando...</>
                  : <><Trash2 size={14} /> Sim, zerar tudo</>
                }
              </button>
              <button
                onClick={() => setShowReset(false)}
                disabled={resetting}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
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
    </div>
  );
}
