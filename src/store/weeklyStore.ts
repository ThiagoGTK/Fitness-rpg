import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { calculateEntryXP } from '../services/xpCalculator';
import { useGameStore } from './gameStore';
import type { SecondaryMuscle, WorkoutEntryInput, WorkoutSet } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface WeeklyPlanExercise {
  id: string;
  planId: string;
  exerciseId: string | null;    // null = free-form (match by name at completion time)
  exerciseName: string;
  primaryMuscleId: string;
  secondaryMuscles: SecondaryMuscle[];
  exerciseType: string;
  sets: number;
  reps: number;
  weight: number;
  restSeconds: number | null;
  notes: string;
  orderIndex: number;
}

export interface WeeklyPlan {
  id: string;
  dayOfWeek: number;            // 0 = Monday … 6 = Sunday
  workoutName: string;
  isRestDay: boolean;
  notes: string;
  lastCompletedDate: string | null; // YYYY-MM-DD
  exercises: WeeklyPlanExercise[];
}

export interface ExerciseInput {
  exerciseId: string | null;
  exerciseName: string;
  primaryMuscleId: string;
  secondaryMuscles: SecondaryMuscle[];
  exerciseType: string;
  sets: number;
  reps: number;
  weight: number;
  restSeconds: number | null;
  notes: string;
}

export interface UpsertDayData {
  workoutName: string;
  isRestDay: boolean;
  notes: string;
  exercises: ExerciseInput[];
}

export interface CompleteDayResult {
  xpTotal: number;
  xpByMuscle: Record<string, number>;
  alreadyDone: boolean;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

interface WeeklyStore {
  plans: WeeklyPlan[];
  loading: boolean;
  initialized: boolean;

  initWeekly: (userId: string) => Promise<void>;
  clearWeekly: () => void;
  upsertDay: (dayOfWeek: number, data: UpsertDayData) => Promise<void>;
  deleteDay: (dayOfWeek: number) => Promise<void>;
  completeDay: (dayOfWeek: number) => Promise<CompleteDayResult>;
}

function mapExerciseRow(e: Record<string, unknown>): WeeklyPlanExercise {
  return {
    id: e.id as string,
    planId: e.plan_id as string,
    exerciseId: (e.exercise_id as string | null) ?? null,
    exerciseName: (e.exercise_name as string) ?? '',
    primaryMuscleId: (e.primary_muscle_id as string) ?? '',
    secondaryMuscles: (e.secondary_muscles as SecondaryMuscle[]) ?? [],
    exerciseType: (e.exercise_type as string) ?? 'strength',
    sets: (e.sets as number) ?? 3,
    reps: (e.reps as number) ?? 10,
    weight: parseFloat((e.weight as string | number | null) as string) || 0,
    restSeconds: (e.rest_seconds as number | null) ?? null,
    notes: (e.notes as string) ?? '',
    orderIndex: (e.order_index as number) ?? 0,
  };
}

export const useWeeklyStore = create<WeeklyStore>()((set, get) => ({
  plans: [],
  loading: false,
  initialized: false,

  // ─── Load all weekly plans for user ──────────────────────────────────────────
  initWeekly: async (userId) => {
    set({ loading: true });

    const [plansRes, exercisesRes] = await Promise.all([
      supabase
        .from('weekly_workout_plans')
        .select('*')
        .eq('user_id', userId)
        .order('day_of_week'),
      supabase
        .from('weekly_plan_exercises')
        .select('*')
        .eq('user_id', userId)
        .order('order_index'),
    ]);

    if (plansRes.error)     console.error('[initWeekly] plans error:',     plansRes.error);
    if (exercisesRes.error) console.error('[initWeekly] exercises error:', exercisesRes.error);

    const planRows     = plansRes.data     ?? [];
    const exerciseRows = exercisesRes.data ?? [];

    const plans: WeeklyPlan[] = planRows.map(p => ({
      id: p.id as string,
      dayOfWeek: p.day_of_week as number,
      workoutName: (p.workout_name as string) ?? '',
      isRestDay: (p.is_rest_day as boolean) ?? false,
      notes: (p.notes as string) ?? '',
      lastCompletedDate: (p.last_completed_date as string | null) ?? null,
      exercises: exerciseRows
        .filter(e => e.plan_id === p.id)
        .map(e => mapExerciseRow(e as Record<string, unknown>)),
    }));

    set({ plans, loading: false, initialized: true });
  },

  // ─── Clear on logout ──────────────────────────────────────────────────────────
  clearWeekly: () => {
    set({ plans: [], loading: false, initialized: false });
  },

  // ─── Save (insert or update) one day ─────────────────────────────────────────
  upsertDay: async (dayOfWeek, data) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data: planRow, error: planErr } = await supabase
      .from('weekly_workout_plans')
      .upsert(
        {
          user_id:      authUser.id,
          day_of_week:  dayOfWeek,
          workout_name: data.workoutName,
          is_rest_day:  data.isRestDay,
          notes:        data.notes,
          updated_at:   new Date().toISOString(),
        },
        { onConflict: 'user_id,day_of_week' }
      )
      .select()
      .single();

    if (planErr || !planRow) {
      console.error('[upsertDay] plan upsert failed:', planErr);
      return;
    }

    // Replace all exercises for this plan
    await supabase.from('weekly_plan_exercises').delete().eq('plan_id', planRow.id);

    let savedExercises: WeeklyPlanExercise[] = [];
    if (!data.isRestDay && data.exercises.length > 0) {
      const rows = data.exercises.map((ex, idx) => ({
        plan_id:           planRow.id,
        user_id:           authUser.id,
        exercise_id:       ex.exerciseId ?? null,
        exercise_name:     ex.exerciseName,
        primary_muscle_id: ex.primaryMuscleId,
        secondary_muscles: ex.secondaryMuscles,
        exercise_type:     ex.exerciseType,
        sets:              ex.sets,
        reps:              ex.reps,
        weight:            ex.weight,
        rest_seconds:      ex.restSeconds,
        notes:             ex.notes,
        order_index:       idx,
      }));

      const { data: inserted, error: exErr } = await supabase
        .from('weekly_plan_exercises')
        .insert(rows)
        .select();

      if (exErr) console.error('[upsertDay] exercises insert failed:', exErr);
      savedExercises = (inserted ?? []).map(e =>
        mapExerciseRow(e as Record<string, unknown>)
      );
    }

    const updated: WeeklyPlan = {
      id:                planRow.id as string,
      dayOfWeek,
      workoutName:       data.workoutName,
      isRestDay:         data.isRestDay,
      notes:             data.notes,
      lastCompletedDate: (planRow.last_completed_date as string | null) ?? null,
      exercises:         savedExercises,
    };

    set(s => {
      const exists = s.plans.some(p => p.dayOfWeek === dayOfWeek);
      const next = exists
        ? s.plans.map(p => (p.dayOfWeek === dayOfWeek ? updated : p))
        : [...s.plans, updated].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      return { plans: next };
    });
  },

  // ─── Remove a day plan ────────────────────────────────────────────────────────
  deleteDay: async (dayOfWeek) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    await supabase
      .from('weekly_workout_plans')
      .delete()
      .eq('user_id', authUser.id)
      .eq('day_of_week', dayOfWeek);

    set(s => ({ plans: s.plans.filter(p => p.dayOfWeek !== dayOfWeek) }));
  },

  // ─── Mark a day as completed today ───────────────────────────────────────────
  // Calculates XP from the plan exercises, calls addWorkout (which handles
  // all XP distribution, streaks, achievements), updates lastCompletedDate.
  completeDay: async (dayOfWeek) => {
    const plan = get().plans.find(p => p.dayOfWeek === dayOfWeek);
    if (!plan || plan.isRestDay) {
      return { xpTotal: 0, xpByMuscle: {}, alreadyDone: false };
    }

    const today = new Date().toISOString().slice(0, 10);
    if (plan.lastCompletedDate === today) {
      return { xpTotal: 0, xpByMuscle: {}, alreadyDone: true };
    }

    const gameStore = useGameStore.getState();

    // Map plan exercises → WorkoutEntryInput (skip any that can't be resolved)
    const entries: WorkoutEntryInput[] = [];

    for (const planEx of plan.exercises) {
      // Prefer the direct library link; fall back to matching by name
      let exerciseId = planEx.exerciseId;
      if (!exerciseId) {
        const matched = gameStore.exercises.find(
          e => e.name.toLowerCase() === planEx.exerciseName.toLowerCase()
        );
        exerciseId = matched?.id ?? null;
      }
      if (!exerciseId) continue;

      const sets: WorkoutSet[] = Array.from({ length: Math.max(1, planEx.sets) }, () => ({
        reps:   Math.max(1, planEx.reps),
        weight: Math.max(0, planEx.weight),
      }));

      entries.push({
        exerciseId,
        sets,
        difficulty: 7,    // sensible default for a pre-planned routine
        notes:     planEx.notes,
        restTime:  planEx.restSeconds ?? undefined,
      });
    }

    if (entries.length === 0) {
      return { xpTotal: 0, xpByMuscle: {}, alreadyDone: false };
    }

    // Pre-calculate XP with current state (same math addWorkout uses internally)
    let xpTotal = 0;
    const xpByMuscle: Record<string, number> = {};

    for (const entry of entries) {
      const exercise = gameStore.exercises.find(e => e.id === entry.exerciseId);
      if (!exercise) continue;
      const { exerciseXP, muscleXPMap } = calculateEntryXP(entry, exercise, gameStore.workouts);
      xpTotal += exerciseXP;
      for (const [mId, xp] of Object.entries(muscleXPMap)) {
        xpByMuscle[mId] = (xpByMuscle[mId] ?? 0) + xp;
      }
    }

    // Persist via the existing addWorkout pipeline
    await gameStore.addWorkout({
      date:    new Date().toISOString(),
      entries,
      notes:   `Treino semanal: ${plan.workoutName}`,
    });

    // Update lastCompletedDate in DB + local state
    await supabase
      .from('weekly_workout_plans')
      .update({ last_completed_date: today, updated_at: new Date().toISOString() })
      .eq('id', plan.id);

    set(s => ({
      plans: s.plans.map(p =>
        p.dayOfWeek === dayOfWeek ? { ...p, lastCompletedDate: today } : p
      ),
    }));

    return { xpTotal, xpByMuscle, alreadyDone: false };
  },
}));
