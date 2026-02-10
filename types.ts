
export enum PartOfSpeech {
  Subject = 'SUBJECT',
  Verb = 'VERB',
  Object = 'OBJECT',
  Helper = 'HELPER', // Particles, Adjectives, Adverbs, etc.
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
}

export interface GameState {
  status: 'START' | 'PLAYING' | 'FEEDBACK' | 'PLAYER_ATTACK' | 'ENEMY_ATTACK' | 'GAMEOVER' | 'VICTORY';
  score: number;
  combo: number;
  level: number;
  roundProgress: number; // 0 to 3
  accumulatedDamage: number; // Damage built up during the 3 sentences
  perfectsInRound: number;
}

export interface Entity {
  id?: string;
  currentHp: number;
  maxHp: number;
  isHit: boolean;
  isAttacking: boolean;
  lastDamageTaken?: number | null;
}
