import { create } from 'zustand';
import type {
  MuscleGroup, Exercise, WorkoutSession,
  WorkoutSessionInput, Achievement, PersonalRecord, LevelUpEvent, UserProfile, Sex,
} from '../types';
import { SEED_MUSCLES, SEED_EXERCISES } from '../data/seedData';
import { calculateEntryXP, calcVolume, calcMaxWeight } from '../services/xpCalculator';
import {
  processLevelUp, xpForMuscleLevel, xpForExerciseLevel, calculateUserLevel,
} from '../services/levelCalculator';
import { checkAchievements, initAchievements } from '../services/achievementChecker';
import { supabase } from '../lib/supabase';

// Static muscle definitions (name, icon, color — never change per user)
const MUSCLE_DEFS = SEED_MUSCLES.map(m => ({ id: m.id, name: m.name, icon: m.icon, color: m.color }));

let _uid = Date.now();
function uid() { return (++_uid).toString(36); }

// Map Supabase row → Exercise type
function mapExercise(row: Record<string, unknown>): Exercise {
  return {
    id: row.id as string,
    name: row.name as string,
    primaryMuscleId: row.primary_muscle_id as string,
    secondaryMuscles: (row.secondary_muscles as Exercise['secondaryMuscles']) ?? [],
    type: row.type as Exercise['type'],
    notes: (row.notes as string) ?? '',
    level: row.level as number,
    currentXP: row.current_xp as number,
    totalXPEarned: row.total_xp_earned as number,
    timesPerformed: row.times_performed as number,
    createdAt: row.created_at as string,
  };
}

const DEFAULT_USER: UserProfile = {
  name: '',
  joinedAt: new Date().toISOString(),
  level: 1, totalXP: 0, weeklyXP: 0, streak: 0, longestStreak: 0,
};

interface GameStore {
  muscles: MuscleGroup[];
  exercises: Exercise[];
  workouts: WorkoutSession[];
  achievements: Achievement[];
  personalRecords: PersonalRecord[];
  user: UserProfile;
  pendingLevelUps: LevelUpEvent[];
  loading: boolean;
  initialized: boolean;

  initData: (userId: string) => Promise<void>;
  clearData: () => void;
  updateProfile: (data: { birthDate?: string; sex?: Sex }) => Promise<void>;
  addWorkout: (input: WorkoutSessionInput) => Promise<void>;
  addExercise: (data: Omit<Exercise, 'id' | 'level' | 'currentXP' | 'totalXPEarned' | 'timesPerformed' | 'createdAt'>) => Promise<string | null>;
  updateExercise: (id: string, data: Partial<Pick<Exercise, 'name' | 'primaryMuscleId' | 'secondaryMuscles' | 'type' | 'notes'>>) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  dismissLevelUp: (id: string) => void;
  cleanReset: () => Promise<void>;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  muscles: MUSCLE_DEFS.map(m => ({ ...m, level: 1, currentXP: 0, totalXPEarned: 0 })),
  exercises: [],
  workouts: [],
  achievements: initAchievements(),
  personalRecords: [],
  user: DEFAULT_USER,
  pendingLevelUps: [],
  loading: false,
  initialized: false,

  // ─── Load all data for the authenticated user ───────────────────────────────
  initData: async (userId: string) => {
    set({ loading: true });

    const [profileRes, muscleRes, exerciseRes, sessionRes, recordRes, achRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('muscle_progress').select('*').eq('user_id', userId),
      supabase.from('exercises').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('workout_sessions').select('*, workout_entries(*)').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('personal_records').select('*').eq('user_id', userId),
      supabase.from('user_achievements').select('*').eq('user_id', userId),
    ]);

    // Surface any DB errors in the console so they're easy to diagnose
    if (profileRes.error)  console.error('[initData] profiles error:',         profileRes.error);
    if (muscleRes.error)   console.error('[initData] muscle_progress error:',   muscleRes.error);
    if (exerciseRes.error) console.error('[initData] exercises error:',         exerciseRes.error);
    if (sessionRes.error)  console.error('[initData] workout_sessions error:',  sessionRes.error);
    if (recordRes.error)   console.error('[initData] personal_records error:',  recordRes.error);
    if (achRes.error)      console.error('[initData] user_achievements error:', achRes.error);

    // Muscles: merge static defs with DB progress
    const muscleRows = muscleRes.data ?? [];
    const muscles: MuscleGroup[] = MUSCLE_DEFS.map(def => {
      const row = muscleRows.find(r => r.muscle_id === def.id);
      return {
        ...def,
        level: row?.level ?? 1,
        currentXP: row?.current_xp ?? 0,
        totalXPEarned: row?.total_xp_earned ?? 0,
      };
    });

    // Exercises: seed for new users
    let exercises: Exercise[] = (exerciseRes.data ?? []).map(mapExercise);
    if (exercises.length === 0) {
      const seedRows = SEED_EXERCISES.map(ex => ({
        user_id: userId,
        name: ex.name,
        primary_muscle_id: ex.primaryMuscleId,
        secondary_muscles: ex.secondaryMuscles,
        type: ex.type,
        notes: ex.notes,
        level: 1,
        current_xp: 0,
        total_xp_earned: 0,
        times_performed: 0,
      }));
      const { data: inserted } = await supabase.from('exercises').insert(seedRows).select();
      exercises = (inserted ?? []).map(mapExercise);
    }

    // Workouts
    type EntryRow = {
      exercise_id: string; sets: WorkoutSession['entries'][0]['sets'];
      difficulty: number; notes: string; rest_time?: number; duration?: number;
      xp_gained: number; muscle_xp: Record<string, number>; is_pr: boolean;
    };
    const workouts: WorkoutSession[] = (sessionRes.data ?? []).map(s => ({
      id: s.id as string,
      date: s.date as string,
      totalXP: s.total_xp as number,
      notes: (s.notes as string) ?? '',
      entries: ((s.workout_entries ?? []) as EntryRow[]).map(e => ({
        exerciseId: e.exercise_id,
        sets: e.sets,
        difficulty: e.difficulty,
        notes: e.notes ?? '',
        restTime: e.rest_time,
        duration: e.duration,
        xpGained: e.xp_gained,
        muscleXP: e.muscle_xp ?? {},
        isPR: e.is_pr,
      })),
    }));

    // Personal records
    const personalRecords: PersonalRecord[] = (recordRes.data ?? []).map(r => ({
      exerciseId: r.exercise_id as string,
      maxWeight: r.max_weight as number,
      maxVolume: r.max_volume as number,
      maxRepsInSet: r.max_reps_in_set as number,
      maxSetsInSession: r.max_sets_in_session as number,
      date: r.date as string,
    }));

    // Achievements: merge definitions with unlocked status
    const unlockedRows = achRes.data ?? [];
    const achievements: Achievement[] = initAchievements().map(a => {
      const row = unlockedRows.find(u => u.achievement_id === a.id);
      return row ? { ...a, unlockedAt: row.unlocked_at as string } : a;
    });

    // User profile
    const p = profileRes.data;
    const user: UserProfile = p ? {
      name: (p.name as string) ?? '',
      joinedAt: (p.joined_at as string) ?? new Date().toISOString(),
      level: (p.level as number) ?? 1,
      totalXP: (p.total_xp as number) ?? 0,
      weeklyXP: (p.weekly_xp as number) ?? 0,
      streak: (p.streak as number) ?? 0,
      longestStreak: (p.longest_streak as number) ?? 0,
      lastTrainedDate: (p.last_trained_date as string | null) ?? undefined,
      birthDate: (p.birth_date as string | null) ?? undefined,
      sex: (p.sex as Sex | null) ?? undefined,
    } : { ...DEFAULT_USER };

    set({ muscles, exercises, workouts, achievements, personalRecords, user, loading: false, initialized: true });
  },

  // ─── Clear state on logout ──────────────────────────────────────────────────
  clearData: () => {
    set({
      muscles: MUSCLE_DEFS.map(m => ({ ...m, level: 1, currentXP: 0, totalXPEarned: 0 })),
      exercises: [],
      workouts: [],
      achievements: initAchievements(),
      personalRecords: [],
      user: DEFAULT_USER,
      pendingLevelUps: [],
      loading: false,
      initialized: false,
    });
  },

  // ─── Update profile (birth date / sex) ─────────────────────────────────────
  updateProfile: async (data) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const updates: Record<string, unknown> = {};
    if (data.birthDate !== undefined) updates.birth_date = data.birthDate;
    if (data.sex      !== undefined) updates.sex        = data.sex;
    updates.updated_at = new Date().toISOString();

    await supabase.from('profiles').update(updates).eq('id', authUser.id);
    set(s => ({ user: { ...s.user, ...data } }));
  },

  // ─── Add workout ────────────────────────────────────────────────────────────
  addWorkout: async (input) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const userId = authUser.id;

    const state = get();
    const date = input.date || new Date().toISOString();

    const newMuscles = state.muscles.map(m => ({ ...m }));
    const newExercises = state.exercises.map(e => ({ ...e }));
    const newRecords = state.personalRecords.map(r => ({ ...r }));
    const levelUps: LevelUpEvent[] = [];
    let totalXP = 0;

    type EntryResult = WorkoutSession['entries'][0];
    const entryResults: EntryResult[] = [];

    for (const entryInput of input.entries) {
      const exIdx = newExercises.findIndex(e => e.id === entryInput.exerciseId);
      if (exIdx === -1) continue;
      const exercise = newExercises[exIdx];

      const { exerciseXP, muscleXPMap, isPR } = calculateEntryXP(entryInput, exercise, state.workouts);

      // Update exercise
      const exLvl = processLevelUp(exercise.level, exercise.currentXP, exerciseXP, xpForExerciseLevel);
      newExercises[exIdx] = {
        ...exercise,
        level: exLvl.newLevel,
        currentXP: exLvl.newXP,
        totalXPEarned: exercise.totalXPEarned + exerciseXP,
        timesPerformed: exercise.timesPerformed + 1,
      };
      if (exLvl.leveledUp) {
        levelUps.push({ id: uid(), type: 'exercise', entityId: exercise.id, entityName: exercise.name, newLevel: exLvl.newLevel });
      }

      // Update muscles
      for (const [muscleId, xp] of Object.entries(muscleXPMap)) {
        const mIdx = newMuscles.findIndex(m => m.id === muscleId);
        if (mIdx === -1) continue;
        const muscle = newMuscles[mIdx];
        const mLvl = processLevelUp(muscle.level, muscle.currentXP, xp, xpForMuscleLevel);
        newMuscles[mIdx] = { ...muscle, level: mLvl.newLevel, currentXP: mLvl.newXP, totalXPEarned: muscle.totalXPEarned + xp };
        if (mLvl.leveledUp) {
          levelUps.push({ id: uid(), type: 'muscle', entityId: muscle.id, entityName: muscle.name, newLevel: mLvl.newLevel });
        }
      }

      // Update personal records
      const volume = calcVolume(entryInput.sets);
      const maxW = calcMaxWeight(entryInput.sets);
      const maxReps = Math.max(0, ...entryInput.sets.map(s => s.reps));
      const recIdx = newRecords.findIndex(r => r.exerciseId === exercise.id);
      if (recIdx === -1) {
        newRecords.push({ exerciseId: exercise.id, maxWeight: maxW, maxVolume: volume, maxRepsInSet: maxReps, maxSetsInSession: entryInput.sets.length, date });
      } else {
        const prev = newRecords[recIdx];
        newRecords[recIdx] = {
          ...prev,
          maxWeight: Math.max(prev.maxWeight, maxW),
          maxVolume: Math.max(prev.maxVolume, volume),
          maxRepsInSet: Math.max(prev.maxRepsInSet, maxReps),
          maxSetsInSession: Math.max(prev.maxSetsInSession, entryInput.sets.length),
          date: volume > prev.maxVolume ? date : prev.date,
        };
      }

      totalXP += exerciseXP;
      entryResults.push({ ...entryInput, xpGained: exerciseXP, muscleXP: muscleXPMap, isPR });
    }

    // Streak calculation
    const u = state.user;
    const today = date.slice(0, 10);
    const yesterday = new Date(new Date(date).getTime() - 86400000).toISOString().slice(0, 10);
    const lastDay = u.lastTrainedDate?.slice(0, 10);
    let newStreak = u.streak;
    if (lastDay !== today) {
      newStreak = lastDay === yesterday ? u.streak + 1 : 1;
    }
    const newTotalXP = u.totalXP + totalXP;
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    const weeklyXP = totalXP + state.workouts.filter(s => s.date >= cutoff).reduce((sum, s) => sum + s.totalXP, 0);

    // ── Write to Supabase ──
    // 1. Insert session
    const { data: sessionRow, error: sessionErr } = await supabase
      .from('workout_sessions')
      .insert({ user_id: userId, date, total_xp: totalXP, notes: input.notes ?? '' })
      .select()
      .single();

    if (sessionErr) console.error('[addWorkout] insert workout_sessions failed:', sessionErr);
    if (!sessionRow) return;

    // 2. Insert entries
    const { error: entriesErr } = await supabase.from('workout_entries').insert(
      entryResults.map(e => ({
        session_id: sessionRow.id,
        user_id: userId,
        exercise_id: e.exerciseId,
        sets: e.sets,
        difficulty: e.difficulty,
        notes: e.notes ?? '',
        rest_time: e.restTime ?? null,
        duration: e.duration ?? null,
        xp_gained: e.xpGained,
        muscle_xp: e.muscleXP,
        is_pr: e.isPR,
      }))
    );
    if (entriesErr) console.error('[addWorkout] insert workout_entries failed:', entriesErr);

    // 3. Update exercises (only changed ones)
    await Promise.all(
      newExercises
        .filter(ex => {
          const orig = state.exercises.find(e => e.id === ex.id);
          return orig && (orig.level !== ex.level || orig.currentXP !== ex.currentXP || orig.timesPerformed !== ex.timesPerformed);
        })
        .map(ex =>
          supabase.from('exercises')
            .update({ level: ex.level, current_xp: ex.currentXP, total_xp_earned: ex.totalXPEarned, times_performed: ex.timesPerformed })
            .eq('id', ex.id).eq('user_id', userId)
        )
    );

    // 4. Upsert muscle_progress (handles new categories like 'cardio' for existing users)
    await Promise.all(
      newMuscles
        .filter(m => {
          const orig = state.muscles.find(x => x.id === m.id);
          return orig && (orig.level !== m.level || orig.currentXP !== m.currentXP);
        })
        .map(m =>
          supabase.from('muscle_progress')
            .upsert(
              { user_id: userId, muscle_id: m.id, level: m.level, current_xp: m.currentXP, total_xp_earned: m.totalXPEarned },
              { onConflict: 'user_id,muscle_id' }
            )
        )
    );

    // 5. Upsert personal_records
    if (newRecords.length > 0) {
      await supabase.from('personal_records').upsert(
        newRecords.map(r => ({
          user_id: userId,
          exercise_id: r.exerciseId,
          max_weight: r.maxWeight,
          max_volume: r.maxVolume,
          max_reps_in_set: r.maxRepsInSet,
          max_sets_in_session: r.maxSetsInSession,
          date: r.date,
        })),
        { onConflict: 'user_id,exercise_id' }
      );
    }

    // 6. Update profile
    const { error: profileErr } = await supabase.from('profiles').update({
      level: calculateUserLevel(newTotalXP),
      total_xp: newTotalXP,
      weekly_xp: weeklyXP,
      streak: newStreak,
      longest_streak: Math.max(u.longestStreak, newStreak),
      last_trained_date: date,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    if (profileErr) console.error('[addWorkout] update profiles failed:', profileErr);

    // 7. Achievements
    const session: WorkoutSession = {
      id: sessionRow.id as string,
      date,
      entries: entryResults,
      totalXP,
      notes: input.notes ?? '',
    };
    const allSessions = [session, ...state.workouts];
    const newAchievements = checkAchievements(state.achievements, allSessions, newMuscles, newExercises, newRecords);

    const newlyUnlocked = newAchievements.filter(
      a => a.unlockedAt && !state.achievements.find(x => x.id === a.id && x.unlockedAt)
    );
    if (newlyUnlocked.length > 0) {
      await supabase.from('user_achievements').insert(
        newlyUnlocked.map(a => ({ user_id: userId, achievement_id: a.id, unlocked_at: a.unlockedAt }))
      );
    }

    // ── Update local state ──
    set({
      muscles: newMuscles,
      exercises: newExercises,
      workouts: allSessions,
      achievements: newAchievements,
      personalRecords: newRecords,
      pendingLevelUps: [...state.pendingLevelUps, ...levelUps],
      user: {
        ...u,
        totalXP: newTotalXP,
        level: calculateUserLevel(newTotalXP),
        weeklyXP,
        streak: newStreak,
        longestStreak: Math.max(u.longestStreak, newStreak),
        lastTrainedDate: date,
      },
    });
  },

  // ─── Add exercise ───────────────────────────────────────────────────────────
  addExercise: async (data) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;

    const { data: row } = await supabase.from('exercises').insert({
      user_id: authUser.id,
      name: data.name,
      primary_muscle_id: data.primaryMuscleId,
      secondary_muscles: data.secondaryMuscles,
      type: data.type,
      notes: data.notes,
      level: 1, current_xp: 0, total_xp_earned: 0, times_performed: 0,
    }).select().single();

    if (row) {
      const newEx = mapExercise(row as Record<string, unknown>);
      set(s => ({ exercises: [...s.exercises, newEx] }));
      return newEx.id;
    }
    return null;
  },

  // ─── Update exercise ────────────────────────────────────────────────────────
  updateExercise: async (id, data) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.primaryMuscleId !== undefined) updates.primary_muscle_id = data.primaryMuscleId;
    if (data.secondaryMuscles !== undefined) updates.secondary_muscles = data.secondaryMuscles;
    if (data.type !== undefined) updates.type = data.type;
    if (data.notes !== undefined) updates.notes = data.notes;

    // Double filter: id + user_id — RLS also enforces this at DB level
    await supabase.from('exercises').update(updates).eq('id', id).eq('user_id', authUser.id);
    set(s => ({ exercises: s.exercises.map(e => e.id === id ? { ...e, ...data } : e) }));
  },

  // ─── Delete exercise ────────────────────────────────────────────────────────
  deleteExercise: async (id) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    // Double filter: id + user_id — RLS also enforces this at DB level
    await supabase.from('exercises').delete().eq('id', id).eq('user_id', authUser.id);
    set(s => ({ exercises: s.exercises.filter(e => e.id !== id) }));
  },

  // ─── Dismiss level-up notification (local only) ─────────────────────────────
  dismissLevelUp: (id) => {
    set(s => ({ pendingLevelUps: s.pendingLevelUps.filter(e => e.id !== id) }));
  },

  // ─── Clean reset ────────────────────────────────────────────────────────────
  cleanReset: async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const userId = authUser.id;

    await Promise.all([
      supabase.from('workout_sessions').delete().eq('user_id', userId),
      supabase.from('user_achievements').delete().eq('user_id', userId),
      supabase.from('personal_records').delete().eq('user_id', userId),
    ]);

    await Promise.all([
      supabase.from('exercises').update({ level: 1, current_xp: 0, total_xp_earned: 0, times_performed: 0 }).eq('user_id', userId),
      supabase.from('muscle_progress').update({ level: 1, current_xp: 0, total_xp_earned: 0 }).eq('user_id', userId),
      supabase.from('profiles').update({ level: 1, total_xp: 0, weekly_xp: 0, streak: 0, longest_streak: 0, last_trained_date: null, updated_at: new Date().toISOString() }).eq('id', userId),
    ]);

    const s = get();
    set({
      muscles: s.muscles.map(m => ({ ...m, level: 1, currentXP: 0, totalXPEarned: 0 })),
      exercises: s.exercises.map(e => ({ ...e, level: 1, currentXP: 0, totalXPEarned: 0, timesPerformed: 0 })),
      workouts: [],
      personalRecords: [],
      achievements: initAchievements(),
      pendingLevelUps: [],
      user: { ...s.user, level: 1, totalXP: 0, weeklyXP: 0, streak: 0, longestStreak: 0, lastTrainedDate: undefined },
    });
  },
}));
