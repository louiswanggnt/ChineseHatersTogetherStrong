import type { EnemyTypeConfig } from '../types';

/**
 * 預設 5 種敵人類別，每種顏色與參數不同。
 * 可在此追加或修改種類。
 */
export const ENEMY_TYPES: EnemyTypeConfig[] = [
  {
    id: 'normal',
    color: 0xff0000, // 紅
    HP_MULTIPLIER: 1,
    SPEED_MULTIPLIER: 1,
    SIZE_MULTIPLIER: 1,
    ATK_MULTIPLIER: 1,
    ATK_SPEED_MULTIPLIER: 1,
    ATK_TYPE: 'SUSTAINED',
  },

  {
    id: 'bomb',
    color: 0x00cc66, // 綠
    HP_MULTIPLIER: 0.7,
    SPEED_MULTIPLIER: 3,
    SIZE_MULTIPLIER: 0.5,
    ATK_MULTIPLIER: 5,
    ATK_SPEED_MULTIPLIER: 1,
    ATK_TYPE: 'ONE_SHOT',
  },
  {
    id: 'doom',
    color: 0xff6600, // 橘
    HP_MULTIPLIER: 2,
    SPEED_MULTIPLIER: 0.5,
    SIZE_MULTIPLIER: 1,
    ATK_MULTIPLIER: 3,
    ATK_SPEED_MULTIPLIER: 0.2,
    ATK_TYPE: 'SUSTAINED',
  },
  {
    id: 'small_boss',
    color: 0x8b008b, // 紫
    HP_MULTIPLIER: 20,
    SPEED_MULTIPLIER: 0.2,
    SIZE_MULTIPLIER: 3,
    ATK_MULTIPLIER: 3,
    ATK_SPEED_MULTIPLIER: 0.7,
    ATK_TYPE: 'SUSTAINED',
  },
  {
    id: 'big_boss',
    color: 0x8b008b, // 紫
    HP_MULTIPLIER: 50,
    SPEED_MULTIPLIER: 0.1,
    SIZE_MULTIPLIER: 5,
    ATK_MULTIPLIER: 10,
    ATK_SPEED_MULTIPLIER: 0.5,
    ATK_TYPE: 'SUSTAINED',
  },
  // 物理堆疊模式專用：步兵、坦克、飛機
  {
    id: 'infantry',
    color: 0x4169e1, // 皇家藍
    HP_MULTIPLIER: 0.8,
    SPEED_MULTIPLIER: 1.4,
    SIZE_MULTIPLIER: 0.8,
    ATK_MULTIPLIER: 4,
    ATK_SPEED_MULTIPLIER: 1,
    ATK_TYPE: 'ONE_SHOT',
    MOVEMENT_TYPE: 'ground',
  },
  {
    id: 'tank',
    color: 0x2e8b57, // 海綠
    HP_MULTIPLIER: 2.5,
    SPEED_MULTIPLIER: 0.4,
    SIZE_MULTIPLIER: 1.4,
    ATK_MULTIPLIER: 2,
    ATK_SPEED_MULTIPLIER: 0.3,
    ATK_TYPE: 'SUSTAINED',
    MOVEMENT_TYPE: 'ranged',
  },
  {
    id: 'aircraft',
    color: 0x9370db, // 中紫
    HP_MULTIPLIER: 1.2,
    SPEED_MULTIPLIER: 1.2,
    SIZE_MULTIPLIER: 0.9,
    ATK_MULTIPLIER: 3,
    ATK_SPEED_MULTIPLIER: 0.5,
    ATK_TYPE: 'SUSTAINED',
    MOVEMENT_TYPE: 'aerial',
  },
];

export const ENEMY_TYPE_IDS = ENEMY_TYPES.map((t) => t.id);

/** PVZ/CENTRAL 模式使用的敵人類型（不載入 infantry/tank/aircraft 圖檔，避免 404 阻塞） */
export const ENEMY_TYPE_IDS_PVZ_CENTRAL = ['normal', 'bomb', 'doom', 'small_boss', 'big_boss'] as const;

/** 物理堆疊模式使用的敵人類型（不載入 normal/bomb/doom 等圖檔） */
export const ENEMY_TYPE_IDS_STACK = ['infantry', 'tank', 'aircraft'] as const;

const byId = new Map<string, EnemyTypeConfig>(ENEMY_TYPES.map((t) => [t.id, t]));

export function getEnemyType(id: string): EnemyTypeConfig {
  const t = byId.get(id);
  if (!t) throw new Error(`Unknown enemy type: ${id}`);
  return t;
}

export function getRandomEnemyType(): EnemyTypeConfig {
  return ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
}

/** small_boss 觸發的累計題數里程碑（10 的倍數）；0 表示尚未觸發過 */
export const SMALL_BOSS_MILESTONE = 10;
/** big_boss 觸發的累計題數里程碑（24 的倍數） */
export const BIG_BOSS_MILESTONE = 24;
/** bomb / doom 基礎出現機率（%） */
const BOMB_DOOM_BASE_RATE = 5;
/** 累計題數每 5 的倍數時，bomb/doom 各加的機率（%） */
const BOMB_DOOM_RATE_PER_5 = 0.5;

export interface GetEnemyTypeForSpawnResult {
  typeConfig: EnemyTypeConfig;
  lastSmallBossMilestone: number;
  lastBigBossMilestone: number;
}

/**
 * 依累計題數與里程碑決定此次要生成的敵人類別：
 * - 累計題數為 10 的倍數時出現 small_boss 一次
 * - 累計題數為 24 的倍數時出現 big_boss 一次
 * - bomb / doom 基礎機率各 5%，累計題數每 5 的倍數時各加 0.5%
 * - 其餘為 normal
 */
export function getEnemyTypeForSpawn(
  totalQuestionCount: number,
  lastSmallBossMilestone: number,
  lastBigBossMilestone: number
): GetEnemyTypeForSpawnResult {
  const smallBossTrigger = totalQuestionCount >= SMALL_BOSS_MILESTONE &&
    totalQuestionCount % SMALL_BOSS_MILESTONE === 0 &&
    totalQuestionCount > lastSmallBossMilestone;
  const bigBossTrigger = totalQuestionCount >= BIG_BOSS_MILESTONE &&
    totalQuestionCount % BIG_BOSS_MILESTONE === 0 &&
    totalQuestionCount > lastBigBossMilestone;

  if (smallBossTrigger) {
    return {
      typeConfig: getEnemyType('small_boss'),
      lastSmallBossMilestone: totalQuestionCount,
      lastBigBossMilestone,
    };
  }
  if (bigBossTrigger) {
    return {
      typeConfig: getEnemyType('big_boss'),
      lastSmallBossMilestone,
      lastBigBossMilestone: totalQuestionCount,
    };
  }

  const bombDoomRate = BOMB_DOOM_BASE_RATE + Math.floor(totalQuestionCount / 5) * BOMB_DOOM_RATE_PER_5;
  const bombRate = Math.min(50, bombDoomRate);
  const doomRate = Math.min(50, bombDoomRate);
  const normalRate = Math.max(0, 100 - bombRate - doomRate);
  const r = Math.random() * 100;
  let typeConfig: EnemyTypeConfig;
  if (r < bombRate) {
    typeConfig = getEnemyType('bomb');
  } else if (r < bombRate + doomRate) {
    typeConfig = getEnemyType('doom');
  } else {
    typeConfig = getEnemyType('normal');
  }

  return {
    typeConfig,
    lastSmallBossMilestone,
    lastBigBossMilestone,
  };
}

/** 物理堆疊模式：步兵／坦克／飛機，依累計題數決定出現比例 */
export function getEnemyTypeForSpawnPhysics(totalQuestionCount: number): EnemyTypeConfig {
  const infantryRate = Math.max(30, 60 - Math.floor(totalQuestionCount / 10) * 3);
  const tankRate = Math.min(35, 15 + Math.floor(totalQuestionCount / 15) * 2);
  const aircraftRate = 100 - infantryRate - tankRate;
  const r = Math.random() * 100;
  if (r < infantryRate) return getEnemyType('infantry');
  if (r < infantryRate + tankRate) return getEnemyType('tank');
  return getEnemyType('aircraft');
}
