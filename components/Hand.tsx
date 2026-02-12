import React from 'react';
import { Card, CardType } from '../types';
import { CARD_TYPE_COLORS } from '../constants';

interface HandProps {
  hand: Card[];
  onCardClick?: (card: Card, index: number) => void;
  disabled?: boolean;
}

export const Hand: React.FC<HandProps> = ({ hand, onCardClick, disabled }) => {
  if (hand.length === 0) {
    return null;
  }

  const getCardColor = (type: CardType): string => {
    return CARD_TYPE_COLORS[type];
  };

  const getRarityBorder = (rarity: string): string => {
    switch (rarity) {
      case 'R':
        return 'border-gray-400';
      case 'SR':
        return 'border-yellow-400';
      case 'UR':
        return 'border-purple-400 shadow-purple-400/50';
      default:
        return 'border-gray-400';
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-2 p-2">
      <div className="text-[8px] text-gray-400 uppercase tracking-widest">手牌</div>
      <div className="flex gap-2 justify-center flex-wrap">
        {hand.map((card, index) => (
          <div
            key={card.id}
            onClick={() => !disabled && onCardClick?.(card, index)}
            className={`
              relative w-16 h-20 flex flex-col items-center justify-between p-2
              border-4 ${getRarityBorder(card.rarity)} ${getCardColor(card.type)}
              shadow-[2px_2px_0_0_black]
              ${!disabled && onCardClick ? 'cursor-pointer hover:translate-y-[-4px] active:translate-y-0' : 'opacity-70'}
              transition-transform
            `}
          >
            {/* 稀有度標記 */}
            <div className="absolute top-0 right-0 bg-black/40 px-1 text-[6px] text-white">
              {card.rarity}
            </div>

            {/* 卡牌名稱 */}
            <div className="text-[8px] text-center font-bold leading-tight">
              {card.name}
            </div>

            {/* 卡牌數值 */}
            <div className="flex flex-col items-center gap-0.5">
              {card.type === CardType.ATTACK && (
                <>
                  <div className="text-xs font-bold">⚔️{card.baseAttack}</div>
                  <div className="text-[6px]">×{card.attackCount}</div>
                </>
              )}
              {card.type === CardType.DEFENSE && (
                <>
                  <div className="text-xs font-bold">🛡️{card.baseBlock}</div>
                  <div className="text-[6px]">{(card.hpConversionRate! * 100).toFixed(0)}%</div>
                </>
              )}
              {card.type === CardType.SKILL && (
                <div className="text-xs font-bold">✨</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
