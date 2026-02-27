import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AnyQuestion,
  CircleModernQuestion,
  CircleClassicalQuestion,
  GunnerStats,
} from '../types';
import { fetchAnyQuestion } from '../services/questionService';
import { updateQuestionStats } from '../services/statsService';
import { gunnerStatsFromAccumulated } from '../services/gunnerService';
import { useGameStore } from '../stores/gameStore';
import {
  SENTENCE_TIME_LIMIT,
  ACCUMULATED_ATTACK_PER_ACCURACY,
  ACCUMULATED_FIRERATE_PER_ACCURACY,
  ACCUMULATED_PENETRATION_PER_ACCURACY,
  ROLLING_NUMBER_STEP_MS,
  ANSWER_FEEDBACK_DURATION_MS,
} from '../constants';
import { CircleQuestionUI, CircleTool } from './CircleQuestionUI';
import { ConjunctionQuestionUI, isConjCorrect } from './ConjunctionQuestionUI';
import { getSynonymsForStandardAnswer } from '../services/conjunctionSynonyms';
import { TitleMatchQuestionUI } from './TitleMatchQuestionUI';
import { ReadingQuestionUI } from './ReadingQuestionUI';
import { CorrectAnswerOverlay } from './CorrectAnswerOverlay';

export interface AccumulatedDisplay {
  attack: number;
  fireRate: number;
  penetration: number;
}

interface QuestionPhaseProps {
  onComplete: (gunnerStats: GunnerStats, accumulated: AccumulatedDisplay) => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---- 工具列定義 ----

/** Modern 題只保留主詞與重點兩種選項 */
const MODERN_TOOLS: CircleTool[] = [
  { id: 'subject', key: 'A', label: '主', color: 'bg-blue-500 border-blue-700 text-white' },
  { id: 'key',     key: 'D', label: '重', color: 'bg-purple-500 border-purple-700 text-white' },
];

const CLASSICAL_TOOLS: CircleTool[] = [
  { id: 'subject',  key: 'A', label: '主', color: 'bg-blue-500 border-blue-700 text-white' },
  { id: 'verb',     key: 'S', label: '動', color: 'bg-green-500 border-green-700 text-white' },
  { id: 'particle', key: 'D', label: '虛', color: 'bg-rose-500 border-rose-700 text-white' },
];

// ---- 評分函式 ----

function scoreCircleModern(
  q: CircleModernQuestion,
  selectedMap: Record<number, string>
): number {
  let correct = 0;
  let wrong = 0;
  const { subjectIndices, keyIndices } = q.answer;
  const total = subjectIndices.length + keyIndices.length;

  const check = (indices: number[], toolId: string) => {
    for (const idx of indices) {
      if (selectedMap[idx] === toolId) correct++;
    }
    for (const [idxStr, tid] of Object.entries(selectedMap)) {
      if (tid === toolId && !indices.includes(Number(idxStr))) wrong++;
    }
  };
  check(subjectIndices, 'subject');
  check(keyIndices, 'key');

  if (correct === 0 && wrong === 0) return -1; // 未作答
  return Math.max(0, (correct - wrong) / Math.max(1, total));
}

function scoreCircleClassical(
  q: CircleClassicalQuestion,
  selectedMap: Record<number, string>
): number {
  let correct = 0;
  let wrong = 0;
  const { subjectIndices, verbIndices, particleIndices } = q.answer;
  const total = subjectIndices.length + verbIndices.length + particleIndices.length;

  const check = (indices: number[], toolId: string) => {
    for (const idx of indices) {
      if (selectedMap[idx] === toolId) correct++;
    }
    for (const [idxStr, tid] of Object.entries(selectedMap)) {
      if (tid === toolId && !indices.includes(Number(idxStr))) wrong++;
    }
  };
  check(subjectIndices, 'subject');
  check(verbIndices, 'verb');
  check(particleIndices, 'particle');

  if (correct === 0 && wrong === 0) return -1;
  return Math.max(0, (correct - wrong) / Math.max(1, total));
}

// ---- 主元件 ----

export const QuestionPhase: React.FC<QuestionPhaseProps> = ({ onComplete }) => {
  const {
    questionBuffer,
    totalQuestionCount,
    accumulatedAttack,
    accumulatedFireRate,
    accumulatedPenetration,
    addQuestionResult,
    clearQuestionBuffer,
    addAccumulatedStats,
    clearAccumulatedStats,
    addTotalQuestionCount,
  } = useGameStore();

  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  const [timeLeft, setTimeLeft] = useState(SENTENCE_TIME_LIMIT);
  const timeLeftRef = useRef(timeLeft);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // 圈選題的選擇狀態：charIndex → toolId
  const [circleSelectedMap, setCircleSelectedMap] = useState<Record<number, string>>({});
  /** 與 circleSelectedMap 同步的 ref，供鍵盤送出時讀取即時值（與閱讀題同理，避免 W/Enter 與滑鼠不一致） */
  const circleSelectedMapRef = useRef<Record<number, string>>({});
  // 圈選題目前選中的工具（題目區與選項區共用）
  const [circleActiveTool, setCircleActiveTool] = useState<string>('');
  const bonusUsedRef = useRef<Set<number>>(new Set());

  // TitleMatch 的配對狀態（state 用於控制送出按鈕，ref 供評分讀取）
  const [titleMatchMap, setTitleMatchMap] = useState<Record<number, string>>({});
  const titleMatchMapRef = useRef<Record<number, string>>({});
  /** 標題配對題：待配對的標題（題目區與選項區共用，題目才可選） */
  const [titleMatchPendingTitle, setTitleMatchPendingTitle] = useState<string | null>(null);
  /** 標題配對題：右欄標題顯示順序（與選項區一致） */
  const [titleMatchShuffledTitles, setTitleMatchShuffledTitles] = useState<string[]>([]);

  /** 閱讀測驗：選中的選項索引 0=A, 1=B, 2=C */
  const [readingSelectedIndex, setReadingSelectedIndex] = useState<number | null>(null);
  /** 與 readingSelectedIndex 同步的 ref，供鍵盤送出時讀取即時值（避免 W/Enter 與滑鼠行為不一致） */
  const readingSelectedIndexRef = useRef<number | null>(null);

  // 答題後回饋階段：正確答案 + 所得顯示 2 秒
  const [feedbackState, setFeedbackState] = useState<{
    question: AnyQuestion;
    deltas: { deltaAttack: number; deltaFireRate: number; deltaPenetration: number };
    isGenerate: boolean;
  } | null>(null);
  const feedbackStateRef = useRef(feedbackState);
  useEffect(() => {
    feedbackStateRef.current = feedbackState;
  }, [feedbackState]);

  // 載入初始題目（依當時 Gunner 數決定是否納入閱讀題）
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const gunnerCount = useGameStore.getState().gunners.length;
      const qs = await fetchAnyQuestion(5, [], { gunnerCount });
      setQuestions(qs);
      addTotalQuestionCount(qs.length);
      if (qs[0]) setTimeLeft(qs[0].timeLimit ?? SENTENCE_TIME_LIMIT);
      setLoading(false);
    };
    load();
  }, []);

  // 換題時重置
  useEffect(() => {
    bonusUsedRef.current.clear();
    setCircleSelectedMap({});
    circleSelectedMapRef.current = {};
    setTitleMatchMap({});
    titleMatchMapRef.current = {};
    setTitleMatchPendingTitle(null);
    setReadingSelectedIndex(null);
    readingSelectedIndexRef.current = null;
    const q = questions[currentIdx];
    if (q) {
      setTimeLeft(q.timeLimit ?? SENTENCE_TIME_LIMIT);
      if (q.type === 'CIRCLE_MODERN' || q.type === 'CIRCLE_CLASSICAL') {
        const tools = q.type === 'CIRCLE_MODERN' ? MODERN_TOOLS : CLASSICAL_TOOLS;
        setCircleActiveTool(tools[0]?.id ?? '');
      }
      if (q.type === 'TITLE_MATCH' && 'pairs' in q) {
        setTitleMatchShuffledTitles(shuffleArray(q.pairs.map((p: { title: string }) => p.title)));
      }
    }
  }, [currentIdx, questions]);

  // 計時器（回饋階段時不觸發送出）
  useEffect(() => {
    if (loading || questions.length === 0) return;
    const timer = setInterval(() => {
      if (feedbackStateRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          submitQuestion();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [currentIdx, loading, questions]);

  // 鍵盤快捷鍵：W/Enter=送出、E=生成；有複數選項的題型 A/S/D/F=左至右選項（conjunction 除外）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (feedbackStateRef.current) return;
      const q = questions[currentIdx];
      const key = e.key.toUpperCase();

      if (key === 'W' || e.key === 'Enter') {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
        if (q?.type === 'TITLE_MATCH') {
          const required = (q as { pairs: unknown[] }).pairs?.length ?? 3;
          if (Object.keys(titleMatchMapRef.current).length < required) return;
        }
        submitQuestion();
        return;
      }
      if (key === 'E') {
        const state = useGameStore.getState();
        const hasAcc = state.accumulatedAttack !== 0 || state.accumulatedFireRate !== 0 || state.accumulatedPenetration !== 0;
        if (hasAcc) handleGenerateGunner(q?.type === 'FILL_CONJUNCTION' ? conjInputRef.current : undefined);
        return;
      }

      if (!q) return;
      if (q.type === 'TITLE_MATCH') {
        const optionIndex = key === 'A' ? 0 : key === 'S' ? 1 : key === 'D' ? 2 : key === 'F' ? 3 : -1;
        if (optionIndex >= 0 && titleMatchShuffledTitles.length > optionIndex) {
          setTitleMatchPendingTitle(titleMatchShuffledTitles[optionIndex]);
        }
        return;
      }
      if (q.type === 'READING_COMPREHENSION') {
        const optionIndex = key === 'A' ? 0 : key === 'S' ? 1 : key === 'D' ? 2 : -1;
        if (optionIndex >= 0) {
          const idx = optionIndex as 0 | 1 | 2;
          setReadingSelectedIndex(idx);
          readingSelectedIndexRef.current = idx;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIdx, questions, titleMatchShuffledTitles]);

  // 同步閱讀選項 state -> ref（滑鼠點選時 ref 與 state 一致；鍵盤 A/S/D 時在 onKey 內也會寫入 ref）
  useEffect(() => {
    readingSelectedIndexRef.current = readingSelectedIndex;
  }, [readingSelectedIndex]);

  /**
   * @param isDrag true = 拖曳滑過，只設定不切換；false/undefined = 單擊，切換該格
   */
  const handleCircleBlockClick = (charIndex: number, toolId: string, isDrag?: boolean) => {
    setCircleSelectedMap((prev) => {
      const next = { ...prev };
      if (isDrag) {
        next[charIndex] = toolId;
      } else {
        if (next[charIndex] === toolId) {
          delete next[charIndex];
        } else {
          next[charIndex] = toolId;
        }
      }
      circleSelectedMapRef.current = next;
      return next;
    });

    // 每格最多 +1s 一次
    const used = bonusUsedRef.current;
    if (!used.has(charIndex)) {
      used.add(charIndex);
      const q = questions[currentIdx];
      const maxTime = q?.timeLimit ?? SENTENCE_TIME_LIMIT;
      setTimeLeft((prev) => Math.min(prev + 1, maxTime));
    }
  };

  const goToNextQuestion = () => {
    const excludeIds = questions.map((q) => q.id);
    const gunnerCount = useGameStore.getState().gunners.length;
    fetchAnyQuestion(1, excludeIds, { gunnerCount }).then((rows) => {
      if (rows.length > 0) {
        addTotalQuestionCount(1);
        const nextIdx = questions.length;
        setQuestions((s) => [...s, rows[0]]);
        setCurrentIdx(nextIdx);
      } else {
        setCurrentIdx((c) => Math.min(c + 1, questions.length - 1));
      }
    });
  };

  const getRollingWaitMs = (d: {
    deltaAttack: number;
    deltaFireRate: number;
    deltaPenetration: number;
  }) => {
    const maxSteps = Math.max(
      Math.ceil(d.deltaAttack),
      Math.ceil(d.deltaFireRate),
      Math.ceil(d.deltaPenetration),
      1
    );
    return maxSteps * ROLLING_NUMBER_STEP_MS + 80;
  };

  type ComputeResult = {
    added: boolean;
    question: AnyQuestion | null;
    deltaAttack: number;
    deltaFireRate: number;
    deltaPenetration: number;
    accuracy?: number;
    timeMultiplier?: number;
    isPerfect?: boolean;
  };

  /** 只計算結果，不寫入 store */
  const computeResult = (conjInput?: string): ComputeResult => {
    const q = questions[currentIdx];
    if (!q) return { added: false, question: null, deltaAttack: 0, deltaFireRate: 0, deltaPenetration: 0 };

    let accuracy = -1;

    switch (q.type) {
      case 'CIRCLE_MODERN':
        accuracy = scoreCircleModern(q, circleSelectedMapRef.current);
        break;
      case 'CIRCLE_CLASSICAL':
        accuracy = scoreCircleClassical(q, circleSelectedMapRef.current);
        break;
      case 'FILL_CONJUNCTION': {
        const raw = conjInput ?? '';
        if (raw.trim() === '') {
          accuracy = -1;
        } else {
          const synonyms = getSynonymsForStandardAnswer(q.standardAnswer, q.synonyms);
          accuracy = isConjCorrect(raw, synonyms) ? 1 : 0;
        }
        break;
      }
      case 'TITLE_MATCH': {
        const matchMap = titleMatchMapRef.current;
        const hasAny = Object.keys(matchMap).length > 0;
        if (!hasAny) {
          accuracy = -1;
        } else {
          const total = q.pairs.length;
          const correct = q.pairs.filter((p, i) => matchMap[i] === p.title).length;
          accuracy = correct / Math.max(1, total);
        }
        break;
      }
      case 'READING_COMPREHENSION': {
        const effectiveIndex = readingSelectedIndexRef.current ?? readingSelectedIndex;
        if (effectiveIndex === null) {
          accuracy = -1;
        } else {
          accuracy = effectiveIndex === q.correctIndex ? 1 : 0;
        }
        break;
      }
    }

    if (accuracy < 0) {
      return { added: false, question: q, deltaAttack: 0, deltaFireRate: 0, deltaPenetration: 0 };
    }

    const timeLimit = q.timeLimit ?? SENTENCE_TIME_LIMIT;
    const timeMultiplier = 1 + Math.max(0, timeLeftRef.current) / timeLimit;
    const isPerfect = accuracy === 1;

    const deltaAttack = accuracy * ACCUMULATED_ATTACK_PER_ACCURACY;
    const deltaFireRate = accuracy * ACCUMULATED_FIRERATE_PER_ACCURACY;
    const deltaPenetration = accuracy * ACCUMULATED_PENETRATION_PER_ACCURACY;

    return {
      added: true,
      question: q,
      deltaAttack,
      deltaFireRate,
      deltaPenetration,
      accuracy,
      timeMultiplier,
      isPerfect,
    };
  };

  /** 將計算結果寫入 store（updateQuestionStats、addQuestionResult、addAccumulatedStats） */
  const applyResult = (result: ComputeResult) => {
    if (!result.added || !result.question || result.accuracy == null) return;
    updateQuestionStats(result.question.id, result.isPerfect ?? false);
    addQuestionResult({
      accuracy: result.accuracy,
      timeMultiplier: result.timeMultiplier ?? 1,
      isPerfect: result.isPerfect ?? false,
    });
    addAccumulatedStats(result.deltaAttack, result.deltaFireRate, result.deltaPenetration);
  };

  const proceedAfterFeedback = (result: ComputeResult, isGenerate: boolean) => {
    applyResult(result);
    const deltas = {
      deltaAttack: result.deltaAttack,
      deltaFireRate: result.deltaFireRate,
      deltaPenetration: result.deltaPenetration,
    };
    const waitMs = getRollingWaitMs(deltas);

    if (isGenerate) {
      const state = useGameStore.getState();
      const gunnerStats = gunnerStatsFromAccumulated(
        state.accumulatedAttack,
        state.accumulatedFireRate,
        state.accumulatedPenetration
      );
      clearQuestionBuffer();
      clearAccumulatedStats();
      setTimeout(() => {
        onComplete(gunnerStats, {
          attack: state.accumulatedAttack,
          fireRate: state.accumulatedFireRate,
          penetration: state.accumulatedPenetration,
        });
        goToNextQuestion();
      }, waitMs);
    } else {
      const buffer = useGameStore.getState().questionBuffer;
      if (buffer.length >= 5) {
        const state = useGameStore.getState();
        const gunnerStats = gunnerStatsFromAccumulated(
          state.accumulatedAttack,
          state.accumulatedFireRate,
          state.accumulatedPenetration
        );
        clearQuestionBuffer();
        clearAccumulatedStats();
        setTimeout(() => {
          onComplete(gunnerStats, {
            attack: state.accumulatedAttack,
            fireRate: state.accumulatedFireRate,
            penetration: state.accumulatedPenetration,
          });
          goToNextQuestion();
        }, waitMs);
      } else {
        setTimeout(goToNextQuestion, waitMs);
      }
    }
  };

  const submitQuestion = (conjInput?: string) => {
    const result = computeResult(conjInput);

    if (!result.added) {
      goToNextQuestion();
      return;
    }

    setFeedbackState({
      question: result.question!,
      deltas: {
        deltaAttack: result.deltaAttack,
        deltaFireRate: result.deltaFireRate,
        deltaPenetration: result.deltaPenetration,
      },
      isGenerate: false,
    });

    setTimeout(() => {
      setFeedbackState(null);
      proceedAfterFeedback(result, false);
    }, ANSWER_FEEDBACK_DURATION_MS);
  };

  const handleGenerateGunner = (conjInput?: string) => {
    if (!hasAccumulated) return;

    const result = computeResult(conjInput);

    if (!result.added) {
      // 當前題目無作答：只結算目前累計並生成 Gunner，不送交本題、不換題
      const state = useGameStore.getState();
      const gunnerStats = gunnerStatsFromAccumulated(
        state.accumulatedAttack,
        state.accumulatedFireRate,
        state.accumulatedPenetration
      );
      clearQuestionBuffer();
      clearAccumulatedStats();
      onComplete(gunnerStats, {
        attack: state.accumulatedAttack,
        fireRate: state.accumulatedFireRate,
        penetration: state.accumulatedPenetration,
      });
      return;
    }

    // 當前題目有作答：計算此題分數、結算累計並生成 Gunner，再切到下一題
    setFeedbackState({
      question: result.question!,
      deltas: {
        deltaAttack: result.deltaAttack,
        deltaFireRate: result.deltaFireRate,
        deltaPenetration: result.deltaPenetration,
      },
      isGenerate: true,
    });

    setTimeout(() => {
      setFeedbackState(null);
      proceedAfterFeedback(result, true);
    }, ANSWER_FEEDBACK_DURATION_MS);
  };

  // ---- 連接詞題暫存輸入（供生成 Gunner 按鈕使用） ----
  const conjInputRef = useRef('');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="hand-drawn-font text-xl animate-pulse" style={{ color: 'var(--marker-black)' }}>
          載入題目中...
        </div>
      </div>
    );
  }

  const question = questions[currentIdx];
  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="hand-drawn-font text-xl mb-4">沒有題目可用</div>
        <button onClick={() => window.location.reload()} className="hand-drawn-btn py-2 px-4 hand-drawn-box-inner">
          重新載入
        </button>
      </div>
    );
  }

  const timeLimit = question.timeLimit ?? SENTENCE_TIME_LIMIT;
  const hasAccumulated = accumulatedAttack !== 0 || accumulatedFireRate !== 0 || accumulatedPenetration !== 0;
  const canGenerateGunner = hasAccumulated;

  const renderQuestionContent = () => {
    switch (question.type) {
      case 'CIRCLE_MODERN':
      case 'CIRCLE_CLASSICAL':
        return (
          <CircleQuestionUI
            questionId={question.id}
            text={question.text}
            tools={question.type === 'CIRCLE_MODERN' ? MODERN_TOOLS : CLASSICAL_TOOLS}
            onBlockClick={handleCircleBlockClick}
            selectedMap={circleSelectedMap}
            slot="question"
            activeTool={circleActiveTool}
            onActiveToolChange={setCircleActiveTool}
          />
        );
      case 'FILL_CONJUNCTION':
        return (
          <ConjunctionQuestionUI
            questionId={question.id}
            sentence1={question.sentence1}
            sentence2={question.sentence2}
            onInputChange={(value) => { conjInputRef.current = value; }}
            onSubmit={(input) => {
              conjInputRef.current = input;
              submitQuestion(input);
            }}
          />
        );
      case 'TITLE_MATCH':
        return (
          <TitleMatchQuestionUI
            questionId={question.id}
            pairs={question.pairs}
            onMatchChange={(map) => {
              titleMatchMapRef.current = map;
              setTitleMatchMap(map);
            }}
            slot="question"
            matchMap={titleMatchMap}
            pendingTitle={titleMatchPendingTitle}
            onPendingTitleChange={setTitleMatchPendingTitle}
            shuffledTitles={titleMatchShuffledTitles}
          />
        );
      case 'READING_COMPREHENSION':
        return (
          <ReadingQuestionUI
            article={question.article}
            question={question.question}
          />
        );
    }
  };

  const renderOptionsContent = () => {
    switch (question.type) {
      case 'CIRCLE_MODERN':
      case 'CIRCLE_CLASSICAL':
        return (
          <div className="min-w-[360px] w-full max-w-[480px]">
            <CircleQuestionUI
              questionId={question.id}
              text={question.text}
              tools={question.type === 'CIRCLE_MODERN' ? MODERN_TOOLS : CLASSICAL_TOOLS}
              onBlockClick={handleCircleBlockClick}
              selectedMap={circleSelectedMap}
              slot="options"
              activeTool={circleActiveTool}
              onActiveToolChange={setCircleActiveTool}
            />
          </div>
        );
      case 'FILL_CONJUNCTION':
        return null;
      case 'TITLE_MATCH':
        return (
          <TitleMatchQuestionUI
            questionId={question.id}
            pairs={question.pairs}
            onMatchChange={(map) => {
              titleMatchMapRef.current = map;
              setTitleMatchMap(map);
            }}
            slot="options"
            layout="horizontal"
            matchMap={titleMatchMap}
            pendingTitle={titleMatchPendingTitle}
            onPendingTitleChange={setTitleMatchPendingTitle}
            shuffledTitles={titleMatchShuffledTitles}
          />
        );
      case 'READING_COMPREHENSION':
        return null;
    }
  };

  const isConjQuestion = question.type === 'FILL_CONJUNCTION';

  return (
    <div className="relative flex flex-col h-full min-h-0" style={{ backgroundColor: 'var(--notebook-bg)' }}>
      {feedbackState && (
        <CorrectAnswerOverlay
          question={feedbackState.question}
          deltas={feedbackState.deltas}
        />
      )}

      {/* 頂部資訊列：[總累計題數] [剩餘秒數] [GUNNER累計題數] */}
      <div className="p-2 hand-drawn-box rounded-none border-t-0 border-l-0 border-r-0 flex items-center gap-3 flex-shrink-0 hand-drawn-box-inner" style={{ transform: 'none', boxShadow: 'none' }}>
        <div className="hand-drawn-font text-xs flex-shrink-0">總累計: {totalQuestionCount}</div>
        <div className="flex-1 min-w-0 h-5 hand-drawn-box relative hand-drawn-box-inner" style={{ borderWidth: 2 }}>
          <div
            className={`h-full transition-all duration-100 ease-linear ${
              (timeLeft / timeLimit) > 0.6 ? 'bg-green-500' : (timeLeft / timeLimit) > 0.3 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.max(0, (timeLeft / timeLimit) * 100)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] hand-drawn-font font-bold" style={{ color: 'var(--marker-black)' }}>
            {Math.ceil(Math.max(0, timeLeft))}s
          </span>
        </div>
        <div className="hand-drawn-font text-xs flex-shrink-0 opacity-80">GUNNER: {questionBuffer.length}/5</div>
      </div>

      {/* 題目區：彈性區域，無框線 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0 overflow-auto py-3">
        {renderQuestionContent()}
      </div>

      {/* 選項區塊：固定於最下方，橫向排列；閱讀題固定 A/B/C 三選項 */}
      <div className={`flex-none flex flex-row items-center justify-center gap-2 px-4 py-3 min-h-[100px] hand-drawn-box rounded-none border-b-0 border-l-0 border-r-0 hand-drawn-box-inner ${question.type === 'FILL_CONJUNCTION' ? 'bg-gray-200 opacity-60' : ''}`} style={{ transform: 'none', boxShadow: 'none' }}>
        {question.type === 'FILL_CONJUNCTION' ? (
          <span className="hand-drawn-font text-xs opacity-70">無選項</span>
        ) : question.type === 'READING_COMPREHENSION' ? (
          (['A', 'S', 'D'] as const).map((shortcut, i) => (
            <button
              key={shortcut}
              type="button"
              onClick={() => setReadingSelectedIndex(i as 0 | 1 | 2)}
              title={`選項 ${'ABC'[i]} (快捷鍵 ${shortcut})`}
              className={`hand-drawn-btn hand-drawn-font w-14 h-12 hand-drawn-box-inner border-2 transition-colors ${
                readingSelectedIndex === i ? 'bg-amber-100 border-amber-600' : ''
              }`}
            >
              {'ABC'[i]}
            </button>
          ))
        ) : (
          renderOptionsContent()
        )}
      </div>

      {/* 固定右側：送出、生成（上下並排，恆常出現） */}
      <div className="fixed right-4 top-2/3 -translate-y-1/2 flex flex-col items-center gap-3 z-10">
        <button
          type="button"
          onClick={() => submitQuestion(isConjQuestion ? conjInputRef.current : undefined)}
          title="送出 (W)"
          className="hand-drawn-btn w-12 h-12 rounded-full flex items-center justify-center text-[10px] hand-drawn-box-inner"
        >
          送出
        </button>
        <button
          type="button"
          onClick={() => { if (canGenerateGunner) handleGenerateGunner(isConjQuestion ? conjInputRef.current : undefined); }}
          title={canGenerateGunner ? '生成 Gunner 並放置 (E)' : '需有累積答題（ATK/SPD/PEN 任一不為 0）才可生成'}
          className={`hand-drawn-btn w-12 h-12 rounded-full flex items-center justify-center text-[8px] hand-drawn-box-inner ${!canGenerateGunner ? 'btn-disabled' : ''}`}
        >
          生成
        </button>
      </div>
    </div>
  );
};
