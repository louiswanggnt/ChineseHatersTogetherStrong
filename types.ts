
export enum PartOfSpeech {
  Subject = 'SUBJECT',
  Verb = 'VERB',
  Object = 'OBJECT',
  Helper = 'HELPER', // Particles, Adjectives, Adverbs, etc.
}

// 卡牌類型
export enum CardType {
  ATTACK = 'ATTACK',
  DEFENSE = 'DEFENSE',
  SKILL = 'SKILL',
}

// 題目類型（擴充）
export enum QuestionType {
  // 原有的文法標註
  GRAMMAR_ANNOTATION = 'GRAMMAR_ANNOTATION',
  // 新增的題型
  ANNOTATION_MAIN_CONNECT_KEY = 'ANNOTATION_MAIN_CONNECT_KEY', // 標註主詞連接重點
  ANNOTATION_5W = 'ANNOTATION_5W', // 標註 5W
  MATCHING_SENTENCE_TITLE = 'MATCHING_SENTENCE_TITLE', // 句子標題配對
  FILL_BLANK_CONNECTOR = 'FILL_BLANK_CONNECTOR', // 填空連接詞
  ANNOTATION_CLASSICAL = 'ANNOTATION_CLASSICAL', // 文言文標註
  WORD_MEANING_CHOICE = 'WORD_MEANING_CHOICE', // 詞義選擇
}

// 卡牌稀有度
export type CardRarity = 'R' | 'SR' | 'UR';

// 卡牌效果
export enum CardEffect {
  NONE = 'NONE',
  AOE = 'AOE', // 攻擊全體
  SWAP_ATK_DEF = 'SWAP_ATK_DEF', // 攻守反轉
  DOUBLE_DAMAGE = 'DOUBLE_DAMAGE', // 雙倍傷害
  HEAL = 'HEAL', // 治療
}

// 卡牌介面
export interface Card {
  id: string;
  type: CardType;
  name: string;
  rarity: CardRarity;
  // 攻擊牌參數
  baseAttack?: number;
  attackCount?: number;
  // 防禦牌參數
  baseBlock?: number;
  hpConversionRate?: number;
  // 共用
  timeBonusMultiplier?: number;
  // 特殊效果
  effect?: CardEffect;
}

// 答題後的卡牌結果
export interface CardResult {
  cardId: string;
  cardType: CardType;
  attack?: number;
  timeMultiplier?: number;
  attackCount?: number;
  block?: number;
  hpConversion?: number;
}

// 敵人意圖
export enum EnemyIntent {
  ATTACK = 'ATTACK',
  DEFEND = 'DEFEND',
  CAST = 'CAST',
  UNKNOWN = 'UNKNOWN',
}

// 地圖節點類型
export enum MapNodeType {
  BATTLE = 'BATTLE',
  ELITE = 'ELITE',
  BOSS = 'BOSS',
  TREASURE = 'TREASURE',
  SHOP = 'SHOP',
  REST = 'REST',
  EVENT = 'EVENT',
}

// 地圖節點
export interface MapNode {
  id: string;
  type: MapNodeType;
  x: number;
  y: number;
  connections: string[]; // IDs of connected nodes
  completed: boolean;
}

// 地圖狀態
export interface MapState {
  nodes: MapNode[];
  currentNodeId: string | null;
  floor: number;
}

// 遭遇
export interface Encounter {
  id: string;
  enemyTypes: string[];
  enemyCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ==================== 多題型系統 ====================

// 基礎題目介面
export interface BaseQuestion {
  id: string;
  type: QuestionType;
  difficulty: CardRarity;
  timeLimit: number;
  perfectThreshold: number;
}

// 1. 標註類題目（主詞連接重點）
export interface AnnotationMainConnectKeyQuestion extends BaseQuestion {
  type: QuestionType.ANNOTATION_MAIN_CONNECT_KEY;
  text: string;
  answer: {
    mainIndices: number[];
    connectIndices: number[];
    keyIndices: number[];
  };
}

// 2. 5W 標註題
export interface Annotation5WQuestion extends BaseQuestion {
  type: QuestionType.ANNOTATION_5W;
  text: string;
  answer: {
    whoIndices: number[];
    whenIndices: number[];
    whereIndices: number[];
    whatIndices: number[];
    whyIndices: number[];
  };
}

// 3. 句子標題配對
export interface MatchingSentenceTitleQuestion extends BaseQuestion {
  type: QuestionType.MATCHING_SENTENCE_TITLE;
  sentences: string[];
  titles: string[];
  answer: number[]; // [0, 2, 1] 表示句子0→標題0, 句子1→標題2, 句子2→標題1
}

// 4. 填空連接詞
export interface FillBlankConnectorQuestion extends BaseQuestion {
  type: QuestionType.FILL_BLANK_CONNECTOR;
  sentenceBefore: string;
  sentenceAfter: string;
  options: string[];
  answer: number; // 正確答案的 index
}

// 5. 文言文標註
export interface AnnotationClassicalQuestion extends BaseQuestion {
  type: QuestionType.ANNOTATION_CLASSICAL;
  text: string;
  answer: {
    subjectIndices: number[];   // 主詞
    verbIndices: number[];      // 動詞
    pronounIndices: number[];   // 代詞
    particleIndices: number[];  // 虛詞
  };
}

// 6. 詞義選擇
export interface WordMeaningChoiceQuestion extends BaseQuestion {
  type: QuestionType.WORD_MEANING_CHOICE;
  text: string;
  targetWord: string;
  targetIndex: number;
  options: string[];
  answer: number;
}

// 所有題型的聯合類型
export type Question = 
  | AnnotationMainConnectKeyQuestion
  | Annotation5WQuestion
  | MatchingSentenceTitleQuestion
  | FillBlankConnectorQuestion
  | AnnotationClassicalQuestion
  | WordMeaningChoiceQuestion;

// 答題統計
export interface QuestionStats {
  questionId: string;
  recentResults: boolean[]; // 最近 N 次的對錯
  totalCorrect: number;
  totalAttempts: number;
  lastAttemptTime: number;
}

export interface CharacterBlock {
  char: string;
  originalIndex: number;
  selectedType?: PartOfSpeech; // If the user has selected this block
}

export interface SentenceRow {
  id: string;
  text: string;
  characters: CharacterBlock[];
  isClearing: boolean; // For animation
  analysis: {
    subjectIndices: number[];
    verbIndices: number[];
    objectIndices: number[];
    helperIndices: number[];
  };
  // 新增：題目類型與難度
  questionType?: CardType;
  difficulty?: CardRarity;
  timeLimit?: number;
  perfectThreshold?: number;
}

export interface GameState {
  status: 'START' | 'PLAYING' | 'FEEDBACK' | 'PLAYER_ATTACK' | 'ENEMY_ATTACK' | 'GAMEOVER' | 'VICTORY' |
          'MAP' | 'MAP_MOVING' | 'BATTLE_START' | 'ENEMY_INTENT' | 'CARD_DRAW' | 'MAP_ADVANCE' | 'PAUSED' | 'CARD_SELECTION';
  score: number;
  combo: number;
  level: number;
  roundProgress: number; // 0 to 5
  // 舊的累積傷害（保留向後兼容）
  accumulatedDamage: number;
  perfectsInRound: number;
  // 新的分類累積
  accumulatedAttack?: number;
  accumulatedBlock?: number;
  accumulatedSkill?: number;
  // 牌組系統
  deck?: Card[];
  hand?: Card[];
  discardPile?: Card[];
  cardResults?: CardResult[];
  // 卡牌選擇（抽8選5）
  availableCards?: Card[]; // 供選擇的8張卡
  selectedCards?: Card[]; // 已選擇的卡（最多5張）
  // 地圖狀態
  mapState?: MapState;
}

export interface Entity {
  id?: string;
  currentHp: number;
  maxHp: number;
  isHit: boolean;
  isAttacking: boolean;
  lastDamageTaken?: number | null;
  // 敵人意圖相關
  intent?: EnemyIntent;
  intentValue?: number; // 意圖的數值（如攻擊傷害、防禦值）
  block?: number; // 護盾值
  enemyType?: string; // 怪物類型（用於 sprite）
}
