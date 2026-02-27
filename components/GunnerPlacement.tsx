import React, { useState } from 'react';
import { GunnerStats } from '../types';
import { LANE_ROWS, GRID_COLS, CELL_SIZE } from '../constants';
import { formatGunnerStats } from '../services/gunnerService';

/** 與戰鬥區中央一致的累積三圍（用於屬性預覽） */
export interface AccumulatedPreview {
  attack: number;
  fireRate: number;
  penetration: number;
}

/** 放置回調：row 0=上列 1=下列, col 0~GRID_COLS-1 */
interface GunnerPlacementProps {
  gunnerStats: GunnerStats;
  onPlacement: (row: number, col: number) => void;
  onCancel?: () => void;
  /** 已被佔用的格子 [row][col] */
  occupiedCells?: boolean[][];
  /** 與戰鬥區累積一致的數值，有則預覽顯示攻擊力×射速×穿透數 */
  accumulatedPreview?: AccumulatedPreview;
}

const ROW_LABELS = ['上列', '下列'];

export const GunnerPlacement: React.FC<GunnerPlacementProps> = ({
  gunnerStats,
  onPlacement,
  onCancel,
  occupiedCells = [Array(GRID_COLS).fill(false), Array(GRID_COLS).fill(false)],
  accumulatedPreview,
}) => {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  const handleConfirm = () => {
    if (selectedCell) {
      onPlacement(selectedCell.row, selectedCell.col);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4" style={{ backgroundColor: 'var(--notebook-bg)' }}>
      <h2 className="hand-drawn-font text-xl mb-4">放置 Gunner（PvZ 兩列）</h2>

      <div className="hand-drawn-box p-4 mb-4 hand-drawn-font text-xs hand-drawn-box-inner">
        <div className="opacity-80 mb-2">屬性預覽（與戰鬥區累積一致）</div>
        {accumulatedPreview != null ? (
          <div className="text-sm">
            攻擊力 <span className="text-amber-700">{Math.floor(accumulatedPreview.attack)}</span>
            <span className="opacity-50 mx-1">×</span>
            射速 <span className="text-sky-700">{Math.floor(accumulatedPreview.fireRate)}</span>
            <span className="opacity-50 mx-1">×</span>
            穿透數 <span className="text-emerald-700">{Math.floor(accumulatedPreview.penetration)}</span>
          </div>
        ) : (
          formatGunnerStats(gunnerStats).map((stat, idx) => (
            <div key={idx} className="mb-1">{stat}</div>
          ))
        )}
      </div>

      {/* 兩橫列：上列 / 下列 */}
      <div className="flex flex-col gap-4 mb-6">
        {[0, 1].map((row) => (
            <div key={row} className="flex flex-col items-center gap-1">
            <div className="hand-drawn-font text-[10px] opacity-70">{ROW_LABELS[row]}</div>
            <div
              className="flex gap-1"
              style={{ width: GRID_COLS * (CELL_SIZE + 4) }}
            >
              {Array.from({ length: GRID_COLS }).map((_, col) => {
                const isSelected =
                  selectedCell?.row === row && selectedCell?.col === col;
                const isOccupied =
                  occupiedCells[row] && occupiedCells[row][col];

                return (
                  <button
                    key={`${row}-${col}`}
                    onClick={() =>
                      !isOccupied && setSelectedCell({ row, col })
                    }
                    disabled={isOccupied}
                    className={`
                      border-4 transition-all flex-shrink-0 hand-drawn-font
                      ${isOccupied ? 'opacity-50 cursor-not-allowed border-stone-400' : ''}
                      ${!isOccupied && isSelected ? 'hand-drawn-btn border-amber-600' : ''}
                      ${!isOccupied && !isSelected ? 'hand-drawn-box hover:brightness-95 hand-drawn-box-inner' : ''}
                    `}
                    style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  >
                    {isOccupied && <span className="text-[10px]">✕</span>}
                    {!isOccupied && isSelected && <span className="text-2xl">🎯</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {onCancel && (
          <button onClick={onCancel} className="hand-drawn-btn text-xs py-3 px-6 hand-drawn-box-inner">
            取消
          </button>
        )}
        <button
          onClick={handleConfirm}
          disabled={!selectedCell}
          className={`hand-drawn-btn text-xs py-3 px-6 hand-drawn-box-inner ${!selectedCell ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          確認放置
        </button>
      </div>

      <div className="mt-4 hand-drawn-font text-[10px] text-center opacity-60">
        上列／下列各選一格，子彈只攻擊該列怪物
      </div>
    </div>
  );
};
