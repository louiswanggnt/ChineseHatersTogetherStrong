import { QuestionStats } from '../types';

const STATS_STORAGE_KEY = 'word-warrior-question-stats';
const MAX_RECENT_RESULTS = 5; // 保留最近 5 次結果

/**
 * 從 localStorage 讀取所有題目統計
 */
export const loadAllStats = (): Record<string, QuestionStats> => {
  try {
    const saved = localStorage.getItem(STATS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to load stats:', error);
    return {};
  }
};

/**
 * 儲存所有題目統計到 localStorage
 */
export const saveAllStats = (stats: Record<string, QuestionStats>): void => {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to save stats:', error);
  }
};

/**
 * 取得單一題目的統計
 */
export const getQuestionStats = (questionId: string): QuestionStats | null => {
  const allStats = loadAllStats();
  return allStats[questionId] || null;
};

/**
 * 更新題目統計
 */
export const updateQuestionStats = (questionId: string, isCorrect: boolean): QuestionStats => {
  const allStats = loadAllStats();
  const existing = allStats[questionId];
  
  const updated: QuestionStats = {
    questionId,
    recentResults: existing?.recentResults || [],
    totalCorrect: existing?.totalCorrect || 0,
    totalAttempts: existing?.totalAttempts || 0,
    lastAttemptTime: Date.now(),
  };
  
  // 更新最近結果（保留最近 N 次）
  updated.recentResults.push(isCorrect);
  if (updated.recentResults.length > MAX_RECENT_RESULTS) {
    updated.recentResults.shift();
  }
  
  // 更新總計
  updated.totalAttempts++;
  if (isCorrect) {
    updated.totalCorrect++;
  }
  
  // 儲存
  allStats[questionId] = updated;
  saveAllStats(allStats);
  
  return updated;
};

/**
 * 計算題目出現權重（用於自適應出題）
 * @returns 權重值（0.05 ~ 2.0）
 */
export const calculateQuestionWeight = (questionId: string): number => {
  const stats = getQuestionStats(questionId);
  
  if (!stats || stats.recentResults.length < 3) {
    return 1.0; // 預設權重
  }
  
  const recent3 = stats.recentResults.slice(-3);
  
  // 最近 3 次全對 → 大幅降低出現機率（5%）
  if (recent3.every(r => r === true)) {
    return 0.05;
  }
  
  // 最近 3 次全錯 → 提高出現機率（200%）
  if (recent3.every(r => r === false)) {
    return 2.0;
  }
  
  // 2對1錯 → 略微降低
  const correctCount = recent3.filter(r => r).length;
  if (correctCount === 2) {
    return 0.7;
  }
  
  // 1對2錯 → 略微提高
  if (correctCount === 1) {
    return 1.3;
  }
  
  return 1.0;
};

/**
 * 加權隨機選擇題目
 */
export const weightedRandomSelect = <T extends { id: string }>(
  items: T[]
): T => {
  if (items.length === 0) {
    throw new Error('Cannot select from empty array');
  }
  
  if (items.length === 1) {
    return items[0];
  }
  
  // 計算每個題目的權重
  const weights = items.map(item => calculateQuestionWeight(item.id));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  // 加權隨機
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }
  
  // Fallback
  return items[items.length - 1];
};

/**
 * 清除所有統計（重置）
 */
export const clearAllStats = (): void => {
  localStorage.removeItem(STATS_STORAGE_KEY);
};
