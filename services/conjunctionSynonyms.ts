import synonymGroupsData from '../data/conjunctionSynonymGroups.json';

/** 正規化：去首尾空白、全形轉半形、英文小寫（與 ConjunctionQuestionUI 評分一致） */
export function normalizeConjInput(str: string): string {
  return str
    .trim()
    .replace(/[\uff01-\uff5e]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase();
}

/** 全域同義詞組：每組為一字串陣列 */
const GROUPS: string[][] = synonymGroupsData as string[][];

/**
 * 依題目的 standardAnswer 取得用來評分的同義詞列表。
 * 若題目有提供 synonyms 則直接使用，否則從全域同義詞組中找出包含 standardAnswer 的那一組。
 */
export function getSynonymsForStandardAnswer(
  standardAnswer: string,
  perQuestionSynonyms?: string[] | null
): string[] {
  if (perQuestionSynonyms != null && perQuestionSynonyms.length > 0) {
    return perQuestionSynonyms;
  }
  const normalized = normalizeConjInput(standardAnswer);
  for (const group of GROUPS) {
    const hasMatch = group.some((w) => normalizeConjInput(w) === normalized);
    if (hasMatch) return group;
  }
  return [standardAnswer];
}
