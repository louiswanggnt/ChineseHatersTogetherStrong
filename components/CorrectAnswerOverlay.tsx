import React from 'react';
import {
  AnyQuestion,
  CircleModernQuestion,
  CircleClassicalQuestion,
} from '../types';

interface CorrectAnswerOverlayProps {
  question: AnyQuestion;
  deltas: { deltaAttack: number; deltaFireRate: number; deltaPenetration: number };
}

/** 從 text 依 indices 擷取連續區段字串 */
function extractByIndices(text: string, indices: number[]): string {
  if (indices.length === 0) return '';
  const sorted = [...indices].sort((a, b) => a - b);
  const chars: string[] = [];
  for (const i of sorted) {
    if (i >= 0 && i < text.length) chars.push(text[i]);
  }
  return chars.join('');
}

function renderCorrectAnswer(q: AnyQuestion): React.ReactNode {
  switch (q.type) {
    case 'CIRCLE_MODERN': {
      const cq = q as CircleModernQuestion;
      const { text, answer } = cq;
      const items = [
        { label: '主', indices: answer.subjectIndices },
        ...(answer.adjIndices.length > 0 ? [{ label: '形' as const, indices: answer.adjIndices }] : []),
        { label: '重', indices: answer.keyIndices },
      ];
      return (
        <div className="flex flex-col gap-2 text-left hand-drawn-font">
          {items.map(({ label, indices }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-sky-700 text-xs w-6">{label}:</span>
              <span className="text-sm">{extractByIndices(text, indices) || '—'}</span>
            </div>
          ))}
        </div>
      );
    }
    case 'CIRCLE_CLASSICAL': {
      const cq = q as CircleClassicalQuestion;
      const { text, answer } = cq;
      const subjectSet = new Set(answer.subjectIndices);
      const verbSet = new Set(answer.verbIndices);
      const particleSet = new Set(answer.particleIndices);
      const annotationsByIndex = answer.annotationsByIndex ?? {};
      const chars = text.split('');
      const cellClass = 'w-8 flex-shrink-0 hand-drawn-box-inner';
      return (
        <div className="flex flex-col gap-1 hand-drawn-font">
          {/* 第一排：純字格，等高，不影響主文排版 */}
          <div className="flex gap-1">
            {chars.map((ch, i) => {
              const inSubject = subjectSet.has(i);
              const inVerb = verbSet.has(i);
              const inParticle = particleSet.has(i);
              const bg = inSubject ? 'bg-blue-100 border-blue-400' : inVerb ? 'bg-green-100 border-green-400' : inParticle ? 'bg-rose-100 border-rose-400' : 'bg-white border-gray-300';
              return (
                <div key={i} className={`${cellClass} h-10 flex items-center justify-center border text-sm ${bg}`}>
                  {ch}
                </div>
              );
            })}
          </div>
          {/* 第二排：註釋獨立於下方，與上排同寬對齊，不影響主文 */}
          <div className="flex gap-1">
            {chars.map((ch, i) => (
              <div key={i} className={`${cellClass} min-h-[1.2em] flex items-center justify-center text-[10px] opacity-70`}>
                {annotationsByIndex[i] ?? ''}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'FILL_CONJUNCTION':
      return (
        <div className="text-left hand-drawn-font">
          <span className="text-sky-700 text-xs">正確答案: </span>
          <span className="text-sm">{q.standardAnswer}</span>
        </div>
      );
    case 'TITLE_MATCH':
      return (
        <div className="flex flex-col gap-2 text-left hand-drawn-font">
          {q.pairs.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs truncate max-w-[120px] opacity-70">{p.sentence}</span>
              <span className="opacity-50">→</span>
              <span className="text-sm">{p.title}</span>
            </div>
          ))}
        </div>
      );
    case 'READING_COMPREHENSION': {
      const letter = ['A', 'B', 'C'][q.correctIndex];
      return (
        <div className="text-left hand-drawn-font">
          <span className="text-sky-700 text-xs">正確答案: </span>
          <span className="text-sm font-bold">
            {q.options ? `${letter}. ${q.options[q.correctIndex]}` : letter}
          </span>
        </div>
      );
    }
    default:
      return null;
  }
}

/**
 * 答題後回饋 overlay：正確答案 + 本次所得（半透明 2 秒）
 */
export const CorrectAnswerOverlay: React.FC<CorrectAnswerOverlayProps> = ({
  question,
  deltas,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4" style={{ backgroundColor: 'rgba(250,248,240,0.92)' }}>
      <div className="hand-drawn-box p-6 max-w-md w-full hand-drawn-box-inner">
        <h3 className="hand-drawn-font text-sm mb-4 text-center">正確答案</h3>
        <div className="mb-6">{renderCorrectAnswer(question)}</div>
        <div className="flex items-center justify-center gap-4 py-2 px-4 hand-drawn-box opacity-90 hand-drawn-font text-sm hand-drawn-box-inner">
          <span className="text-amber-700">+{deltas.deltaAttack.toFixed(1)} 攻</span>
          <span className="opacity-50">|</span>
          <span className="text-sky-700">+{deltas.deltaFireRate.toFixed(1)} 速</span>
          <span className="opacity-50">|</span>
          <span className="text-emerald-700">+{deltas.deltaPenetration.toFixed(1)} 穿</span>
        </div>
      </div>
    </div>
  );
};
