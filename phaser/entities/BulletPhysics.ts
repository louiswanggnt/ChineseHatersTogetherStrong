import Phaser from 'phaser';
import { BULLET_BASE, BULLET_COLORS, GAME_WIDTH, GAME_HEIGHT, MODE_PARAMS } from '../../constants';
import type { BulletType } from './Bullet';

/** 物理堆疊模式：子彈受重力影響，拋物線飛行 */
export class BulletPhysics extends Phaser.GameObjects.Graphics {
  private damage: number = 0;
  private maxHits: number = 1;
  private hitCount: number = 0;
  private hitTargets: Set<Phaser.GameObjects.GameObject> = new Set();
  private bulletType: BulletType = 'normal';
  private matterBody: MatterJS.BodyType | null = null;
  private spawnTime: number = 0;

  constructor(scene: Phaser.Scene, _x?: number, _y?: number, _key?: string, _frame?: string | number) {
    super(scene);
    this.drawBullet();
    this.setActive(false);
    this.setVisible(false);
  }

  /** 首次 fire 時才建立 Matter body，確保在正確場景且 matter 已就緒 */
  private ensureMatterBody() {
    if (this.matterBody) return;
    const scene = this.scene as Phaser.Scene & { matter?: { add: { gameObject: (go: Phaser.GameObjects.GameObject, opts: object) => void } } };
    if (!scene?.matter?.add?.gameObject) return;
    const body = MODE_PARAMS.STACK.BULLET_BODY as { radius: number };
    const matter = MODE_PARAMS.STACK.BULLET_MATTER;
    scene.matter.add.gameObject(this, {
      shape: { type: 'circle', radius: body.radius },
      ...matter,
    });
    this.matterBody = (this as any).body as MatterJS.BodyType;
  }

  private drawBullet() {
    this.clear();
    const color = BULLET_COLORS[this.bulletType];
    const { fillRadius, strokeRadius } = MODE_PARAMS.STACK.BULLET_DRAW;
    this.fillStyle(color, 1);
    this.fillCircle(0, 0, fillRadius);
    this.lineStyle(2, 0xffffff, 0.5);
    this.strokeCircle(0, 0, strokeRadius);
  }

  public fire(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    penetration: number,
    bulletType: BulletType = 'normal'
  ) {
    this.ensureMatterBody();
    if (!this.matterBody) return;

    this.damage = damage * MODE_PARAMS.STACK.BULLET_DAMAGE_MULTIPLIER;
    this.maxHits = Math.max(1, penetration);
    this.bulletType = bulletType;
    this.hitCount = 0;
    this.hitTargets.clear();
    this.spawnTime = this.scene.time.now;
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.setDepth(9);
    this.drawBullet();
    const atkScale = MODE_PARAMS.STACK.BULLET_SPEED_ATK_SCALE;
    const t = Math.min(1, damage / atkScale.atkForMax);
    const speedMultiplier = atkScale.minMultiplier + t * (atkScale.maxMultiplier - atkScale.minMultiplier);
    const speed = BULLET_BASE.SPEED * MODE_PARAMS.STACK.BULLET_SPEED_MULTIPLIER * speedMultiplier;
    (Phaser.Physics.Matter as any).Matter.Body.setVelocity(this.matterBody, { x: vx * speed, y: vy * speed });
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
    const elapsed = this.scene.time.now - this.spawnTime;
    if (elapsed > MODE_PARAMS.STACK.BULLET_LIFETIME_MS) {
      this.deactivate();
      return;
    }
    if (
      this.x < -50 ||
      this.x > GAME_WIDTH + 50 ||
      this.y < -50 ||
      this.y > GAME_HEIGHT + 50
    ) {
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

  public getSpawnTime(): number {
    return this.spawnTime;
  }

  public deactivate() {
    this.setActive(false);
    this.setVisible(false);
    if (this.matterBody) {
      (Phaser.Physics.Matter as any).Matter.Body.setVelocity(this.matterBody, { x: 0, y: 0 });
    }
    this.setPosition(-100, -100);
  }
}
