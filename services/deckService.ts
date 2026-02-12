import { Card, CardType, CardRarity, CardEffect } from '../types';

// 生成唯一 ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// 初始牌庫（15張）
const STARTER_DECK: Omit<Card, 'id'>[] = [
  // 攻擊牌 x8
  {
    type: CardType.ATTACK,
    name: '基礎攻擊',
    rarity: 'R',
    baseAttack: 50,
    attackCount: 1,
    timeBonusMultiplier: 1.0,
    effect: CardEffect.NONE,
  },
  {
    type: CardType.ATTACK,
    name: '基礎攻擊',
    rarity: 'R',
    baseAttack: 50,
    attackCount: 1,
    timeBonusMultiplier: 1.0,
    effect: CardEffect.NONE,
  },
  {
    type: CardType.ATTACK,
    name: '基礎攻擊',
    rarity: 'R',
    baseAttack: 50,
    attackCount: 1,
    timeBonusMultiplier: 1.0,
    effect: CardEffect.NONE,
  },
  {
    type: CardType.ATTACK,
    name: '基礎攻擊',
    rarity: 'R',
    baseAttack: 50,
    attackCount: 1,
    timeBonusMultiplier: 1.0,
    effect: CardEffect.NONE,
  },
  {
    type: CardType.ATTACK,
    name: '基礎攻擊',
    rarity: 'R',
    baseAttack: 50,
    attackCount: 1,
    timeBonusMultiplier: 1.0,
    effect: CardEffect.NONE,
  },
  {
    type: CardType.ATTACK,
    name: '重擊',
    rarity: 'SR',
    baseAttack: 80,
    attackCount: 1,
    timeBonusMultiplier: 1.0,
    effect: CardEffect.NONE,
  },
  {
    type: CardType.ATTACK,
    name: '重擊',
    rarity: 'SR',
    baseAttack: 80,
    attackCount: 1,
    timeBonusMultiplier: 1.0,
    effect: CardEffect.NONE,
  },
  {
    type: CardType.ATTACK,
    name: '連擊',
    rarity: 'R',
    baseAttack: 30,
    attackCount: 2,
    timeBonusMultiplier: 1.0,
    effect: CardEffect.NONE,
  },
  // 防禦牌 x5
  {
    type: CardType.DEFENSE,
    name: '基礎防禦',
    rarity: 'R',
    baseBlock: 40,
    hpConversionRate: 0.05,
    timeBonusMultiplier: 1.0,
    effect: CardEffect.NONE,
  },
  {
    type: CardType.DEFENSE,
    name: '基礎防禦',
    rarity: 'R',
    baseBlock: 40,
    hpConversionRate: 0.05,
    timeBonusMultiplier: 1.0,
    effect: CardEffect.NONE,
  },
  {
    type: CardType.DEFENSE,
    name: '基礎防禦',
    rarity: 'R',
    baseBlock: 40,
    hpConversionRate: 0.05,
    timeBonusMultiplier: 1.0,
    effect: CardEffect.NONE,
  },
  {
    type: CardType.DEFENSE,
    name: '鐵壁',
    rarity: 'SR',
    baseBlock: 70,
    hpConversionRate: 0.08,
    timeBonusMultiplier: 1.0,
    effect: CardEffect.NONE,
  },
  {
    type: CardType.DEFENSE,
    name: '恢復',
    rarity: 'R',
    baseBlock: 30,
    hpConversionRate: 0.15,
    timeBonusMultiplier: 1.0,
    effect: CardEffect.NONE,
  },
  // 技能牌 x2
  {
    type: CardType.SKILL,
    name: '集中',
    rarity: 'R',
    timeBonusMultiplier: 1.5,
    effect: CardEffect.NONE,
  },
  {
    type: CardType.SKILL,
    name: '冥想',
    rarity: 'R',
    timeBonusMultiplier: 1.3,
    effect: CardEffect.NONE,
  },
];

/**
 * 初始化牌庫
 */
export const initializeDeck = (): Card[] => {
  // #region agent log
  const deck = STARTER_DECK.map(card => ({
    ...card,
    id: generateId(),
  }));
  fetch('http://127.0.0.1:7243/ingest/719fb5fc-5553-4fc1-863a-2b62e502ec55',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'deckService.ts:60',message:'initializeDeck called',data:{deckSize:deck.length,starterDeckSize:STARTER_DECK.length},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  return deck;
};

/**
 * 洗牌（Fisher-Yates 算法）
 */
export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * 抽牌
 * @param deck 牌庫
 * @param count 抽取數量
 * @returns [抽到的牌, 剩餘牌庫]
 */
export const drawCards = (deck: Card[], count: number): [Card[], Card[]] => {
  const drawn = deck.slice(0, count);
  const remaining = deck.slice(count);
  return [drawn, remaining];
};

/**
 * 將手牌移到棄牌堆
 */
export const discardHand = (hand: Card[], discardPile: Card[]): Card[] => {
  return [...discardPile, ...hand];
};

/**
 * 重新洗牌（當牌庫為空時，將棄牌堆洗回牌庫）
 */
export const reshuffleDiscardPile = (discardPile: Card[]): Card[] => {
  return shuffleDeck(discardPile);
};

/**
 * 抽牌（自動處理牌庫為空的情況）
 * @param deck 當前牌庫
 * @param discardPile 棄牌堆
 * @param count 抽取數量
 * @returns [抽到的牌, 新牌庫, 新棄牌堆]
 */
export const drawCardsWithReshuffle = (
  deck: Card[],
  discardPile: Card[],
  count: number
): [Card[], Card[], Card[]] => {
  let currentDeck = [...deck];
  let currentDiscard = [...discardPile];
  const drawnCards: Card[] = [];

  for (let i = 0; i < count; i++) {
    // 如果牌庫為空，從棄牌堆重新洗牌
    if (currentDeck.length === 0) {
      if (currentDiscard.length === 0) {
        // 連棄牌堆都沒牌了，停止抽牌
        break;
      }
      currentDeck = reshuffleDiscardPile(currentDiscard);
      currentDiscard = [];
    }

    // 抽一張牌
    const [drawn] = currentDeck.splice(0, 1);
    if (drawn) {
      drawnCards.push(drawn);
    }
  }

  return [drawnCards, currentDeck, currentDiscard];
};
