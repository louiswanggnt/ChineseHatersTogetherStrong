import React from 'react';
import { CharacterBlock, PartOfSpeech } from '../types';
import { TOOL_COLORS } from '../constants';

interface BlockProps {
  block: CharacterBlock;
  onClick: () => void;
  disabled?: boolean;
}

export const Block: React.FC<BlockProps> = ({ block, onClick, disabled }) => {
  // Pixel art style: No rounded corners, thick borders, boxy feel
  let baseClasses = "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-lg md:text-xl font-bold border-2 border-black cursor-pointer select-none relative shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none transition-none";
  
  // Default Style (Unselected) - Beige retro tile
  let styleClasses = "bg-[#eaddcf] text-gray-900 hover:bg-[#fff5eb]";

  // Selected Style
  if (block.selectedType) {
    // We override the color but keep the pixel structure
    styleClasses = `${TOOL_COLORS[block.selectedType]}`;
  }

  return (
    <div 
      className={`${baseClasses} ${styleClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={!disabled ? onClick : undefined}
    >
      {/* Small highlight for "plastic/shiny" pixel look */}
      <div className="absolute top-1 left-1 w-2 h-2 bg-white opacity-40 pointer-events-none"></div>
      {block.char}
    </div>
  );
};