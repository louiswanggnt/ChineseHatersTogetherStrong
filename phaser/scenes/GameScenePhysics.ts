import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  STACK_GROUND_Y,
  STACK_GUNNER_SIZE,
  CENTRAL_HERO_RADIUS,
  MODE_PARAMS,
} from '../../constants';
import { GunnerPhysics } from '../entities/GunnerPhysics';
import { BulletPhysics } from '../entities/BulletPhysics';
import { BombPhysics } from '../entities/BombPhysics';
import { EnemyPhysics } from '../entities/EnemyPhysics';
import { WaveManagerPhysics } from '../managers/WaveManagerPhysics';
import { EXPLOSION_RADIUS } from '../../constants';

const CENTER_X = GAME_WIDTH / 2;
const BULLET_HIT_RADIUS = 25;
const BULLET_GUNNER_HERO_TOUCH = MODE_PARAMS.STACK.BULLET_GUNNER_HERO_TOUCH;
const BOMB_TOUCH_RADIUS = MODE_PARAMS.STACK.BOMB_TOUCH_RADIUS ?? 35;
const BULLET_ARM_DELAY_MS = MODE_PARAMS.STACK.BULLET_ARM_DELAY_MS;
const ENEMY_GUNNER_TOUCH = 45;
const ENEMY_HERO_TOUCH = MODE_PARAMS.STACK.ENEMY_HERO_TOUCH ?? 50;
const GROUND_HEIGHT = 40;
const HERO_SIZE = CENTRAL_HERO_RADIUS * 2;

/** 物理堆疊模式：地面、主角、Matter 物理 */
export class GameScenePhysics extends Phaser.Scene {
  private gunners!: Phaser.GameObjects.Group;
  private bullets!: Phaser.GameObjects.Group;
  private bombs!: Phaser.GameObjects.Group;
  private enemies!: Phaser.GameObjects.Group;
  private waveManager!: WaveManagerPhysics;
  private currentTotalQuestionCount: number = 0;
  private matterReady: boolean = false;
  private heroY: number = 0;

  constructor() {
    super({ key: 'GameScenePhysics', physics: { matter: true } });
  }

  /** 從指定 X 軸投擲 Gunner */
  public addGunnerAtDropX(dropX: number, stats: any, gunnerId?: string): void {
    if (!this.matterReady || !this.gunners || !this.bullets || !this.enemies || !this.bombs) return;
    const gunner = new GunnerPhysics(this, dropX, stats, gunnerId, this.bullets, this.enemies);
    this.gunners.add(gunner);
  }

  create() {
    if (!this.matter || !this.matter.world) {
      console.error('[GameScenePhysics] Matter physics not available');
      return;
    }
    this.matterReady = true;

    this.cameras.main.setBackgroundColor('#87CEEB');

    this.gunners = this.add.group({ runChildUpdate: true });
    this.bullets = this.add.group({
      classType: BulletPhysics,
      maxSize: 200,
      runChildUpdate: true,
    });
    this.enemies = this.add.group({
      classType: EnemyPhysics,
      maxSize: 50,
      runChildUpdate: true,
    });
    this.bombs = this.add.group({
      classType: BombPhysics,
      maxSize: 50,
    });

    this.events.on('aircraftExplode', ({ damage, x, y }: { damage: number; x?: number; y?: number }) => {
      const ex = x ?? CENTER_X;
      const ey = y ?? this.heroY;
      this.playExplosionAnimation(ex, ey);
      this.gunners.getChildren().forEach((gObj) => {
        const gunner = gObj as GunnerPhysics;
        if (gunner.active) gunner.takeDamage(damage);
      });
      this.events.emit('heroTakeDamage', { damage });
    });

    this.waveManager = new WaveManagerPhysics(
      this,
      this.enemies,
      () => this.getHpMultiplier(),
      () => this.currentTotalQuestionCount
    );

    this.events.on('totalQuestionCount', (n: number) => {
      this.currentTotalQuestionCount = n;
    });

    this.time.delayedCall(2000, () => this.waveManager.startWave());

    this.drawBackground();

    const groundCategory = MODE_PARAMS.STACK.GROUND_CATEGORY ?? 0x0001;
    const heroGunnerCat = MODE_PARAMS.STACK.HERO_GUNNER_CATEGORY ?? 0x0004;
    const groundBody = Phaser.Physics.Matter.Matter.Bodies.rectangle(
      CENTER_X,
      STACK_GROUND_Y + GROUND_HEIGHT / 2,
      GAME_WIDTH,
      GROUND_HEIGHT,
      { isStatic: true, collisionFilter: { category: groundCategory, mask: 0x0003 | heroGunnerCat } }
    );
    this.matter.world.add(groundBody);
    this.add.graphics().fillStyle(0x8B4513, 1).fillRect(0, STACK_GROUND_Y, GAME_WIDTH, GROUND_HEIGHT).setDepth(0);

    this.heroY = STACK_GROUND_Y - HERO_SIZE / 2;
    const heroCategory = MODE_PARAMS.STACK.HERO_GUNNER_CATEGORY ?? 0x0004;
    const heroBody = Phaser.Physics.Matter.Matter.Bodies.rectangle(CENTER_X, this.heroY, HERO_SIZE, HERO_SIZE, {
      isStatic: true,
      collisionFilter: { category: heroCategory, mask: 0 },
    });
    this.matter.world.add(heroBody);
    if (this.textures.exists('hero_idle')) {
      const heroImg = this.add.image(CENTER_X, this.heroY, 'hero_idle');
      heroImg.setDisplaySize(HERO_SIZE, HERO_SIZE).setDepth(5);
    } else {
      this.add.graphics()
        .fillStyle(0xff0000, 1)
        .fillRect(CENTER_X - HERO_SIZE / 2, this.heroY - HERO_SIZE / 2, HERO_SIZE, HERO_SIZE)
        .setDepth(5);
    }

    const debugText = this.add.text(10, 10, 'GameScenePhysics (STACK)', {
      font: '14px monospace',
      color: '#ffffff',
      backgroundColor: '#000000',
    });
    debugText.setDepth(100);

    this.game.events.emit('gameSceneReady', this.scene.key);
  }

  private getHpMultiplier(): number {
    return 1 + this.currentTotalQuestionCount * MODE_PARAMS.STACK.ENEMY_HP_PER_QUESTION;
  }

  private playExplosionAnimation(x: number, y: number) {
    const g = this.add.graphics();
    g.setDepth(20);
    const minRadius = 0;
    const maxRadius = 70;
    const duration = 350;
    const progress = { v: 0 };
    this.tweens.add({
      targets: progress,
      v: 1,
      duration,
      ease: 'Power2',
      onUpdate: () => {
        const v = progress.v;
        g.clear();
        const r = minRadius + v * maxRadius;
        const alpha = 0.8 * (1 - v);
        g.fillStyle(0xff6600, alpha);
        g.fillCircle(x, y, r);
        g.lineStyle(2, 0xffaa00, alpha);
        g.strokeCircle(x, y, r);
      },
      onComplete: () => {
        g.destroy();
      },
    });
  }

  private drawBackground() {
    if (this.textures.exists('bg_battle')) {
      const bg = this.add.image(0, 0, 'bg_battle');
      bg.setOrigin(0, 0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(-1);
    }
  }

  update() {
    if (!this.matterReady || !this.enemies || !this.gunners || !this.bullets || !this.bombs) return;

    this.waveManager?.update(this.game.loop.delta);

    this.checkEnemyGunnerOverlap();
    this.checkEnemyHeroOverlap();
    this.checkBulletEnemyCollision();
    this.checkBulletGunnerHeroCollision();
    this.checkBombCollision();
  }

  private checkBulletGunnerHeroCollision() {
    const now = this.time.now;
    this.bullets.getChildren().forEach((bObj) => {
      const bullet = bObj as BulletPhysics;
      if (!bullet.active) return;
      const elapsed = now - bullet.getSpawnTime();
      if (elapsed < BULLET_ARM_DELAY_MS) return;

      const touch2 = BULLET_GUNNER_HERO_TOUCH * BULLET_GUNNER_HERO_TOUCH;
      const dxHero = CENTER_X - bullet.x;
      const dyHero = this.heroY - bullet.y;
      if (dxHero * dxHero + dyHero * dyHero < touch2) {
        bullet.deactivate();
        return;
      }
      this.gunners.getChildren().forEach((gObj) => {
        const gunner = gObj as GunnerPhysics;
        if (!gunner.active) return;
        const dx = gunner.x - bullet.x;
        const dy = gunner.y - bullet.y;
        if (dx * dx + dy * dy < touch2) {
          bullet.deactivate();
        }
      });
    });
  }

  private checkEnemyGunnerOverlap() {
    this.enemies.getChildren().forEach((eObj) => {
      const enemy = eObj as EnemyPhysics;
      if (!enemy.active) return;
      let foundGunner: GunnerPhysics | null = null;
      for (const gObj of this.gunners.getChildren()) {
        const gunner = gObj as GunnerPhysics;
        if (!gunner.active) continue;
        const dx = gunner.x - enemy.x;
        const dy = gunner.y - enemy.y;
        if (dx * dx + dy * dy < ENEMY_GUNNER_TOUCH * ENEMY_GUNNER_TOUCH) {
          foundGunner = gunner;
          break;
        }
      }
      enemy.setAttackingGunner(foundGunner);
    });
  }

  private checkEnemyHeroOverlap() {
    this.enemies.getChildren().forEach((eObj) => {
      const enemy = eObj as EnemyPhysics;
      if (!enemy.active) return;
      if (enemy.isAircraft()) return;
      if (enemy.isAttackingGunner()) return;
      const dx = CENTER_X - enemy.x;
      const dy = this.heroY - enemy.y;
      const dist2 = dx * dx + dy * dy;
      const touch2 = ENEMY_HERO_TOUCH * ENEMY_HERO_TOUCH;
      enemy.setAttackingHero(dist2 < touch2);
    });
  }

  private checkBombCollision() {
    const touch2 = BOMB_TOUCH_RADIUS * BOMB_TOUCH_RADIUS;
    this.bombs.getChildren().forEach((bObj) => {
      const bomb = bObj as BombPhysics;
      if (!bomb.active) return;

      const { x: bx, y: by } = bomb.getWorldPosition();

      // 地面消失：Y 軸抵達地面即消失（簡化判斷）
      if (by >= STACK_GROUND_Y) {
        bomb.deactivate();
        return;
      }
      const dxHero = CENTER_X - bx;
      const dyHero = this.heroY - by;
      if (dxHero * dxHero + dyHero * dyHero < touch2) {
        this.events.emit('heroTakeDamage', { damage: bomb.getDamage() });
        bomb.deactivate();
        return;
      }

      for (const gObj of this.gunners.getChildren()) {
        const gunner = gObj as GunnerPhysics;
        if (!gunner.active) continue;
        const dx = gunner.x - bx;
        const dy = gunner.y - by;
        if (dx * dx + dy * dy < touch2) {
          gunner.takeDamage(bomb.getDamage());
          bomb.deactivate();
          return;
        }
      }
    });
  }

  private checkBulletEnemyCollision() {
    this.bullets.getChildren().forEach((bObj) => {
      const bullet = bObj as BulletPhysics;
      if (!bullet.active) return;
      this.enemies.getChildren().forEach((eObj) => {
        const enemy = eObj as EnemyPhysics;
        if (!enemy.active) return;
        if (bullet.hasHit(enemy)) return;
        const dx = enemy.x - bullet.x;
        const dy = enemy.y - bullet.y;
        if (dx * dx + dy * dy < BULLET_HIT_RADIUS * BULLET_HIT_RADIUS) {
          enemy.takeDamage(bullet.getDamage());
          bullet.registerHit(enemy);
          bullet.onHit();
        }
      });
    });
  }
}
