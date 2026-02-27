import React, { useState, useEffect, useMemo } from 'react';

interface Pair {
  sentence: string;
  title: string;
}

interface TitleMatchQuestionUIProps {
  questionId: string;
  pairs: Pair[];
  timeLeft?: number;
  timeLimit?: number;
  /** 外層透過此 ref 取得當前配對結果（sentenceIdx → title） */
  onMatchChange: (matchMap: Record<number, string>) => void;
  /** 選項區橫向排列 */
  layout?: 'horizontal' | 'vertical';
  /** 'question'=題目區（句子）；'options'=選項區（標題按鈕） */
  slot?: 'question' | 'options';
  /** 拆分題目/選項時由外層傳入，與另一 slot 共用狀態 */
  matchMap?: Record<number, string>;
  pendingTitle?: string | null;
  onPendingTitleChange?: (title: string | null) => void;
  shuffledTitles?: string[];
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const TitleMatchQuestionUI: React.FC<TitleMatchQuestionUIProps> = ({
  questionId,
  pairs,
  timeLeft,
  timeLimit,
  onMatchChange,
  layout = 'horizontal',
  slot,
  matchMap: matchMapProp,
  pendingTitle: pendingTitleProp,
  onPendingTitleChange,
  shuffledTitles: shuffledTitlesProp,
}) => {
  const [internalShuffled, setInternalShuffled] = useState<string[]>([]);
  const [internalPending, setInternalPending] = useState<string | null>(null);
  const [internalMatchMap, setInternalMatchMap] = useState<Record<number, string>>({});

  const isControlled = matchMapProp != null && onPendingTitleChange != null && shuffledTitlesProp != null;
  const shuffledTitles = isControlled ? shuffledTitlesProp! : internalShuffled;
  const pendingTitle = isControlled ? (pendingTitleProp ?? null) : internalPending;
  const matchMap = isControlled ? (matchMapProp ?? {}) : internalMatchMap;
  const setMatchMap = isControlled
    ? (updater: (prev: Record<number, string>) => Record<number, string>) => {
        onMatchChange(updater(matchMapProp ?? {}));
      }
    : (updater: (prev: Record<number, string>) => Record<number, string>) => {
        setInternalMatchMap((prev) => updater(prev));
      };
  const setPendingTitle = isControlled ? (onPendingTitleChange!) : setInternalPending;

  // 題目換了時重置（僅非受控或受控時由外層處理）
  useEffect(() => {
    if (!isControlled) {
      setInternalShuffled(shuffleArray(pairs.map((p) => p.title)));
      setInternalPending(null);
      setInternalMatchMap({});
    }
  }, [questionId, isControlled]);

  // 非受控時，每次 matchMap 改變時通知外層
  useEffect(() => {
    if (!isControlled) onMatchChange(internalMatchMap);
  }, [internalMatchMap, isControlled]);

  const handleTitleClick = (title: string) => {
    if (pendingTitle === title) {
      setPendingTitle(null);
    } else {
      setPendingTitle(title);
    }
  };

  const handleSentenceClick = (idx: number) => {
    if (!pendingTitle) return;
    setMatchMap((prev) => {
      const next = { ...prev };
      if (next[idx] === pendingTitle) {
        delete next[idx];
      } else {
        for (const k in next) {
          if (next[+k] === pendingTitle) delete next[+k];
        }
        next[idx] = pendingTitle;
      }
      return next;
    });
    setPendingTitle(null);
  };

  const usedTitles = new Set(Object.values(matchMap));

  const sentenceButton = (pair: Pair, idx: number) => {
    const matched = matchMap[idx];
    return (
      <button
        key={idx}
        onClick={() => handleSentenceClick(idx)}
        disabled={!pendingTitle && !matched}
        className={`
          text-left px-3 py-2 border-[3px] text-sm leading-snug hand-drawn-font transition-colors select-none flex-shrink-0
          ${matched ? 'border-emerald-600 bg-emerald-100' : pendingTitle ? 'border-sky-500 bg-sky-50 cursor-pointer hover:brightness-95' : 'hand-drawn-box hand-drawn-box-inner opacity-70 cursor-default'}
        `}
      >
        <span className="block">{pair.sentence}</span>
        {matched && <span className="block text-emerald-700 text-xs mt-1">→ {matched}</span>}
      </button>
    );
  };

  const titleButton = (title: string) => {
    const isUsed = usedTitles.has(title);
    const isPending = pendingTitle === title;
    return (
      <button
        key={title}
        onClick={() => handleTitleClick(title)}
        className={`
          px-3 py-2 border-[3px] text-sm font-bold text-center hand-drawn-font transition-colors select-none flex-shrink-0
          ${isPending ? 'border-amber-500 bg-amber-100' : isUsed ? 'border-emerald-600 bg-emerald-50 line-through opacity-60' : 'hand-drawn-box hand-drawn-box-inner hover:brightness-95 cursor-pointer'}
        `}
      >
        {title}
      </button>
    );
  };

  if (slot === 'question') {
    return (
      <div className="flex flex-col items-stretch gap-2 w-full">
        {pairs.map((p, idx) => sentenceButton(p, idx))}
      </div>
    );
  }

  if (slot === 'options') {
    return (
      <div className="flex flex-row flex-wrap items-center justify-center gap-2 w-full">
        {shuffledTitles.map((t) => titleButton(t))}
      </div>
    );
  }

  if (layout === 'horizontal') {
    return (
      <div className="flex flex-row flex-wrap items-center justify-center gap-2 w-full">
        {pairs.map((p, idx) => sentenceButton(p, idx))}
        {shuffledTitles.map((t) => titleButton(t))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-2">
        {pairs.map((p, idx) => sentenceButton(p, idx))}
      </div>
      <div className="flex flex-col gap-2">
        {shuffledTitles.map((t) => titleButton(t))}
      </div>
    </div>
  );
};
