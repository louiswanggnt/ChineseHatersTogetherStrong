import React, { useState, useEffect, useRef } from 'react';
import { normalizeConjInput } from '../services/conjunctionSynonyms';

interface ConjunctionQuestionUIProps {
  questionId: string;
  sentence1: string;
  sentence2: string;
  timeLeft?: number;
  timeLimit?: number;
  /** 使用者按下 Enter 或「送出」時回呼，外層負責評分 */
  onSubmit?: (input: string) => void;
  /** 選填：輸入內容變更時同步給外層（供右側固定送出鈕使用） */
  onInputChange?: (input: string) => void;
}

export { normalizeConjInput };

/** 比對輸入是否屬於同義詞列表（任一符合即正確） */
export function isConjCorrect(input: string, synonyms: string[]): boolean {
  const normalized = normalizeConjInput(input);
  return synonyms.some((s) => normalizeConjInput(s) === normalized);
}

export const ConjunctionQuestionUI: React.FC<ConjunctionQuestionUIProps> = ({
  questionId,
  sentence1,
  sentence2,
  timeLeft,
  timeLimit,
  onSubmit,
  onInputChange,
}) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 題目換了時清空輸入並重新聚焦
  useEffect(() => {
    setInput('');
    inputRef.current?.focus();
  }, [questionId]);

  const handleInputChange = (value: string) => {
    setInput(value);
    onInputChange?.(value);
  };

  const handleSubmit = () => {
    onSubmit?.(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full px-4">
      {/* 題目卡 - 手繪筆記風 */}
      <div className="w-full max-w-md hand-drawn-box p-4 flex flex-col gap-3 hand-drawn-box-inner">
        <div className="hand-drawn-font text-lg font-bold text-center leading-relaxed">
          {sentence1}
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="hand-drawn-font text-sm opacity-70">連接詞：</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="請輸入..."
            className="hand-drawn-box hand-drawn-font outline-none px-3 py-2 text-base w-36 text-center font-bold transition-colors hand-drawn-box-inner placeholder:opacity-40"
            style={{ borderWidth: 3 }}
          />
        </div>
        <div className="hand-drawn-font text-lg font-bold text-center leading-relaxed">
          {sentence2}
        </div>
      </div>
    </div>
  );
};
