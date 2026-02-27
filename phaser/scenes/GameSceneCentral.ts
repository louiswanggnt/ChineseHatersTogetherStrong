import Phaser from 'phaser';
import { EnemyCentral } from '../entities/EnemyCentral';
import { GunnerCentral } from '../entities/GunnerCentral';
import { BulletCentral } from '../entities/BulletCentral';
import { WaveManagerCentral } from '../managers/WaveManagerCentral';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  CENTRAL_SLOT_COUNT,
  CENTRAL_HERO_RADIUS,
  CENTRAL_SLOTS_LEFT,
  CENTRAL_SLOT_COLS,
  CENTRAL_SLOT_ROWS,
  CENTRAL_SLOT_GAP,
  CENTRAL_SLOT_SIZE,
  CENTRAL_SLOT_INSET,
  MODE_PARAMS,
  EXPLOSION_RADIUS,
} from '../../constants';

const CENTER_X = GAME_WIDTH / 2;
const CENTER_Y = GAME_HEIGHT / 2;

/** 左 6 格（2×3）、右 6 格（2×3），以主角為中心左右對稱、靠近主角 */
function getSlotPositions(): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const rowStep = CENTRAL_SLOT_SIZE + CENTRAL_SLOT_GAP;
  const colStep = CENTRAL_SLOT_SIZE + CENTRAL_SLOT_GAP;
  const blockWidth = CENTRAL_SLOT_COLS * CENTRAL_SLOT_SIZE + (CENTRAL_SLOT_COLS - 1) * CENTRAL_SLOT_GAP;
  const leftBlockLeft = CENTER_X - CENTRAL_SLOT_INSET - blockWidth;
  const rightBlockLeft = CENTER_X + CENTRAL_SLOT_INSET;

  for (let i = 0; i < CENTRAL_SLOT_COUNT; i++) {
    const isLeft = i < CENTRAL_SLOTS_LEFT;
    const localIdx = isLeft ? i : i - CENTRAL_SLOTS_LEFT;
    const row = Math.floor(localIdx / CENTRAL_SLOT_COLS);
    const col = localIdx % CENTRAL_SLOT_COLS;

    const y = CENTER_Y + (row - (CENTRAL_SLOT_ROWS - 1) / 2) * rowStep;
    let x: number;
    if (isLeft) {
      x = leftBlockLeft + CENTRAL_SLOT_SIZE / 2 + CENTRAL_SLOT_GAP / 2 + col * colStep;
    } else {
      x = rightBlockLeft + CENTRAL_SLOT_SIZE / 2 + CENTRAL_SLOT_GAP / 2 + col * colStep;
    }
    positions.push({ x, y });
  }
  return positions;
}

const SLOT_POSITIONS = getSlotPositions();

/** 中央塔防模式：敵人自四面湧入、攻擊中央主角，Gunner 隨機格、瞄準最近敵人 */
export class GameSceneCentral extends Phaser.Scene {
  private gunners!: Phaser.GameObjects.Group;
  private enemies!: Phaser.GameObjects.Group;
  private bullets!: Phaser.GameObjects.Group;
  private waveManager!: WaveManagerCentral;
  private occupiedSlots: boolean[] = [];
  private currentTotalQuestionCount: number = 0;

  constructor() {
    super({ key: 'GameSceneCentral' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#87CEEB');

    this.occupiedSlots = Array(CENTRAL_SLOT_COUNT).fill(false);

    this.drawCentralGrid();

    this.bullets = this.add.group({
      classType: BulletCentral,
      maxSize: 200,
      runChildUpdate: true,
    });

    this.enemies = this.add.group({
      classType: EnemyCentral,
      maxSize: 50,
      runChildUpdate: true,
    });

    this.gunners = this.add.group({
      runChildUpdate: true,
    });

    const getEnemyType = this.registry.get('getEnemyTypeForSpawn') as (() => import('../../types').EnemyTypeConfig) | undefined;
    this.waveManager = new WaveManagerCentral(this, this.enemies, () => this.getHpMultiplier(), getEnemyType);

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

    this.events.on('totalQuestionCount', (n: number) => {
      this.currentTotalQuestionCount = n;
    });
    this.events.on('requestEliteSpawn', () => {
      this.waveManager.spawnElite();
    });
    this.events.on('gunnerDestroyed', (data: { slotIndex: number }) => {
      this.releaseSlot(data.slotIndex);
    });

    this.time.delayedCall(2000, () => this.waveManager.startWave());

    const debugText = this.add.text(10, 10, '', {
      font: '14px monospace',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 },
    });
    this.events.on('update', () => {
      debugText.setText([
        `Central Mode`,
        `Enemies: ${this.enemies.countActive(true)}`,
        `Gunners: ${this.gunners.countActive(true)}`,
        `Bullets: ${this.bullets.countActive(true)}`,
      ]);
    });

    this.game.events.emit('gameSceneReady', this.scene.key);
  }

  update(_time: number, delta: number) {
    this.waveManager.update(delta);
  }

  private drawCentralGrid() {
    const g = this.add.graphics();
    g.setDepth(1);

    if (this.textures.exists('bg_battle')) {
      const bg = this.add.image(0, 0, 'bg_battle');
      bg.setOrigin(0, 0);
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
      bg.setDepth(0);
    } else {
      g.fillStyle(0x8B4513, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    if (this.textures.exists('hero_idle')) {
      const heroImg = this.add.image(CENTER_X, CENTER_Y, 'hero_idle');
      heroImg.setOrigin(0.5, 0.5);
      heroImg.setDisplaySize(CENTRAL_HERO_RADIUS * 2, CENTRAL_HERO_RADIUS * 2);
      heroImg.setDepth(5);
    } else {
      g.fillStyle(0xff0000, 1);
      g.fillRect(
        CENTER_X - CENTRAL_HERO_RADIUS,
        CENTER_Y - CENTRAL_HERO_RADIUS,
        CENTRAL_HERO_RADIUS * 2,
        CENTRAL_HERO_RADIUS * 2
      );
      g.lineStyle(3, 0x000000, 1);
      g.strokeRect(
        CENTER_X - CENTRAL_HERO_RADIUS,
        CENTER_Y - CENTRAL_HERO_RADIUS,
        CENTRAL_HERO_RADIUS * 2,
        CENTRAL_HERO_RADIUS * 2
      );
    }

    g.lineStyle(2, 0x00ff00, 1);
    SLOT_POSITIONS.forEach((pos) => {
      g.strokeRect(pos.x - CENTRAL_SLOT_SIZE / 2, pos.y - CENTRAL_SLOT_SIZE / 2, CENTRAL_SLOT_SIZE, CENTRAL_SLOT_SIZE);
    });
  }

  private handleBulletEnemyCollision(
    bulletObj: Phaser.GameObjects.GameObject,
    enemyObj: Phaser.GameObjects.GameObject
  ) {
    const bullet = bulletObj as BulletCentral;
    const enemy = enemyObj as EnemyCentral;
    if (!bullet.active || !enemy.active) return;
    if (bullet.hasHit(enemy)) return;
    const damage = bullet.getDamage();
    enemy.takeDamage(damage);
    bullet.registerHit(enemy);
    bullet.onHit();

    const bulletType = bullet.getBulletType();
    if (bulletType === 'lightning') {
      const other = this.findNearestOtherEnemy(enemy);
      if (other) other.takeDamage(damage * 0.2);
    } else if (bulletType === 'fire') {
      enemy.addBurn(3000, 1);
    } else if (bulletType === 'explosion') {
      this.dealExplosionDamage(enemy.x, enemy.y, damage * 0.5);
    }
  }

  private findNearestOtherEnemy(exclude: EnemyCentral): EnemyCentral | null {
    let nearest: EnemyCentral | null = null;
    let minDist = Infinity;
    this.enemies.getChildren().forEach((obj) => {
      const e = obj as EnemyCentral;
      if (!e.active || e === exclude) return;
      const d = Phaser.Math.Distance.Between(exclude.x, exclude.y, e.x, e.y);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    });
    return nearest;
  }

  private dealExplosionDamage(cx: number, cy: number, damage: number) {
    const r2 = EXPLOSION_RADIUS * EXPLOSION_RADIUS;
    this.enemies.getChildren().forEach((obj) => {
      const e = obj as EnemyCentral;
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
    const enemy = enemyObj as EnemyCentral;
    const gunner = gunnerObj as GunnerCentral;
    if (enemy.active && gunner.active) {
      enemy.setAttackingGunner(gunner);
    }
  }

  public getHpMultiplier(): number {
    return 1 + this.currentTotalQuestionCount * MODE_PARAMS.CENTRAL.ENEMY_HP_PER_QUESTION;
  }

  /** 隨機選一空 slot 放置 Gunner（由 React 呼叫） */
  public addGunnerRandomSlot(stats: any, gunnerId?: string): number | null {
    const available: number[] = [];
    for (let i = 0; i < CENTRAL_SLOT_COUNT; i++) {
      if (!this.occupiedSlots[i]) available.push(i);
    }
    if (available.length === 0) return null;
    const idx = available[Math.floor(Math.random() * available.length)];
    this.placeGunnerAtSlot(idx, stats, gunnerId);
    return idx;
  }

  /** 在指定 slot 放置 Gunner（還原用） */
  public addGunnerAtSlot(slotIndex: number, stats: any, gunnerId?: string): void {
    if (slotIndex < 0 || slotIndex >= CENTRAL_SLOT_COUNT) return;
    if (this.occupiedSlots[slotIndex]) return;
    this.placeGunnerAtSlot(slotIndex, stats, gunnerId);
  }

  private placeGunnerAtSlot(slotIndex: number, stats: any, gunnerId?: string): void {
    this.occupiedSlots[slotIndex] = true;
    const pos = SLOT_POSITIONS[slotIndex];
    const gunner = new GunnerCentral(this, pos.x, pos.y, slotIndex, stats, this.bullets, this.enemies, gunnerId);
    this.gunners.add(gunner);
  }

  public releaseSlot(slotIndex: number) {
    if (slotIndex >= 0 && slotIndex < CENTRAL_SLOT_COUNT) {
      this.occupiedSlots[slotIndex] = false;
    }
  }
}
