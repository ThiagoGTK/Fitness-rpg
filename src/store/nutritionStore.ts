import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type {
  MealEntry, WaterLog, WeightLog, NutritionGoals,
  MealType, NutritionObjective, ActivityLevel, DailyNutritionSummary,
} from '../types/nutrition';
import { NUTRITION_XP, NUTRITION_ACHIEVEMENT_IDS } from '../utils/nutritionCalc';
import { useGameStore } from './gameStore';

// ── Store interface ───────────────────────────────────────────────────────────

interface NutritionStore {
  mealEntries:  MealEntry[];
  waterLogs:    WaterLog[];
  weightLogs:   WeightLog[];
  goals:        NutritionGoals | null;
  loading:      boolean;
  initialized:  boolean;
  // Achievement IDs that were just unlocked (shown as toast), cleared after read
  newAchievements: string[];

  initNutritionData:  (userId: string) => Promise<void>;
  clearNutritionData: () => void;
  clearNewAchievements: () => void;

  // Meal entries
  addMealEntry: (data: {
    date: string;
    mealType: MealType;
    foodName: string;
    quantityG?: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }) => Promise<void>;
  deleteMealEntry: (id: string) => Promise<void>;

  // Water
  addWaterLog:    (date: string, amountMl: number) => Promise<void>;
  removeWaterLog: (id: string) => Promise<void>;

  // Weight
  addWeightLog:    (weightKg: number, measuredAt: string, notes?: string) => Promise<void>;
  deleteWeightLog: (id: string) => Promise<void>;

  // Goals
  saveNutritionGoals: (goals: {
    objective:     NutritionObjective;
    dailyCalories: number;
    proteinG:      number;
    carbsG:        number;
    fatsG:         number;
    waterMl:       number;
    heightCm?:     number;
    activityLevel: ActivityLevel;
  }) => Promise<void>;

  // Computed selectors
  getMealEntriesForDate: (date: string) => MealEntry[];
  getWaterTotalForDate:  (date: string) => number;
  getDailySummary:       (date: string) => DailyNutritionSummary;
}

// ── Streak helpers ────────────────────────────────────────────────────────────

function maxConsecutiveDays(sortedUniqueDates: string[]): number {
  if (sortedUniqueDates.length === 0) return 0;
  let max = 1, curr = 1;
  for (let i = 1; i < sortedUniqueDates.length; i++) {
    const diff = Math.round(
      (new Date(sortedUniqueDates[i]).getTime() - new Date(sortedUniqueDates[i - 1]).getTime()) / 86400000
    );
    if (diff === 1) { curr++; if (curr > max) max = curr; }
    else curr = 1;
  }
  return max;
}

function mealStreak(entries: MealEntry[]): number {
  const days = [...new Set(entries.map(e => e.date))].sort();
  return maxConsecutiveDays(days);
}

function waterGoalStreak(logs: WaterLog[], goalMl: number): number {
  const byDate: Record<string, number> = {};
  for (const l of logs) byDate[l.date] = (byDate[l.date] ?? 0) + l.amountMl;
  const days = Object.keys(byDate).filter(d => byDate[d] >= goalMl).sort();
  return maxConsecutiveDays(days);
}

function proteinGoalStreak(entries: MealEntry[], goalG: number): number {
  const byDate: Record<string, number> = {};
  for (const e of entries) byDate[e.date] = (byDate[e.date] ?? 0) + e.protein;
  const days = Object.keys(byDate).filter(d => byDate[d] >= goalG).sort();
  return maxConsecutiveDays(days);
}

function calorieGoalStreak(entries: MealEntry[], goalKcal: number): number {
  const low = goalKcal * 0.9, high = goalKcal * 1.1;
  const byDate: Record<string, number> = {};
  for (const e of entries) byDate[e.date] = (byDate[e.date] ?? 0) + e.calories;
  const days = Object.keys(byDate).filter(d => byDate[d] >= low && byDate[d] <= high).sort();
  return maxConsecutiveDays(days);
}

// ── Helper: add XP and sync game store ───────────────────────────────────────

async function awardXP(userId: string, amount: number) {
  const gameState = useGameStore.getState();
  const newTotalXP = (gameState.user.totalXP ?? 0) + amount;
  const { error } = await supabase
    .from('profiles')
    .update({ total_xp: newTotalXP })
    .eq('id', userId);
  if (!error) {
    useGameStore.setState(s => ({ user: { ...s.user, totalXP: newTotalXP } }));
  }
}

// ── Helper: check & unlock achievement ───────────────────────────────────────

async function unlockAchievement(
  userId: string,
  achievementId: string,
  set: (fn: (s: NutritionStore) => Partial<NutritionStore>) => void,
) {
  const now = new Date().toISOString();
  const { error } = await supabase.from('user_achievements').insert({
    user_id:        userId,
    achievement_id: achievementId,
    unlocked_at:    now,
  });
  if (!error) {
    set(s => ({ newAchievements: [...s.newAchievements, achievementId] }));
    // Sync into gameStore so AchievementsPage reflects it without a page reload
    useGameStore.setState(s => ({
      achievements: s.achievements.map(a =>
        a.id === achievementId && !a.unlockedAt ? { ...a, unlockedAt: now } : a
      ),
    }));
  }
}

// ── Store implementation ──────────────────────────────────────────────────────

export const useNutritionStore = create<NutritionStore>((set, get) => ({
  mealEntries:     [],
  waterLogs:       [],
  weightLogs:      [],
  goals:           null,
  loading:         false,
  initialized:     false,
  newAchievements: [],

  // ── Init ─────────────────────────────────────────────────────────────────

  initNutritionData: async (userId: string) => {
    set({ loading: true });

    // Load last 60 days of meal/water entries + all weight logs + goals
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const [mealsRes, waterRes, weightRes, goalsRes] = await Promise.all([
      supabase.from('meal_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', cutoffStr)
        .order('created_at', { ascending: false }),
      supabase.from('water_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', cutoffStr)
        .order('created_at', { ascending: false }),
      supabase.from('weight_logs')
        .select('*')
        .eq('user_id', userId)
        .order('measured_at', { ascending: false }),
      supabase.from('nutrition_goals')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    const mealEntries: MealEntry[] = (mealsRes.data ?? []).map(r => ({
      id:         r.id,
      userId:     r.user_id,
      date:       r.date,
      mealType:   r.meal_type as MealType,
      foodName:   r.food_name,
      quantityG:  r.quantity_g ?? undefined,
      calories:   Number(r.calories),
      protein:    Number(r.protein),
      carbs:      Number(r.carbs),
      fats:       Number(r.fats),
      createdAt:  r.created_at,
    }));

    const waterLogs: WaterLog[] = (waterRes.data ?? []).map(r => ({
      id:        r.id,
      userId:    r.user_id,
      date:      r.date,
      amountMl:  r.amount_ml,
      createdAt: r.created_at,
    }));

    const weightLogs: WeightLog[] = (weightRes.data ?? []).map(r => ({
      id:         r.id,
      userId:     r.user_id,
      weightKg:   Number(r.weight_kg),
      measuredAt: r.measured_at,
      notes:      r.notes ?? '',
      createdAt:  r.created_at,
    }));

    const g = goalsRes.data;
    const goals: NutritionGoals | null = g ? {
      userId:        g.user_id,
      objective:     g.objective as NutritionObjective,
      dailyCalories: Number(g.daily_calories),
      proteinG:      Number(g.protein_g),
      carbsG:        Number(g.carbs_g),
      fatsG:         Number(g.fats_g),
      waterMl:       g.water_ml,
      heightCm:      g.height_cm ? Number(g.height_cm) : undefined,
      activityLevel: g.activity_level as ActivityLevel,
      updatedAt:     g.updated_at,
    } : null;

    set({ mealEntries, waterLogs, weightLogs, goals, loading: false, initialized: true });
  },

  clearNutritionData: () => set({
    mealEntries: [], waterLogs: [], weightLogs: [], goals: null,
    loading: false, initialized: false, newAchievements: [],
  }),

  clearNewAchievements: () => set({ newAchievements: [] }),

  // ── Meal entries ─────────────────────────────────────────────────────────

  addMealEntry: async (data) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const { data: row, error } = await supabase
      .from('meal_entries')
      .insert({
        user_id:    userId,
        date:       data.date,
        meal_type:  data.mealType,
        food_name:  data.foodName,
        quantity_g: data.quantityG ?? null,
        calories:   data.calories,
        protein:    data.protein,
        carbs:      data.carbs,
        fats:       data.fats,
      })
      .select()
      .single();

    if (error || !row) return;

    const entry: MealEntry = {
      id:         row.id,
      userId:     row.user_id,
      date:       row.date,
      mealType:   row.meal_type as MealType,
      foodName:   row.food_name,
      quantityG:  row.quantity_g ?? undefined,
      calories:   Number(row.calories),
      protein:    Number(row.protein),
      carbs:      Number(row.carbs),
      fats:       Number(row.fats),
      createdAt:  row.created_at,
    };

    set(s => ({ mealEntries: [entry, ...s.mealEntries] }));

    await awardXP(userId, NUTRITION_XP.ADD_MEAL_ENTRY);

    const allEntries = get().mealEntries;
    const goals = get().goals;

    if (allEntries.length === 1) await unlockAchievement(userId, NUTRITION_ACHIEVEMENT_IDS.FIRST_MEAL, set);

    // Count milestones — query DB total to cover entries older than the 60-day window
    const { count: totalMeals } = await supabase
      .from('meal_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if ((totalMeals ?? 0) >= 10) await unlockAchievement(userId, NUTRITION_ACHIEVEMENT_IDS.MEALS_10, set);
    if ((totalMeals ?? 0) >= 50) await unlockAchievement(userId, NUTRITION_ACHIEVEMENT_IDS.MEALS_50, set);

    // Streak milestones (60-day window is enough for any streak up to 60)
    const streak = mealStreak(allEntries);
    if (streak >= 7)  await unlockAchievement(userId, NUTRITION_ACHIEVEMENT_IDS.STREAK_MEALS_7, set);
    if (streak >= 21) await unlockAchievement(userId, NUTRITION_ACHIEVEMENT_IDS.STREAK_MEALS_21, set);

    if (goals) {
      const pStreak = proteinGoalStreak(allEntries, goals.proteinG);
      if (pStreak >= 7) await unlockAchievement(userId, NUTRITION_ACHIEVEMENT_IDS.PROTEIN_GOAL_7, set);

      const cStreak = calorieGoalStreak(allEntries, goals.dailyCalories);
      if (cStreak >= 7) await unlockAchievement(userId, NUTRITION_ACHIEVEMENT_IDS.CALORIE_GOAL_7, set);
    }
  },

  deleteMealEntry: async (id: string) => {
    const { error } = await supabase.from('meal_entries').delete().eq('id', id);
    if (!error) set(s => ({ mealEntries: s.mealEntries.filter(e => e.id !== id) }));
  },

  // ── Water ────────────────────────────────────────────────────────────────

  addWaterLog: async (date: string, amountMl: number) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const { data: row, error } = await supabase
      .from('water_logs')
      .insert({ user_id: userId, date, amount_ml: amountMl })
      .select()
      .single();

    if (error || !row) return;

    const log: WaterLog = {
      id:        row.id,
      userId:    row.user_id,
      date:      row.date,
      amountMl:  row.amount_ml,
      createdAt: row.created_at,
    };

    set(s => ({ waterLogs: [log, ...s.waterLogs] }));

    await awardXP(userId, NUTRITION_XP.ADD_MEAL_ENTRY / 2); // 5 XP per glass

    const allLogs = get().waterLogs;
    if (allLogs.length === 1) await unlockAchievement(userId, NUTRITION_ACHIEVEMENT_IDS.FIRST_WATER, set);

    const goals = get().goals;
    if (goals) {
      const total = get().getWaterTotalForDate(date);
      if (total >= goals.waterMl && total - amountMl < goals.waterMl) {
        await awardXP(userId, NUTRITION_XP.HIT_WATER_GOAL);
      }
      const wStreak = waterGoalStreak(allLogs, goals.waterMl);
      if (wStreak >= 7) await unlockAchievement(userId, NUTRITION_ACHIEVEMENT_IDS.WATER_GOAL_7, set);
    }
  },

  removeWaterLog: async (id: string) => {
    const { error } = await supabase.from('water_logs').delete().eq('id', id);
    if (!error) set(s => ({ waterLogs: s.waterLogs.filter(l => l.id !== id) }));
  },

  // ── Weight ───────────────────────────────────────────────────────────────

  addWeightLog: async (weightKg: number, measuredAt: string, notes = '') => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const { data: row, error } = await supabase
      .from('weight_logs')
      .insert({ user_id: userId, weight_kg: weightKg, measured_at: measuredAt, notes })
      .select()
      .single();

    if (error || !row) return;

    const log: WeightLog = {
      id:         row.id,
      userId:     row.user_id,
      weightKg:   Number(row.weight_kg),
      measuredAt: row.measured_at,
      notes:      row.notes ?? '',
      createdAt:  row.created_at,
    };

    set(s => ({ weightLogs: [log, ...s.weightLogs] }));

    await awardXP(userId, NUTRITION_XP.LOG_WEIGHT);

    const allLogs = get().weightLogs;
    if (allLogs.length === 1)  await unlockAchievement(userId, NUTRITION_ACHIEVEMENT_IDS.FIRST_WEIGHT, set);
    if (allLogs.length >= 10) await unlockAchievement(userId, NUTRITION_ACHIEVEMENT_IDS.WEIGHT_10, set);
  },

  deleteWeightLog: async (id: string) => {
    const { error } = await supabase.from('weight_logs').delete().eq('id', id);
    if (!error) set(s => ({ weightLogs: s.weightLogs.filter(l => l.id !== id) }));
  },

  // ── Goals ────────────────────────────────────────────────────────────────

  saveNutritionGoals: async (data) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const row = {
      user_id:        userId,
      objective:      data.objective,
      daily_calories: data.dailyCalories,
      protein_g:      data.proteinG,
      carbs_g:        data.carbsG,
      fats_g:         data.fatsG,
      water_ml:       data.waterMl,
      height_cm:      data.heightCm ?? null,
      activity_level: data.activityLevel,
      updated_at:     new Date().toISOString(),
    };

    const { error } = await supabase
      .from('nutrition_goals')
      .upsert(row, { onConflict: 'user_id' });

    if (error) return;

    const goals: NutritionGoals = {
      userId,
      objective:     data.objective,
      dailyCalories: data.dailyCalories,
      proteinG:      data.proteinG,
      carbsG:        data.carbsG,
      fatsG:         data.fatsG,
      waterMl:       data.waterMl,
      heightCm:      data.heightCm,
      activityLevel: data.activityLevel,
      updatedAt:     row.updated_at,
    };

    set({ goals });

    await awardXP(userId, NUTRITION_XP.SET_GOALS);

    // Unlock "goals set" achievement
    await unlockAchievement(userId, NUTRITION_ACHIEVEMENT_IDS.GOALS_SET, set);
  },

  // ── Computed selectors ───────────────────────────────────────────────────

  getMealEntriesForDate: (date: string) =>
    get().mealEntries.filter(e => e.date === date),

  getWaterTotalForDate: (date: string) =>
    get().waterLogs
      .filter(l => l.date === date)
      .reduce((acc, l) => acc + l.amountMl, 0),

  getDailySummary: (date: string): DailyNutritionSummary => {
    const entries = get().getMealEntriesForDate(date);
    return {
      calories: entries.reduce((a, e) => a + e.calories, 0),
      protein:  entries.reduce((a, e) => a + e.protein,  0),
      carbs:    entries.reduce((a, e) => a + e.carbs,    0),
      fats:     entries.reduce((a, e) => a + e.fats,     0),
      waterMl:  get().getWaterTotalForDate(date),
    };
  },
}));
