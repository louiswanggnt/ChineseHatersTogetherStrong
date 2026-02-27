import Phaser from 'phaser';
import {
  MODE_PARAMS,
  ELITE_HP_MULTIPLIER,
  ELITE_SPEED_MULTIPLIER,
  CENTRAL_REACH_THRESHOLD,
  GAME_WIDTH,
  GAME_HEIGHT,
  ENEMY_MELEE_DAMAGE,
  ENEMY_ATTACK_GUNNER_INTERVAL,
} from '../../constants';
import type { EnemyTypeConfig } from '../../types';
import { getEnemyType } from '../../data/enemyTypes';
import type { GunnerCentral } from './GunnerCentral';

const CENTER_X = GAME_WIDTH / 2;
const CENTER_Y = GAME_HEIGHT / 2;
const params = MODE_PARAMS.CENTRAL;
const ENEMY_GUNNER_TOUCH_RADIUS = 45;
const BASE_SIZE = 40;

/** 中央塔防：敵人自四面湧入，朝中心移動；接觸 Gunner 時停下並優先攻擊 Gunner。使用 Container 以支援 sprite 子節點 */
export class EnemyCentral extends Phaser.GameObjects.Container {
  private hp: number;
  private maxHp: number;
  private speed: number;
  private hpBar!: Phaser.GameObjects.Graphics;
  private damageText?: Phaser.GameObjects.Text;
  private isElite: boolean = false;
  private targetGunner: GunnerCentral | null = null;
  private attackTimer: number = 0;
  private typeConfig: EnemyTypeConfig = getEnemyType('normal');
  private halfSize: number = BASE_SIZE / 2;
  private oneShotDealt: boolean = false;
  private burnStacks: number = 0;
  private burnRemainingMs: number = 0;
  private burnTickAccum: number = 0;
  private spriteChild: Phaser.GameObjects.Image | null = null;
  private graphicsChild: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.maxHp = params.BASE_ENEMY_HP;
    this.hp = this.maxHp;
    this.speed = params.BASE_ENEMY_SPEED;
    this.tryAddEnemySprite();
    this.createHpBar();
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) body.setSize(BASE_SIZE, BASE_SIZE);
    this.setActive(true);
    this.setVisible(true);
    this.setDepth(10);
  }

  private getEnemyTextureKey(action: 'idle' | 'attack' | 'hit' = 'idle'): string {
    return `enemy_${this.typeConfig.id}_${action}`;
  }

  private ensureGraphicsChild(): void {
    if (!this.graphicsChild) {
      this.graphicsChild = this.scene.add.graphics();
      this.add(this.graphicsChild);
    }
  }

  private tryAddEnemySprite(): void {
    const key = this.getEnemyTextureKey('idle');
    if (this.scene.textures.exists(key)) {
      this.spriteChild = this.scene.add.image(0, 0, key);
      this.spriteChild.setOrigin(0.5, 0.5);
      this.spriteChild.setDisplaySize(this.halfSize * 2, this.halfSize * 2);
      this.add(this.spriteChild);
    } else {
      this.ensureGraphicsChild();
      this.drawEnemy();
    }
  }

  private updateEnemySpriteOrDraw(): void {
    const key = this.getEnemyTextureKey('idle');
    if (this.spriteChild) {
      if (this.scene.textures.exists(key)) {
        this.spriteChild.setTexture(key);
        this.spriteChild.setDisplaySize(this.halfSize * 2, this.halfSize * 2);
        this.spriteChild.setVisible(true);
      } else {
        this.spriteChild.destroy();
        this.spriteChild = null;
        this.ensureGraphicsChild();
        if (this.isElite) this.drawElite();
        else this.drawEnemy();
      }
    } else if (this.scene.textures.exists(key)) {
      if (this.graphicsChild) {
        this.remove(this.graphicsChild);
        this.graphicsChild.destroy();
        this.graphicsChild = null;
      }
      this.spriteChild = this.scene.add.image(0, 0, key);
      this.spriteChild.setOrigin(0.5, 0.5);
      this.spriteChild.setDisplaySize(this.halfSize * 2, this.halfSize * 2);
      this.add(this.spriteChild);
    } else {
      this.ensureGraphicsChild();
      if (this.isElite) this.drawElite();
      else this.drawEnemy();
    }
  }

  private drawEnemy() {
    const g = this.graphicsChild;
    if (!g) return;
    const h = this.halfSize;
    g.clear();
    g.fillStyle(this.typeConfig.color, 1);
    g.fillRect(-h, -h, h * 2, h * 2);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-h * 0.4, -h * 0.4, Math.max(2, h * 0.12));
    g.fillCircle(h * 0.4, -h * 0.4, Math.max(2, h * 0.12));
    g.fillStyle(0x000000, 1);
    g.fillCircle(-h * 0.4, -h * 0.4, Math.max(1, h * 0.08));
    g.fillCircle(h * 0.4, -h * 0.4, Math.max(1, h * 0.08));
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(-h, -h, h * 2, h * 2);
  }

  private createHpBar() {
    this.hpBar = this.scene.add.graphics();
    this.hpBar.setDepth(11);
    this.updateHpBar();
  }

  private updateHpBar() {
    if (!this.hpBar) return;
    const barWidth = this.halfSize * 2;
    const barHeight = 4;
    const hpPercent = this.hp / this.maxHp;
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.5);
    this.hpBar.fillRect(this.x - this.halfSize, this.y - this.halfSize - 10, barWidth, barHeight);
    if (hpPercent > 0.5) this.hpBar.fillStyle(0x00ff00, 1);
    else if (hpPercent > 0.25) this.hpBar.fillStyle(0xffff00, 1);
    else this.hpBar.fillStyle(0xff0000, 1);
    this.hpBar.fillRect(this.x - this.halfSize, this.y - this.halfSize - 10, barWidth * hpPercent, barHeight);
  }

  private getAttackInterval(): number {
    return ENEMY_ATTACK_GUNNER_INTERVAL / Math.max(0.1, this.typeConfig.ATK_SPEED_MULTIPLIER);
  }

  private getAttackDamage(): number {
    return Math.max(1, Math.floor(ENEMY_MELEE_DAMAGE * this.typeConfig.ATK_MULTIPLIER));
  }

  /** 施加燃燒：durationMs 剩餘時間，stacks 疊加層數（最多 5） */
  public addBurn(durationMs: number, stacks: number) {
    this.burnStacks = Math.min(5, this.burnStacks + stacks);
    this.burnRemainingMs = durationMs;
  }

  /** 被場景呼叫：敵人與 Gunner 重疊時設為正在攻擊該 Gunner */
  public setAttackingGunner(gunner: GunnerCentral | null) {
    this.targetGunner = gunner;
  }

  update(_time: number, delta: number) {
    if (!this.active) return;

    if (this.burnRemainingMs > 0) {
      this.burnRemainingMs -= delta;
      this.burnTickAccum += delta;
      if (this.burnTickAccum >= 1000) {
        this.burnTickAccum -= 1000;
        this.takeDamage(10 * this.burnStacks);
      }
      if (this.burnRemainingMs <= 0) this.burnStacks = 0;
    }

    // 若正在攻擊 Gunner：檢查目標是否仍有效且在範圍內
    if (this.targetGunner) {
      if (!this.targetGunner.active) {
        this.targetGunner = null;
        this.attackTimer = 0;
      } else {
        const gdx = this.targetGunner.x - this.x;
        const gdy = this.targetGunner.y - this.y;
        const gdist = Math.sqrt(gdx * gdx + gdy * gdy);
        if (gdist > ENEMY_GUNNER_TOUCH_RADIUS) {
          this.targetGunner = null;
          this.attackTimer = 0;
        } else {
          if (this.typeConfig.ATK_TYPE === 'ONE_SHOT') {
            if (!this.oneShotDealt) {
              this.targetGunner.takeDamage(this.getAttackDamage());
              this.oneShotDealt = true;
              this.deactivate();
              return;
            }
          } else {
            this.attackTimer += delta;
            if (this.attackTimer >= this.getAttackInterval()) {
              this.targetGunner.takeDamage(this.getAttackDamage());
              this.attackTimer = 0;
            }
          }
          this.updateHpBar();
          return;
        }
      }
    }

    const dx = CENTER_X - this.x;
    const dy = CENTER_Y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < CENTRAL_REACH_THRESHOLD) {
      this.reachBase();
      return;
    }

    const move = (this.speed * delta) / 1000;
    const nx = dx / dist;
    const ny = dy / dist;
    this.x += nx * move;
    this.y += ny * move;
    this.updateHpBar();
  }

  public takeDamage(damage: number) {
    this.hp -= damage;
    this.showDamageText(damage);
    if (!this.spriteChild && this.graphicsChild) {
      const h = this.halfSize;
      this.graphicsChild.clear();
      this.graphicsChild.fillStyle(0xffffff, 1);
      this.graphicsChild.fillRect(-h, -h, h * 2, h * 2);
      this.graphicsChild.lineStyle(2, 0x000000, 1);
      this.graphicsChild.strokeRect(-h, -h, h * 2, h * 2);
    }
    this.scene.time.delayedCall(100, () => {
      if (this.spriteChild) return;
      if (this.isElite) this.drawElite();
      else this.drawEnemy();
    });
    this.updateHpBar();
    if (this.hp <= 0) this.die();
  }

  private showDamageText(damage: number) {
    if (this.damageText) this.damageText.destroy();
    this.damageText = this.scene.add.text(this.x, this.y - this.halfSize - 10, `-${Math.floor(damage)}`, {
      font: 'bold 16px monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.damageText.setOrigin(0.5);
    this.scene.tweens.add({
      targets: this.damageText,
      y: this.y - this.halfSize - 30,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => { this.damageText?.destroy(); },
    });
  }

  private die() {
    this.deactivate();
    this.scene.events.emit('enemyKilled', { score: 10 });
  }

  private reachBase() {
    this.scene.events.emit('enemyReachedBase', { damage: 50 });
    this.deactivate();
  }

  private deactivate() {
    this.targetGunner = null;
    this.attackTimer = 0;
    this.oneShotDealt = false;
    this.burnStacks = 0;
    this.burnRemainingMs = 0;
    this.burnTickAccum = 0;
    this.setActive(false);
    this.setVisible(false);
    this.hpBar.clear();
    this.setPosition(-100, -100);
  }

  public spawn(
    x: number,
    y: number,
    hpMultiplier: number = 1,
    isElite: boolean = false,
    typeConfig?: EnemyTypeConfig
  ) {
    this.typeConfig = typeConfig ?? getEnemyType('normal');
    this.oneShotDealt = false;
    this.burnStacks = 0;
    this.burnRemainingMs = 0;
    this.burnTickAccum = 0;
    this.isElite = isElite;
    this.targetGunner = null;
    this.attackTimer = 0;
    const hpMult = isElite ? hpMultiplier * ELITE_HP_MULTIPLIER : hpMultiplier;
    this.maxHp = params.BASE_ENEMY_HP * hpMult * this.typeConfig.HP_MULTIPLIER;
    this.hp = this.maxHp;
    this.speed = params.BASE_ENEMY_SPEED * this.typeConfig.SPEED_MULTIPLIER * (isElite ? ELITE_SPEED_MULTIPLIER : 1);
    this.halfSize = (BASE_SIZE * this.typeConfig.SIZE_MULTIPLIER) / 2;
    this.setPosition(x, y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) body.setSize(this.halfSize * 2, this.halfSize * 2);
    this.setActive(true);
    this.setVisible(true);
    this.setDepth(10);
    this.updateEnemySpriteOrDraw();
    this.updateHpBar();
  }

  private drawElite() {
    const g = this.graphicsChild;
    if (!g) return;
    const h = this.halfSize;
    g.clear();
    g.fillStyle(0x8b008b, 1);
    g.fillRect(-h, -h, h * 2, h * 2);
    g.fillStyle(0xffd700, 1);
    g.fillCircle(-h * 0.4, -h * 0.4, Math.max(2, h * 0.12));
    g.fillCircle(h * 0.4, -h * 0.4, Math.max(2, h * 0.12));
    g.lineStyle(3, 0x4b0082, 1);
    g.strokeRect(-h, -h, h * 2, h * 2);
  }
}
