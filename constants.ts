import { PartOfSpeech } from "./types";

export const BOARD_HEIGHT = 12; // Number of rows in the grid
export const FALL_SPEED_MS = 2000; // Milliseconds per step
export const INITIAL_HERO_HP = 500;
export const INITIAL_ENEMY_HP = 500;
export const DAMAGE_PER_BLOCK = 10;
export const COMBO_MULTIPLIER = 0.5; // +50% per combo level
export const SENTENCE_TIME_LIMIT = 30; // Seconds per sentence

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
