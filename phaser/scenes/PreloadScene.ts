import Phaser from 'phaser';
import { HERO_SPRITES, GUNNER_SPRITE, getEnemySpritePath, BACKGROUND_BATTLE, ENEMY_TYPE_IDS_PVZ_CENTRAL, ENEMY_TYPE_IDS_STACK } from '../../constants/spritePaths';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // 創建進度條
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // 進度條背景
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(centerX - 150, centerY - 15, 300, 30);

    // Loading 文字
    const loadingText = this.make.text({
      x: centerX,
      y: centerY - 50,
      text: 'Loading...',
      style: {
        font: '20px monospace',
        color: '#ffffff'
      }
    });
    loadingText.setOrigin(0.5, 0.5);

    // 進度百分比文字
    const percentText = this.make.text({
      x: centerX,
      y: centerY,
      text: '0%',
      style: {
        font: '18px monospace',
        color: '#ffffff'
      }
    });
    percentText.setOrigin(0.5, 0.5);

    // 更新進度條
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(centerX - 145, centerY - 10, 290 * value, 20);
      percentText.setText(Math.floor(value * 100) + '%');
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // 主角圖檔（key: hero_idle, hero_walk, ...）
    (Object.entries(HERO_SPRITES) as [keyof typeof HERO_SPRITES, string][]).forEach(([key, path]) => {
      this.load.image(`hero_${key}`, path);
    });
    // Gunner 圖檔
    this.load.image('gunner', GUNNER_SPRITE);
    // 敵人圖檔（key: enemy_normal_idle, ...）；依模式只載入該模式會用到的，避免 404 阻塞
    const mode = (typeof window !== 'undefined' && (window as any).__GAME_MODE) || 'PVZ';
    const enemyTypeIds = mode === 'STACK' ? [...ENEMY_TYPE_IDS_STACK] : [...ENEMY_TYPE_IDS_PVZ_CENTRAL];
    const actions: ('idle' | 'attack' | 'hit')[] = ['idle', 'attack', 'hit'];
    enemyTypeIds.forEach((typeId) => {
      actions.forEach((action) => {
        this.load.image(`enemy_${typeId}_${action}`, getEnemySpritePath(typeId, action));
      });
    });
    this.load.on('loaderror', (_file: any) => {
      // 允許單一資源 404 時仍繼續，不阻塞載入
    });

    // 戰鬥區背景圖
    this.load.image('bg_battle', BACKGROUND_BATTLE);

    // 預設延遲以展示載入畫面（保留 placeholder 以維持載入流程）
    this.load.image('placeholder', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  }

  create() {
    const mode = (typeof window !== 'undefined' && (window as any).__GAME_MODE) || 'PVZ';
    const sceneKey = mode === 'CENTRAL' ? 'GameSceneCentral' : mode === 'STACK' ? 'GameScenePhysics' : 'GameScenePvZ';
    console.log('[PreloadScene] create, mode:', mode, 'sceneKey:', sceneKey);
    try {
      this.scene.start(sceneKey);
    } catch (e) {
      console.error('[PreloadScene] scene.start failed:', e);
    }
  }
}
