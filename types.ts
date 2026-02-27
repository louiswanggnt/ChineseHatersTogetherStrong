
// ==================== 答題系統 ====================

// ---- 新四種題型 discriminated union ----

export type QuestionType =
  | 'CIRCLE_MODERN'
  | 'FILL_CONJUNCTION'
  | 'TITLE_MATCH'
  | 'CIRCLE_CLASSICAL'
  | 'READING_COMPREHENSION';

export interface CircleModernQuestion {
  id: string;
  type: 'CIRCLE_MODERN';
  difficulty: 'R' | 'SR' | 'UR';
  timeLimit?: number;
  text: string;
  answer: {
    subjectIndices: number[];
    adjIndices: number[];
    keyIndices: number[];
  };
}

export interface ConjunctionQuestion {
  id: string;
  type: 'FILL_CONJUNCTION';
  difficulty: 'R' | 'SR' | 'UR';
  timeLimit?: number;
  sentence1: string;
  sentence2: string;
  standardAnswer: string;
  /** 選填。若未提供則依 standardAnswer 從全域同義詞組對照 */
  synonyms?: string[];
}

export interface TitleMatchQuestion {
  id: string;
  type: 'TITLE_MATCH';
  difficulty: 'R' | 'SR' | 'UR';
  timeLimit?: number;
  pairs: { sentence: string; title: string }[];
}

export interface CircleClassicalQuestion {
  id: string;
  type: 'CIRCLE_CLASSICAL';
  difficulty: 'R' | 'SR' | 'UR';
  timeLimit?: number;
  text: string;
  answer: {
    subjectIndices: number[];
    verbIndices: number[];
    particleIndices: number[];
    /** 可選。字元 index → 白話註釋，用於 CorrectAnswerOverlay */
    annotationsByIndex?: Record<number, string>;
  };
}

export interface ReadingComprehensionQuestion {
  id: string;
  type: 'READING_COMPREHENSION';
  articleId: string;
  article: string;
  difficulty: 'R' | 'SR' | 'UR';
  timeLimit?: number;
  /** 右側顯示用：題目＋選項純文字（可含 "A.xxx\nB.xxx\nC.xxx"） */
  question: string;
  /** 選填，用於正確答案 overlay 顯示選項文字 */
  options?: [string, string, string];
  correctIndex: 0 | 1 | 2;
}

export type AnyQuestion =
  | CircleModernQuestion
  | ConjunctionQuestion
  | TitleMatchQuestion
  | CircleClassicalQuestion
  | ReadingComprehensionQuestion;

// ---- 舊版型別（向後兼容） ----


export enum PartOfSpeech {
  Subject = 'SUBJECT',
  Verb = 'VERB',
  Object = 'OBJECT',
  Helper = 'HELPER', // Particles, Adjectives, Adverbs, etc.
}

export interface CharacterBlock {
  char: string;
  originalIndex: number;
  selectedType?: PartOfSpeech;
}

export interface SentenceRow {
  id: string;
  text: string;
  characters: CharacterBlock[];
  isClearing: boolean;
  analysis: {
    subjectIndices: number[];
    verbIndices: number[];
    objectIndices: number[];
    helperIndices: number[];
  };
  difficulty?: 'R' | 'SR' | 'UR';
  timeLimit?: number;
  perfectThreshold?: number;
}

// 答題結果
export interface QuestionResult {
  accuracy: number;        // 0-1 準確度
  timeMultiplier: number;  // 時間加成倍率
  isPerfect: boolean;      // 是否完美答題
}

// 答題統計
export interface QuestionStats {
  questionId: string;
  recentResults: boolean[];
  totalCorrect: number;
  totalAttempts: number;
  lastAttemptTime: number;
}

// ==================== Gunner 系統 ====================

export interface GunnerStats {
  bulletDamage: number;      // 子彈攻擊力
  bulletsPerShot: number;   // 每次射擊發射子彈數
  bulletPenetration: number; // 穿透敵人數量
  fireRate: number;          // 射速（毫秒/次）
  hp?: number;               // 可選，未傳則用 BASE_GUNNER_HP
}

export interface Gunner extends GunnerStats {
  id: string;
  gridX?: number;             // 網格 X 座標（PvZ 用）
  gridY?: number;             // 網格 Y 座標（PvZ 用）
  slotIndex?: number;         // 中央模式用：Gunner 所在 slot 索引
  dropX?: number;             // 物理堆疊模式用：投擲 X 座標
}

// ==================== 敵人類別 ====================

/** 攻擊模式：持續攻擊 = 依間隔重複造成傷害；一次性攻擊 = 接觸時只造成一次傷害 */
export type EnemyAttackType = 'SUSTAINED' | 'ONE_SHOT';

/** 物理堆疊模式敵人移動／攻擊型態 */
export type EnemyMovementType = 'ground' | 'ranged' | 'aerial';

export interface EnemyTypeConfig {
  id: string;
  /** Phaser 填色用（0xRRGGBB） */
  color: number;
  HP_MULTIPLIER: number;
  SPEED_MULTIPLIER: number;
  /** 邊長倍率（基準 40px） */
  SIZE_MULTIPLIER: number;
  ATK_MULTIPLIER: number;
  /** 攻擊頻率倍率（愈高愈快，間隔 = BASE_INTERVAL / 此值） */
  ATK_SPEED_MULTIPLIER: number;
  ATK_TYPE: EnemyAttackType;
  /** 物理堆疊模式用：ground=步兵衝撞爆炸 / ranged=坦克發射砲彈 / aerial=飛機丟炸彈 */
  MOVEMENT_TYPE?: EnemyMovementType;
}

// ==================== 地圖系統 ====================

export enum MapNodeType {
  BATTLE = 'BATTLE',
  ELITE = 'ELITE',
  BOSS = 'BOSS',
  TREASURE = 'TREASURE',
  SHOP = 'SHOP',
  REST = 'REST',
  EVENT = 'EVENT',
}

export interface MapNode {
  id: string;
  type: MapNodeType;
  x: number;
  y: number;
  connections: string[];
  completed: boolean;
}

export interface MapState {
  nodes: MapNode[];
  currentNodeId: string | null;
  floor: number;
}

// 關卡
export interface Stage {
  id: number;
  name: string;
  waves: number;                    // 波次數量
  enemyHpMultiplier: number;        // 敵人血量倍率
  enemySpeedMultiplier: number;     // 敵人速度倍率
  completed: boolean;
}

// ==================== 遊戲狀態 ====================

export type GameMode = 'PVZ' | 'CENTRAL' | 'STACK';

export type GamePhase = 
  | 'START'       // 開始畫面
  | 'MAP'         // 地圖選關
  | 'QUESTION'    // 答題階段
  | 'PLACEMENT'   // Gunner 放置
  | 'BATTLE'      // 射擊戰鬥
  | 'VICTORY'     // 勝利
  | 'GAMEOVER'    // 遊戲結束
  | 'PAUSED';     // 暫停

export interface GameState {
  phase: GamePhase;
  gameMode: GameMode;
  score: number;
  level: number;
  wave: number;
  heroHp: number;
  maxHeroHp: number;
  questionBuffer: QuestionResult[];  // 累積的答題結果
  gunners: Gunner[];                 // 已放置的 Gunners
  /** 答題累積：攻擊力（生成 Gunner 時用於子彈傷害，生成後歸零） */
  accumulatedAttack: number;
  /** 答題累積：射速（數值愈高愈快，生成後歸零） */
  accumulatedFireRate: number;
  /** 答題累積：穿透數（生成後歸零） */
  accumulatedPenetration: number;
  /** 總答題數（生成的題目總量，含未作答；用於敵人血量與菁英怪） */
  totalQuestionCount: number;
  /** 已觸發菁英怪的最高 20 倍數（20, 40, 60...） */
  lastEliteMilestone: number;
  /** 已觸發 small_boss 的最高 10 倍數（10, 20, 30...） */
  lastSmallBossMilestone: number;
  /** 已觸發 big_boss 的最高 24 倍數（24, 48, 72...） */
  lastBigBossMilestone: number;
  /** 累計擊殺數（用於 roguelite 升級里程碑） */
  totalKillCount: number;
  /** 已觸發升級的擊殺里程碑（10, 20, 30, 50, 80...） */
  lastUpgradeKillMilestone: number;
  /** 是否顯示升級選單（擊殺達里程碑時 true，選完關閉） */
  showUpgradeModal: boolean;
  /** 本次升級三選一選項（顯示時由 pickThreeUpgradeOptions 填入） */
  upgradeChoices: { id: string; label: string; description: string }[] | null;
  /** 各 Gunner 的額外 ATK/SPD/PEN（key = Gunner.id） */
  gunnerBonuses: Record<string, { atk: number; spd: number; pen: number }>;
  /** 全體 Gunner 的額外數值與子彈機率 */
  globalGunnerBonuses: {
    atk: number;
    spd: number;
    pen: number;
    extraBulletChance: number;
    lightningChance: number;
    fireChance: number;
    explosionChance: number;
  };
  currentStage?: Stage;
  mapState?: MapState;
}
