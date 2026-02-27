import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  STACK_GROUND_Y,
  MODE_PARAMS,
  ENEMY_MELEE_DAMAGE,
  ENEMY_ATTACK_GUNNER_INTERVAL,
} from '../../constants';
import type { EnemyTypeConfig } from '../../types';
import { getEnemyType } from '../../data/enemyTypes';
import type { GunnerPhysics } from './GunnerPhysics';

const CENTER_X = GAME_WIDTH / 2;
const params = MODE_PARAMS.STACK;
const BASE_SIZE = 40;
const REACH_THRESHOLD = 50;
const GUNNER_TOUCH_RADIUS = 45;
const AIRCRAFT_Y = 80;

/** 物理堆疊模式：步兵／坦克／飛機，從兩側逼近 */
export class EnemyPhysics extends Phaser.GameObjects.Container {
  private hp: number;
  private maxHp: number;
  private speed: number;
  private hpBar!: Phaser.GameObjects.Graphics;
  private typeConfig: EnemyTypeConfig = getEnemyType('infantry');
  private halfSize: number = BASE_SIZE / 2;
  private targetGunner: GunnerPhysics | null = null;
  private targetHero: boolean = false;
  private attackTimer: number = 0;
  private attackHeroTimer: number = 0;
  private oneShotDealt: boolean = false;
  private fromLeft: boolean = true;
  private graphicsChild: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.maxHp = params.BASE_ENEMY_HP;
    this.hp = this.maxHp;
    this.speed = params.BASE_ENEMY_SPEED;
    this.fromLeft = x < CENTER_X;
    this.ensureGraphicsChild();
    this.drawEnemy();
    this.createHpBar();
    scene.add.existing(this);
    this.setActive(true);
    this.setVisible(true);
    this.setDepth(10);
  }

  private ensureGraphicsChild(): void {
    if (!this.graphicsChild) {
      this.graphicsChild = this.scene.add.graphics();
      this.add(this.graphicsChild);
    }
  }

  private drawEnemy() {
    const g = this.graphicsChild;
    if (!g) return;
    const h = this.halfSize;
    g.clear();
    g.fillStyle(this.typeConfig.color, 1);
    g.fillRect(-h, -h, h * 2, h * 2);
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

  public setAttackingGunner(gunner: GunnerPhysics | null) {
    this.targetGunner = gunner;
  }

  public setAttackingHero(attacking: boolean) {
    this.targetHero = attacking;
    if (!attacking) this.attackHeroTimer = 0;
  }

  /** 是否為 aircraft（用於 Gunner 瞄準優先順序調整） */
  public isAircraft(): boolean {
    return this.typeConfig.MOVEMENT_TYPE === 'aerial';
  }

  /** 是否正在攻擊 Gunner（若為 true 則不再設為攻擊主角） */
  public isAttackingGunner(): boolean {
    return this.targetGunner !== null;
  }

  public spawn(
    x: number,
    y: number,
    hpMultiplier: number = 1,
    typeConfig?: EnemyTypeConfig
  ) {
    this.typeConfig = typeConfig ?? getEnemyType('infantry');
    this.oneShotDealt = false;
    this.targetGunner = null;
    this.targetHero = false;
    this.attackTimer = 0;
    this.maxHp = params.BASE_ENEMY_HP * hpMultiplier * this.typeConfig.HP_MULTIPLIER;
    this.hp = this.maxHp;
    this.speed = params.BASE_ENEMY_SPEED * this.typeConfig.SPEED_MULTIPLIER;
    this.halfSize = (BASE_SIZE * this.typeConfig.SIZE_MULTIPLIER) / 2;
    this.fromLeft = x < CENTER_X;
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.drawEnemy();
    this.updateHpBar();
  }

  public takeDamage(damage: number) {
    this.hp -= damage;
    this.updateHpBar();
    if (this.hp <= 0) this.die();
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
    this.targetHero = false;
    this.oneShotDealt = false;
    this.setActive(false);
    this.setVisible(false);
    this.hpBar?.clear();
    this.setPosition(-200, -200);
  }

  private getAttackDamage(): number {
    return Math.max(1, Math.floor(ENEMY_MELEE_DAMAGE * this.typeConfig.ATK_MULTIPLIER));
  }

  private getAttackInterval(): number {
    return ENEMY_ATTACK_GUNNER_INTERVAL / Math.max(0.1, this.typeConfig.ATK_SPEED_MULTIPLIER);
  }

  update(_time: number, delta: number) {
    if (!this.active) return;

    const movementType = this.typeConfig.MOVEMENT_TYPE ?? 'ground';

    if (movementType === 'aerial') {
      this.updateAircraft(delta);
      return;
    }

    if (this.targetGunner) {
      if (!this.targetGunner.active) {
        this.targetGunner = null;
        this.attackTimer = 0;
      } else {
        const gdx = this.targetGunner.x - this.x;
        const gdy = this.targetGunner.y - this.y;
        const gdist = Math.sqrt(gdx * gdx + gdy * gdy);
        if (gdist > GUNNER_TOUCH_RADIUS) {
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

    if (this.targetHero) {
      this.attackHeroTimer += delta;
      if (this.attackHeroTimer >= this.getAttackInterval()) {
        this.scene.events.emit('heroTakeDamage', { damage: this.getAttackDamage() });
        this.attackHeroTimer = 0;
      }
      this.updateHpBar();
      return;
    }

    if (movementType === 'ground') {
      const dx = CENTER_X - this.x;
      const dy = STACK_GROUND_Y - this.halfSize - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < REACH_THRESHOLD) {
        this.reachBase();
        return;
      }
      const move = (this.speed * delta) / 1000;
      const len = dist || 1;
      this.x += (dx / len) * move;
      this.y += (dy / len) * move;
    } else if (movementType === 'ranged') {
      const dx = (this.fromLeft ? 1 : -1) * this.speed * delta / 1000;
      this.x += dx;
      const dy = STACK_GROUND_Y - this.halfSize - this.y;
      if (Math.abs(dy) > 5) {
        this.y += Math.sign(dy) * Math.min(Math.abs(dy), (this.speed * 0.5 * delta) / 1000);
      }
      if (this.x < -50 || this.x > GAME_WIDTH + 50) this.deactivate();
    }

    this.updateHpBar();
  }

  private updateAircraft(delta: number) {
    const dx = (this.fromLeft ? 1 : -1) * this.speed * delta / 1000;
    this.x += dx;
    if (this.x < -50 || this.x > GAME_WIDTH + 50) this.deactivate();

    const distFromCenter = Math.abs(this.x - CENTER_X);
    const threshold = params.AIRCRAFT_EXPLOSION_X_THRESHOLD ?? 30;
    if (distFromCenter < threshold) {
      const damage = params.AIRCRAFT_EXPLOSION_DAMAGE ?? 20;
      this.scene.events.emit('aircraftExplode', { damage, x: this.x, y: this.y });
      this.deactivate();
    }
  }
}
