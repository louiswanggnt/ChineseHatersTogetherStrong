import React from 'react';

interface ReadingQuestionUIProps {
  article: string;
  question: string;
}

/**
 * 閱讀測驗：左 70% 文章、右 30% 問題與選項（純文字，無互動按鈕）
 * 選答由底欄固定 A/B/C 三按鈕處理
 */
export const ReadingQuestionUI: React.FC<ReadingQuestionUIProps> = ({
  article,
  question,
}) => {
  return (
    <div className="flex flex-1 w-full min-h-0 gap-4 px-2">
      {/* 左：文章（70%） */}
      <div className="flex flex-col flex-shrink-0 min-w-0 hand-drawn-box hand-drawn-box-inner p-4" style={{ width: '70%' }}>
        <h3 className="hand-drawn-font text-sm font-bold mb-2 text-center" style={{ color: 'var(--marker-black)' }}>
          文章
        </h3>
        <div
          className="flex-1 overflow-y-auto hand-drawn-font text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--marker-black)' }}
        >
          {article}
        </div>
      </div>

      {/* 右：問題與選項（30%，純文字排列） */}
      <div className="flex flex-col flex-shrink-0 min-w-0 hand-drawn-box hand-drawn-box-inner p-4" style={{ width: '30%' }}>
        <h3 className="hand-drawn-font text-sm font-bold mb-2 text-center" style={{ color: 'var(--marker-black)' }}>
          問題
        </h3>
        <div
          className="flex-1 overflow-y-auto hand-drawn-font text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--marker-black)' }}
        >
          {question}
        </div>
      </div>
    </div>
  );
};
