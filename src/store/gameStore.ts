import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  MuscleGroup, Exercise, WorkoutSession, WorkoutEntry,
  WorkoutSessionInput, Achievement, PersonalRecord, LevelUpEvent, UserProfile,
} from '../types';
import { buildSeedState } from '../data/seedData';
import { calculateEntryXP, calcVolume, calcMaxWeight } from '../services/xpCalculator';
import {
  processLevelUp, xpForMuscleLevel, xpForExerciseLevel, calculateUserLevel,
} from '../services/levelCalculator';
import { checkAchievements } from '../services/achievementChecker';

let _uid = Date.now();
function uid() { return (++_uid).toString(36); }

interface GameStore {
  muscles: MuscleGroup[];
  exercises: Exercise[];
  workouts: WorkoutSession[];
  achievements: Achievement[];
  personalRecords: PersonalRecord[];
  user: UserProfile;
  pendingLevelUps: LevelUpEvent[];

  addWorkout: (input: WorkoutSessionInput) => void;
  addExercise: (data: Omit<Exercise, 'id' | 'level' | 'currentXP' | 'totalXPEarned' | 'timesPerformed' | 'createdAt'>) => void;
  updateExercise: (id: string, data: Partial<Pick<Exercise, 'name' | 'primaryMuscleId' | 'secondaryMuscles' | 'type' | 'notes'>>) => void;
  deleteExercise: (id: string) => void;
  dismissLevelUp: (id: string) => void;
  resetData: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...buildSeedState(),
      pendingLevelUps: [],

      addWorkout: (input) => {
        const state = get();
        const sessionId = uid();
        const date = input.date || new Date().toISOString();

        const newMuscles = state.muscles.map(m => ({ ...m }));
        const newExercises = state.exercises.map(e => ({ ...e }));
        const newRecords = state.personalRecords.map(r => ({ ...r }));
        const levelUps: LevelUpEvent[] = [];
        const entries: WorkoutEntry[] = [];
        let totalXP = 0;

        for (const entryInput of input.entries) {
          const exIdx = newExercises.findIndex(e => e.id === entryInput.exerciseId);
          if (exIdx === -1) continue;
          const exercise = newExercises[exIdx];

          const { exerciseXP, muscleXPMap, isPR } = calculateEntryXP(
            entryInput, exercise, state.workouts
          );

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
            newMuscles[mIdx] = {
              ...muscle,
              level: mLvl.newLevel,
              currentXP: mLvl.newXP,
              totalXPEarned: muscle.totalXPEarned + xp,
            };
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
            newRecords.push({
              exerciseId: exercise.id, maxWeight: maxW, maxVolume: volume,
              maxRepsInSet: maxReps, maxSetsInSession: entryInput.sets.length, date,
            });
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
          entries.push({ ...entryInput, xpGained: exerciseXP, muscleXP: muscleXPMap, isPR });
        }

        const session: WorkoutSession = { id: sessionId, date, entries, totalXP, notes: input.notes };

        // Update streak
        const u = state.user;
        const today = date.slice(0, 10);
        const yesterday = new Date(new Date(date).getTime() - 86400000).toISOString().slice(0, 10);
        const lastDay = u.lastTrainedDate?.slice(0, 10);
        let newStreak = u.streak;
        if (lastDay !== today) {
          newStreak = lastDay === yesterday ? u.streak + 1 : 1;
        }

        const newTotalXP = u.totalXP + totalXP;

        const newAchievements = checkAchievements(
          state.achievements,
          [session, ...state.workouts],
          newMuscles,
          newExercises,
          newRecords
        );

        // Weekly XP: sum XP from sessions in the last 7 days
        const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
        const weeklyXP = [session, ...state.workouts]
          .filter(s => s.date >= cutoff)
          .reduce((sum, s) => sum + s.totalXP, 0);

        set({
          muscles: newMuscles,
          exercises: newExercises,
          workouts: [session, ...state.workouts],
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

      addExercise: (data) => {
        const exercise: Exercise = {
          id: uid(), ...data,
          level: 1, currentXP: 0, totalXPEarned: 0, timesPerformed: 0,
          createdAt: new Date().toISOString(),
        };
        set(s => ({ exercises: [...s.exercises, exercise] }));
      },

      updateExercise: (id, data) => {
        set(s => ({ exercises: s.exercises.map(e => e.id === id ? { ...e, ...data } : e) }));
      },

      deleteExercise: (id) => {
        set(s => ({ exercises: s.exercises.filter(e => e.id !== id) }));
      },

      dismissLevelUp: (id) => {
        set(s => ({ pendingLevelUps: s.pendingLevelUps.filter(e => e.id !== id) }));
      },

      resetData: () => {
        set({ ...buildSeedState(), pendingLevelUps: [] });
      },
    }),
    { name: 'fitness-rpg-v1' }
  )
);
