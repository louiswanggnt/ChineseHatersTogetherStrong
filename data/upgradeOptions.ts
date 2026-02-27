import type { GameState, Gunner } from '../types';

export interface GunnerBonusesRecord {
  atk: number;
  spd: number;
  pen: number;
}

export interface GlobalGunnerBonuses {
  atk: number;
  spd: number;
  pen: number;
  extraBulletChance: number;
  lightningChance: number;
  fireChance: number;
  explosionChance: number;
}

export const INITIAL_GLOBAL_GUNNER_BONUSES: GlobalGunnerBonuses = {
  atk: 0,
  spd: 0,
  pen: 0,
  extraBulletChance: 0,
  lightningChance: 0,
  fireChance: 0,
  explosionChance: 0,
};

export type ApplyUpgrade = (state: GameState) => Partial<GameState>;

export interface UpgradeOption {
  id: string;
  label: string;
  description: string;
  apply: (getState: () => GameState) => Partial<GameState>;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function mergeGunnerBonuses(
  prev: Record<string, GunnerBonusesRecord>,
  ids: string[],
  delta: GunnerBonusesRecord
): Record<string, GunnerBonusesRecord> {
  const next = { ...prev };
  for (const id of ids) {
    const cur = next[id] ?? { atk: 0, spd: 0, pen: 0 };
    next[id] = {
      atk: cur.atk + delta.atk,
      spd: cur.spd + delta.spd,
      pen: cur.pen + delta.pen,
    };
  }
  return next;
}

export const UPGRADE_OPTIONS: UpgradeOption[] = [
  {
    id: 'random3_atk',
    label: '隨機三隻 ATK+15',
    description: '場上隨機 3 隻 Gunner 攻擊力 +15',
    apply: (getState) => {
      const { gunners, gunnerBonuses } = getState();
      const pick = shuffle([...gunners]).slice(0, 3);
      return {
        gunnerBonuses: mergeGunnerBonuses(
          gunnerBonuses,
          pick.map((g) => g.id),
          { atk: 15, spd: 0, pen: 0 }
        ),
      };
    },
  },
  {
    id: 'random3_spd',
    label: '隨機三隻 SPD+1.5',
    description: '場上隨機 3 隻 Gunner 射速 +1.5',
    apply: (getState) => {
      const { gunners, gunnerBonuses } = getState();
      const pick = shuffle([...gunners]).slice(0, 3);
      return {
        gunnerBonuses: mergeGunnerBonuses(
          gunnerBonuses,
          pick.map((g) => g.id),
          { atk: 0, spd: 1.5, pen: 0 }
        ),
      };
    },
  },
  {
    id: 'random3_pen',
    label: '隨機三隻 PEN+1',
    description: '場上隨機 3 隻 Gunner 穿透 +1',
    apply: (getState) => {
      const { gunners, gunnerBonuses } = getState();
      const pick = shuffle([...gunners]).slice(0, 3);
      return {
        gunnerBonuses: mergeGunnerBonuses(
          gunnerBonuses,
          pick.map((g) => g.id),
          { atk: 0, spd: 0, pen: 1 }
        ),
      };
    },
  },
  {
    id: 'all_atk',
    label: '全體 ATK+3',
    description: '所有 Gunner 攻擊力 +3',
    apply: (getState) => {
      const g = getState().globalGunnerBonuses;
      return {
        globalGunnerBonuses: { ...g, atk: g.atk + 3 },
      };
    },
  },
  {
    id: 'all_spd',
    label: '全體 SPD+0.4',
    description: '所有 Gunner 射速 +0.4',
    apply: (getState) => {
      const g = getState().globalGunnerBonuses;
      return {
        globalGunnerBonuses: { ...g, spd: g.spd + 0.4 },
      };
    },
  },
  {
    id: 'all_pen',
    label: '全體 PEN+0.2',
    description: '所有 Gunner 穿透 +0.2',
    apply: (getState) => {
      const g = getState().globalGunnerBonuses;
      return {
        globalGunnerBonuses: { ...g, pen: g.pen + 0.2 },
      };
    },
  },
  {
    id: 'extra_bullet',
    label: '額外一發 +5%',
    description: '子彈射出時額外一發機率 +5%',
    apply: (getState) => {
      const g = getState().globalGunnerBonuses;
      return {
        globalGunnerBonuses: { ...g, extraBulletChance: g.extraBulletChance + 5 },
      };
    },
  },
  {
    id: 'lightning',
    label: '雷電子彈 +3%',
    description: '子彈變為雷電子彈機率 +3%，鏈至最近 1 敵（20% 傷害）',
    apply: (getState) => {
      const g = getState().globalGunnerBonuses;
      return {
        globalGunnerBonuses: { ...g, lightningChance: g.lightningChance + 3 },
      };
    },
  },
  {
    id: 'fire',
    label: '火子彈 +3%',
    description: '子彈變為火子彈機率 +3%，擊中附加燃燒 3 秒',
    apply: (getState) => {
      const g = getState().globalGunnerBonuses;
      return {
        globalGunnerBonuses: { ...g, fireChance: g.fireChance + 3 },
      };
    },
  },
  {
    id: 'explosion',
    label: '爆炸子彈 +3%',
    description: '子彈變為爆炸子彈機率 +3%，範圍內敵人額外 50% 傷害',
    apply: (getState) => {
      const g = getState().globalGunnerBonuses;
      return {
        globalGunnerBonuses: { ...g, explosionChance: g.explosionChance + 3 },
      };
    },
  },
];

/** 從池中不重複抽 3 個選項 */
export function pickThreeUpgradeOptions(): UpgradeOption[] {
  return shuffle(UPGRADE_OPTIONS).slice(0, 3);
}
