
import React from 'react';

interface EnemyProps {
  isHit: boolean;
  isAttacking: boolean;
  hp: number;
  maxHp: number;
  damageText: number | null;
}

export const Enemy: React.FC<EnemyProps> = ({ isHit, isAttacking, hp, maxHp, damageText }) => {
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  return (
    <div className={`relative w-32 h-32 transition-transform duration-100 ${isAttacking ? '-translate-x-4' : ''}`}>
      {/* Retro HP Bar */}
      <div className="absolute -top-10 left-0 w-full h-5 bg-gray-900 border-2 border-black p-0.5 z-30">
        <div 
          className="h-full bg-red-600 transition-all duration-300 ease-out"
          style={{ width: `${hpPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-['Press_Start_2P'] drop-shadow-[1px_1px_0_black]">
           HP {hp}/{maxHp}
        </div>
      </div>

      {/* Damage Text Pop-up (Pixel Font) */}
      {damageText && (
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 text-xl text-white bg-red-600 px-2 py-1 border-2 border-white animate-bounce z-50 shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-['Press_Start_2P']">
          -{damageText}
        </div>
      )}

      {/* Slash Effect overlay */}
      {isHit && (
         <div className="absolute inset-0 flex items-center justify-center z-40 slash-effect">
            <div className="w-full h-4 bg-white rotate-45 border-y-4 border-gray-300"></div>
         </div>
      )}

      {/* Pixel Slime Sprite */}
      <div className={`w-full h-full relative ${isHit ? 'shake-animation grayscale brightness-150' : 'float-animation'}`}>
        
        {/* Main Body Blocks (Stepped Pyramid) */}
        
        {/* Bottom Layer */}
        <div className="absolute bottom-0 left-2 right-2 h-8 bg-green-500 border-x-4 border-b-4 border-black"></div>
        
        {/* Middle Layer */}
        <div className="absolute bottom-8 left-4 right-4 h-12 bg-green-500 border-x-4 border-black"></div>
        
        {/* Top Layer */}
        <div className="absolute bottom-20 left-8 right-8 h-4 bg-green-500 border-x-4 border-t-4 border-black"></div>

        {/* Highlights (Shine) */}
        <div className="absolute bottom-16 left-6 w-4 h-4 bg-white opacity-60"></div>

        {/* Eyes */}
        <div className="absolute bottom-12 left-8 w-4 h-4 bg-black"></div>
        <div className="absolute bottom-12 right-8 w-4 h-4 bg-black"></div>

        {/* Mouth (Pixel) */}
        <div className="absolute bottom-6 left-12 right-12 h-2 bg-black opacity-60"></div>
        
        {/* Slime Drippings (Decoration) */}
        <div className="absolute -bottom-2 left-4 w-4 h-4 bg-green-600 border-2 border-black"></div>
        <div className="absolute -bottom-2 right-6 w-4 h-4 bg-green-600 border-2 border-black"></div>

      </div>
    </div>
  );
};
