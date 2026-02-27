import { AnyQuestion, ReadingComprehensionQuestion } from '../types';
import modernData from '../data/questions/modern.json';
import conjData from '../data/questions/conjunction.json';
import matchData from '../data/questions/titleMatch.json';
import classicalData from '../data/questions/classical.json';
import readingData from '../data/questions/reading.json';
import { RARITY_PARAMS } from '../constants';

const ALL_QUESTIONS: AnyQuestion[] = [
  ...(modernData as AnyQuestion[]),
  ...(conjData as AnyQuestion[]),
  ...(matchData as AnyQuestion[]),
  ...(classicalData as AnyQuestion[]),
];

/** 閱讀子題：支援 question+answer（純文字）或 question+options+correctIndex */
interface ReadingSubQuestion {
  id: string;
  question: string;
  /** 新格式：答案字母，右側以純文字顯示 question（可含 "A.xxx\nB.xxx\nC.xxx"） */
  answer?: 'A' | 'B' | 'C';
  options?: [string, string, string];
  correctIndex?: 0 | 1 | 2;
}

/** 閱讀測驗：文章資料形狀（來自 reading.json） */
interface ReadingArticleItem {
  id: string;
  article: string;
  difficulty?: 'R' | 'SR' | 'UR';
  questions: ReadingSubQuestion[];
}

const READING_ARTICLES = readingData as ReadingArticleItem[];

/** 當前閱讀組：同一篇文章的 3 題連續出題 */
let currentReadingBlock: {
  article: ReadingArticleItem;
  subIndices: number[];
  index: number;
} | null = null;

const READING_CHANCE = 0.18;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandomIndices(max: number, count: number): number[] {
  const indices = Array.from({ length: max }, (_, i) => i);
  const shuffled = shuffle(indices);
  return shuffled.slice(0, Math.min(count, max));
}

/** 解析 "X(白話)" → { text: "X", annotation?: "白話" }；無括號則 annotation 為 undefined */
function parseSegmentWithAnnotation(s: string): { text: string; annotation?: string } {
  const m = String(s).match(/^(.+?)\(([^)]*)\)$/);
  if (m) return { text: m[1].trim(), annotation: m[2].trim() || undefined };
  return { text: String(s).trim(), annotation: undefined };
}

/** 在 text 中找子字串的第一次出現位置，回傳該區段的字元索引陣列；找不到則 [] */
function stringToIndices(text: string, value: string | string[]): number[] {
  const addFor = (sub: string): number[] => {
    const start = text.indexOf(sub);
    if (start === -1) return [];
    return Array.from({ length: sub.length }, (_, i) => start + i);
  };
  if (typeof value === 'string') return addFor(value);
  const set = new Set<number>();
  for (const sub of value) {
    for (const i of addFor(sub)) set.add(i);
  }
  return [...set].sort((a, b) => a - b);
}

/** 處理古典題字串答案：支援 "X" 或 "X(註)"，回傳 indices 與 annotationsByIndex */
function processClassicalSegments(
  text: string,
  value: number[] | string | string[]
): { indices: number[]; annotationsByIndex: Record<number, string> } {
  const annotationsByIndex: Record<number, string> = {};
  const isNumArr = (v: unknown): v is number[] =>
    Array.isArray(v) && (v.length === 0 || typeof v[0] === 'number');
  if (isNumArr(value)) return { indices: value, annotationsByIndex };

  const arr = typeof value === 'string' ? [value] : value;
  if (!arr || arr.length === 0) return { indices: [], annotationsByIndex };

  const set = new Set<number>();
  let searchStart = 0;
  for (const seg of arr) {
    const { text: part, annotation } = parseSegmentWithAnnotation(seg);
    if (!part) continue;
    const start = text.indexOf(part, searchStart);
    if (start === -1) continue;
    for (let i = 0; i < part.length; i++) {
      const idx = start + i;
      set.add(idx);
      if (annotation) annotationsByIndex[idx] = annotation;
    }
    searchStart = start + part.length; // 同一字串可多次出現時，下次從此處往後找
  }
  return { indices: [...set].sort((a, b) => a - b), annotationsByIndex };
}

/** CIRCLE_CLASSICAL 字串答案正規化為索引格式（主、動、虛），含 annotationsByIndex */
function normalizeCircleClassicalAnswer(
  text: string,
  answer: {
    subjectIndices: number[] | string | string[];
    verbIndices: number[] | string | string[];
    particleIndices: number[] | string | string[];
  }
): {
  subjectIndices: number[];
  verbIndices: number[];
  particleIndices: number[];
  annotationsByIndex?: Record<number, string>;
} {
  const s = processClassicalSegments(text, answer.subjectIndices);
  const v = processClassicalSegments(text, answer.verbIndices);
  const p = processClassicalSegments(text, answer.particleIndices);
  const annotationsByIndex: Record<number, string> = {
    ...s.annotationsByIndex,
    ...v.annotationsByIndex,
    ...p.annotationsByIndex,
  };
  return {
    subjectIndices: s.indices,
    verbIndices: v.indices,
    particleIndices: p.indices,
    annotationsByIndex: Object.keys(annotationsByIndex).length > 0 ? annotationsByIndex : undefined,
  };
}

/** CIRCLE_MODERN 字串答案正規化為索引格式（主詞＋重點；無形容詞時 adjIndices=[]） */
function normalizeCircleModernAnswer(
  text: string,
  answer: {
    subjectIndices: number[] | string | string[];
    adjIndices?: number[];
    keyIndices: number[] | string;
  }
): { subjectIndices: number[]; adjIndices: number[]; keyIndices: number[] } {
  const isNumArr = (v: unknown): v is number[] =>
    Array.isArray(v) && (v.length === 0 || typeof v[0] === 'number');
  return {
    subjectIndices: isNumArr(answer.subjectIndices)
      ? answer.subjectIndices
      : stringToIndices(text, answer.subjectIndices as string | string[]),
    adjIndices: answer.adjIndices && isNumArr(answer.adjIndices) ? answer.adjIndices : [],
    keyIndices: isNumArr(answer.keyIndices)
      ? answer.keyIndices
      : stringToIndices(text, answer.keyIndices as string),
  };
}

/** 標題配對題：若 pairs 超過 3 個，隨機挑選 3 個「title 皆不同」的 pair 出題 */
function selectThreePairsWithDistinctTitles(
  pairs: { sentence: string; title: string }[]
): { sentence: string; title: string }[] {
  if (pairs.length <= 3) return pairs;
  const shuffled = shuffle([...pairs]);
  const seenTitles = new Set<string>();
  const result: { sentence: string; title: string }[] = [];
  for (const p of shuffled) {
    if (seenTitles.has(p.title)) continue;
    seenTitles.add(p.title);
    result.push(p);
    if (result.length >= 3) break;
  }
  return result;
}

/** 將 answer 字串正規化為 0|1|2（A→0, B→1, C→2），避免空白/BOM/大小寫導致判錯 */
function normalizedAnswerToIndex(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().toUpperCase();
  const first = s.charAt(0);
  if (first === 'A') return 0;
  if (first === 'B') return 1;
  if (first === 'C') return 2;
  return null;
}

function buildReadingQuestion(
  article: ReadingArticleItem,
  subIndex: number
): ReadingComprehensionQuestion {
  const sub = article.questions[subIndex] as ReadingSubQuestion;
  const difficulty = (article.difficulty ?? 'R') as 'R' | 'SR' | 'UR';
  const params = RARITY_PARAMS[difficulty];
  const fromAnswer = normalizedAnswerToIndex(sub.answer);
  const correctIndex: 0 | 1 | 2 =
    fromAnswer != null ? (fromAnswer as 0 | 1 | 2) : (sub.correctIndex ?? 0);
  const questionDisplay = sub.options
    ? sub.question +
      '\n' +
      ['A. ', 'B. ', 'C. '].map((prefix, i) => {
        const opt = sub.options![i];
        return opt.trimStart().toUpperCase().startsWith(prefix.trim())
          ? opt
          : prefix + opt;
      }).join('\n')
    : sub.question;
  return {
    type: 'READING_COMPREHENSION',
    id: `${article.id}_${sub.id}`,
    articleId: article.id,
    article: article.article,
    difficulty,
    timeLimit: params.timeLimit,
    question: questionDisplay,
    options: sub.options,
    correctIndex,
  };
}

/**
 * 隨機抽取題目（不限題型）
 * @param count 欲抽取數量
 * @param excludeIds 已出過的題目 id，下一題不會重複從中選取
 * @param options.gunnerCount 場上 Gunner 數量；若 < 2 則不出閱讀題；若 >= 2 有機率出一組 3 題閱讀
 */
export const fetchAnyQuestion = async (
  count = 1,
  excludeIds: string[] = [],
  options?: { gunnerCount?: number }
): Promise<AnyQuestion[]> => {
  await new Promise((r) => setTimeout(r, 100));

  const gunnerCount = options?.gunnerCount;

  // 已有一組閱讀進行中：回傳下一子題
  if (currentReadingBlock) {
    const { article, subIndices, index } = currentReadingBlock;
    if (index < subIndices.length) {
      const q = buildReadingQuestion(article, subIndices[index]);
      currentReadingBlock.index += 1;
      if (currentReadingBlock.index >= subIndices.length) {
        currentReadingBlock = null;
      }
      return [q];
    }
    currentReadingBlock = null;
  }

  // Gunner >= 2 時有機率開始一組閱讀（3 題同文章）
  if (
    gunnerCount !== undefined &&
    gunnerCount >= 2 &&
    READING_ARTICLES.length > 0 &&
    Math.random() < READING_CHANCE
  ) {
    const article = READING_ARTICLES[Math.floor(Math.random() * READING_ARTICLES.length)];
    const n = article.questions.length;
    if (n >= 1) {
      const take = Math.min(3, n);
      const subIndices = pickRandomIndices(n, take);
      currentReadingBlock = { article, subIndices, index: 1 };
      return [buildReadingQuestion(article, subIndices[0])];
    }
  }

  // 一般題型
  let pool = ALL_QUESTIONS.length > 0 ? ALL_QUESTIONS : (classicalData as AnyQuestion[]);
  if (excludeIds.length > 0) {
    const set = new Set(excludeIds);
    pool = pool.filter((q) => !set.has(q.id));
  }
  if (pool.length === 0) {
    pool = ALL_QUESTIONS.length > 0 ? ALL_QUESTIONS : (classicalData as AnyQuestion[]);
  }
  const shuffled = shuffle(pool);
  return shuffled.slice(0, count).map((q) => {
    const params = RARITY_PARAMS[q.difficulty ?? 'R'];
    const base = { ...q, timeLimit: q.timeLimit ?? params.timeLimit };
    if (base.type === 'TITLE_MATCH' && base.pairs.length > 3) {
      return { ...base, pairs: selectThreePairsWithDistinctTitles(base.pairs) };
    }
    if (base.type === 'CIRCLE_MODERN') {
      return { ...base, answer: normalizeCircleModernAnswer(base.text, base.answer as Parameters<typeof normalizeCircleModernAnswer>[1]) };
    }
    if (base.type === 'CIRCLE_CLASSICAL') {
      return { ...base, answer: normalizeCircleClassicalAnswer(base.text, base.answer as Parameters<typeof normalizeCircleClassicalAnswer>[1]) };
    }
    return base;
  });
};

/**
 * 依難度抽題（不限題型）
 */
export const fetchAnyQuestionByDifficulty = async (
  difficulty: 'R' | 'SR' | 'UR' = 'R',
  count = 1
): Promise<AnyQuestion[]> => {
  await new Promise((r) => setTimeout(r, 100));
  const pool = ALL_QUESTIONS.filter((q) => q.difficulty === difficulty);
  const fallback = ALL_QUESTIONS.length > 0 ? ALL_QUESTIONS : (classicalData as AnyQuestion[]);
  const source = pool.length > 0 ? pool : fallback;
  const shuffled = shuffle(source);
  const params = RARITY_PARAMS[difficulty];
  return shuffled.slice(0, count).map((q) => {
    const base = { ...q, timeLimit: q.timeLimit ?? params.timeLimit };
    if (base.type === 'TITLE_MATCH' && base.pairs.length > 3) {
      return { ...base, pairs: selectThreePairsWithDistinctTitles(base.pairs) };
    }
    if (base.type === 'CIRCLE_MODERN') {
      return { ...base, answer: normalizeCircleModernAnswer(base.text, base.answer as Parameters<typeof normalizeCircleModernAnswer>[1]) };
    }
    if (base.type === 'CIRCLE_CLASSICAL') {
      return { ...base, answer: normalizeCircleClassicalAnswer(base.text, base.answer as Parameters<typeof normalizeCircleClassicalAnswer>[1]) };
    }
    return base;
  });
};
