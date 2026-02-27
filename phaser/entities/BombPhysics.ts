import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, MODE_PARAMS } from '../../constants';

/** aircraft 炸彈：受重力下落，觸及地面／Gunner／主角時造成傷害 */
export class BombPhysics extends Phaser.GameObjects.Graphics {
  private damage: number = 0;
  private matterBody: MatterJS.BodyType | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene);
    this.drawBomb();
    this.setActive(false);
    this.setVisible(false);
  }

  private ensureMatterBody() {
    if (this.matterBody) return;
    const scene = this.scene as Phaser.Scene & { matter?: { add: { gameObject: (go: Phaser.GameObjects.GameObject, opts: object) => void } } };
    if (!scene?.matter?.add?.gameObject) return;
    const bulletMatter = MODE_PARAMS.STACK.BULLET_MATTER;
    const { collisionFilter: _cf, ...matterOpts } = bulletMatter as typeof bulletMatter & { collisionFilter?: object };
    scene.matter.add.gameObject(this, {
      shape: { type: 'circle', radius: 12 },
      friction: matterOpts.friction ?? 0,
      frictionAir: matterOpts.frictionAir ?? 0.005,
      restitution: matterOpts.restitution ?? 0,
      ignoreGravity: matterOpts.ignoreGravity ?? false,
    });
    this.matterBody = (this as any).body as MatterJS.BodyType;
  }

  private drawBomb() {
    this.clear();
    this.fillStyle(0x333333, 1);
    this.fillCircle(0, 0, 10);
    this.lineStyle(2, 0x666666, 1);
    this.strokeCircle(0, 0, 10);
  }

  public spawn(x: number, y: number, damage: number) {
    this.ensureMatterBody();
    if (!this.matterBody) return;

    this.damage = damage;
    this.setPosition(x, y);
    const M = (Phaser.Physics.Matter as any).Matter.Body;
    M.setPosition(this.matterBody, { x, y });
    M.setVelocity(this.matterBody, { x: 0, y: 0 });
    this.setActive(true);
    this.setVisible(true);
    this.setDepth(9);
    this.drawBomb();
    const vy = MODE_PARAMS.STACK.BOMB_INITIAL_VY ?? 180;
    M.setVelocity(this.matterBody, { x: 0, y: vy / 60 });
  }

  public getDamage(): number {
    return this.damage;
  }

  /** Matter body 位置（與 GameObject 同步，供碰撞檢測使用） */
  public getWorldPosition(): { x: number; y: number } {
    if (this.matterBody) {
      const pos = (Phaser.Physics.Matter as any).Matter.Body.getPosition(this.matterBody);
      if (pos) return { x: pos.x, y: pos.y };
    }
    return { x: this.x, y: this.y };
  }

  public deactivate() {
    this.setActive(false);
    this.setVisible(false);
    if (this.matterBody) {
      const M = (Phaser.Physics.Matter as any).Matter.Body;
      M.setVelocity(this.matterBody, { x: 0, y: 0 });
      M.setPosition(this.matterBody, { x: -200, y: -200 });
    }
    this.setPosition(-200, -200);
  }
}
