import { create } from 'zustand';
import { GameState, GamePhase, GameMode, QuestionResult, Gunner } from '../types';
import { INITIAL_HERO_HP } from '../constants';
import { getMilestoneToTrigger } from '../data/upgradeMilestones';
import { INITIAL_GLOBAL_GUNNER_BONUSES, UPGRADE_OPTIONS, pickThreeUpgradeOptions } from '../data/upgradeOptions';

const LOG_ENDPOINT = 'http://127.0.0.1:7244/ingest/15351fe1-57c4-45dc-aeff-65a65dc5601c';

interface GameStore extends GameState {
  // Actions
  setPhase: (phase: GamePhase) => void;
  setGameMode: (mode: GameMode) => void;
  addQuestionResult: (result: QuestionResult) => void;
  clearQuestionBuffer: () => void;
  /** 依答對比例疊加三圍（答題後呼叫） */
  addAccumulatedStats: (deltaAttack: number, deltaFireRate: number, deltaPenetration: number) => void;
  /** 生成 Gunner 後歸零三圍 */
  clearAccumulatedStats: () => void;
  addGunner: (gunner: Gunner) => void;
  /** 依網格座標移除 Gunner（Phaser 端死亡時呼叫，使該格可再放置） */
  removeGunnerAt: (gridRow: number, gridCol: number) => void;
  /** 中央模式：依 slotIndex 移除 Gunner */
  removeGunnerAtSlot?: (slotIndex: number) => void;
  /** 物理堆疊模式：依 id 移除 Gunner */
  removeGunnerById?: (id: string) => void;
  /** 增加總答題數（每次生成/載入題目時呼叫） */
  addTotalQuestionCount: (delta: number) => void;
  /** 記錄已觸發菁英的里程碑（20 的倍數） */
  setLastEliteMilestone: (milestone: number) => void;
  /** 記錄已觸發 small_boss 的里程碑（10 的倍數） */
  setLastSmallBossMilestone: (milestone: number) => void;
  /** 記錄已觸發 big_boss 的里程碑（24 的倍數） */
  setLastBigBossMilestone: (milestone: number) => void;
  addKillCount: (amount: number) => void;
  setLastUpgradeKillMilestone: (milestone: number) => void;
  setShowUpgradeModal: (show: boolean) => void;
  applyUpgrade: (optionId: string) => void;
  takeDamage: (amount: number) => void;
  addScore: (amount: number) => void;
  setWave: (wave: number) => void;
  reset: () => void;
}

const initialState: GameState = {
  phase: 'START',
  gameMode: 'PVZ',
  score: 0,
  level: 1,
  wave: 1,
  heroHp: INITIAL_HERO_HP,
  maxHeroHp: INITIAL_HERO_HP,
  questionBuffer: [],
  gunners: [],
  accumulatedAttack: 0,
  accumulatedFireRate: 0,
  accumulatedPenetration: 0,
  totalQuestionCount: 0,
  lastEliteMilestone: 0,
  lastSmallBossMilestone: 0,
  lastBigBossMilestone: 0,
  totalKillCount: 0,
  lastUpgradeKillMilestone: 0,
  showUpgradeModal: false,
  upgradeChoices: null,
  gunnerBonuses: {},
  globalGunnerBonuses: { ...INITIAL_GLOBAL_GUNNER_BONUSES },
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setPhase: (phase) => {
    // #region agent log
    fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'gameStore.ts:setPhase', message: 'setPhase called', data: { phase, ts: Date.now() }, timestamp: Date.now(), hypothesisId: 'H2' }) }).catch(() => {});
    // #endregion
    set({ phase });
  },

  setGameMode: (mode) => set({ gameMode: mode }),

  addQuestionResult: (result) =>
    set((state) => ({
      questionBuffer: [...state.questionBuffer, result],
    })),

  clearQuestionBuffer: () => set({ questionBuffer: [] }),

  addAccumulatedStats: (deltaAttack, deltaFireRate, deltaPenetration) =>
    set((state) => ({
      accumulatedAttack: state.accumulatedAttack + deltaAttack,
      accumulatedFireRate: state.accumulatedFireRate + deltaFireRate,
      accumulatedPenetration: state.accumulatedPenetration + deltaPenetration,
    })),

  clearAccumulatedStats: () =>
    set({
      accumulatedAttack: 0,
      accumulatedFireRate: 0,
      accumulatedPenetration: 0,
    }),

  addGunner: (gunner) =>
    set((state) => ({
      gunners: [...state.gunners, gunner],
    })),

  removeGunnerAt: (gridRow, gridCol) =>
    set((state) => ({
      gunners: state.gunners.filter(
        (g) => !(g.gridY === gridRow && g.gridX === gridCol)
      ),
    })),

  removeGunnerAtSlot: (slotIndex) =>
    set((state) => ({
      gunners: state.gunners.filter((g) => g.slotIndex !== slotIndex),
    })),

  removeGunnerById: (id) =>
    set((state) => ({
      gunners: state.gunners.filter((g) => g.id !== id),
    })),

  addTotalQuestionCount: (delta) =>
    set((state) => ({
      totalQuestionCount: state.totalQuestionCount + delta,
    })),

  setLastEliteMilestone: (milestone) =>
    set({ lastEliteMilestone: milestone }),

  setLastSmallBossMilestone: (milestone) =>
    set({ lastSmallBossMilestone: milestone }),

  setLastBigBossMilestone: (milestone) =>
    set({ lastBigBossMilestone: milestone }),

  addKillCount: (amount) =>
    set((state) => {
      const totalKillCount = state.totalKillCount + amount;
      const milestone = getMilestoneToTrigger(totalKillCount, state.lastUpgradeKillMilestone);
      if (milestone != null) {
        const choices = pickThreeUpgradeOptions();
        return {
          totalKillCount,
          lastUpgradeKillMilestone: milestone,
          showUpgradeModal: true,
          upgradeChoices: choices.map((o) => ({ id: o.id, label: o.label, description: o.description })),
        };
      }
      return { totalKillCount };
    }),

  setLastUpgradeKillMilestone: (milestone) =>
    set({ lastUpgradeKillMilestone: milestone }),

  setShowUpgradeModal: (show) =>
    set({ showUpgradeModal: show }),

  applyUpgrade: (optionId) =>
    set((state) => {
      const option = UPGRADE_OPTIONS.find((o) => o.id === optionId);
      if (!option) return {};
      const patch = option.apply(() => state);
      return { ...patch, level: state.level + 1, showUpgradeModal: false, upgradeChoices: null };
    }),

  takeDamage: (amount) =>
    set((state) => {
      const newHp = Math.max(0, state.heroHp - amount);
      const nextPhase = newHp <= 0 ? 'GAMEOVER' : state.phase;
      // #region agent log
      fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'gameStore.ts:takeDamage', message: 'takeDamage applied', data: { amount, prevHp: state.heroHp, newHp, nextPhase, ts: Date.now() }, timestamp: Date.now(), hypothesisId: 'H2,H3' }) }).catch(() => {});
      // #endregion
      return {
        heroHp: newHp,
        phase: nextPhase,
      };
    }),

  addScore: (amount) =>
    set((state) => ({
      score: state.score + amount,
    })),

  setWave: (wave) => set({ wave }),

  reset: () => set(initialState),
}));
