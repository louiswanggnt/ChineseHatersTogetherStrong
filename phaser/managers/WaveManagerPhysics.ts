import Phaser from 'phaser';
import type { EnemyTypeConfig } from '../../types';
import { EnemyPhysics } from '../entities/EnemyPhysics';
import { GAME_WIDTH, GAME_HEIGHT, STACK_GROUND_Y, MODE_PARAMS } from '../../constants';
import { getEnemyTypeForSpawnPhysics } from '../../data/enemyTypes';

export type GetHpMultiplier = () => number;
export type GetQuestionCount = () => number;

export class WaveManagerPhysics {
  private scene: Phaser.Scene;
  private enemies: Phaser.GameObjects.Group;
  private spawnTimer: number = 0;
  private spawnInterval: number = MODE_PARAMS.STACK.SPAWN_INTERVAL;
  private isActive: boolean = false;
  private getHpMultiplier: GetHpMultiplier;
  private getQuestionCount: GetQuestionCount;

  constructor(
    scene: Phaser.Scene,
    enemies: Phaser.GameObjects.Group,
    getHpMultiplier: GetHpMultiplier,
    getQuestionCount: GetQuestionCount
  ) {
    this.scene = scene;
    this.enemies = enemies;
    this.getHpMultiplier = getHpMultiplier;
    this.getQuestionCount = getQuestionCount;
  }

  public startWave() {
    this.spawnTimer = 0;
    this.isActive = true;
  }

  public update(delta: number) {
    if (!this.isActive) return;
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }
  }

  private spawnEnemy() {
    const edge = Phaser.Math.Between(0, 1);
    const typeConfig = getEnemyTypeForSpawnPhysics(this.getQuestionCount());
    const movementType = typeConfig.MOVEMENT_TYPE ?? 'ground';

    let x: number, y: number;
    if (movementType === 'aerial') {
      y = 60 + Phaser.Math.Between(0, 60);
      x = edge === 0 ? -30 : GAME_WIDTH + 30;
    } else {
      x = edge === 0 ? -30 : GAME_WIDTH + 30;
      y = STACK_GROUND_Y - 30;
    }

    const hpMultiplier = this.getHpMultiplier();
    let enemy = this.enemies.getFirstDead(false) as EnemyPhysics;
    if (!enemy) {
      enemy = new EnemyPhysics(this.scene, x, y);
      this.enemies.add(enemy);
    }
    enemy.spawn(x, y, hpMultiplier, typeConfig);
  }

  public getCurrentWave(): number {
    return 1;
  }

  public isWaveActive(): boolean {
    return this.isActive;
  }
}
