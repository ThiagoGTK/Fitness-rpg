import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Exercise, TrainerPlan, TrainerPlanExercise, TrainerStudentSummary, UserProfile, WorkoutSession } from '../types';

interface TrainerStore {
  students: TrainerStudentSummary[];
  plans: TrainerPlan[];
  studentDetails: {
    profile: UserProfile;
    plans: TrainerPlan[];
    workouts: WorkoutSession[];
    exercises: Exercise[];
  } | null;
  loading: boolean;
  initialized: boolean;
  initTrainer: () => Promise<void>;
  loadStudents: () => Promise<void>;
  loadPlans: (studentId?: string) => Promise<void>;
  loadStudentDetail: (studentId: string) => Promise<void>;
  addStudentByEmail: (email: string) => Promise<string | null>;
  createPlan: (studentId: string, planName: string, scheduledDate: string | undefined, notes: string, exercises: TrainerPlanExercise[]) => Promise<string | null>;
  updatePlan: (planId: string, planName: string, scheduledDate: string | undefined, notes: string, exercises: TrainerPlanExercise[]) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  clearTrainer: () => void;
}

function mapPlanExerciseRow(row: Record<string, unknown>): TrainerPlanExercise {
  return {
    id: row.id as string,
    planId: row.plan_id as string,
    exerciseId: (row.exercise_id as string | null) ?? null,
    exerciseName: (row.exercise_name as string) ?? '',
    primaryMuscleId: (row.primary_muscle_id as string) ?? '',
    secondaryMuscles: (row.secondary_muscles as any) ?? [],
    exerciseType: (row.exercise_type as string) ?? 'strength',
    sets: (row.sets as number) ?? 3,
    reps: (row.reps as number) ?? 10,
    weight: parseFloat((row.weight as string | number | null) as string) || 0,
    restSeconds: (row.rest_seconds as number | null) ?? undefined,
    notes: (row.notes as string) ?? '',
    orderIndex: (row.order_index as number) ?? 0,
  };
}

function mapPlanRow(row: Record<string, unknown>): TrainerPlan {
  return {
    id: row.id as string,
    trainerId: row.trainer_id as string,
    studentId: row.student_id as string,
    planName: (row.plan_name as string) ?? '',
    scheduledDate: (row.scheduled_date as string | null) ?? undefined,
    notes: (row.notes as string) ?? '',
    exercises: ((row.trainer_plan_exercises as Record<string, unknown>[]) ?? []).map(mapPlanExerciseRow),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

export const useTrainerStore = create<TrainerStore>()((set, get) => ({
  students: [],
  plans: [],
  studentDetails: null,
  loading: false,
  initialized: false,

  initTrainer: async () => {
    set({ loading: true });
    await get().loadStudents();
    await get().loadPlans();
    set({ loading: false, initialized: true });
  },

  loadStudents: async () => {
    set({ loading: true });
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      set({ students: [], loading: false });
      return;
    }

    const profilesRes = await supabase
      .from('profiles')
      .select('id,name,email,last_trained_date')
      .eq('trainer_id', authUser.id)
      .order('name', { ascending: true });

    if (profilesRes.error) {
      console.error('[trainerStore] loadStudents profiles error:', profilesRes.error);
      set({ students: [], loading: false });
      return;
    }

    const studentIds = (profilesRes.data ?? []).map(row => row.id as string);
    const workoutsRes = studentIds.length > 0
      ? await supabase.from('workout_sessions').select('user_id,date').in('user_id', studentIds)
      : { data: [] as any[], error: null };

    if (workoutsRes.error) {
      console.error('[trainerStore] loadStudents workouts error:', workoutsRes.error);
    }

    const workoutByStudent = (workoutsRes.data ?? []).reduce<Record<string, { count: number; lastDate: string }>>((acc, row) => {
      const userId = row.user_id as string;
      const date = row.date as string;
      const existing = acc[userId];
      if (!existing) {
        acc[userId] = { count: 1, lastDate: date };
      } else {
        existing.count += 1;
        if (date > existing.lastDate) existing.lastDate = date;
      }
      return acc;
    }, {});

    const students: TrainerStudentSummary[] = (profilesRes.data ?? []).map(row => ({
      id: row.id as string,
      name: (row.name as string) ?? 'Aluno',
      email: (row.email as string) ?? undefined,
      lastTrainedDate: (row.last_trained_date as string | null) ?? undefined,
      totalWorkouts: workoutByStudent[row.id as string]?.count ?? 0,
    }));

    set({ students, loading: false });
  },

  loadPlans: async (studentId) => {
    set({ loading: true });
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      set({ plans: [], loading: false });
      return;
    }

    let query = supabase
      .from('trainer_plans')
      .select('*, trainer_plan_exercises(*)')
      .eq('trainer_id', authUser.id)
      .order('scheduled_date', { ascending: true });

    if (studentId) query = query.eq('student_id', studentId);

    const plansRes = await query;
    if (plansRes.error) {
      console.error('[trainerStore] loadPlans error:', plansRes.error);
      set({ plans: [], loading: false });
      return;
    }

    const plans: TrainerPlan[] = (plansRes.data ?? []).map(mapPlanRow);
    set({ plans, loading: false });
  },

  loadStudentDetail: async (studentId) => {
    set({ loading: true });
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      set({ studentDetails: null, loading: false });
      return;
    }

    const profileRes = await supabase
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .eq('trainer_id', authUser.id)
      .single();

    if (profileRes.error) {
      console.error('[trainerStore] loadStudentDetail profile error:', profileRes.error);
      set({ studentDetails: null, loading: false });
      return;
    }

    const plansRes = await supabase
      .from('trainer_plans')
      .select('*, trainer_plan_exercises(*)')
      .eq('trainer_id', authUser.id)
      .eq('student_id', studentId)
      .order('scheduled_date', { ascending: false });

    if (plansRes.error) {
      console.error('[trainerStore] loadStudentDetail plans error:', plansRes.error);
      set({ studentDetails: null, loading: false });
      return;
    }

    const workoutsRes = await supabase
      .from('workout_sessions')
      .select('*, workout_entries(*)')
      .eq('user_id', studentId)
      .order('date', { ascending: false });

    if (workoutsRes.error) {
      console.error('[trainerStore] loadStudentDetail workouts error:', workoutsRes.error);
      set({ studentDetails: null, loading: false });
      return;
    }

    const exercisesRes = await supabase
      .from('exercises')
      .select('id,name,primary_muscle_id,secondary_muscles,type,notes,level,current_xp,total_xp_earned,times_performed,created_at')
      .eq('user_id', studentId);

    if (exercisesRes.error) {
      console.error('[trainerStore] loadStudentDetail exercises error:', exercisesRes.error);
    }

    const profileRow = profileRes.data as Record<string, unknown>;
    const profile: UserProfile = {
      name: (profileRow.name as string) ?? '',
      joinedAt: (profileRow.joined_at as string) ?? new Date().toISOString(),
      level: (profileRow.level as number) ?? 1,
      totalXP: (profileRow.total_xp as number) ?? 0,
      weeklyXP: (profileRow.weekly_xp as number) ?? 0,
      streak: (profileRow.streak as number) ?? 0,
      longestStreak: (profileRow.longest_streak as number) ?? 0,
      lastTrainedDate: (profileRow.last_trained_date as string | null) ?? undefined,
      birthDate: (profileRow.birth_date as string | null) ?? undefined,
      sex: (profileRow.sex as 'male' | 'female' | null) ?? undefined,
      email: (profileRow.email as string) ?? undefined,
      isTrainer: (profileRow.is_trainer as boolean) ?? false,
      trainerId: (profileRow.trainer_id as string | null) ?? undefined,
      role: ((profileRow.role as string) ?? 'student') as 'admin' | 'trainer' | 'student',
      mustChangePassword: (profileRow.must_change_password as boolean) ?? false,
    };

    const plans: TrainerPlan[] = (plansRes.data ?? []).map(mapPlanRow);
    const workouts: WorkoutSession[] = ((workoutsRes.data ?? []) as any[]).map(session => ({
      id: session.id as string,
      date: session.date as string,
      notes: (session.notes as string) ?? '',
      totalXP: (session.total_xp as number) ?? 0,
      trainerPlanId: (session.trainer_plan_id as string | null) ?? undefined,
      entries: ((session.workout_entries as any[]) ?? []).map(entry => ({
        exerciseId: entry.exercise_id as string,
        sets: entry.sets as any,
        difficulty: (entry.difficulty as number) ?? 0,
        notes: (entry.notes as string) ?? '',
        restTime: (entry.rest_time as number | null) ?? undefined,
        duration: (entry.duration as number | null) ?? undefined,
        xpGained: (entry.xp_gained as number) ?? 0,
        muscleXP: (entry.muscle_xp as Record<string, number>) ?? {},
        isPR: (entry.is_pr as boolean) ?? false,
      })),
    }));

    const exercises: Exercise[] = ((exercisesRes.data ?? []) as any[]).map(row => ({
      id: row.id as string,
      name: row.name as string,
      primaryMuscleId: row.primary_muscle_id as string,
      secondaryMuscles: (row.secondary_muscles as Exercise['secondaryMuscles']) ?? [],
      type: row.type as Exercise['type'],
      notes: (row.notes as string) ?? '',
      level: (row.level as number) ?? 1,
      currentXP: (row.current_xp as number) ?? 0,
      totalXPEarned: (row.total_xp_earned as number) ?? 0,
      timesPerformed: (row.times_performed as number) ?? 0,
      createdAt: (row.created_at as string) ?? new Date().toISOString(),
    }));

    set({ studentDetails: { profile, plans, workouts, exercises }, loading: false });
  },

  addStudentByEmail: async (email) => {
    set({ loading: true });
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      set({ loading: false });
      return 'Usuário não autenticado.';
    }

    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      set({ loading: false });
      return 'E-mail inválido.';
    }

    const profileRes = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', normalized)
      .single();

    if (profileRes.error) {
      console.error('[trainerStore] addStudentByEmail search profile error:', profileRes.error);
      set({ loading: false });
      return 'Aluno não encontrado. Peça para ele se cadastrar primeiro.';
    }

    const studentId = profileRes.data?.id as string;
    const updateRes = await supabase
      .from('profiles')
      .update({ trainer_id: authUser.id })
      .eq('id', studentId);

    if (updateRes.error) {
      console.error('[trainerStore] addStudentByEmail update profile error:', updateRes.error);
      set({ loading: false });
      return 'Erro ao vincular aluno. Tente novamente.';
    }

    await get().loadStudents();
    set({ loading: false });
    return null;
  },

  createPlan: async (studentId, planName, scheduledDate, notes, exercises) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;

    const { data: planRow, error: planErr } = await supabase
      .from('trainer_plans')
      .insert({
        trainer_id: authUser.id,
        student_id: studentId,
        plan_name: planName,
        scheduled_date: scheduledDate ?? null,
        notes,
      })
      .select()
      .single();

    if (planErr || !planRow) {
      console.error('[trainerStore] createPlan error:', planErr);
      return null;
    }

    if (exercises.length > 0) {
      const rows = exercises.map((exercise, index) => ({
        plan_id: planRow.id,
        exercise_id: exercise.exerciseId,
        exercise_name: exercise.exerciseName,
        primary_muscle_id: exercise.primaryMuscleId,
        secondary_muscles: exercise.secondaryMuscles,
        exercise_type: exercise.exerciseType,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        rest_seconds: exercise.restSeconds ?? null,
        notes: exercise.notes,
        order_index: index,
      }));
      const { error: exErr } = await supabase.from('trainer_plan_exercises').insert(rows);
      if (exErr) console.error('[trainerStore] createPlan exercises error:', exErr);
    }

    await get().loadPlans(studentId);
    await get().loadStudents();
    return planRow.id as string;
  },

  updatePlan: async (planId, planName, scheduledDate, notes, exercises) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { error: planErr } = await supabase
      .from('trainer_plans')
      .update({
        plan_name: planName,
        scheduled_date: scheduledDate ?? null,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .eq('trainer_id', authUser.id);

    if (planErr) {
      console.error('[trainerStore] updatePlan error:', planErr);
      return;
    }

    await supabase.from('trainer_plan_exercises').delete().eq('plan_id', planId);

    if (exercises.length > 0) {
      const rows = exercises.map((exercise, index) => ({
        plan_id: planId,
        exercise_id: exercise.exerciseId,
        exercise_name: exercise.exerciseName,
        primary_muscle_id: exercise.primaryMuscleId,
        secondary_muscles: exercise.secondaryMuscles,
        exercise_type: exercise.exerciseType,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        rest_seconds: exercise.restSeconds ?? null,
        notes: exercise.notes,
        order_index: index,
      }));
      const { error: exErr } = await supabase.from('trainer_plan_exercises').insert(rows);
      if (exErr) console.error('[trainerStore] updatePlan exercises error:', exErr);
    }

    await get().loadPlans();
    await get().loadStudents();
  },

  deletePlan: async (planId) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { error: err } = await supabase
      .from('trainer_plans')
      .delete()
      .eq('id', planId)
      .eq('trainer_id', authUser.id);

    if (err) console.error('[trainerStore] deletePlan error:', err);
    await get().loadPlans();
    await get().loadStudents();
  },

  clearTrainer: () => {
    set({ students: [], plans: [], studentDetails: null, loading: false, initialized: false });
  },
}));
