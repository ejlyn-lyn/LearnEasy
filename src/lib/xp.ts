export function formatXp(value: number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "0";
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1);
}

export function getLevelInfo(value: number) {
  const xp = Number.isFinite(value) ? Math.max(0, value) : 0;
  let level = 0;

  while (levelThreshold(level + 1) <= xp) {
    level += 1;
  }

  const threshold = levelThreshold(level);
  const nextThreshold = levelThreshold(level + 1);
  const levelXp = Math.max(0, xp - threshold);
  const nextLevelXp = Math.max(0, nextThreshold - threshold);

  return {
    level,
    xp,
    threshold,
    nextThreshold,
    levelXp,
    nextLevelXp,
  };
}

export function levelThreshold(level: number) {
  if (level <= 0) return 0;
  return 10 * level * (level + 1) / 2;
}
