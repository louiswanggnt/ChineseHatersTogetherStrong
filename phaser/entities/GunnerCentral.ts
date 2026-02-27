import Phaser from 'phaser';
import { GunnerStats } from '../../types';
import { BASE_GUNNER_HP } from '../../constants';
import { EnemyCentral } from './EnemyCentral';
import { BulletCentral } from './BulletCentral';
import type { BulletType } from './Bullet';

interface EffectiveStats {
  bulletDamage: number;
  fireRate: number;
  bulletPenetration: number;
  bulletsPerShot: number;
  extraBulletChance: number;
  lightningChance: number;
  fireChance: number;
  explosionChance: number;
}

/** 中央塔防：Gunner 瞄準最近敵人射擊。使用 Container 以支援 sprite 子節點（Phaser Graphics 無 .add()） */
export class GunnerCentral extends Phaser.GameObjects.Container {
  private fireTimer: number = 0;
  private stats: GunnerStats;
  private bulletsGroup: Phaser.GameObjects.Group;
  private enemiesGroup: Phaser.GameObjects.Group;
  private slotIndex: number;
  private gunnerId: string | undefined;
  private hp: number = 0;
  private maxHp: number = 0;
  private hpBar!: Phaser.GameObjects.Graphics;
  private spriteChild: Phaser.GameObjects.Image | null = null;
  private graphicsChild: Phaser.GameObjects.Graphics | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    slotIndex: number,
    stats: GunnerStats,
    bulletsGroup: Phaser.GameObjects.Group,
    enemiesGroup: Phaser.GameObjects.Group,
    gunnerId?: string
  ) {
    super(scene, x, y);
    this.stats = stats;
    this.bulletsGroup = bulletsGroup;
    this.enemiesGroup = enemiesGroup;
    this.slotIndex = slotIndex;
    this.gunnerId = gunnerId;
    this.maxHp = stats.hp ?? BASE_GUNNER_HP;
    this.hp = this.maxHp;

    if (this.scene.textures.exists('gunner')) {
      this.spriteChild = this.scene.add.image(0, 0, 'gunner');
      this.spriteChild.setOrigin(0.5, 0.5);
      this.spriteChild.setDisplaySize(50, 40);
      this.add(this.spriteChild);
    } else {
      this.graphicsChild = this.scene.add.graphics();
      this.add(this.graphicsChild);
      this.drawGunner();
    }
    this.createHpBar();

    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setImmovable(true);
      body.setSize(50, 40);
    }
    this.setActive(true);
    this.setVisible(true);
    this.setDepth(10);
  }

  private createHpBar() {
    this.hpBar = this.scene.add.graphics();
    this.hpBar.setDepth(11);
    this.updateHpBar();
  }

  private updateHpBar() {
    if (!this.hpBar || this.maxHp <= 0) return;
    const barWidth = 40;
    const barHeight = 4;
    const hpPercent = Math.max(0, this.hp / this.maxHp);
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.5);
    this.hpBar.fillRect(this.x - 20, this.y - 28, barWidth, barHeight);
    if (hpPercent > 0.5) this.hpBar.fillStyle(0x00ff00, 1);
    else if (hpPercent > 0.25) this.hpBar.fillStyle(0xffff00, 1);
    else this.hpBar.fillStyle(0xff0000, 1);
    this.hpBar.fillRect(this.x - 20, this.y - 28, barWidth * hpPercent, barHeight);
  }

  private drawGunner() {
    const g = this.graphicsChild;
    if (!g) return;
    g.clear();
    g.fillStyle(0x0088ff, 1);
    g.fillRect(-20, -20, 40, 40);
    g.fillStyle(0x666666, 1);
    g.fillRect(20, -5, 30, 10);
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(-20, -20, 40, 40);
  }

  private getEffectiveStats(): EffectiveStats {
    const fn = this.scene.registry.get('getGunnerEffectiveStats') as (id: string | null, slot: number | null, base: GunnerStats) => EffectiveStats;
    return fn ? fn(this.gunnerId ?? null, this.slotIndex, this.stats) : { ...this.stats, extraBulletChance: 0, lightningChance: 0, fireChance: 0, explosionChance: 0 } as EffectiveStats;
  }

  update(_time: number, delta: number) {
    if (!this.active || this.hp <= 0) return;
    const effective = this.getEffectiveStats();
    this.fireTimer += delta;
    if (this.fireTimer >= effective.fireRate) {
      this.fire();
      this.fireTimer = 0;
    }
  }

  public takeDamage(damage: number) {
    this.hp -= damage;
    this.updateHpBar();
    if (this.hp <= 0) {
      this.die();
    } else if (!this.spriteChild && this.graphicsChild) {
      this.graphicsChild.clear();
      this.graphicsChild.fillStyle(0xffffff, 1);
      this.graphicsChild.fillRect(-20, -20, 40, 40);
      this.graphicsChild.fillStyle(0x666666, 1);
      this.graphicsChild.fillRect(20, -5, 30, 10);
      this.graphicsChild.lineStyle(2, 0x000000, 1);
      this.graphicsChild.strokeRect(-20, -20, 40, 40);
      this.scene.time.delayedCall(100, () => this.drawGunner());
    }
  }

  private die() {
    this.scene.events.emit('gunnerDestroyed', { slotIndex: this.slotIndex });
    if (this.hpBar) this.hpBar.clear();
    this.setActive(false);
    this.setVisible(false);
  }

  private getNearestEnemy(): EnemyCentral | null {
    let nearest: EnemyCentral | null = null;
    let minDist = Infinity;
    this.enemiesGroup.getChildren().forEach((obj) => {
      const e = obj as EnemyCentral;
      if (!e.active) return;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const d = dx * dx + dy * dy;
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    });
    return nearest;
  }

  private rollBulletType(e: EffectiveStats): BulletType {
    const r = Math.random() * 100;
    if (r < e.lightningChance) return 'lightning';
    if (r < e.lightningChance + e.fireChance) return 'fire';
    if (r < e.lightningChance + e.fireChance + e.explosionChance) return 'explosion';
    return 'normal';
  }

  private fire() {
    const target = this.getNearestEnemy();
    if (!target) return;

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const vx = dx / len;
    const vy = dy / len;

    const effective = this.getEffectiveStats();
    const count = effective.bulletsPerShot;
    const extra = Math.random() * 100 < effective.extraBulletChance ? 1 : 0;
    for (let i = 0; i < count + extra; i++) {
      const bullet = this.bulletsGroup.get() as BulletCentral;
      if (bullet) {
        const offset = (i - (count + extra - 1) / 2) * 8;
        const startX = this.x + vx * 30 + vy * offset;
        const startY = this.y + vy * 30 - vx * offset;
        const bulletType = this.rollBulletType(effective);
        bullet.fire(startX, startY, vx, vy, effective.bulletDamage, effective.bulletPenetration, bulletType);
      }
    }
  }

  public getSlotIndex(): number {
    return this.slotIndex;
  }
}
