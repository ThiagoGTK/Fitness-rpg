/**
 * Nutrition calculation utilities
 *
 * BMR formula: Mifflin-St Jeor (1990) — most validated for the general population.
 *   Male:   BMR = 10W + 6.25H - 5A + 5
 *   Female: BMR = 10W + 6.25H - 5A - 161
 *   where W = weight (kg), H = height (cm), A = age (years)
 *
 * TDEE = BMR × activity multiplier
 * Calorie target adjusted ±250-500 kcal based on objective.
 * Macros distributed per evidence-based sport nutrition guidelines.
 */

import type { ActivityLevel, NutritionObjective } from '../types/nutrition';

// ── Activity multipliers (Ainsworth et al.) ───────────────────────────────────
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,   // desk job, no exercise
  light:       1.375, // light exercise 1-3 days/week
  moderate:    1.55,  // moderate exercise 3-5 days/week
  active:      1.725, // hard exercise 6-7 days/week
  very_active: 1.9,   // very hard exercise or physical job + training
};

// ── Calorie adjustments per goal ─────────────────────────────────────────────
const CALORIE_DELTA: Record<NutritionObjective, number> = {
  muscle_gain: +400,  // moderate surplus for lean bulk
  weight_loss: -500,  // ~0.5 kg/week loss
  definition:  -250,  // mild deficit to preserve muscle mass
  maintenance:    0,
};

// ── Protein targets (g per kg of body weight) ────────────────────────────────
// Higher during cut phases to protect lean mass.
const PROTEIN_PER_KG: Record<NutritionObjective, number> = {
  muscle_gain: 2.0,
  weight_loss: 2.2,
  definition:  2.2,
  maintenance: 1.8,
};

// ── Public result type ────────────────────────────────────────────────────────
export interface MacroResult {
  bmr:      number; // basal metabolic rate (kcal)
  tdee:     number; // total daily energy expenditure (kcal)
  calories: number; // adjusted calorie target (kcal)
  protein:  number; // grams
  carbs:    number; // grams
  fats:     number; // grams
}

/**
 * Calculate BMR, TDEE, and macro targets.
 * Returns rounded integer values suitable for display.
 */
export function calculateMacros(params: {
  sex:           'male' | 'female' | 'other';
  age:           number;
  weightKg:      number;
  heightCm:      number;
  activityLevel: ActivityLevel;
  objective:     NutritionObjective;
}): MacroResult {
  const { sex, age, weightKg, heightCm, activityLevel, objective } = params;

  // Mifflin-St Jeor BMR
  const baseBmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = sex === 'female' ? baseBmr - 161 : baseBmr + 5;

  const tdee     = bmr * ACTIVITY_MULTIPLIERS[activityLevel];
  let   calories = tdee + CALORIE_DELTA[objective];

  // Safety floor — below these values micronutrient needs cannot be met
  const minCalories = sex === 'female' ? 1200 : 1500;
  calories = Math.max(calories, minCalories);

  // Protein: set by goal, using body weight
  const protein = Math.round(weightKg * PROTEIN_PER_KG[objective]);

  // Fats: ~27% of total calories (supports hormonal function)
  const fats = Math.round((calories * 0.27) / 9);

  // Carbohydrates: fill remaining calories (minimum 50 g for brain function)
  const remainingCalories = calories - protein * 4 - fats * 9;
  const carbs = Math.round(Math.max(remainingCalories / 4, 50));

  return {
    bmr:      Math.round(bmr),
    tdee:     Math.round(tdee),
    calories: Math.round(calories),
    protein,
    carbs,
    fats,
  };
}

// ── XP rewards for nutrition actions ─────────────────────────────────────────
export const NUTRITION_XP = {
  ADD_MEAL_ENTRY:     10, // per food item logged
  HIT_PROTEIN_GOAL:   50, // daily protein target met
  HIT_WATER_GOAL:     30, // daily water target met
  LOG_WEIGHT:         20, // body weight recorded
  SET_GOALS:          15, // nutrition goals saved
  HIT_CALORIE_GOAL:   40, // within 10% of calorie target
} as const;

// ── Nutrition achievement IDs ─────────────────────────────────────────────────
// These map to rows in user_achievements. Prefixed with "nutrition_" to avoid
// collisions with workout achievements.
export const NUTRITION_ACHIEVEMENT_IDS = {
  FIRST_MEAL:       'nutrition_first_meal',
  FIRST_WATER:      'nutrition_first_water',
  FIRST_WEIGHT:     'nutrition_first_weight',
  GOALS_SET:        'nutrition_goals_set',
  // TODO: 7-day streaks — requires checking consecutive dates in meal/water logs
  // STREAK_MEALS_7:   'nutrition_streak_meals_7',
  // STREAK_PROTEIN_7: 'nutrition_streak_protein_7',
  // STREAK_WATER_7:   'nutrition_streak_water_7',
} as const;

// ── Water portion presets (ml) ────────────────────────────────────────────────
export const WATER_PRESETS = [150, 200, 300, 350, 500, 750] as const;

// ── Nutrient caloric density (kcal/g) ────────────────────────────────────────
export const KCAL_PER_G = { protein: 4, carbs: 4, fats: 9 } as const;
