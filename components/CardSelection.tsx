import React from 'react';
import { Card, CardType } from '../types';
import { CARD_TYPE_COLORS } from '../constants';

interface CardSelectionProps {
  availableCards: Card[];
  selectedCards: Card[];
  onCardClick: (card: Card) => void;
  onConfirm: () => void;
}

const CARD_TYPE_ICONS: Record<CardType, string> = {
  [CardType.ATTACK]: '⚔️',
  [CardType.DEFENSE]: '🛡️',
  [CardType.SKILL]: '✨',
};

export const CardSelection: React.FC<CardSelectionProps> = ({
  availableCards,
  selectedCards,
  onCardClick,
  onConfirm,
}) => {
  const selectedIds = new Set(selectedCards.map(c => c.id));
  const maxSelect = Math.min(5, availableCards.length);
  const canConfirm = maxSelect >= 5
    ? selectedCards.length === 5
    : selectedCards.length === maxSelect;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-800 to-gray-900">
      <div className="text-white text-sm font-['Press_Start_2P'] mb-4">
        選擇 {maxSelect >= 5 ? '5' : maxSelect} 張卡牌 ({selectedCards.length}/{maxSelect})
      </div>

      {/* Available Cards */}
      <div className="grid grid-cols-4 gap-2 mb-4 max-w-lg">
        {availableCards.map(card => {
          const isSelected = selectedIds.has(card.id);
          return (
            <button
              key={card.id}
              onClick={() => onCardClick(card)}
              className={`
                relative p-2 border-2 rounded transition-all
                ${isSelected ? 'border-yellow-400 scale-105' : 'border-gray-600'}
                ${CARD_TYPE_COLORS[card.type]}
                hover:scale-110 active:scale-95
              `}
            >
              <div className="text-2xl mb-1">{CARD_TYPE_ICONS[card.type]}</div>
              <div className="text-[8px] text-white font-['Press_Start_2P']">{card.name}</div>
              <div className="text-[6px] text-gray-300 mt-1">{card.rarity}</div>
              {isSelected && (
                <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[8px] px-1 rounded-bl">
                  {selectedCards.findIndex(c => c.id === card.id) + 1}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Cards Preview */}
      <div className="flex gap-1 mb-4">
        {[0, 1, 2, 3, 4].map(i => {
          const card = selectedCards[i];
          return (
            <div
              key={i}
              className={`
                w-8 h-8 border-2 rounded flex items-center justify-center
                ${card ? CARD_TYPE_COLORS[card.type] : 'bg-gray-700 border-gray-600'}
              `}
            >
              {card && <span className="text-sm">{CARD_TYPE_ICONS[card.type]}</span>}
            </div>
          );
        })}
      </div>

      {/* Confirm Button */}
      <button
        onClick={onConfirm}
        disabled={!canConfirm}
        className={`
          text-white text-xs py-2 px-4 border-2 border-white font-['Press_Start_2P']
          ${canConfirm ? 'bg-green-600 hover:bg-green-700 active:translate-y-1' : 'bg-gray-600 opacity-50 cursor-not-allowed'}
        `}
      >
        確認選擇
      </button>
    </div>
  );
};
