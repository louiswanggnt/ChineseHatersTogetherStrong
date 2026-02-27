import Phaser from 'phaser';
import { GunnerStats } from '../../types';
import { BASE_GUNNER_HP, GAME_HEIGHT, STACK_GROUND_Y, STACK_GUNNER_SIZE, MODE_PARAMS } from '../../constants';
import type { EnemyPhysics } from './EnemyPhysics';
import { BulletPhysics } from './BulletPhysics';
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

/** 物理堆疊模式：Gunner 從上方落下、堆疊，使用 Matter 物理 */
export class GunnerPhysics extends Phaser.GameObjects.Container {
  private stats: GunnerStats;
  private bulletsGroup: Phaser.GameObjects.Group;
  private enemiesGroup: Phaser.GameObjects.Group;
  private gunnerId: string | undefined;
  private hp: number = 0;
  private maxHp: number = 0;
  private fireTimer: number = 0;
  private hpBar!: Phaser.GameObjects.Graphics;
  private spriteChild: Phaser.GameObjects.Image | null = null;
  private graphicsChild: Phaser.GameObjects.Graphics | null = null;
  private matterBody!: MatterJS.BodyType;
  private effectiveSize: number;

  constructor(
    scene: Phaser.Scene,
    dropX: number,
    stats: GunnerStats,
    gunnerId: string | undefined,
    bulletsGroup: Phaser.GameObjects.Group,
    enemiesGroup: Phaser.GameObjects.Group
  ) {
    const scale = MODE_PARAMS.STACK.GUNNER_SIZE_ATK_SCALE;
    const sizeMultiplier = Math.min(
      scale.maxMultiplier,
      scale.minMultiplier + (stats.bulletDamage / scale.atkForMax) * (scale.maxMultiplier - scale.minMultiplier)
    );
    const effectiveSize = STACK_GUNNER_SIZE * sizeMultiplier;

    super(scene, dropX, -effectiveSize);
    this.effectiveSize = effectiveSize;
    this.stats = stats;
    this.bulletsGroup = bulletsGroup;
    this.enemiesGroup = enemiesGroup;
    this.gunnerId = gunnerId;
    this.maxHp = stats.hp ?? BASE_GUNNER_HP;
    this.hp = this.maxHp;

    if (this.scene.textures.exists('gunner')) {
      this.spriteChild = this.scene.add.image(0, 0, 'gunner');
      this.spriteChild.setOrigin(0.5, 0.5);
      this.spriteChild.setDisplaySize(this.effectiveSize, this.effectiveSize * 0.9);
      this.add(this.spriteChild);
    } else {
      this.graphicsChild = this.scene.add.graphics();
      this.add(this.graphicsChild);
      this.drawGunner();
    }
    this.createHpBar();

    scene.add.existing(this);
    const gunnerMatter = MODE_PARAMS.STACK.GUNNER_MATTER ?? { friction: 0.6, restitution: 0 };
    const heroGunnerCategory = MODE_PARAMS.STACK.HERO_GUNNER_CATEGORY ?? 0x0004;
    const groundCategory = MODE_PARAMS.STACK.GROUND_CATEGORY ?? 0x0001;
    scene.matter.add.gameObject(this, {
      shape: {
        type: 'rectangle',
        width: this.effectiveSize,
        height: this.effectiveSize,
      },
      isStatic: false,
      friction: gunnerMatter.friction,
      restitution: gunnerMatter.restitution,
      collisionFilter: { category: heroGunnerCategory, mask: groundCategory | heroGunnerCategory },
    });
    this.matterBody = this.body as MatterJS.BodyType;

    this.setActive(true);
    this.setVisible(true);
    this.setDepth(10);
  }

  private getEffectiveStats(): EffectiveStats {
    const fn = this.scene.registry.get('getGunnerEffectiveStats') as (id: string | null, slot: number | null, base: GunnerStats) => EffectiveStats;
    return fn ? fn(this.gunnerId ?? null, null, this.stats) : { ...this.stats, extraBulletChance: 0, lightningChance: 0, fireChance: 0, explosionChance: 0 } as EffectiveStats;
  }

  private getNearestEnemy(): Phaser.GameObjects.GameObject | null {
    let nearest: Phaser.GameObjects.GameObject | null = null;
    let minDist = Infinity;
    const aircraftMult = MODE_PARAMS.STACK.AIRCRAFT_DISTANCE_MULTIPLIER ?? 1;
    this.enemiesGroup.getChildren().forEach((obj) => {
      if (!obj.active) return;
      const dx = obj.x - this.x;
      const dy = obj.y - this.y;
      const d = dx * dx + dy * dy;
      const enemy = obj as EnemyPhysics;
      const effectiveD = typeof enemy.isAircraft === 'function' && enemy.isAircraft() ? d * aircraftMult * aircraftMult : d;
      if (effectiveD < minDist) {
        minDist = effectiveD;
        nearest = obj;
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
      const bullet = this.bulletsGroup.get() as BulletPhysics;
      if (bullet) {
        const offset = (i - (count + extra - 1) / 2) * 8;
        const startX = this.x + vx * 20 + vy * offset;
        const startY = this.y + vy * 20 - vx * offset;
        const bulletType = this.rollBulletType(effective);
        bullet.fire(startX, startY, vx, vy, effective.bulletDamage, effective.bulletPenetration, bulletType);
      }
    }
  }

  private createHpBar() {
    this.hpBar = this.scene.add.graphics();
    this.hpBar.setDepth(11);
    this.updateHpBar();
  }

  private updateHpBar() {
    if (!this.hpBar || this.maxHp <= 0) return;
    const barWidth = this.effectiveSize;
    const barHeight = 4;
    const hpPercent = Math.max(0, this.hp / this.maxHp);
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.5);
    this.hpBar.fillRect(this.x - barWidth / 2, this.y - this.effectiveSize / 2 - 8, barWidth, barHeight);
    if (hpPercent > 0.5) this.hpBar.fillStyle(0x00ff00, 1);
    else if (hpPercent > 0.25) this.hpBar.fillStyle(0xffff00, 1);
    else this.hpBar.fillStyle(0xff0000, 1);
    this.hpBar.fillRect(this.x - barWidth / 2, this.y - STACK_GUNNER_SIZE / 2 - 8, barWidth * hpPercent, barHeight);
  }

  private drawGunner() {
    const g = this.graphicsChild;
    if (!g) return;
    const h = this.effectiveSize / 2;
    g.clear();
    g.fillStyle(0x0088ff, 1);
    g.fillRect(-h, -h, this.effectiveSize, this.effectiveSize);
    g.fillStyle(0x666666, 1);
    g.fillRect(h * 0.5, -h * 0.3, h, h * 0.5);
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(-h, -h, this.effectiveSize, this.effectiveSize);
  }

  update(_time: number, delta: number) {
    if (!this.active || this.hp <= 0) return;
    if (this.y > GAME_HEIGHT + 50 || this.y > STACK_GROUND_Y + 100) {
      this.die();
      return;
    }
    const effective = this.getEffectiveStats();
    this.fireTimer += delta;
    if (this.fireTimer >= effective.fireRate) {
      this.fire();
      this.fireTimer = 0;
    }
    this.updateHpBar();
  }

  public takeDamage(damage: number) {
    this.hp -= damage;
    this.updateHpBar();
    if (this.hp <= 0) {
      this.die();
    } else if (!this.spriteChild && this.graphicsChild) {
      this.graphicsChild.clear();
      this.graphicsChild.fillStyle(0xffffff, 1);
      this.graphicsChild.fillRect(-this.effectiveSize / 2, -this.effectiveSize / 2, this.effectiveSize, this.effectiveSize);
      this.scene.time.delayedCall(100, () => this.drawGunner());
    }
  }

  private die() {
    this.scene.events.emit('gunnerDestroyed', { gunnerId: this.gunnerId });
    if (this.hpBar) this.hpBar.clear();
    this.scene.matter.world.remove(this.matterBody);
    this.setActive(false);
    this.setVisible(false);
    this.destroy();
  }

  public getGunnerId(): string | undefined {
    return this.gunnerId;
  }
}
