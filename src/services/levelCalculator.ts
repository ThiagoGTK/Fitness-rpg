// XP required to reach next level from current level
// Muscle: 100 * level * 1.25^(level-1)
export function xpForMuscleLevel(level: number): number {
  return Math.floor(100 * level * Math.pow(1.25, level - 1));
}

// Exercise: 50 * level * 1.3^(level-1)
export function xpForExerciseLevel(level: number): number {
  return Math.floor(50 * level * Math.pow(1.3, level - 1));
}

// User level: 500 * level * 1.2^(level-1)
export function xpForUserLevel(level: number): number {
  return Math.floor(500 * level * Math.pow(1.2, level - 1));
}

export interface LevelUpResult {
  newLevel: number;
  newXP: number;
  leveledUp: boolean;
  levelsGained: number;
}

export function processLevelUp(
  currentLevel: number,
  currentXP: number,
  xpToAdd: number,
  xpFn: (level: number) => number
): LevelUpResult {
  let level = currentLevel;
  let xp = currentXP + xpToAdd;
  let levelsGained = 0;

  while (xp >= xpFn(level)) {
    xp -= xpFn(level);
    level++;
    levelsGained++;
  }

  return { newLevel: level, newXP: xp, leveledUp: levelsGained > 0, levelsGained };
}

export function calculateUserLevel(totalXP: number): number {
  let level = 1;
  let accumulated = 0;
  while (true) {
    const needed = xpForUserLevel(level);
    if (accumulated + needed > totalXP) break;
    accumulated += needed;
    level++;
  }
  return level;
}

export function getXPProgress(currentXP: number, level: number, xpFn: (l: number) => number) {
  const required = xpFn(level);
  const pct = Math.min(100, Math.floor((currentXP / required) * 100));
  return { required, pct };
}
