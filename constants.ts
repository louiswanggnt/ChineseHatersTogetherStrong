import { PartOfSpeech, CardType, CardRarity, EnemyIntent } from "./types";

export const BOARD_HEIGHT = 12; // Number of rows in the grid
export const FALL_SPEED_MS = 2000; // Milliseconds per step
export const INITIAL_HERO_HP = 500;
export const INITIAL_ENEMY_HP = 500;
export const DAMAGE_PER_BLOCK = 10;
export const COMBO_MULTIPLIER = 0.5; // +50% per combo level
export const SENTENCE_TIME_LIMIT = 30; // Seconds per sentence

// 稀有度對應的難度參數
export const RARITY_PARAMS: Record<CardRarity, {
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

// 卡牌類型對應的顏色
export const CARD_TYPE_COLORS: Record<CardType, string> = {
  [CardType.ATTACK]: 'bg-red-500 border-red-700 text-white',
  [CardType.DEFENSE]: 'bg-blue-500 border-blue-700 text-white',
  [CardType.SKILL]: 'bg-green-500 border-green-700 text-white',
};

// 敵人意圖對應的顏色與圖示
export const INTENT_COLORS: Record<EnemyIntent, string> = {
  [EnemyIntent.ATTACK]: 'text-red-500',
  [EnemyIntent.DEFEND]: 'text-blue-500',
  [EnemyIntent.CAST]: 'text-purple-500',
  [EnemyIntent.UNKNOWN]: 'text-gray-500',
};

export const INTENT_ICONS: Record<EnemyIntent, string> = {
  [EnemyIntent.ATTACK]: '⚔️',
  [EnemyIntent.DEFEND]: '🛡️',
  [EnemyIntent.CAST]: '✨',
  [EnemyIntent.UNKNOWN]: '❓',
};

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
