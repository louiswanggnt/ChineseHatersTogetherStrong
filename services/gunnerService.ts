import { QuestionResult, GunnerStats } from '../types';
import { BASE_ATTACK_PER_QUESTION, BASE_FIRE_RATE } from '../constants';

/**
 * 依「累積三圍」產生 Gunner 子彈屬性（生成後由 store 將三圍歸零）
 */
export const gunnerStatsFromAccumulated = (
  accumulatedAttack: number,
  accumulatedFireRate: number,
  accumulatedPenetration: number
): GunnerStats => {
  const bulletDamage = Math.max(1, Math.floor(accumulatedAttack));
  const bulletPenetration = Math.max(1, Math.floor(accumulatedPenetration));
  // 累積射速愈高 → 間隔愈短（每 1 點約減少 30ms，最低 200ms）
  const fireRate = Math.max(200, BASE_FIRE_RATE - Math.floor(accumulatedFireRate) * 30);
  return {
    bulletDamage,
    bulletsPerShot: 1,
    bulletPenetration,
    fireRate,
  };
};

/**
 * Balatro 式 Gunner 生成
 * 
 * 計算公式：
 * - 總基礎攻擊 = Σ(準確度 × 基礎攻擊力)
 * - 總時間倍率 = Σ(時間加成倍率)
 * - 最終攻擊力 = floor(總基礎攻擊 × 總時間倍率 / 題數)
 * - 射數 = 1 + floor(完美數 × 0.5)
 * - 穿透 = 1 + floor(完美數 × 0.3)
 */
export const generateGunner = (results: QuestionResult[]): GunnerStats => {
  if (results.length === 0) {
    // 防呆：沒有答題結果則返回最低配置
    return {
      bulletDamage: 10,
      bulletsPerShot: 1,
      bulletPenetration: 1,
      fireRate: BASE_FIRE_RATE,
    };
  }

  // 步驟 1: 計算總基礎攻擊力（加總）
  const totalBaseAttack = results.reduce((sum, r) => {
    return sum + (r.accuracy * BASE_ATTACK_PER_QUESTION);
  }, 0);

  // 步驟 2: 計算總時間倍率（加總）
  const totalTimeMultiplier = results.reduce((sum, r) => {
    return sum + r.timeMultiplier;
  }, 0);

  // 步驟 3: 計算完美答題數量
  const perfectCount = results.filter(r => r.isPerfect).length;

  // 步驟 4: Balatro 式結算 - 相乘後除以題數
  const bulletDamage = Math.floor((totalBaseAttack * totalTimeMultiplier) / results.length);

  // 步驟 5: 根據完美數量計算射數與穿透
  const bulletsPerShot = 1 + Math.floor(perfectCount * 0.5);
  const bulletPenetration = 1 + Math.floor(perfectCount * 0.3);

  // 步驟 6: 射速固定（可擴展為依題數調整）
  const fireRate = BASE_FIRE_RATE;

  return {
    bulletDamage,
    bulletsPerShot,
    bulletPenetration,
    fireRate,
  };
};

/**
 * 生成 Gunner 的 ID
 */
export const generateGunnerId = (): string => {
  return `gunner_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * 格式化 Gunner 屬性為可讀文字
 */
export const formatGunnerStats = (stats: GunnerStats): string[] => {
  return [
    `攻擊力: ${stats.bulletDamage}`,
    `射數: ${stats.bulletsPerShot}`,
    `穿透: ${stats.bulletPenetration}`,
    `射速: ${(1000 / stats.fireRate).toFixed(1)}/秒`,
  ];
};
