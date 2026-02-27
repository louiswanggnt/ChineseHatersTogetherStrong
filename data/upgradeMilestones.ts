/**
 * 升級里程碑：擊殺數達此序列時觸發一次升級。
 * 10, 20, 30, 50, 80, 130, 210... (a₀=10, a₁=20, aₙ = aₙ₋₁ + aₙ₋₂)
 */
const FIB_BASE = [10, 20];

function generateMilestones(maxKills: number): number[] {
  const out = [...FIB_BASE];
  while (out[out.length - 1] + out[out.length - 2] <= maxKills) {
    out.push(out[out.length - 1] + out[out.length - 2]);
  }
  return out;
}

const CACHE_MAX = 5000;
const MILESTONES = generateMilestones(CACHE_MAX);

export function getUpgradeMilestones(): number[] {
  return [...MILESTONES];
}

export function getNextUpgradeMilestone(lastUpgradeMilestone: number): number | null {
  for (const m of MILESTONES) {
    if (m > lastUpgradeMilestone) return m;
  }
  return null;
}

export function getMilestoneToTrigger(totalKillCount: number, lastUpgradeMilestone: number): number | null {
  const next = getNextUpgradeMilestone(lastUpgradeMilestone);
  if (next == null) return null;
  if (totalKillCount >= next) return next;
  return null;
}
