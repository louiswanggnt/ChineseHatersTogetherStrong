import Phaser from 'phaser';
import { BULLET_BASE, BULLET_COLORS, GAME_WIDTH, GAME_HEIGHT, MODE_PARAMS } from '../../constants';
import type { BulletType } from './Bullet';

/** 中央塔防：子彈朝任意方向飛行，擊中任意敵人 */
export class BulletCentral extends Phaser.GameObjects.Graphics {
  private damage: number = 0;
  /** 可擊中敵人次數上限（至少 1） */
  private maxHits: number = 1;
  private hitCount: number = 0;
  /** 已擊中過的敵人，同一敵人只計一次傷害 */
  private hitTargets: Set<Phaser.GameObjects.GameObject> = new Set();
  private bulletType: BulletType = 'normal';
  private body!: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene) {
    super(scene);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const b = this.body as Phaser.Physics.Arcade.Body;
    const body = MODE_PARAMS.CENTRAL.BULLET_BODY as { width: number; height: number };
    if (b) b.setSize(body.width, body.height);
    this.drawBullet();
    this.setActive(false);
    this.setVisible(false);
  }

  private drawBullet() {
    this.clear();
    const color = BULLET_COLORS[this.bulletType];
    const { fillRadius, strokeRadius } = MODE_PARAMS.CENTRAL.BULLET_DRAW;
    this.fillStyle(color, 1);
    this.fillCircle(0, 0, fillRadius);
    this.lineStyle(2, 0xffffff, 0.5);
    this.strokeCircle(0, 0, strokeRadius);
  }

  public fire(x: number, y: number, vx: number, vy: number, damage: number, penetration: number, bulletType: BulletType = 'normal') {
    this.damage = damage * MODE_PARAMS.CENTRAL.BULLET_DAMAGE_MULTIPLIER;
    this.maxHits = Math.max(1, penetration);
    this.bulletType = bulletType;
    this.hitCount = 0;
    this.hitTargets.clear();
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setDepth(9);
    this.drawBullet();
    const b = this.body as Phaser.Physics.Arcade.Body;
    if (b) {
      const len = Math.sqrt(vx * vx + vy * vy) || 1;
      const speed = BULLET_BASE.SPEED * MODE_PARAMS.CENTRAL.BULLET_SPEED_MULTIPLIER;
      b.setVelocity((vx / len) * speed, (vy / len) * speed);
    }
  }

  public getBulletType(): BulletType {
    return this.bulletType;
  }

  public hasHit(enemy: Phaser.GameObjects.GameObject): boolean {
    return this.hitTargets.has(enemy);
  }

  public registerHit(enemy: Phaser.GameObjects.GameObject): void {
    this.hitTargets.add(enemy);
  }

  update() {
    if (!this.active) return;
    const b = this.body as Phaser.Physics.Arcade.Body;
    if (b && (this.x < -50 || this.x > GAME_WIDTH + 50 || this.y < -50 || this.y > GAME_HEIGHT + 50)) {
      this.deactivate();
    }
  }

  public onHit() {
    this.hitCount++;
    if (this.hitCount >= this.maxHits) this.deactivate();
  }

  public getDamage(): number {
    return this.damage;
  }

  private deactivate() {
    this.setActive(false);
    this.setVisible(false);
    const b = this.body as Phaser.Physics.Arcade.Body;
    if (b) b.setVelocity(0, 0);
    this.setPosition(-100, -100);
  }
}
