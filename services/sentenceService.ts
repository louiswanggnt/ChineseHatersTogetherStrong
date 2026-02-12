
import { SentenceRow, Card, CardType, CardRarity } from "../types";
import { RARITY_PARAMS } from "../constants";
import { weightedRandomSelect } from "./statsService";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

interface RawSentenceData {
  id: string; // 題目唯一 ID
  text: string;
  difficulty: CardRarity; // 難度對應稀有度
  subjectIndices: number[];
  verbIndices: number[];
  objectIndices: number[];
  helperIndices: number[];
}

// Built-in library of sentences
const STATIC_SENTENCES: RawSentenceData[] = [
  {
    id: 'q001',
    text: "有朋自遠方來",
    difficulty: 'R',
    subjectIndices: [1], // 朋
    verbIndices: [0, 5], // 有, 來
    objectIndices: [],
    helperIndices: [2, 3, 4], // 自遠方
  },
  {
    id: 'q002',
    text: "三人行必有我師焉",
    difficulty: 'SR',
    subjectIndices: [0, 1, 2], // 三人
    verbIndices: [3, 5], // 行, 有
    objectIndices: [6, 7], // 我師
    helperIndices: [4, 8], // 必, 焉
  },
  {
    id: 'q003',
    text: "學而時習之",
    difficulty: 'R',
    subjectIndices: [], // Implicit
    verbIndices: [0, 3], // 學, 習
    objectIndices: [4], // 之
    helperIndices: [1, 2], // 而, 時
  },
  {
    id: 'q004',
    text: "己所不欲勿施於人",
    difficulty: 'SR',
    subjectIndices: [0], // 己
    verbIndices: [3, 5], // 欲, 施
    objectIndices: [],
    helperIndices: [1, 2, 4, 6, 7], // 所, 不, 勿, 於, 人
  },
  {
    id: 'q005',
    text: "溫故而知新",
    difficulty: 'R',
    subjectIndices: [],
    verbIndices: [1, 4], // 溫, 知
    objectIndices: [2, 5], // 故, 新
    helperIndices: [3], // 而
  },
  {
    id: 'q006',
    text: "知之者不如好之者",
    difficulty: 'SR',
    subjectIndices: [2, 7], // 者, 者
    verbIndices: [0, 4, 5], // 知, 如, 好
    objectIndices: [1, 6], // 之, 之
    helperIndices: [3], // 不
  },
  {
    id: 'q007',
    text: "見賢思齊焉",
    difficulty: 'R',
    subjectIndices: [],
    verbIndices: [0, 2], // 見, 思
    objectIndices: [1, 3], // 賢, 齊
    helperIndices: [4], // 焉
  },
  {
    id: 'q008',
    text: "見不賢而內自省",
    difficulty: 'SR',
    subjectIndices: [],
    verbIndices: [0, 6], // 見, 省
    objectIndices: [2], // 賢
    helperIndices: [1, 3, 4, 5], // 不, 而, 內, 自
  },
  {
     id: 'q009',
     text: "過而不改",
     difficulty: 'R',
     subjectIndices: [],
     verbIndices: [0, 3], // 過, 改
     objectIndices: [],
     helperIndices: [1, 2] // 而, 不
  },
  {
      id: 'q010',
      text: "工欲善其事",
      difficulty: 'R',
      subjectIndices: [0], // 工
      verbIndices: [1, 2], // 欲, 善
      objectIndices: [4], // 事
      helperIndices: [3] // 其
  },
  {
      id: 'q011',
      text: "必先利其器",
      difficulty: 'R',
      subjectIndices: [],
      verbIndices: [2], // 利
      objectIndices: [4], // 器
      helperIndices: [0, 1, 3] // 必, 先, 其
  },
  {
      id: 'q012',
      text: "逝者如斯夫",
      difficulty: 'R',
      subjectIndices: [0, 1], // 逝者
      verbIndices: [2], // 如
      objectIndices: [3], // 斯
      helperIndices: [4] // 夫
  },
  {
      id: 'q013',
      text: "不亦說乎",
      difficulty: 'R',
      subjectIndices: [],
      verbIndices: [2], // 說(Yue)
      objectIndices: [],
      helperIndices: [0, 1, 3] // 不, 亦, 乎
  },
  {
      id: 'q014',
      text: "言必信行必果",
      difficulty: 'R',
      subjectIndices: [0, 3], // 言, 行 (Words, Actions) - serving as subject/topic
      verbIndices: [2, 5], // 信, 果
      objectIndices: [],
      helperIndices: [1, 4] // 必, 必
  }
];

/**
 * 舊版：依數量與難度取題（向後兼容）
 */
export const fetchSentences = async (count: number = 3, difficulty: string = 'easy'): Promise<SentenceRow[]> => {
  // Simulate network delay for better UX (loading states)
  await new Promise(resolve => setTimeout(resolve, 500));

  // Randomly shuffle the static array
  const shuffled = [...STATIC_SENTENCES].sort(() => 0.5 - Math.random());
  
  // Select the requested number of sentences
  const selected = shuffled.slice(0, count);

  return selected.map(data => ({
    id: generateId(),
    text: data.text,
    isClearing: false,
    characters: data.text.split('').map((char, index) => ({
      char,
      originalIndex: index,
    })),
    analysis: {
      subjectIndices: data.subjectIndices,
      verbIndices: data.verbIndices,
      objectIndices: data.objectIndices,
      helperIndices: data.helperIndices,
    },
    difficulty: data.difficulty,
  }));
};

/**
 * 新版：依手牌取題（每張卡對應一題）
 */
export const fetchQuestionsByCards = async (cards: Card[]): Promise<SentenceRow[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return cards.map(card => {
    // 依卡牌稀有度篩選題目
    const matchingQuestions = STATIC_SENTENCES.filter(q => q.difficulty === card.rarity);
    
    // 若該難度沒題目，則從全部題庫隨機選
    const pool = matchingQuestions.length > 0 ? matchingQuestions : STATIC_SENTENCES;
    
    // 使用加權隨機選取（自適應出題）
    const question = weightedRandomSelect(pool);
    
    // 取得該稀有度的參數
    const params = RARITY_PARAMS[card.rarity];

    return {
      id: question.id, // 使用題目的真實 ID
      text: question.text,
      isClearing: false,
      characters: question.text.split('').map((char, index) => ({
        char,
        originalIndex: index,
      })),
      analysis: {
        subjectIndices: question.subjectIndices,
        verbIndices: question.verbIndices,
        objectIndices: question.objectIndices,
        helperIndices: question.helperIndices,
      },
      questionType: card.type,
      difficulty: card.rarity,
      timeLimit: params.timeLimit,
      perfectThreshold: params.perfectThreshold,
    };
  });
};
