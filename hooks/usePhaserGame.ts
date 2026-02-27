import { useEffect, useRef, useCallback } from 'react';
import Phaser from 'phaser';
import { GAME_CONFIG } from '../phaser/config';
import { useGameStore } from '../stores/gameStore';
import { GunnerStats } from '../types';
import { getEnemyTypeForSpawn } from '../data/enemyTypes';
import { FIRE_RATE_REDUCTION_PER_SPD_MS, MIN_FIRE_RATE_MS } from '../constants';

const LOG_ENDPOINT = 'http://127.0.0.1:7244/ingest/15351fe1-57c4-45dc-aeff-65a65dc5601c';

export const usePhaserGame = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const unsubStoreRef = useRef<(() => void) | null>(null);
  const prevShowUpgradeModalRef = useRef(false);

  const getActiveSceneKey = useCallback(() => {
    const mode = useGameStore.getState().gameMode || 'PVZ';
    if (mode === 'CENTRAL') return 'GameSceneCentral';
    if (mode === 'STACK') return 'GameScenePhysics';
    return 'GameScenePvZ';
  }, []);

  const addGunnerAtCell = useCallback((row: number, col: number, stats: GunnerStats, gunnerId?: string) => {
    const sceneKey = getActiveSceneKey();
    if (!gameRef.current?.scene.isActive(sceneKey)) return;
    const scene = gameRef.current?.scene.getScene(sceneKey) as any;
    if (scene?.addGunnerAtCell) {
      scene.addGunnerAtCell(row, col, stats, gunnerId);
    }
  }, [getActiveSceneKey]);

  const addGunnerAtDropX = useCallback((dropX: number, stats: GunnerStats, gunnerId?: string): boolean => {
    const sceneKey = 'GameScenePhysics';
    if (!gameRef.current?.scene.isActive(sceneKey)) {
      console.warn('[usePhaserGame] 物理堆疊場景尚未就緒');
      return false;
    }
    const scene = gameRef.current?.scene.getScene(sceneKey) as any;
    if (scene?.addGunnerAtDropX) {
      scene.addGunnerAtDropX(dropX, stats, gunnerId);
      return true;
    }
    return false;
  }, []);

  const addGunnerRandomSlot = useCallback((stats: GunnerStats, gunnerId?: string): number | null => {
    const sceneKey = 'GameSceneCentral';
    if (!gameRef.current?.scene.isActive(sceneKey)) {
      console.warn('[usePhaserGame] 遊戲場景尚未就緒，請稍候再生成 Gunner');
      return null;
    }
    const scene = gameRef.current?.scene.getScene(sceneKey) as any;
    if (scene?.addGunnerRandomSlot) {
      return scene.addGunnerRandomSlot(stats, gunnerId);
    }
    return null;
  }, []);

  const pauseGame = useCallback(() => {
    const sceneKey = getActiveSceneKey();
    if (gameRef.current?.scene.getScene(sceneKey)) {
      gameRef.current.scene.pause(sceneKey);
    }
  }, [getActiveSceneKey]);

  const resumeGame = useCallback(() => {
    const sceneKey = getActiveSceneKey();
    if (gameRef.current?.scene.getScene(sceneKey)) {
      gameRef.current.scene.resume(sceneKey);
    }
  }, [getActiveSceneKey]);

  useEffect(() => {
    // #region agent log
    fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'usePhaserGame.ts:effect', message: 'effect run', data: { ts: Date.now(), hasGame: !!gameRef.current, runId: 'post-fix' }, timestamp: Date.now(), hypothesisId: 'H1,H2' }) }).catch(() => {});
    // #endregion

    if (!gameRef.current) {
      const container = document.getElementById('phaser-container');
      if (!container) {
        console.error('[usePhaserGame] phaser-container 不存在！');
        return;
      }
      
      // 檢查容器尺寸
      const rect = container.getBoundingClientRect();
      console.log('[usePhaserGame] phaser-container 尺寸:', {
        width: rect.width,
        height: rect.height,
        offsetWidth: container.offsetWidth,
        offsetHeight: container.offsetHeight
      });
      
      if (rect.width === 0 || rect.height === 0) {
        console.warn('[usePhaserGame] phaser-container 尺寸為 0，Phaser 可能無法正確渲染！');
      }
      
      (window as any).__GAME_MODE = useGameStore.getState().gameMode || 'PVZ';
      console.log('[usePhaserGame] 找到 phaser-container，開始創建遊戲，mode:', (window as any).__GAME_MODE);
      gameRef.current = new Phaser.Game(GAME_CONFIG);
      console.log('[usePhaserGame] Phaser.Game 已創建', gameRef.current);

      gameRef.current.registry.set('getEnemyTypeForSpawn', () => {
        const state = useGameStore.getState();
        const result = getEnemyTypeForSpawn(
          state.totalQuestionCount,
          state.lastSmallBossMilestone,
          state.lastBigBossMilestone
        );
        if (result.lastSmallBossMilestone !== state.lastSmallBossMilestone) {
          useGameStore.getState().setLastSmallBossMilestone(result.lastSmallBossMilestone);
        }
        if (result.lastBigBossMilestone !== state.lastBigBossMilestone) {
          useGameStore.getState().setLastBigBossMilestone(result.lastBigBossMilestone);
        }
        return result.typeConfig;
      });

      gameRef.current.registry.set('getGunnerEffectiveStats', (gunnerId: string | null, slotIndex: number | null, baseStats: GunnerStats) => {
        const state = useGameStore.getState();
        const gunner = gunnerId != null
          ? state.gunners.find((g) => g.id === gunnerId)
          : state.gunners.find((g) => g.slotIndex === slotIndex);
        const base = gunner ?? { bulletDamage: baseStats.bulletDamage, bulletsPerShot: baseStats.bulletsPerShot, bulletPenetration: baseStats.bulletPenetration, fireRate: baseStats.fireRate };
        const bid = gunner?.id;
        const per = bid ? state.gunnerBonuses[bid] : null;
        const g = state.globalGunnerBonuses;
        const atk = (per?.atk ?? 0) + g.atk;
        const spd = (per?.spd ?? 0) + g.spd;
        const pen = (per?.pen ?? 0) + g.pen;
        const fireRate = Math.max(
          MIN_FIRE_RATE_MS,
          base.fireRate - spd * FIRE_RATE_REDUCTION_PER_SPD_MS
        );
        return {
          bulletDamage: base.bulletDamage + atk,
          bulletsPerShot: base.bulletsPerShot,
          bulletPenetration: Math.max(1, Math.floor(base.bulletPenetration + pen)),
          fireRate,
          extraBulletChance: g.extraBulletChance,
          lightningChance: g.lightningChance,
          fireChance: g.fireChance,
          explosionChance: g.explosionChance,
        };
      });

      // 延遲檢查 Canvas 是否被正確插入
      setTimeout(() => {
        const canvas = container.querySelector('canvas');
        if (canvas) {
          console.log('[usePhaserGame] Canvas 已插入 DOM', {
            width: canvas.width,
            height: canvas.height,
            style: canvas.style.cssText,
            visible: canvas.offsetWidth > 0 && canvas.offsetHeight > 0
          });
        } else {
          console.error('[usePhaserGame] Canvas 未被插入到 phaser-container！');
        }
      }, 100);

      // 等遊戲場景 create 完成後再設定監聽與同步 gunners（不再用固定 1 秒）
      const setupEventListeners = () => {
        const sceneKey = getActiveSceneKey();
        const scene = gameRef.current?.scene.getScene(sceneKey) as any;
        if (!scene) return;
        scene.events.on('enemyReachedBase', ({ damage }: { damage: number }) => {
            // #region agent log
            fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'usePhaserGame.ts:enemyReachedBase', message: 'phaser event enemyReachedBase', data: { damage, ts: Date.now() }, timestamp: Date.now(), hypothesisId: 'H3' }) }).catch(() => {});
            // #endregion
            useGameStore.getState().takeDamage(damage);
          });

          scene.events.on('heroTakeDamage', ({ damage }: { damage: number }) => {
            useGameStore.getState().takeDamage(damage);
          });

          scene.events.on('enemyKilled', ({ score }: { score: number }) => {
            // #region agent log
            fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'usePhaserGame.ts:enemyKilled', message: 'phaser event enemyKilled', data: { score, ts: Date.now() }, timestamp: Date.now(), hypothesisId: 'H4' }) }).catch(() => {});
            // #endregion
            useGameStore.getState().addScore(score);
            useGameStore.getState().addKillCount(1);
          });

          scene.events.on('waveComplete', ({ wave }: { wave: number }) => {
            // #region agent log
            fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'usePhaserGame.ts:waveComplete', message: 'phaser event waveComplete', data: { wave, ts: Date.now() }, timestamp: Date.now(), hypothesisId: 'H4' }) }).catch(() => {});
            // #endregion
            useGameStore.getState().setWave(wave);
            console.log(`Wave ${wave} completed in React!`);
          });

          scene.events.on('gunnerDestroyed', (data: { row?: number; col?: number; slotIndex?: number; gunnerId?: string }) => {
            if (data.gunnerId != null) {
              useGameStore.getState().removeGunnerById?.(data.gunnerId);
            } else if (data.slotIndex != null) {
              useGameStore.getState().removeGunnerAtSlot?.(data.slotIndex);
            } else if (data.row != null && data.col != null) {
              useGameStore.getState().removeGunnerAt(data.row, data.col);
            }
          });

          const state = useGameStore.getState();
          scene.events.emit('totalQuestionCount', state.totalQuestionCount);
          unsubStoreRef.current = useGameStore.subscribe((s) => {
            const scKey = s.gameMode === 'CENTRAL' ? 'GameSceneCentral' : s.gameMode === 'STACK' ? 'GameScenePhysics' : 'GameScenePvZ';
            const sc = gameRef.current?.scene.getScene(scKey) as any;
            if (sc) sc.events.emit('totalQuestionCount', s.totalQuestionCount);
            const milestone = Math.floor(s.totalQuestionCount / 20) * 20;
            if (milestone > 0 && milestone > s.lastEliteMilestone && sc) {
              sc.events.emit('requestEliteSpawn');
              useGameStore.getState().setLastEliteMilestone(milestone);
            }
            const prev = prevShowUpgradeModalRef.current;
            prevShowUpgradeModalRef.current = s.showUpgradeModal;
            if (!prev && s.showUpgradeModal && gameRef.current) {
              gameRef.current.scene.pause(scKey);
            }
          });

          // 從 store 讀取已放置的機槍手並加入場景
          const gunners = useGameStore.getState().gunners;
          const mode = useGameStore.getState().gameMode || 'PVZ';
          const stats = (g: (typeof gunners)[0]) => ({
            bulletDamage: g.bulletDamage,
            bulletsPerShot: g.bulletsPerShot,
            bulletPenetration: g.bulletPenetration,
            fireRate: g.fireRate,
          });
          if (mode === 'CENTRAL' && scene.addGunnerAtSlot && gunners.length > 0) {
            gunners.forEach((g) => {
              if (g.slotIndex != null) scene.addGunnerAtSlot(g.slotIndex, stats(g), g.id);
            });
          } else if (mode === 'STACK' && scene.addGunnerAtDropX && gunners.length > 0) {
            gunners.forEach((g) => {
              if (g.dropX != null) scene.addGunnerAtDropX(g.dropX, stats(g), g.id);
            });
          } else if (scene.addGunnerAtCell && gunners.length > 0) {
            gunners.forEach((g) => {
              if (g.gridY != null && g.gridX != null) {
                scene.addGunnerAtCell(g.gridY, g.gridX, stats(g), g.id);
              }
            });
          }
      };

      gameRef.current.events.once('gameSceneReady', setupEventListeners);
    }

    return () => {
      // #region agent log
      fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'usePhaserGame.ts:cleanup', message: 'cleanup run', data: { ts: Date.now(), hadGame: !!gameRef.current, runId: 'post-fix' }, timestamp: Date.now(), hypothesisId: 'H1,H2,H3,H4' }) }).catch(() => {});
      // #endregion
      unsubStoreRef.current?.();
      unsubStoreRef.current = null;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
    // 空依賴：僅在 mount/unmount 時執行，避免 store 更新導致 effect 重跑並 destroy 遊戲
  }, []);

  return { gameRef: gameRef.current, addGunnerAtCell, addGunnerRandomSlot, addGunnerAtDropX, pauseGame, resumeGame };
};
