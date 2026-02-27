import Phaser from 'phaser';
import { BULLET_BASE, BULLET_COLORS, GAME_WIDTH, MODE_PARAMS } from '../../constants';

export type BulletType = 'normal' | 'lightning' | 'fire' | 'explosion';

export class Bullet extends Phaser.GameObjects.Graphics {
  private damage: number = 0;
  /** 可擊中敵人次數上限（至少 1） */
  private maxHits: number = 1;
  private hitCount: number = 0;
  /** 已擊中過的敵人，同一敵人只計一次傷害 */
  private hitTargets: Set<Phaser.GameObjects.GameObject> = new Set();
  private velocity: number = BULLET_BASE.SPEED * MODE_PARAMS.PVZ.BULLET_SPEED_MULTIPLIER;
  /** 所在橫列 0=上 1=下，只擊中同列敵人 */
  private rowIndex: number = 0;
  private bulletType: BulletType = 'normal';
  private body!: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene) {
    super(scene);
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.body = this.body as Phaser.Physics.Arcade.Body;
    const body = MODE_PARAMS.PVZ.BULLET_BODY as { width: number; height: number };
    this.body.setSize(body.width, body.height);
    
    this.drawBullet();
    
    // 初始化為非活動狀態
    this.setActive(false);
    this.setVisible(false);
  }

  private drawBullet() {
    this.clear();
    const color = BULLET_COLORS[this.bulletType];
    const { fillRadius, strokeRadius } = MODE_PARAMS.PVZ.BULLET_DRAW;
    this.fillStyle(color, 1);
    this.fillCircle(0, 0, fillRadius);
    this.lineStyle(2, 0xffffff, 0.5);
    this.strokeCircle(0, 0, strokeRadius);
  }

  public fire(x: number, y: number, damage: number, penetration: number, rowIndex: number = 0, bulletType: BulletType = 'normal') {
    this.damage = damage * MODE_PARAMS.PVZ.BULLET_DAMAGE_MULTIPLIER;
    this.maxHits = Math.max(1, penetration);
    this.rowIndex = rowIndex;
    this.bulletType = bulletType;
    this.hitCount = 0;
    this.hitTargets.clear();
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setDepth(9);
    this.drawBullet();
    if (this.body) {
      this.body.setVelocityX(this.velocity);
    }
  }

  public getBulletType(): BulletType {
    return this.bulletType;
  }

  /** 此子彈是否已擊中過該敵人 */
  public hasHit(enemy: Phaser.GameObjects.GameObject): boolean {
    return this.hitTargets.has(enemy);
  }

  /** 登記已擊中該敵人（僅在造成傷害後呼叫一次） */
  public registerHit(enemy: Phaser.GameObjects.GameObject): void {
    this.hitTargets.add(enemy);
  }

  public getRowIndex(): number {
    return this.rowIndex;
  }

  update() {
    if (!this.active) return;
    
    if (this.x > GAME_WIDTH + 50) {
      this.deactivate();
    }
  }

  public onHit() {
    this.hitCount++;
    if (this.hitCount >= this.maxHits) {
      this.deactivate();
    }
  }

  public getDamage(): number {
    return this.damage;
  }

  private deactivate() {
    this.setActive(false);
    this.setVisible(false);
    
    if (this.body) {
      this.body.setVelocity(0, 0);
    }
    
    // 移到畫面外
    this.setPosition(-100, -100);
  }
}
