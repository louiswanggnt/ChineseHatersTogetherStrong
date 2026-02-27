/**
 * Phase 10: 圖片資源路徑常數
 * 對應 public/sprites/ 底下的檔名
 */

import { ENEMY_TYPE_IDS, ENEMY_TYPE_IDS_PVZ_CENTRAL, ENEMY_TYPE_IDS_STACK } from '../data/enemyTypes';

const BASE = '/sprites';

/** 僅 hero_idle 存在時，其他動作使用 idle 作為 fallback，避免 404 阻塞 */
const HERO_IDLE_PATH = `${BASE}/hero/idle.png`;

export const HERO_SPRITES = {
  idle: HERO_IDLE_PATH,
  walk: HERO_IDLE_PATH,
  attack: HERO_IDLE_PATH,
  hit: HERO_IDLE_PATH,
  victory: HERO_IDLE_PATH,
} as const;

/** 與 data/enemyTypes 一致：normal, bomb, doom, small_boss, big_boss, infantry, tank, aircraft */
export const ENEMY_SPRITE_TYPE_IDS = ENEMY_TYPE_IDS;

export { ENEMY_TYPE_IDS_PVZ_CENTRAL, ENEMY_TYPE_IDS_STACK };

/** STACK 模式敵人（infantry/tank/aircraft）圖檔若不存在則使用 normal_idle 作為 fallback，避免 404 阻塞 */
const STACK_ENEMY_TYPES = ['infantry', 'tank', 'aircraft'] as const;
const FALLBACK_ENEMY_PATH = `${BASE}/enemies/normal_idle.png`;

export const getEnemySpritePath = (
  enemyType: string,
  action: 'idle' | 'attack' | 'hit'
): string => {
  if (STACK_ENEMY_TYPES.includes(enemyType as any)) {
    return FALLBACK_ENEMY_PATH;
  }
  return `${BASE}/enemies/${enemyType}_${action}.png`;
};

/** Gunner 單一圖檔（idle） */
export const GUNNER_SPRITE = `${BASE}/gunner/idle.png`;

/** 戰鬥區背景（路徑依實際資料夾命名：baclground 為 typo 保留相容） */
export const BACKGROUND_BATTLE = `${BASE}/baclground/battle.png`;
