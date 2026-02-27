import Phaser from 'phaser';
import { Gunner } from '../entities/Gunner';
import { Enemy } from '../entities/Enemy';
import { Bullet } from '../entities/Bullet';
import { WaveManager } from '../managers/WaveManager';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GRID_COLS,
  CELL_WIDTH,
  LANE_Y_POSITIONS,
  LANE_ROWS,
  getCellCenterX,
  ENEMY_HP_PER_QUESTION,
  EXPLOSION_RADIUS,
} from '../../constants';

export class GameScenePvZ extends Phaser.Scene {
  private gunners!: Phaser.GameObjects.Group;
  private enemies!: Phaser.GameObjects.Group;
  private bullets!: Phaser.GameObjects.Group;
  private waveManager!: WaveManager;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private occupiedCells: boolean[][] = [];
  private currentTotalQuestionCount: number = 0;

  constructor() {
    super({ key: 'GameScenePvZ' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#87CEEB');

    this.occupiedCells = [
      Array(GRID_COLS).fill(false),
      Array(GRID_COLS).fill(false),
    ];

    this.drawPvZGrid();

    this.bullets = this.add.group({
      classType: Bullet,
      maxSize: 200,
      runChildUpdate: true,
    });

    this.enemies = this.add.group({
      classType: Enemy,
      maxSize: 50,
      runChildUpdate: true,
    });

    this.gunners = this.add.group({
      runChildUpdate: true,
    });

    const getEnemyType = this.registry.get('getEnemyTypeForSpawn') as (() => import('../../types').EnemyTypeConfig) | undefined;
    this.waveManager = new WaveManager(this, this.enemies, () => this.getHpMultiplier(), getEnemyType);

    this.events.on('totalQuestionCount', (n: number) => {
      this.currentTotalQuestionCount = n;
    });
    this.events.on('requestEliteSpawn', () => {
      this.waveManager.spawnElite();
    });

    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      this.handleBulletEnemyCollision as any,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.enemies,
      this.gunners,
      this.handleEnemyGunnerOverlap as any,
      undefined,
      this
    );

    this.events.on('gunnerDestroyed', (data: { row: number; col: number }) => {
      if (data.row >= 0 && data.row < LANE_ROWS && data.col >= 0 && data.col < GRID_COLS) {
        this.occupiedCells[data.row][data.col] = false;
      }
    });

    const testIndicator = this.add.circle(GAME_WIDTH - 20, GAME_HEIGHT - 20, 8, 0x00ff00, 1);
    testIndicator.setStrokeStyle(2, 0xffffff);
    testIndicator.setDepth(100);

    this.time.delayedCall(2000, () => this.waveManager.startWave());

    const debugText = this.add.text(10, 10, '', {
      font: '14px monospace',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 }
    });

    this.events.on('update', () => {
      debugText.setText([
        `Wave: ${this.waveManager.getCurrentWave()}`,
        `Enemies: ${this.enemies.countActive(true)}`,
        `Gunners: ${this.gunners.countActive(true)}`,
        `Bullets: ${this.bullets.countActive(true)}`,
      ]);
    });

    this.game.events.emit('gameSceneReady', this.scene.key);
  }

  update(time: number, delta: number) {
    this.waveManager.update(delta);
  }

  private drawPvZGrid() {
    if (this.textures.exists('bg_battle')) {
      const bg = this.add.image(0, 0, 'bg_battle');
      bg.setOrigin(0, 0);
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
      bg.setDepth(0);
    }

    this.gridGraphics = this.add.graphics();
    const rowHeight = 80;
    this.gridGraphics.fillStyle(0x228B22, 0.4);
    this.gridGraphics.fillRect(0, LANE_Y_POSITIONS[0] - rowHeight / 2, GAME_WIDTH, rowHeight);
    this.gridGraphics.fillStyle(0x2E8B2E, 0.4);
    this.gridGraphics.fillRect(0, LANE_Y_POSITIONS[1] - rowHeight / 2, GAME_WIDTH, rowHeight);

    this.gridGraphics.lineStyle(2, 0xffffff, 0.5);
    for (let c = 0; c <= GRID_COLS; c++) {
      const x = c * CELL_WIDTH;
      this.gridGraphics.lineBetween(x, 0, x, LANE_Y_POSITIONS[0] + rowHeight / 2);
      this.gridGraphics.lineBetween(x, LANE_Y_POSITIONS[1] - rowHeight / 2, x, GAME_HEIGHT);
    }

    this.gridGraphics.lineStyle(3, 0x1a4d1a, 1);
    this.gridGraphics.lineBetween(0, LANE_Y_POSITIONS[0], GAME_WIDTH, LANE_Y_POSITIONS[0]);
    this.gridGraphics.lineBetween(0, LANE_Y_POSITIONS[1], GAME_WIDTH, LANE_Y_POSITIONS[1]);

    const ground = this.add.graphics();
    ground.fillStyle(0x8B4513, 1);
    ground.fillRect(0, 420, GAME_WIDTH, GAME_HEIGHT - 420);
  }

  private handleBulletEnemyCollision(
    bulletObj: Phaser.GameObjects.GameObject,
    enemyObj: Phaser.GameObjects.GameObject
  ) {
    const bullet = bulletObj as Bullet;
    const enemy = enemyObj as Enemy;
    if (!bullet.active || !enemy.active) return;
    if (bullet.getRowIndex() !== enemy.getRowIndex()) return;
    if (bullet.hasHit(enemy)) return;
    const damage = bullet.getDamage();
    enemy.takeDamage(damage);
    bullet.registerHit(enemy);
    bullet.onHit();

    const bulletType = bullet.getBulletType();
    if (bulletType === 'lightning') {
      const other = this.findNearestOtherEnemyInRow(enemy, bullet.getRowIndex());
      if (other) other.takeDamage(damage * 0.2);
    } else if (bulletType === 'fire') {
      enemy.addBurn(3000, 1);
    } else if (bulletType === 'explosion') {
      this.dealExplosionDamage(enemy.x, enemy.y, damage * 0.5, bullet, enemy);
    }
  }

  private findNearestOtherEnemyInRow(exclude: Enemy, rowIndex: number): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;
    this.enemies.getChildren().forEach((obj) => {
      const e = obj as Enemy;
      if (!e.active || e === exclude || e.getRowIndex() !== rowIndex) return;
      const d = Phaser.Math.Distance.Between(exclude.x, exclude.y, e.x, e.y);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    });
    return nearest;
  }

  private dealExplosionDamage(cx: number, cy: number, damage: number, _bullet: Bullet, _primary: Enemy) {
    const r2 = EXPLOSION_RADIUS * EXPLOSION_RADIUS;
    this.enemies.getChildren().forEach((obj) => {
      const e = obj as Enemy;
      if (!e.active) return;
      const dx = e.x - cx;
      const dy = e.y - cy;
      if (dx * dx + dy * dy <= r2) e.takeDamage(damage);
    });
  }

  private handleEnemyGunnerOverlap(
    enemyObj: Phaser.GameObjects.GameObject,
    gunnerObj: Phaser.GameObjects.GameObject
  ) {
    const enemy = enemyObj as Enemy;
    const gunner = gunnerObj as Gunner;
    if (!enemy.active || !gunner.active) return;
    if (enemy.getRowIndex() !== gunner.getGridRow()) return;
    enemy.setBlockingGunner(gunner);
  }

  public addGunnerAtCell(row: number, col: number, stats: any, gunnerId?: string): Gunner | null {
    if (row < 0 || row >= LANE_ROWS || col < 0 || col >= GRID_COLS) return null;
    if (this.occupiedCells[row][col]) return null;

    const x = getCellCenterX(col);
    const y = LANE_Y_POSITIONS[row];
    const gunner = new Gunner(this, x, y, row, stats, this.bullets, row, col, gunnerId);
    this.gunners.add(gunner);
    this.occupiedCells[row][col] = true;
    return gunner;
  }

  public getHpMultiplier(): number {
    return 1 + this.currentTotalQuestionCount * ENEMY_HP_PER_QUESTION;
  }

  public isCellOccupied(row: number, col: number): boolean {
    if (row < 0 || row >= LANE_ROWS || col < 0 || col >= GRID_COLS) return true;
    return this.occupiedCells[row][col];
  }

  public addGunner(x: number, y: number, stats: any, gunnerId?: string): Gunner | null {
    const col = Math.floor(x / CELL_WIDTH);
    const row = Math.abs(y - LANE_Y_POSITIONS[0]) < Math.abs(y - LANE_Y_POSITIONS[1]) ? 0 : 1;
    return this.addGunnerAtCell(row, col, stats, gunnerId);
  }

  public clearBattle() {
    this.enemies.clear(true, true);
    this.bullets.clear(true, true);
    this.gunners.clear(true, true);
    this.occupiedCells = [
      Array(GRID_COLS).fill(false),
      Array(GRID_COLS).fill(false),
    ];
  }
}
