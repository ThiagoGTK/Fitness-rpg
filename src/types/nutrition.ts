// ── Nutrition module types ────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'supper';
export type NutritionObjective = 'muscle_gain' | 'weight_loss' | 'maintenance' | 'definition';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Café da manhã',
  lunch:     'Almoço',
  snack:     'Lanche',
  dinner:    'Jantar',
  supper:    'Ceia',
};

export const MEAL_EMOJIS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch:     '☀️',
  snack:     '🍎',
  dinner:    '🌙',
  supper:    '⭐',
};

export const OBJECTIVE_LABELS: Record<NutritionObjective, string> = {
  muscle_gain: 'Ganho de massa muscular',
  weight_loss: 'Emagrecimento',
  maintenance: 'Manutenção',
  definition:  'Definição',
};

export const OBJECTIVE_COLORS: Record<NutritionObjective, string> = {
  muscle_gain: '#a855f7',
  weight_loss: '#0ea5e9',
  maintenance: '#10b981',
  definition:  '#f97316',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   'Sedentário (sem exercício)',
  light:       'Leve (1-3x/semana)',
  moderate:    'Moderado (3-5x/semana)',
  active:      'Ativo (6-7x/semana)',
  very_active: 'Muito ativo (2x/dia)',
};

// ── DB-backed types ───────────────────────────────────────────────────────────

export interface MealEntry {
  id:         string;
  userId:     string;
  date:       string; // YYYY-MM-DD
  mealType:   MealType;
  foodName:   string;
  quantityG?: number;
  calories:   number;
  protein:    number;
  carbs:      number;
  fats:       number;
  createdAt:  string;
}

export interface WaterLog {
  id:        string;
  userId:    string;
  date:      string; // YYYY-MM-DD
  amountMl:  number;
  createdAt: string;
}

export interface WeightLog {
  id:         string;
  userId:     string;
  weightKg:   number;
  measuredAt: string; // YYYY-MM-DD
  notes:      string;
  createdAt:  string;
}

export interface NutritionGoals {
  userId:        string;
  objective:     NutritionObjective;
  dailyCalories: number;
  proteinG:      number;
  carbsG:        number;
  fatsG:         number;
  waterMl:       number;
  heightCm?:     number;
  activityLevel: ActivityLevel;
  updatedAt:     string;
}

// ── Computed helpers ──────────────────────────────────────────────────────────

export interface DailyNutritionSummary {
  calories: number;
  protein:  number;
  carbs:    number;
  fats:     number;
  waterMl:  number;
}

// ── Trainer diet plan types ───────────────────────────────────────────────────

export interface TrainerDietPlanItem {
  id:         string;
  planId:     string;
  mealType:   MealType;
  foodName:   string;
  quantityG?: number;
  calories:   number;
  protein:    number;
  carbs:      number;
  fats:       number;
  notes:      string;
  orderIndex: number;
}

export interface TrainerDietPlan {
  id:        string;
  trainerId: string;
  studentId: string;
  planName:  string;
  objective: NutritionObjective;
  notes:     string;
  items:     TrainerDietPlanItem[];
  createdAt: string;
  updatedAt: string;
}

// ── RPG Attribute integration (prepared for future) ──────────────────────────
// TODO: Wire these into the RPG system when attributes module is created.
// - Força (Strength):    boosted by workout XP + daily protein goal met
// - Resistência (Endurance): boosted by workout XP + water goal met
// - Recuperação (Recovery): boosted by consistent meal logging (7-day streak)
// - Energia (Energy):    boosted by being within ±10% of calorie target

export type RpgAttributeType = 'strength' | 'endurance' | 'recovery' | 'energy';

export interface RpgAttributeBonus {
  attribute: RpgAttributeType;
  bonus: number;
  source: 'nutrition' | 'workout';
  reason: string;
}
