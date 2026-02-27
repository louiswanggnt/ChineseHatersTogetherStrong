import React, { useState, useEffect, useRef } from 'react';
import { GunnerStats } from '../types';
import { GAME_WIDTH, MODE_PARAMS } from '../constants';
import { formatGunnerStats } from '../services/gunnerService';

export interface AccumulatedPreview {
  attack: number;
  fireRate: number;
  penetration: number;
}

interface GunnerPlacementStackProps {
  gunnerStats: GunnerStats;
  onPlacement: (dropX: number) => void;
  onCancel?: () => void;
  accumulatedPreview?: AccumulatedPreview;
}

const { DROP_X_MARGIN, MARKER_SPEED, SLIDER_WIDTH } = MODE_PARAMS.STACK;

export const GunnerPlacementStack: React.FC<GunnerPlacementStackProps> = ({
  gunnerStats,
  onPlacement,
  onCancel,
  accumulatedPreview,
}) => {
  const [markerX, setMarkerX] = useState(0.5);
  const [isStopped, setIsStopped] = useState(false);
  const directionRef = useRef(1);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isStopped) return;
    const animate = () => {
      setMarkerX((prev) => {
        let next = prev + directionRef.current * MARKER_SPEED;
        if (next >= 1) {
          next = 1;
          directionRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          directionRef.current = 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [isStopped]);

  const handleThrow = () => {
    setIsStopped(true);
    const dropX = Math.floor(DROP_X_MARGIN + markerX * (GAME_WIDTH - 2 * DROP_X_MARGIN));
    onPlacement(dropX);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4" style={{ backgroundColor: 'var(--notebook-bg)' }}>
      <h2 className="hand-drawn-font text-xl mb-4">選擇投擲 X 軸（物理堆疊）</h2>

      <div className="hand-drawn-box p-4 mb-4 hand-drawn-font text-xs hand-drawn-box-inner">
        <div className="opacity-80 mb-2">屬性預覽</div>
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

      <div className="hand-drawn-font text-[10px] mb-2 opacity-70">
        {isStopped ? '已鎖定位置' : '定點左右移動，按下「投擲」時停止'}
      </div>
      <div className="relative mb-6" style={{ width: SLIDER_WIDTH }}>
        <div
          className="hand-drawn-box hand-drawn-box-inner h-8 rounded"
          style={{ width: SLIDER_WIDTH }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 hand-drawn-btn border-2 border-amber-600 rounded flex items-center justify-center hand-drawn-font text-xs"
          style={{
            left: `calc(${markerX * 100}% - 12px)`,
            transform: 'translateY(-50%)',
          }}
        >
          ▼
        </div>
      </div>

      <div className="flex gap-4">
        {onCancel && (
          <button onClick={onCancel} className="hand-drawn-btn text-xs py-3 px-6 hand-drawn-box-inner">
            取消
          </button>
        )}
        <button
          onClick={handleThrow}
          className="hand-drawn-btn text-xs py-3 px-6 hand-drawn-box-inner"
        >
          投擲
        </button>
      </div>
    </div>
  );
};
