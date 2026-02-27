import { PartOfSpeech } from "./types";

// ==================== 遊戲常數 ====================

export const INITIAL_HERO_HP = 500;
export const SENTENCE_TIME_LIMIT = 30; // Seconds per sentence

// 稀有度對應的難度參數
export const RARITY_PARAMS: Record<'R' | 'SR' | 'UR', {
  timeLimit: number;
  perfectThreshold: number;
  sentenceLengthMin: number;
  sentenceLengthMax: number;
}> = {
  'R': {
    timeLimit: 30,
    perfectThreshold: 0.8,
    sentenceLengthMin: 5,
    sentenceLengthMax: 8,
  },
  'SR': {
    timeLimit: 20,
    perfectThreshold: 0.9,
    sentenceLengthMin: 9,
    sentenceLengthMax: 12,
  },
  'UR': {
    timeLimit: 15,
    perfectThreshold: 1.0,
    sentenceLengthMin: 13,
    sentenceLengthMax: 20,
  },
};

// ==================== 答題系統 UI ====================

export const TOOL_COLORS: Record<PartOfSpeech, string> = {
  [PartOfSpeech.Subject]: 'bg-blue-500 border-blue-700 text-white',
  [PartOfSpeech.Verb]: 'bg-green-500 border-green-700 text-white',
  [PartOfSpeech.Object]: 'bg-purple-500 border-purple-700 text-white',
  [PartOfSpeech.Helper]: 'bg-rose-500 border-rose-700 text-white',
};

export const TOOL_LABELS: Record<PartOfSpeech, string> = {
  [PartOfSpeech.Subject]: '主',
  [PartOfSpeech.Verb]: '動',
  [PartOfSpeech.Object]: '受',
  [PartOfSpeech.Helper]: '助',
};

export const TOOL_NAMES: Record<PartOfSpeech, string> = {
  [PartOfSpeech.Subject]: 'Subject',
  [PartOfSpeech.Verb]: 'Action',
  [PartOfSpeech.Object]: 'Receiver',
  [PartOfSpeech.Helper]: 'Helper',
};

export const TOOL_KEYS: Record<PartOfSpeech, string> = {
  [PartOfSpeech.Subject]: 'A',
  [PartOfSpeech.Verb]: 'S',
  [PartOfSpeech.Object]: 'D',
  [PartOfSpeech.Helper]: 'F',
};

// ==================== Phaser 遊戲場常數 (PvZ 風格) ====================

export const GAME_WIDTH = 1440;
export const GAME_HEIGHT = 480;

// 僅上下兩橫列
export const LANE_ROWS = 2;
export const GRID_COLS = 6;
export const CELL_WIDTH = GAME_WIDTH / GRID_COLS;
export const CELL_SIZE = 80; // UI 放置用

// 兩橫列的中心 Y 座標（像素）
export const LANE_0_Y = 140;   // 上列
export const LANE_1_Y = 340;  // 下列

export const LANE_Y_POSITIONS = [LANE_0_Y, LANE_1_Y] as const;

/** 由欄位索引取得該格中心 X 座標 */
export const getCellCenterX = (col: number): number =>
  (col + 0.5) * CELL_WIDTH;

// 向後兼容
export const GRID_ROWS = LANE_ROWS;

// Gunner 相關
export const BASE_FIRE_RATE = 1000; // 毫秒
/** 每 1 點 SPD 加成減少 fireRate 的毫秒數（roguelite 升級用） */
export const FIRE_RATE_REDUCTION_PER_SPD_MS = 30;
export const MIN_FIRE_RATE_MS = 200;
/** 爆炸子彈範圍傷害半徑（像素） */
export const EXPLOSION_RADIUS = 60;

// ==================== 共通參照（三種模式共用） ====================

/** 主角、Gunner 貼圖 key（對應 PreloadScene 載入的 key） */
export const COMMON_SPRITE_KEYS = {
  HERO_IDLE: 'hero_idle',
  HERO_WALK: 'hero_walk',
  HERO_ATTACK: 'hero_attack',
  HERO_HIT: 'hero_hit',
  HERO_VICTORY: 'hero_victory',
  GUNNER: 'gunner',
} as const;

/** 子彈顏色（十六進位，依 bulletType） */
export const BULLET_COLORS = {
  normal: 0x00000,    // 黑
  lightning: 0x00000,  // 青
  fire: 0x00000,      // 橘
  explosion: 0x00000, // 金
} as const;

/** 子彈基礎參數（共通基準值） */
export const BULLET_BASE = {
  /** 基準速度（像素/秒），各模式可乘以倍率 */
  SPEED: 100,
  /** 基準傷害倍率（1.0 = 不調整） */
  DAMAGE_MULTIPLIER: 1,
  /** Arcade 模式子彈碰撞體尺寸 */
  BODY_ARCADE: { width: 18, height: 10 },
  /** 繪製：填充圓半徑、外框圓半徑 */
  DRAW: { fillRadius: 5, strokeRadius: 5 },
} as const;

export const BASE_BULLET_SPEED = BULLET_BASE.SPEED;
export const BASE_ATTACK_PER_QUESTION = 50; // 每題最多貢獻的基礎攻擊力
// 答題累積：每 1.0 準確度可加上的數值（攻擊力 / 射速累積值 / 穿透累積值）
export const ACCUMULATED_ATTACK_PER_ACCURACY = 20;
export const ACCUMULATED_FIRERATE_PER_ACCURACY = 3;   // 累積愈高 → 轉成 Gunner 時射速愈快
export const ACCUMULATED_PENETRATION_PER_ACCURACY = 0.5;
/** 中央三圍數字翻動動畫每步間隔（ms），與 RollingNumber stepMs 一致，用於計算延遲 */
export const ROLLING_NUMBER_STEP_MS = 32;
/** 答題後正確答案與所得顯示時長（ms） */
export const ANSWER_FEEDBACK_DURATION_MS = 2000;

// Enemy 相關
export const BASE_ENEMY_HP = 20;
export const BASE_ENEMY_SPEED = 40; // 像素/秒
export const SPAWN_INTERVAL = 4000; // 毫秒
/** 總答題數每 1 題增加敵人血量倍率（hpMultiplier = 1 + totalQuestionCount * this） */
export const ENEMY_HP_PER_QUESTION = 0.1;
/** 菁英怪血量為一般敵人倍率 */
export const ELITE_HP_MULTIPLIER = 5;
/** 菁英怪速度倍率 */
export const ELITE_SPEED_MULTIPLIER = 1.2;
/** 敵人接觸 Gunner 時每次攻擊造成的傷害 */
export const ENEMY_MELEE_DAMAGE = 15;
/** 敵人攻擊 Gunner 的間隔（毫秒） */
export const ENEMY_ATTACK_GUNNER_INTERVAL = 800;

// Gunner 血量（接觸敵人時被攻擊直到耗盡）
export const BASE_GUNNER_HP = 150;

// ==================== 模式參數（PvZ vs 中央塔防 vs 物理堆疊） ====================

export const MODE_PARAMS = {
  /** 模式一：雙軌網格 PvZ */
  PVZ: {
    SPAWN_INTERVAL: 4000,
    BASE_ENEMY_HP: 20,
    BASE_ENEMY_SPEED: 50,
    ENEMY_HP_PER_QUESTION: 0.1,
    ENEMY_MELEE_DAMAGE: 15,
    ENEMY_ATTACK_GUNNER_INTERVAL: 800,
    /** 子彈速度倍率（× BULLET_BASE.SPEED） */
    BULLET_SPEED_MULTIPLIER: 1,
    /** 子彈傷害倍率 */
    BULLET_DAMAGE_MULTIPLIER: 1,
    /** 子彈繪製尺寸（覆寫共通值） */
    BULLET_DRAW: BULLET_BASE.DRAW,
    /** 子彈碰撞體（Arcade） */
    BULLET_BODY: BULLET_BASE.BODY_ARCADE,
  },
  /** 模式二：中央塔防 */
  CENTRAL: {
    SPAWN_INTERVAL: 3000,
    BASE_ENEMY_HP: 15,
    BASE_ENEMY_SPEED: 45,
    ENEMY_HP_PER_QUESTION: 0.08,
    ENEMY_MELEE_DAMAGE: 15,
    ENEMY_ATTACK_GUNNER_INTERVAL: 800,
    BULLET_SPEED_MULTIPLIER: 1,
    BULLET_DAMAGE_MULTIPLIER: 1,
    BULLET_DRAW: BULLET_BASE.DRAW,
    BULLET_BODY: BULLET_BASE.BODY_ARCADE,
  },
  /** 模式三：物理堆疊 */
  STACK: {
    SPAWN_INTERVAL: 3500,
    BASE_ENEMY_HP: 18,
    BASE_ENEMY_SPEED: 40,
    ENEMY_HP_PER_QUESTION: 0.075,
    ENEMY_MELEE_DAMAGE: 20,
    ENEMY_ATTACK_GUNNER_INTERVAL: 700,
    BULLET_SPEED_MULTIPLIER: 0.15,
    BULLET_DAMAGE_MULTIPLIER: 1,
    /** 子彈繪製尺寸（較大） */
    BULLET_DRAW: { fillRadius: 10, strokeRadius: 10 },
    /** Matter 圓形碰撞體半徑 */
    BULLET_BODY: { radius: 6 },
    /** Matter 物理重力（y 愈大重力愈強） */
    MATTER_GRAVITY: { x: 0, y: 2 },
    /** Matter 碰撞類別：地面 */
    GROUND_CATEGORY: 0x0001,
    /** Matter 碰撞類別：子彈 */
    BULLET_CATEGORY: 0x0002,
    /** Matter 碰撞類別：英雄與 Gunner（子彈不與之 Matter 碰撞，仍由手動 overlap 處理） */
    HERO_GUNNER_CATEGORY: 0x0004,
    /** 子彈 Matter 參數（與地面、子彈碰撞並反彈） */
    BULLET_MATTER: {
      friction: 0,
      frictionAir: 0.005,
      restitution: 0.6,
      ignoreGravity: false,
      collisionFilter: { category: 0x0002, mask: 0x0003 },
    },
    /** 子彈存活時間（毫秒），逾時自動消失；5 秒未擊中敵人即消失 */
    BULLET_LIFETIME_MS: 5000,
    /** 子彈射出後多久才可與 Gunner/主角碰撞並消失（毫秒） */
    BULLET_ARM_DELAY_MS: 100,
    /** 子彈與 Gunner/主角的碰撞判定半徑（像素） */
    BULLET_GUNNER_HERO_TOUCH: 30,
    /** Gunner  Matter 物理參數（提高 friction、零 restitution 以利堆疊穩定性） */
    GUNNER_MATTER: { friction: 0.6, restitution: 0 },
    /** Gunner 尺寸依 ATK 縮放：0→atkForMax 對應 minMultiplier→maxMultiplier */
    GUNNER_SIZE_ATK_SCALE: { minMultiplier: 1, maxMultiplier: 2.5, atkForMax: 100 },
    /** 子彈初速依 ATK 縮放：0→atkForMax 對應 1x→2x */
    BULLET_SPEED_ATK_SCALE: { minMultiplier: 1, maxMultiplier: 2, atkForMax: 100 },
    /** 投擲 X 軸邊界留白（像素） */
    DROP_X_MARGIN: 80,
    /** 滑桿定點移動速度（每幀移動比例 0~1，愈大愈快） */
    MARKER_SPEED: 0.025,
    /** 滑桿軌道寬度（像素） */
    SLIDER_WIDTH: 300,
    /** aircraft 炸彈：觸及判定半徑（像素） */
    BOMB_TOUCH_RADIUS: 35,
    /** aircraft 炸彈：落下初速（y 正向下，像素/秒） */
    BOMB_INITIAL_VY: 180,
    /** aircraft 瞄準距離權重（<1 表示有效距離較短，提高優先順序） */
    AIRCRAFT_DISTANCE_MULTIPLIER: 0.7,
    /** aircraft 抵達中央爆炸：傷害值（對全體 Gunner 與主角） */
    AIRCRAFT_EXPLOSION_DAMAGE: 20,
    /** aircraft 抵達中央爆炸：X 軸門檻（像素，與 CENTER_X 距離小於此值即觸發） */
    AIRCRAFT_EXPLOSION_X_THRESHOLD: 30,
    /** 地面敵人與主角觸及半徑（像素），小於此值則停下來攻擊主角 */
    ENEMY_HERO_TOUCH: 50,
  },
} as const;

// 物理堆疊模式專用
/** 地面 Y 座標（地面頂緣） */
export const STACK_GROUND_Y = GAME_HEIGHT - 40;
/** Gunner 投擲起始高度（從畫面上方落下） */
export const STACK_DROP_HEIGHT = 80;
/** Gunner 實體寬高 */
export const STACK_GUNNER_SIZE = 36;

// 中央塔防專用
export const CENTRAL_SLOT_COUNT = 12;
export const CENTRAL_SLOTS_LEFT = 6;
export const CENTRAL_SLOTS_RIGHT = 6;
/** 左/右各 3 列 × 2 欄，格子間距 */
export const CENTRAL_SLOT_COLS = 2;
export const CENTRAL_SLOT_ROWS = 3;
export const CENTRAL_SLOT_GAP = 12;
export const CENTRAL_SLOT_SIZE = 36;
/** 左側格子群左邊緣距左邊界距離（僅在未使用 CENTRAL_SLOT_INSET 時使用） */
export const CENTRAL_LEFT_MARGIN = 120;
/** 右側格子群右邊緣距右邊界距離（僅在未使用 CENTRAL_SLOT_INSET 時使用） */
export const CENTRAL_RIGHT_MARGIN = 120;
/** 主角中心與最近欄位群邊緣的距離，欄位以中心為基準左右對稱、靠近主角 */
export const CENTRAL_SLOT_INSET = 80;
export const CENTRAL_SLOT_RADIUS = 120; // 保留供相容
export const CENTRAL_HERO_RADIUS = 30;
export const CENTRAL_REACH_THRESHOLD = 40;
