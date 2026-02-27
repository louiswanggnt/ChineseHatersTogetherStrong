import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScenePvZ } from './scenes/GameScenePvZ';
import { GameSceneCentral } from './scenes/GameSceneCentral';
import { GameScenePhysics } from './scenes/GameScenePhysics';
import { GAME_WIDTH, GAME_HEIGHT, MODE_PARAMS } from '../constants';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,  // 明確使用 CANVAS 渲染器
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'phaser-container',
  backgroundColor: '#87CEEB', // Sky blue
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
    matter: {
      enabled: true,
      gravity: MODE_PARAMS.STACK.MATTER_GRAVITY,
      debug: false,
    },
  },
  scene: [PreloadScene, GameScenePvZ, GameSceneCentral, GameScenePhysics],
};
