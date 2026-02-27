import React, { useState, useEffect, useRef } from 'react';

interface RollingNumberProps {
  value: number;
  className?: string;
  /** 每步間隔 ms，愈小翻動愈快 */
  stepMs?: number;
}

/**
 * 數字快速翻動增加效果：從舊值逐步增加到新值
 */
export const RollingNumber: React.FC<RollingNumberProps> = ({
  value,
  className = '',
  stepMs = 35,
}) => {
  const [displayValue, setDisplayValue] = useState(() => Math.floor(value));
  const displayRef = useRef(displayValue);

  useEffect(() => {
    displayRef.current = displayValue;
  }, [displayValue]);

  useEffect(() => {
    const target = Math.floor(value);
    if (displayRef.current === target) return;

    const step = target > displayRef.current ? 1 : -1;
    const id = setInterval(() => {
      const current = displayRef.current;
      if ((step > 0 && current >= target) || (step < 0 && current <= target)) {
        displayRef.current = target;
        setDisplayValue(target);
        clearInterval(id);
        return;
      }
      displayRef.current = current + step;
      setDisplayValue(displayRef.current);
    }, stepMs);
    return () => clearInterval(id);
  }, [value, stepMs]);

  return <span className={className}>{displayValue}</span>;
};
