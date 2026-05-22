import type { Achievement, WorkoutSession, MuscleGroup, Exercise, PersonalRecord } from '../types';

const ALL_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  { id: 'first_workout', title: 'Primeiro Passo', description: 'Registre seu primeiro treino', icon: '🏃' },
  { id: 'five_workouts', title: 'Aquecendo', description: 'Complete 5 treinos', icon: '🔥' },
  { id: 'twenty_workouts', title: 'Veterano', description: 'Complete 20 treinos', icon: '⚔️' },
  { id: 'fifty_workouts', title: 'Dedicado', description: 'Complete 50 treinos', icon: '🛡️' },
  { id: 'hundred_workouts', title: 'Lendário', description: 'Complete 100 treinos', icon: '👑' },
  { id: 'muscle_lvl5', title: 'Músculo Forte', description: 'Leve um músculo ao nível 5', icon: '💪' },
  { id: 'muscle_lvl10', title: 'Músculo Poderoso', description: 'Leve um músculo ao nível 10', icon: '🦾' },
  { id: 'exercise_lvl10', title: 'Mestre do Exercício', description: 'Leve um exercício ao nível 10', icon: '🎯' },
  { id: 'exercise_lvl15', title: 'Especialista', description: 'Leve um exercício ao nível 15', icon: '🏆' },
  { id: 'streak_7', title: 'Semana Perfeita', description: 'Treine 7 dias seguidos', icon: '📅' },
  { id: 'streak_30', title: 'Mês Consistente', description: 'Treine 30 dias seguidos', icon: '🗓️' },
  { id: 'first_pr', title: 'Novo Recorde!', description: 'Bata seu primeiro recorde pessoal', icon: '🎖️' },
  { id: 'ten_prs', title: 'Quebrador de Recordes', description: 'Bata 10 recordes pessoais', icon: '📈' },
  { id: 'all_muscles', title: 'Atleta Completo', description: 'Treine todos os grupos musculares em uma semana', icon: '🌟' },
  { id: 'all_muscles_lvl3', title: 'Equilíbrio Total', description: 'Todos os músculos no mínimo nível 3', icon: '⚖️' },
  { id: 'heavy_lifter', title: 'Força Bruta', description: 'Levante 100kg ou mais em um exercício', icon: '🏋️' },
  { id: 'volume_king', title: 'Rei do Volume', description: 'Faça mais de 5000kg de volume em uma sessão', icon: '📊' },
];

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function initAchievements(): Achievement[] {
  return ALL_ACHIEVEMENTS.map(a => ({ ...a }));
}

export function checkAchievements(
  existing: Achievement[],
  sessions: WorkoutSession[],
  muscles: MuscleGroup[],
  exercises: Exercise[],
  records: PersonalRecord[]
): Achievement[] {
  const updated = existing.map(a => ({ ...a }));
  const now = new Date().toISOString();

  function unlock(id: string) {
    const a = updated.find(x => x.id === id);
    if (a && !a.unlockedAt) a.unlockedAt = now;
  }

  // Workout count
  if (sessions.length >= 1) unlock('first_workout');
  if (sessions.length >= 5) unlock('five_workouts');
  if (sessions.length >= 20) unlock('twenty_workouts');
  if (sessions.length >= 50) unlock('fifty_workouts');
  if (sessions.length >= 100) unlock('hundred_workouts');

  // Muscle levels
  if (muscles.some(m => m.level >= 5)) unlock('muscle_lvl5');
  if (muscles.some(m => m.level >= 10)) unlock('muscle_lvl10');

  // Exercise levels
  if (exercises.some(e => e.level >= 10)) unlock('exercise_lvl10');
  if (exercises.some(e => e.level >= 15)) unlock('exercise_lvl15');

  // All muscles lvl 3
  if (muscles.every(m => m.level >= 3)) unlock('all_muscles_lvl3');

  // PRs
  const prCount = sessions.reduce((sum, s) => sum + s.entries.filter(e => e.isPR).length, 0);
  if (prCount >= 1) unlock('first_pr');
  if (prCount >= 10) unlock('ten_prs');

  // Heavy lifter
  const maxWeight = Math.max(0, ...records.map(r => r.maxWeight));
  if (maxWeight >= 100) unlock('heavy_lifter');

  // Volume king: one session with 5000+ kg total
  const hasVolumeSession = sessions.some(s =>
    s.entries.reduce((sum, e) => sum + e.sets.reduce((vs, set) => vs + set.weight * set.reps, 0), 0) >= 5000
  );
  if (hasVolumeSession) unlock('volume_king');

  // Streak 7 and 30
  const maxStreak = computeMaxStreak(sessions);
  if (maxStreak >= 7) unlock('streak_7');
  if (maxStreak >= 30) unlock('streak_30');

  // All muscles trained in one week
  if (sessions.length > 0) {
    const weekStart = getWeekStart(new Date(sessions[0].date));
    const weekSessions = sessions.filter(s => s.date >= weekStart);
    const trainedMuscleIds = new Set<string>();
    for (const s of weekSessions) {
      for (const e of s.entries) {
        const ex = exercises.find(x => x.id === e.exerciseId);
        if (ex) {
          trainedMuscleIds.add(ex.primaryMuscleId);
          ex.secondaryMuscles.forEach(sm => trainedMuscleIds.add(sm.muscleId));
        }
      }
    }
    if (trainedMuscleIds.size >= muscles.length) unlock('all_muscles');
  }

  return updated;
}

function computeMaxStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  const days = [...new Set(sessions.map(s => s.date.slice(0, 10)))].sort();
  let max = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 1;
    }
  }
  return max;
}
