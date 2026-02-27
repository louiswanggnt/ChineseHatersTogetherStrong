import Phaser from 'phaser';
import type { EnemyTypeConfig } from '../../types';
import { Enemy } from '../entities/Enemy';
import { SPAWN_INTERVAL, GAME_WIDTH, LANE_Y_POSITIONS, LANE_ROWS } from '../../constants';
import { getRandomEnemyType } from '../../data/enemyTypes';

/** 由場景提供當前敵人血量倍率（依總答題數） */
export type GetHpMultiplier = () => number;

export class WaveManager {
  private scene: Phaser.Scene;
  private enemies: Phaser.GameObjects.Group;
  private spawnTimer: number = 0;
  private spawnInterval: number = SPAWN_INTERVAL;
  private isActive: boolean = false;
  private getHpMultiplier: GetHpMultiplier;
  private getEnemyTypeForSpawn?: () => EnemyTypeConfig;

  constructor(
    scene: Phaser.Scene,
    enemies: Phaser.GameObjects.Group,
    getHpMultiplier: GetHpMultiplier,
    getEnemyTypeForSpawn?: () => EnemyTypeConfig
  ) {
    this.scene = scene;
    this.enemies = enemies;
    this.getHpMultiplier = getHpMultiplier;
    this.getEnemyTypeForSpawn = getEnemyTypeForSpawn;
  }

  public startWave() {
    this.spawnTimer = 0;
    this.isActive = true;
    console.log('[WaveManager] 持續生成敵人已啟動');
  }

  public update(delta: number) {
    if (!this.isActive) return;
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnEnemy(false);
      this.spawnTimer = 0;
    }
  }

  /** 生成一隻菁英怪（總答題數為 20 的倍數時由場景呼叫） */
  public spawnElite() {
    this.spawnEnemy(true);
  }

  private spawnEnemy(isElite: boolean) {
    const rowIndex = Phaser.Math.Between(0, LANE_ROWS - 1);
    const y = LANE_Y_POSITIONS[rowIndex];
    const spawnX = GAME_WIDTH + 40;
    const hpMultiplier = this.getHpMultiplier();
    const typeConfig = this.getEnemyTypeForSpawn?.() ?? getRandomEnemyType();
    let enemy = this.enemies.getFirstDead(false) as Enemy;
    if (!enemy) {
      enemy = new Enemy(this.scene, spawnX, y);
      this.enemies.add(enemy);
    }
    enemy.spawn(spawnX, y, rowIndex, hpMultiplier, isElite, typeConfig);
  }

  public getCurrentWave(): number {
    return 1;
  }

  public isWaveActive(): boolean {
    return this.isActive;
  }
}
