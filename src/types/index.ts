export type ExerciseType = 'strength' | 'endurance' | 'cardio' | 'mobility' | 'stretching';

export interface SecondaryMuscle {
  muscleId: string;
  xpPercentage: number; // 0-100
}

export interface Exercise {
  id: string;
  name: string;
  primaryMuscleId: string;
  secondaryMuscles: SecondaryMuscle[];
  type: ExerciseType;
  notes: string;
  level: number;
  currentXP: number;
  totalXPEarned: number;
  timesPerformed: number;
  createdAt: string;
}

export interface WorkoutSet {
  reps: number;
  weight: number; // kg, 0 = bodyweight
}

export interface WorkoutEntryInput {
  exerciseId: string;
  sets: WorkoutSet[];
  restTime?: number; // seconds
  duration?: number; // minutes
  difficulty: number; // 1-10
  notes: string;
}

export interface WorkoutEntry extends WorkoutEntryInput {
  xpGained: number;
  muscleXP: Record<string, number>;
  isPR: boolean;
}

export interface WorkoutSessionInput {
  date: string;
  entries: WorkoutEntryInput[];
  notes: string;
  trainerPlanId?: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  entries: WorkoutEntry[];
  totalXP: number;
  notes: string;
  trainerPlanId?: string;
}

export interface MuscleGroup {
  id: string;
  name: string;
  level: number;
  currentXP: number;
  totalXPEarned: number;
  icon: string;
  color: string; // hex color
}

export interface PersonalRecord {
  exerciseId: string;
  maxWeight: number;
  maxVolume: number;
  maxRepsInSet: number;
  maxSetsInSession: number;
  date: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface LevelUpEvent {
  id: string;
  type: 'muscle' | 'exercise';
  entityId: string;
  entityName: string;
  newLevel: number;
}

export type Sex = 'male' | 'female' | 'other';
export type UserRole = 'admin' | 'trainer' | 'student';

export interface UserProfile {
  name: string;
  level: number;
  totalXP: number;
  weeklyXP: number;
  streak: number;
  longestStreak: number;
  lastTrainedDate?: string;
  joinedAt: string;
  birthDate?: string; // YYYY-MM-DD
  sex?: Sex;
  email?: string;
  role: UserRole;
  trainerCode?: string;
  mustChangePassword: boolean;
  isTrainer?: boolean; // kept for backwards compat — use role === 'trainer' instead
  trainerId?: string;
}

export interface TrainerPlanExercise {
  id: string;
  planId: string;
  exerciseId: string | null;
  exerciseName: string;
  primaryMuscleId: string;
  secondaryMuscles: SecondaryMuscle[];
  exerciseType: string;
  sets: number;
  reps: number;
  weight: number;
  restSeconds?: number;
  notes: string;
  orderIndex: number;
}

export interface TrainerPlan {
  id: string;
  trainerId: string;
  studentId: string;
  planName: string;
  scheduledDate?: string;
  notes: string;
  exercises: TrainerPlanExercise[];
  createdAt: string;
  updatedAt: string;
}

export interface TrainerStudentSummary {
  id: string;
  name: string;
  email?: string;
  lastTrainedDate?: string;
  totalWorkouts: number;
}

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  strength: 'Força',
  endurance: 'Resistência',
  cardio: 'Cardio',
  mobility: 'Mobilidade',
  stretching: 'Alongamento',
};
