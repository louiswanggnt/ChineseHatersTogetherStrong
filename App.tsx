import React, { useState } from 'react';
import { useGameStore } from './stores/gameStore';
import { usePhaserGame } from './hooks/usePhaserGame';
import { QuestionPhase } from './components/QuestionPhase';
import { GunnerPlacement } from './components/GunnerPlacement';
import { GunnerPlacementStack } from './components/GunnerPlacementStack';
import { UpgradeModal } from './components/UpgradeModal';
import { RollingNumber } from './components/RollingNumber';
import { GunnerStats } from './types';
import { generateGunnerId } from './services/gunnerService';
import { GAME_WIDTH, GRID_COLS, LANE_ROWS } from './constants';
import { getNextUpgradeMilestone } from './data/upgradeMilestones';

const App: React.FC = () => {
  const { phase, heroHp, maxHeroHp, score, wave, gunners, setPhase, setGameMode, reset, addGunner } = useGameStore();

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ backgroundColor: 'var(--notebook-bg)' }}>
      {/* 開始畫面 - 手繪筆記風 */}
      {phase === 'START' && (
        <div className="flex flex-col items-center justify-center h-full" style={{ backgroundColor: 'var(--notebook-bg)' }}>
          <h1 className="hand-drawn-font text-4xl mb-8 leading-relaxed p-4 hand-drawn-box" style={{ color: 'var(--marker-black)' }}>
            WORD<br />WARRIOR
          </h1>
          <p className="hand-drawn-font text-sm mb-8" style={{ color: 'var(--marker-black)' }}>射擊版 v0.2</p>
          <div className="flex flex-col items-center gap-3">
            <p className="hand-drawn-font text-xs mb-2 opacity-70">選擇遊戲模式</p>
            <button
              onClick={() => { setGameMode('PVZ'); setPhase('BATTLE'); }}
              className="hand-drawn-btn text-sm py-4 px-8"
            >
              植物大戰僵屍
            </button>
            <button
              onClick={() => { setGameMode('CENTRAL'); setPhase('BATTLE'); }}
              className="hand-drawn-btn text-sm py-4 px-8"
            >
              中央塔防式
            </button>
            <button
              onClick={() => { setGameMode('STACK'); setPhase('BATTLE'); }}
              className="hand-drawn-btn text-sm py-4 px-8"
            >
              物理堆疊
            </button>
          </div>
        </div>
      )}

      {/* 戰鬥 + 答題 同屏：上戰鬥、下答題 */}
      {phase === 'BATTLE' && <BattleWithQuestions />}

      {/* 遊戲結束畫面 - 手繪筆記風 */}
      {phase === 'GAMEOVER' && (
        <div className="flex flex-col items-center justify-center h-full" style={{ backgroundColor: 'var(--notebook-bg)' }}>
          <h2 className="hand-drawn-font text-3xl mb-6" style={{ color: 'var(--marker-black)' }}>GAME OVER</h2>
          <p className="hand-drawn-font text-xl mb-8">最終分數: {score}</p>
          <button
            onClick={() => {
              reset();
              setPhase('START');
            }}
            className="hand-drawn-btn text-sm py-3 px-6"
          >
            返回主選單
          </button>
        </div>
      )}
    </div>
  );
};

/** 上：Phaser 戰鬥；下：答題介面；生成 Gunner 時以 modal 放置 */
const BattleWithQuestions: React.FC = () => {
  const { level, heroHp, maxHeroHp, score, wave, gunners, totalKillCount, lastUpgradeKillMilestone, showUpgradeModal, gameMode, accumulatedAttack, accumulatedFireRate, accumulatedPenetration, addGunner, setPhase, reset } = useGameStore();
  const { addGunnerAtCell, addGunnerRandomSlot, addGunnerAtDropX, pauseGame, resumeGame } = usePhaserGame();
  const [pendingGunnerStats, setPendingGunnerStats] = useState<GunnerStats | null>(null);
  const [pendingAccumulatedPreview, setPendingAccumulatedPreview] = useState<{
    attack: number;
    fireRate: number;
    penetration: number;
  } | null>(null);
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);

  const handleGenerateGunner = (
    gunnerStats: GunnerStats,
    accumulated: { attack: number; fireRate: number; penetration: number }
  ) => {
    if (gameMode === 'CENTRAL') {
      const id = generateGunnerId();
      const slotIndex = addGunnerRandomSlot(gunnerStats, id);
      if (slotIndex != null) {
        addGunner({
          id,
          slotIndex,
          ...gunnerStats,
        });
      } else {
        console.warn('遊戲載入中，請等畫面出現後再按生成');
      }
      return;
    }
    if (gameMode === 'STACK') {
      setPendingGunnerStats(gunnerStats);
      setPendingAccumulatedPreview(accumulated);
      return;
    }
    setPendingGunnerStats(gunnerStats);
    setPendingAccumulatedPreview(accumulated);
  };

  const handlePlacement = (row: number, col: number) => {
    if (!pendingGunnerStats) return;

    const gunner = {
      id: generateGunnerId(),
      gridX: col,
      gridY: row,
      ...pendingGunnerStats,
    };
    addGunner(gunner);
    addGunnerAtCell(row, col, pendingGunnerStats, gunner.id);
    setPendingGunnerStats(null);
    setPendingAccumulatedPreview(null);
  };

  const handlePlacementStack = (dropX: number) => {
    if (!pendingGunnerStats) return;

    const id = generateGunnerId();
    if (addGunnerAtDropX(dropX, pendingGunnerStats, id)) {
      addGunner({ id, dropX, ...pendingGunnerStats });
    }
    setPendingGunnerStats(null);
    setPendingAccumulatedPreview(null);
  };

  const openPauseMenu = () => {
    setPauseMenuOpen(true);
    pauseGame();
  };

  const closePauseMenu = () => {
    setPauseMenuOpen(false);
    resumeGame();
  };

  const returnToMainMenu = () => {
    setPauseMenuOpen(false);
    resumeGame(); // 先恢復再卸載，避免殘留
    reset();
    setPhase('START');
  };

  const occupiedCells = (() => {
    const occupied = Array.from({ length: LANE_ROWS }, () =>
      Array(GRID_COLS).fill(false)
    );
    gunners.forEach((g) => {
      if (g.gridY >= 0 && g.gridY < LANE_ROWS && g.gridX >= 0 && g.gridX < GRID_COLS) {
        occupied[g.gridY][g.gridX] = true;
      }
    });
    return occupied;
  })();

  return (
    <div className="relative flex flex-col w-full h-full min-h-0" style={{ backgroundColor: 'var(--notebook-bg)' }}>
      {/* 上半：戰鬥區三欄（左：玩家參數區；中：Phaser；右：參照操作區） */}
      <div className="w-full flex-[0_0_40%] min-h-0 flex flex-row items-stretch">
        {/* 左欄：玩家參數區（LV、HP、EXP） */}
        <div className="flex-shrink-0 w-[180px] flex flex-col gap-2 p-2 hand-drawn-box hand-drawn-box-inner rounded-none border-r-2" style={{ backgroundColor: 'rgba(250, 248, 240, 0.92)', borderColor: 'var(--marker-black)' }}>
          <div className="hand-drawn-font text-sm font-bold" style={{ color: 'var(--marker-black)' }}>LV {level}</div>
          <div className="flex flex-col gap-1">
            <div className="hand-drawn-font text-[10px] uppercase tracking-wider" style={{ color: 'var(--marker-black)' }}>HP</div>
            <div className="h-6 border-2 relative overflow-hidden rounded-sm min-w-0" style={{ borderColor: 'var(--marker-black)', backgroundColor: 'rgba(255,255,255,0.6)' }}>
              <div className="absolute inset-0 h-full transition-all duration-300" style={{ width: `${maxHeroHp > 0 ? (heroHp / maxHeroHp) * 100 : 0}%`, backgroundColor: '#86efac' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="hand-drawn-font text-xs" style={{ color: 'var(--marker-black)' }}>{heroHp}<span className="opacity-60">/</span>{maxHeroHp}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="hand-drawn-font text-[10px] uppercase tracking-wider" style={{ color: 'var(--marker-black)' }}>EXP</div>
            <div className="h-6 border-2 relative overflow-hidden rounded-sm min-w-0" style={{ borderColor: 'var(--marker-black)', backgroundColor: 'rgba(255,255,255,0.6)' }}>
              <div
                className="absolute inset-0 h-full transition-all duration-300"
                style={{
                  width: `${(() => {
                    const next = getNextUpgradeMilestone(lastUpgradeKillMilestone);
                    if (next == null) return 100;
                    const span = next - lastUpgradeKillMilestone;
                    if (span <= 0) return 100;
                    const progress = (totalKillCount - lastUpgradeKillMilestone) / span;
                    return Math.min(100, Math.max(0, progress * 100));
                  })()}%`,
                  backgroundColor: '#fcd34d',
                }}
              />
            </div>
          </div>
        </div>
        {/* 中欄：Phaser 畫布 */}
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="relative flex-shrink-0 max-h-full" style={{ aspectRatio: '1440/480', width: 'auto', maxWidth: '100%' }}>
            <div id="phaser-container" className="w-full h-full bg-gray-900 min-h-0" style={{ display: 'block', position: 'relative' }} />
          </div>
        </div>
        {/* 右欄：參照、操作區（暫停、NEXT；SCORE/WAVE 一併放此） */}
        <div className="flex-shrink-0 w-[180px] flex flex-col gap-2 p-2 hand-drawn-box hand-drawn-box-inner rounded-none border-l-2" style={{ backgroundColor: 'rgba(250, 248, 240, 0.92)', borderColor: 'var(--marker-black)' }}>
          <button type="button" onClick={openPauseMenu} className="hand-drawn-btn w-full py-2 text-xs hand-drawn-box-inner">
            暫停
          </button>
          <div className="hand-drawn-box p-2 hand-drawn-font text-[10px] hand-drawn-box-inner">
            <div className="mb-1">SCORE: {score}</div>
            <div>WAVE: {wave}</div>
          </div>
          <div className="hand-drawn-box hand-drawn-font text-center hand-drawn-box-inner px-2 py-2 text-xs">
            <div className="text-[10px] opacity-70 mb-1">NEXT</div>
            <div>
              ATK <RollingNumber value={accumulatedAttack} className="text-amber-700" stepMs={32} />
              <span className="opacity-50 mx-0.5">×</span>
              SPD <RollingNumber value={accumulatedFireRate} className="text-sky-700" stepMs={32} />
              <span className="opacity-50 mx-0.5">×</span>
              PEN <RollingNumber value={accumulatedPenetration} className="text-emerald-700" stepMs={32} />
            </div>
          </div>
        </div>
      </div>

      {/* Roguelite 升級選單：擊殺達里程碑時三選一 */}
      {showUpgradeModal && <UpgradeModal onResume={resumeGame} />}

      {/* 暫停選單 - 手繪筆記風 */}
      {pauseMenuOpen && (
        <div className="absolute inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(250,248,240,0.85)' }}>
          <div className="hand-drawn-box p-6 max-w-sm w-full mx-4 flex flex-col gap-4 hand-drawn-box-inner">
            <h3 className="hand-drawn-font text-lg text-center">暫停</h3>
            <button type="button" onClick={closePauseMenu} className="w-full hand-drawn-btn py-3 px-4 text-sm hand-drawn-box-inner">
              繼續遊戲
            </button>
            <button type="button" onClick={returnToMainMenu} className="w-full hand-drawn-btn py-3 px-4 text-sm hand-drawn-box-inner">
              返回主畫面
            </button>
          </div>
        </div>
      )}

      {/* 下半：答題介面，嚴格 60% */}
      <div className="w-full flex-[1_1_60%] min-h-0 flex flex-col overflow-auto">
        <QuestionPhase onComplete={handleGenerateGunner} />
      </div>

      {/* 放置 Gunner 的 Modal - 手繪筆記風 */}
      {pendingGunnerStats && gameMode === 'STACK' && (
        <div className="absolute inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(250,248,240,0.9)' }}>
          <div className="hand-drawn-box p-4 max-w-md w-full hand-drawn-box-inner">
            <GunnerPlacementStack
              gunnerStats={pendingGunnerStats}
              onPlacement={handlePlacementStack}
              onCancel={() => {
                setPendingGunnerStats(null);
                setPendingAccumulatedPreview(null);
              }}
              accumulatedPreview={pendingAccumulatedPreview ?? undefined}
            />
          </div>
        </div>
      )}
      {pendingGunnerStats && gameMode !== 'STACK' && (
        <div className="absolute inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(250,248,240,0.9)' }}>
          <div className="hand-drawn-box p-4 max-w-md w-full hand-drawn-box-inner">
            <h3 className="hand-drawn-font text-lg mb-4 text-center">選擇放置位置</h3>
            <GunnerPlacement
              gunnerStats={pendingGunnerStats}
              onPlacement={handlePlacement}
              onCancel={() => {
                setPendingGunnerStats(null);
                setPendingAccumulatedPreview(null);
              }}
              occupiedCells={occupiedCells}
              accumulatedPreview={pendingAccumulatedPreview ?? undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
