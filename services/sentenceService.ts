
import { SentenceRow } from "../types";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

interface RawSentenceData {
  text: string;
  subjectIndices: number[];
  verbIndices: number[];
  objectIndices: number[];
  helperIndices: number[];
}

// Built-in library of sentences
const STATIC_SENTENCES: RawSentenceData[] = [
  {
    text: "有朋自遠方來",
    subjectIndices: [1], // 朋
    verbIndices: [0, 5], // 有, 來
    objectIndices: [],
    helperIndices: [2, 3, 4], // 自遠方
  },
  {
    text: "三人行必有我師焉",
    subjectIndices: [0, 1, 2], // 三人
    verbIndices: [3, 5], // 行, 有
    objectIndices: [6, 7], // 我師
    helperIndices: [4, 8], // 必, 焉
  },
  {
    text: "學而時習之",
    subjectIndices: [], // Implicit
    verbIndices: [0, 3], // 學, 習
    objectIndices: [4], // 之
    helperIndices: [1, 2], // 而, 時
  },
  {
    text: "己所不欲勿施於人",
    subjectIndices: [0], // 己
    verbIndices: [3, 5], // 欲, 施
    objectIndices: [],
    helperIndices: [1, 2, 4, 6, 7], // 所, 不, 勿, 於, 人
  },
  {
    text: "溫故而知新",
    subjectIndices: [],
    verbIndices: [1, 4], // 溫, 知
    objectIndices: [2, 5], // 故, 新
    helperIndices: [3], // 而
  },
  {
    text: "知之者不如好之者",
    subjectIndices: [2, 7], // 者, 者
    verbIndices: [0, 4, 5], // 知, 如, 好
    objectIndices: [1, 6], // 之, 之
    helperIndices: [3], // 不
  },
  {
    text: "見賢思齊焉",
    subjectIndices: [],
    verbIndices: [0, 2], // 見, 思
    objectIndices: [1, 3], // 賢, 齊
    helperIndices: [4], // 焉
  },
  {
    text: "見不賢而內自省",
    subjectIndices: [],
    verbIndices: [0, 6], // 見, 省
    objectIndices: [2], // 賢
    helperIndices: [1, 3, 4, 5], // 不, 而, 內, 自
  },
  {
     text: "過而不改",
     subjectIndices: [],
     verbIndices: [0, 3], // 過, 改
     objectIndices: [],
     helperIndices: [1, 2] // 而, 不
  },
  {
      text: "工欲善其事",
      subjectIndices: [0], // 工
      verbIndices: [1, 2], // 欲, 善
      objectIndices: [4], // 事
      helperIndices: [3] // 其
  },
  {
      text: "必先利其器",
      subjectIndices: [],
      verbIndices: [2], // 利
      objectIndices: [4], // 器
      helperIndices: [0, 1, 3] // 必, 先, 其
  },
  {
      text: "逝者如斯夫",
      subjectIndices: [0, 1], // 逝者
      verbIndices: [2], // 如
      objectIndices: [3], // 斯
      helperIndices: [4] // 夫
  },
  {
      text: "不亦說乎",
      subjectIndices: [],
      verbIndices: [2], // 說(Yue)
      objectIndices: [],
      helperIndices: [0, 1, 3] // 不, 亦, 乎
  },
  {
      text: "言必信行必果",
      subjectIndices: [0, 3], // 言, 行 (Words, Actions) - serving as subject/topic
      verbIndices: [2, 5], // 信, 果
      objectIndices: [],
      helperIndices: [1, 4] // 必, 必
  }
];

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
    }
  }));
};
