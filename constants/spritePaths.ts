/**
 * Phase 10: 圖片資源路徑常數
 * 對應 public/sprites/ 底下的檔名
 */

const BASE = '/sprites';

export const HERO_SPRITES = {
  idle: `${BASE}/hero/idle.png`,
  walk: `${BASE}/hero/walk.png`,
  attack: `${BASE}/hero/attack.png`,
  hit: `${BASE}/hero/hit.png`,
  victory: `${BASE}/hero/victory.png`,
} as const;

export const ENEMY_SPRITE_NAMES = ['slime', 'elite_slime', 'boss_slime'] as const;

export const getEnemySpritePath = (
  enemyType: string,
  action: 'idle' | 'attack' | 'hit'
): string => {
  return `${BASE}/enemies/${enemyType}_${action}.png`;
};
