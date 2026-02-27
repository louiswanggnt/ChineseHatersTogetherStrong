import Phaser from 'phaser';
import type { EnemyTypeConfig } from '../../types';
import { EnemyCentral } from '../entities/EnemyCentral';
import { GAME_WIDTH, GAME_HEIGHT, MODE_PARAMS } from '../../constants';
import { getRandomEnemyType } from '../../data/enemyTypes';

export type GetHpMultiplier = () => number;

export class WaveManagerCentral {
  private scene: Phaser.Scene;
  private enemies: Phaser.GameObjects.Group;
  private spawnTimer: number = 0;
  private spawnInterval: number = MODE_PARAMS.CENTRAL.SPAWN_INTERVAL;
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
  }

  public update(delta: number) {
    if (!this.isActive) return;
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnEnemy(false);
      this.spawnTimer = 0;
    }
  }

  public spawnElite() {
    this.spawnEnemy(true);
  }

  private spawnEnemy(isElite: boolean) {
    const edge = Phaser.Math.Between(0, 1);
    let x: number, y: number;
    if (edge === 0) {
      x = -30;
      y = Phaser.Math.Between(0, GAME_HEIGHT);
    } else {
      x = GAME_WIDTH + 30;
      y = Phaser.Math.Between(0, GAME_HEIGHT);
    }
    const hpMultiplier = this.getHpMultiplier();
    const typeConfig = this.getEnemyTypeForSpawn?.() ?? getRandomEnemyType();
    let enemy = this.enemies.getFirstDead(false) as EnemyCentral;
    if (!enemy) {
      enemy = new EnemyCentral(this.scene, x, y);
      this.enemies.add(enemy);
    }
    enemy.spawn(x, y, hpMultiplier, isElite, typeConfig);
  }

  public getCurrentWave(): number {
    return 1;
  }

  public isWaveActive(): boolean {
    return this.isActive;
  }
}
