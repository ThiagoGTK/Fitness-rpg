import type { WorkoutEntryInput, WorkoutSet, WorkoutSession, Exercise } from '../types';

export function calcVolume(sets: WorkoutSet[]): number {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function calcTotalReps(sets: WorkoutSet[]): number {
  return sets.reduce((sum, s) => sum + s.reps, 0);
}

export function calcMaxWeight(sets: WorkoutSet[]): number {
  return Math.max(0, ...sets.map(s => s.weight));
}

function getPreviousMaxVolume(exerciseId: string, sessions: WorkoutSession[]): number {
  let max = 0;
  for (const s of sessions) {
    for (const e of s.entries) {
      if (e.exerciseId === exerciseId) {
        const vol = calcVolume(e.sets);
        if (vol > max) max = vol;
      }
    }
  }
  return max;
}

function getPreviousMaxWeight(exerciseId: string, sessions: WorkoutSession[]): number {
  let max = 0;
  for (const s of sessions) {
    for (const e of s.entries) {
      if (e.exerciseId === exerciseId) {
        const w = calcMaxWeight(e.sets);
        if (w > max) max = w;
      }
    }
  }
  return max;
}

export interface XPResult {
  exerciseXP: number;
  muscleXPMap: Record<string, number>;
  isPR: boolean;
}

export function calculateEntryXP(
  entry: WorkoutEntryInput,
  exercise: Exercise,
  previousSessions: WorkoutSession[]
): XPResult {
  const volume = calcVolume(entry.sets);
  const totalReps = calcTotalReps(entry.sets);
  const numSets = entry.sets.length;

  // Base XP: weighted uses volume/10, bodyweight uses reps×1.5
  let baseXP: number;
  if (volume > 0) {
    baseXP = Math.floor(volume / 10);
  } else {
    baseXP = Math.floor(totalReps * 1.5);
  }
  // Floor so every set gives at least 3 XP
  baseXP = Math.max(baseXP, numSets * 3);

  // Difficulty multiplier: difficulty 1 → 0.76, difficulty 10 → 1.36
  const diffMult = 0.7 + (entry.difficulty / 10) * 0.66;

  // PR bonus: 50% extra if new volume record
  const prevMaxVolume = getPreviousMaxVolume(exercise.id, previousSessions);
  const prevMaxWeight = getPreviousMaxWeight(exercise.id, previousSessions);
  const currentMaxWeight = calcMaxWeight(entry.sets);
  const isPR =
    (volume > 0 && volume > prevMaxVolume) ||
    (currentMaxWeight > 0 && currentMaxWeight > prevMaxWeight);
  const prBonus = isPR ? Math.floor(baseXP * 0.5) : 0;

  const exerciseXP = Math.floor(baseXP * diffMult) + prBonus;

  // Distribute to muscles (primaryMuscleId may be empty for cardio exercises)
  const muscleXPMap: Record<string, number> = {};
  if (exercise.primaryMuscleId) muscleXPMap[exercise.primaryMuscleId] = exerciseXP;
  for (const sm of exercise.secondaryMuscles) {
    muscleXPMap[sm.muscleId] = Math.floor(exerciseXP * sm.xpPercentage / 100);
  }

  return { exerciseXP, muscleXPMap, isPR };
}
