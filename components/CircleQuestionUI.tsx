import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CharacterBlock } from '../types';

export interface CircleTool {
  key: string;
  label: string;
  color: string;
  /** 用於識別此工具的 symbol */
  id: string;
}

interface CircleQuestionUIProps {
  questionId: string;
  text: string;
  tools: CircleTool[];
  timeLeft?: number;
  timeLimit?: number;
  /** 當點擊/滑過字格時回呼；isDrag=true 表示拖曳滑過（只設定不切換） */
  onBlockClick: (charIndex: number, toolId: string, isDrag?: boolean) => void;
  /** selectedMap: charIndex → toolId */
  selectedMap: Record<number, string>;
  /** 'question'=題目區（句子文字+字格）；'options'=選項區（僅工具列）；'all'=全部（預設） */
  slot?: 'question' | 'options' | 'all';
  /** 拆分 slot 時需共用：目前選中的工具 */
  activeTool?: string;
  /** 拆分 slot 時需共用：切換工具 */
  onActiveToolChange?: (toolId: string) => void;
}

export const CircleQuestionUI: React.FC<CircleQuestionUIProps> = ({
  questionId,
  text,
  tools,
  timeLeft,
  timeLimit,
  onBlockClick,
  selectedMap,
  slot = 'all',
  activeTool: activeToolProp,
  onActiveToolChange,
}) => {
  const [internalTool, setInternalTool] = useState<string>(tools[0]?.id ?? '');
  const activeTool = activeToolProp ?? internalTool;
  const setActiveTool = onActiveToolChange ?? setInternalTool;
  const isDraggingRef = useRef(false);
  const blocksContainerRef = useRef<HTMLDivElement>(null);
  const capturedPointerIdRef = useRef<number | null>(null);
  /** 拖曳時上一次套用到的字格 index，避免重複觸發同一格 */
  const lastAppliedIndexRef = useRef<number | null>(null);
  const activeToolRef = useRef(activeTool);
  const onBlockClickRef = useRef(onBlockClick);
  activeToolRef.current = activeTool;
  onBlockClickRef.current = onBlockClick;

  // 題目換了時重置工具（僅內部狀態時）
  useEffect(() => {
    if (!onActiveToolChange) setInternalTool(tools[0]?.id ?? '');
  }, [questionId, onActiveToolChange]);

  // 鍵盤快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const upper = e.key.toUpperCase();
      const matched = tools.find((t) => t.key.toUpperCase() === upper);
      if (matched) setActiveTool(matched.id);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tools]);

  // 長按滑動：在 window 放開或離開時結束拖曳
  useEffect(() => {
    const endDrag = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    window.addEventListener('pointerleave', endDrag);
    return () => {
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('pointerleave', endDrag);
    };
  }, []);

  const characters: CharacterBlock[] = text.split('').map((char, i) => ({
    char,
    originalIndex: i,
  }));

  const handleBlockPointerDown = useCallback(
    (idx: number, e: React.PointerEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      lastAppliedIndexRef.current = idx;
      onBlockClick(idx, activeTool, false);
      const el = blocksContainerRef.current;
      if (el?.setPointerCapture) {
        el.setPointerCapture(e.pointerId);
        capturedPointerIdRef.current = e.pointerId;
      }
    },
    [activeTool, onBlockClick]
  );

  const releaseCapture = useCallback(() => {
    const el = blocksContainerRef.current;
    const id = capturedPointerIdRef.current;
    if (el?.releasePointerCapture && id != null) {
      try {
        el.releasePointerCapture(id);
      } catch (_) {}
      capturedPointerIdRef.current = null;
    }
    lastAppliedIndexRef.current = null;
  }, []);

  /** 依目前滑鼠/手指位置找出底下的字格 index（用 elementFromPoint，拖曳時較穩） */
  const handleContainerPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const blockEl = target?.closest?.('[data-char-index]');
    const idxStr = blockEl?.getAttribute?.('data-char-index');
    if (idxStr == null) return;
    const idx = parseInt(idxStr, 10);
    if (Number.isNaN(idx)) return;
    if (lastAppliedIndexRef.current === idx) return;
    lastAppliedIndexRef.current = idx;
    onBlockClickRef.current(idx, activeToolRef.current, true);
  }, []);

  if (slot === 'question') {
    return (
      <div className="flex flex-col w-full gap-2">
        <div className="hand-drawn-font text-lg text-center leading-relaxed w-full" style={{ color: 'var(--marker-black)' }}>
          {text}
        </div>
        <div
          ref={blocksContainerRef}
          className="flex flex-wrap justify-center gap-1 touch-none"
          onPointerMove={handleContainerPointerMove}
          onPointerUp={() => { releaseCapture(); isDraggingRef.current = false; }}
          onPointerLeave={() => { releaseCapture(); }}
          onPointerCancel={() => { releaseCapture(); isDraggingRef.current = false; }}
        >
          {characters.map((block, idx) => {
            const toolId = selectedMap[idx];
            const toolDef = tools.find((t) => t.id === toolId);
            const colorClass = toolDef?.color ?? '';
            return (
              <div
                key={`${questionId}-${idx}`}
                role="button"
                tabIndex={0}
                data-char-index={idx}
                className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-lg md:text-xl font-bold border-[3px] cursor-pointer select-none relative hand-drawn-font active:translate-y-0.5 transition-none ${
                  toolId ? colorClass : 'border-[var(--marker-black)] hover:brightness-95'
                }`}
                style={!toolId ? { backgroundColor: 'var(--notebook-paper)', color: 'var(--marker-black)' } : undefined}
                onPointerDown={(e) => handleBlockPointerDown(idx, e)}
              >
                {block.char}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (slot === 'options') {
    return (
      <div
        className="hand-drawn-box rounded-none border-t-4 border-l-0 border-r-0 p-1 flex gap-1 flex-shrink-0 hand-drawn-box-inner"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${tools.length}, 1fr)`, transform: 'none', boxShadow: 'none' }}
      >
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`
              flex flex-col items-center justify-center py-2 border-[3px] transition-none relative text-xs hand-drawn-font
              ${activeTool === tool.id ? 'border-[var(--marker-black)] translate-y-0.5 shadow-none' : 'shadow-[0_3px_0_0_var(--marker-black)] -translate-y-0.5'}
              ${tool.color}
            `}
          >
            <div className="absolute top-1 right-1 opacity-60 px-1 text-[8px] border border-current">{tool.key}</div>
            <span className="text-lg">{tool.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="hand-drawn-font text-lg text-center mb-3" style={{ color: 'var(--marker-black)' }}>{text}</div>
      <div
        ref={blocksContainerRef}
        className="flex flex-wrap justify-center gap-1 mb-3 touch-none"
        onPointerMove={handleContainerPointerMove}
        onPointerUp={() => { releaseCapture(); isDraggingRef.current = false; }}
        onPointerLeave={() => { releaseCapture(); }}
        onPointerCancel={() => { releaseCapture(); isDraggingRef.current = false; }}
      >
        {characters.map((block, idx) => {
          const toolId = selectedMap[idx];
          const toolDef = tools.find((t) => t.id === toolId);
          const colorClass = toolDef?.color ?? '';
          return (
            <div
              key={`${questionId}-${idx}`}
              role="button"
              tabIndex={0}
              data-char-index={idx}
              className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-lg md:text-xl font-bold border-[3px] cursor-pointer select-none relative hand-drawn-font active:translate-y-0.5 transition-none ${
                toolId ? colorClass : 'border-[var(--marker-black)] hover:brightness-95'
              }`}
              style={!toolId ? { backgroundColor: 'var(--notebook-paper)', color: 'var(--marker-black)' } : undefined}
              onPointerDown={(e) => handleBlockPointerDown(idx, e)}
            >
              {block.char}
            </div>
          );
        })}
      </div>

      {/* 工具列 - 手繪筆記風 */}
      <div
        className="hand-drawn-box rounded-none border-t-4 border-l-0 border-r-0 p-1 flex gap-1 flex-shrink-0 hand-drawn-box-inner"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${tools.length}, 1fr)`, transform: 'none', boxShadow: 'none' }}
      >
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`
              flex flex-col items-center justify-center py-2 border-[3px] transition-none relative text-xs hand-drawn-font
              ${activeTool === tool.id ? 'border-[var(--marker-black)] translate-y-0.5 shadow-none' : 'shadow-[0_3px_0_0_var(--marker-black)] -translate-y-0.5'}
              ${tool.color}
            `}
          >
            <div className="absolute top-1 right-1 opacity-60 px-1 text-[8px] border border-current">
              {tool.key}
            </div>
            <span className="text-lg">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
