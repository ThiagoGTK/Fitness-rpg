import type { MuscleGroup, Exercise, WorkoutSession, PersonalRecord, UserProfile } from '../types';
import { initAchievements } from '../services/achievementChecker';

export const SEED_MUSCLES: MuscleGroup[] = [
  { id: 'peito', name: 'Peito', level: 3, currentXP: 180, totalXPEarned: 1180, icon: '🫁', color: '#a855f7' },
  { id: 'costas', name: 'Costas', level: 2, currentXP: 210, totalXPEarned: 710, icon: '🔙', color: '#3b82f6' },
  { id: 'biceps', name: 'Bíceps', level: 2, currentXP: 140, totalXPEarned: 640, icon: '💪', color: '#ef4444' },
  { id: 'triceps', name: 'Tríceps', level: 2, currentXP: 80, totalXPEarned: 580, icon: '🔱', color: '#f97316' },
  { id: 'ombros', name: 'Ombros', level: 1, currentXP: 70, totalXPEarned: 170, icon: '🙌', color: '#eab308' },
  { id: 'quadriceps', name: 'Quadríceps', level: 2, currentXP: 50, totalXPEarned: 550, icon: '🦵', color: '#10b981' },
  { id: 'posteriores', name: 'Posterior', level: 1, currentXP: 60, totalXPEarned: 160, icon: '🦵', color: '#06b6d4' },
  { id: 'gluteos', name: 'Glúteos', level: 1, currentXP: 90, totalXPEarned: 190, icon: '🍑', color: '#ec4899' },
  { id: 'panturrilha', name: 'Panturrilha', level: 1, currentXP: 40, totalXPEarned: 40, icon: '🦶', color: '#22d3ee' },
  { id: 'abdomen', name: 'Abdômen', level: 2, currentXP: 60, totalXPEarned: 560, icon: '⚡', color: '#84cc16' },
  { id: 'lombar', name: 'Lombar', level: 1, currentXP: 30, totalXPEarned: 30, icon: '🔩', color: '#f59e0b' },
  { id: 'antebraco', name: 'Antebraço', level: 1, currentXP: 50, totalXPEarned: 50, icon: '🤜', color: '#6ee7b7' },
  { id: 'trapezio', name: 'Trapézio', level: 1, currentXP: 20, totalXPEarned: 20, icon: '🗻', color: '#94a3b8' },
  { id: 'cardio',   name: 'Cardio',   level: 1, currentXP: 0,  totalXPEarned: 0,  icon: '❤️', color: '#ef4444' },
];

export const SEED_EXERCISES: Exercise[] = [
  {
    id: 'supino-reto', name: 'Supino Reto', primaryMuscleId: 'peito',
    secondaryMuscles: [{ muscleId: 'triceps', xpPercentage: 40 }, { muscleId: 'ombros', xpPercentage: 30 }],
    type: 'strength', notes: 'Exercício clássico para peito', level: 4, currentXP: 30,
    totalXPEarned: 1130, timesPerformed: 12, createdAt: '2025-04-01T00:00:00.000Z',
  },
  {
    id: 'supino-inclinado', name: 'Supino Inclinado', primaryMuscleId: 'peito',
    secondaryMuscles: [{ muscleId: 'triceps', xpPercentage: 35 }, { muscleId: 'ombros', xpPercentage: 25 }],
    type: 'strength', notes: 'Foco na parte superior do peito', level: 3, currentXP: 40,
    totalXPEarned: 590, timesPerformed: 8, createdAt: '2025-04-01T00:00:00.000Z',
  },
  {
    id: 'crucifixo', name: 'Crucifixo', primaryMuscleId: 'peito',
    secondaryMuscles: [{ muscleId: 'ombros', xpPercentage: 20 }],
    type: 'strength', notes: 'Isolamento para peito', level: 2, currentXP: 30,
    totalXPEarned: 330, timesPerformed: 6, createdAt: '2025-04-01T00:00:00.000Z',
  },
  {
    id: 'agachamento', name: 'Agachamento', primaryMuscleId: 'quadriceps',
    secondaryMuscles: [
      { muscleId: 'gluteos', xpPercentage: 70 },
      { muscleId: 'posteriores', xpPercentage: 50 },
      { muscleId: 'panturrilha', xpPercentage: 20 },
      { muscleId: 'lombar', xpPercentage: 25 },
    ],
    type: 'strength', notes: 'Rei dos exercícios', level: 3, currentXP: 20,
    totalXPEarned: 690, timesPerformed: 9, createdAt: '2025-04-01T00:00:00.000Z',
  },
  {
    id: 'leg-press', name: 'Leg Press', primaryMuscleId: 'quadriceps',
    secondaryMuscles: [{ muscleId: 'gluteos', xpPercentage: 50 }, { muscleId: 'posteriores', xpPercentage: 30 }],
    type: 'strength', notes: '', level: 2, currentXP: 10,
    totalXPEarned: 310, timesPerformed: 5, createdAt: '2025-04-01T00:00:00.000Z',
  },
  {
    id: 'levantamento-terra', name: 'Levantamento Terra', primaryMuscleId: 'costas',
    secondaryMuscles: [
      { muscleId: 'posteriores', xpPercentage: 60 },
      { muscleId: 'gluteos', xpPercentage: 50 },
      { muscleId: 'lombar', xpPercentage: 80 },
      { muscleId: 'trapezio', xpPercentage: 30 },
    ],
    type: 'strength', notes: 'Movimento fundamental', level: 3, currentXP: 60,
    totalXPEarned: 760, timesPerformed: 7, createdAt: '2025-04-01T00:00:00.000Z',
  },
  {
    id: 'remada-curvada', name: 'Remada Curvada', primaryMuscleId: 'costas',
    secondaryMuscles: [{ muscleId: 'biceps', xpPercentage: 40 }, { muscleId: 'lombar', xpPercentage: 30 }],
    type: 'strength', notes: 'Ótimo para espessura das costas', level: 3, currentXP: 10,
    totalXPEarned: 560, timesPerformed: 8, createdAt: '2025-04-01T00:00:00.000Z',
  },
  {
    id: 'pulldown', name: 'Pulldown (Puxada)', primaryMuscleId: 'costas',
    secondaryMuscles: [{ muscleId: 'biceps', xpPercentage: 40 }],
    type: 'strength', notes: 'Foco no grande dorsal', level: 3, currentXP: 45,
    totalXPEarned: 495, timesPerformed: 7, createdAt: '2025-04-01T00:00:00.000Z',
  },
  {
    id: 'rosca-direta', name: 'Rosca Direta', primaryMuscleId: 'biceps',
    secondaryMuscles: [{ muscleId: 'antebraco', xpPercentage: 30 }],
    type: 'strength', notes: '', level: 3, currentXP: 20,
    totalXPEarned: 420, timesPerformed: 9, createdAt: '2025-04-01T00:00:00.000Z',
  },
  {
    id: 'rosca-martelo', name: 'Rosca Martelo', primaryMuscleId: 'biceps',
    secondaryMuscles: [{ muscleId: 'antebraco', xpPercentage: 50 }],
    type: 'strength', notes: '', level: 2, currentXP: 25,
    totalXPEarned: 375, timesPerformed: 6, createdAt: '2025-04-01T00:00:00.000Z',
  },
  {
    id: 'triceps-pulley', name: 'Tríceps Pulley', primaryMuscleId: 'triceps',
    secondaryMuscles: [],
    type: 'strength', notes: '', level: 3, currentXP: 15,
    totalXPEarned: 465, timesPerformed: 8, createdAt: '2025-04-01T00:00:00.000Z',
  },
  {
    id: 'desenvolvimento', name: 'Desenvolvimento', primaryMuscleId: 'ombros',
    secondaryMuscles: [{ muscleId: 'triceps', xpPercentage: 40 }],
    type: 'strength', notes: 'Desenvolvimento com halteres ou barra', level: 2, currentXP: 15,
    totalXPEarned: 265, timesPerformed: 5, createdAt: '2025-04-01T00:00:00.000Z',
  },
  {
    id: 'elevacao-lateral', name: 'Elevação Lateral', primaryMuscleId: 'ombros',
    secondaryMuscles: [],
    type: 'strength', notes: 'Isolamento para deltóide lateral', level: 2, currentXP: 10,
    totalXPEarned: 160, timesPerformed: 4, createdAt: '2025-04-01T00:00:00.000Z',
  },
  {
    id: 'abdominais', name: 'Abdominais', primaryMuscleId: 'abdomen',
    secondaryMuscles: [{ muscleId: 'lombar', xpPercentage: 20 }],
    type: 'strength', notes: '', level: 2, currentXP: 35,
    totalXPEarned: 385, timesPerformed: 8, createdAt: '2025-04-01T00:00:00.000Z',
  },
  {
    id: 'panturrilha-pe', name: 'Panturrilha em Pé', primaryMuscleId: 'panturrilha',
    secondaryMuscles: [],
    type: 'strength', notes: '', level: 1, currentXP: 25,
    totalXPEarned: 25, timesPerformed: 3, createdAt: '2025-04-01T00:00:00.000Z',
  },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const SEED_WORKOUTS: WorkoutSession[] = [
  {
    id: 'w1', date: daysAgo(21), totalXP: 312, notes: 'Bom treino de peito',
    entries: [
      {
        exerciseId: 'supino-reto', difficulty: 7, notes: '', restTime: 90, duration: 15,
        sets: [{ reps: 10, weight: 40 }, { reps: 10, weight: 40 }, { reps: 8, weight: 45 }, { reps: 8, weight: 45 }],
        xpGained: 190, muscleXP: { peito: 190, triceps: 76, ombros: 57 }, isPR: true,
      },
      {
        exerciseId: 'crucifixo', difficulty: 6, notes: '', restTime: 60,
        sets: [{ reps: 12, weight: 14 }, { reps: 12, weight: 14 }, { reps: 10, weight: 14 }],
        xpGained: 122, muscleXP: { peito: 122, ombros: 24 }, isPR: true,
      },
    ],
  },
  {
    id: 'w2', date: daysAgo(18), totalXP: 445, notes: 'Treino de costas intenso',
    entries: [
      {
        exerciseId: 'remada-curvada', difficulty: 8, notes: 'Senti bem no dorsal', restTime: 120,
        sets: [{ reps: 8, weight: 50 }, { reps: 8, weight: 50 }, { reps: 6, weight: 55 }, { reps: 6, weight: 55 }],
        xpGained: 240, muscleXP: { costas: 240, biceps: 96, lombar: 72 }, isPR: true,
      },
      {
        exerciseId: 'pulldown', difficulty: 7, notes: '', restTime: 90,
        sets: [{ reps: 10, weight: 45 }, { reps: 10, weight: 45 }, { reps: 8, weight: 50 }],
        xpGained: 205, muscleXP: { costas: 205, biceps: 82 }, isPR: false,
      },
    ],
  },
  {
    id: 'w3', date: daysAgo(14), totalXP: 380, notes: '',
    entries: [
      {
        exerciseId: 'agachamento', difficulty: 9, notes: 'Novo recorde!', restTime: 150,
        sets: [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 6, weight: 70 }, { reps: 6, weight: 70 }],
        xpGained: 380, muscleXP: { quadriceps: 380, gluteos: 266, posteriores: 190, panturrilha: 76, lombar: 95 }, isPR: true,
      },
    ],
  },
  {
    id: 'w4', date: daysAgo(10), totalXP: 290, notes: 'Dia de braço',
    entries: [
      {
        exerciseId: 'rosca-direta', difficulty: 7, notes: '', restTime: 60,
        sets: [{ reps: 12, weight: 20 }, { reps: 12, weight: 20 }, { reps: 10, weight: 22 }],
        xpGained: 160, muscleXP: { biceps: 160, antebraco: 48 }, isPR: true,
      },
      {
        exerciseId: 'triceps-pulley', difficulty: 6, notes: '', restTime: 60,
        sets: [{ reps: 12, weight: 25 }, { reps: 12, weight: 25 }, { reps: 10, weight: 30 }],
        xpGained: 130, muscleXP: { triceps: 130 }, isPR: false,
      },
    ],
  },
  {
    id: 'w5', date: daysAgo(5), totalXP: 520, notes: 'Treino completo!',
    entries: [
      {
        exerciseId: 'supino-reto', difficulty: 8, notes: 'Aumentei a carga', restTime: 90,
        sets: [{ reps: 8, weight: 50 }, { reps: 8, weight: 50 }, { reps: 6, weight: 55 }, { reps: 6, weight: 55 }],
        xpGained: 250, muscleXP: { peito: 250, triceps: 100, ombros: 75 }, isPR: true,
      },
      {
        exerciseId: 'levantamento-terra', difficulty: 9, notes: '', restTime: 180,
        sets: [{ reps: 5, weight: 80 }, { reps: 5, weight: 80 }, { reps: 5, weight: 80 }],
        xpGained: 270, muscleXP: { costas: 270, posteriores: 162, gluteos: 135, lombar: 216, trapezio: 81 }, isPR: true,
      },
    ],
  },
];

export const SEED_RECORDS: PersonalRecord[] = [
  { exerciseId: 'supino-reto', maxWeight: 55, maxVolume: 940, maxRepsInSet: 10, maxSetsInSession: 4, date: daysAgo(5) },
  { exerciseId: 'agachamento', maxWeight: 70, maxVolume: 2040, maxRepsInSet: 8, maxSetsInSession: 4, date: daysAgo(14) },
  { exerciseId: 'remada-curvada', maxWeight: 55, maxVolume: 1030, maxRepsInSet: 8, maxSetsInSession: 4, date: daysAgo(18) },
  { exerciseId: 'levantamento-terra', maxWeight: 80, maxVolume: 1200, maxRepsInSet: 5, maxSetsInSession: 3, date: daysAgo(5) },
  { exerciseId: 'rosca-direta', maxWeight: 22, maxVolume: 574, maxRepsInSet: 12, maxSetsInSession: 3, date: daysAgo(10) },
  { exerciseId: 'pulldown', maxWeight: 50, maxVolume: 1050, maxRepsInSet: 10, maxSetsInSession: 3, date: daysAgo(18) },
  { exerciseId: 'triceps-pulley', maxWeight: 30, maxVolume: 900, maxRepsInSet: 12, maxSetsInSession: 3, date: daysAgo(10) },
];

export const SEED_USER: UserProfile = {
  name: 'Atleta',
  level: 3,
  totalXP: 1947,
  weeklyXP: 520,
  streak: 2,
  longestStreak: 5,
  lastTrainedDate: daysAgo(5),
  joinedAt: daysAgo(30),
};

export function buildSeedState() {
  const achievements = initAchievements();
  // Pre-unlock some achievements for the seed data
  const unlock = (id: string) => {
    const a = achievements.find(x => x.id === id);
    if (a) a.unlockedAt = daysAgo(20);
  };
  unlock('first_workout');
  unlock('five_workouts');
  unlock('first_pr');

  return {
    muscles: SEED_MUSCLES,
    exercises: SEED_EXERCISES,
    workouts: SEED_WORKOUTS,
    achievements,
    personalRecords: SEED_RECORDS,
    user: SEED_USER,
  };
}
