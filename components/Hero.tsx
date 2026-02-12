
import React, { useState } from 'react';
import { HERO_SPRITES } from '../constants/spritePaths';

interface HeroProps {
  isAttacking: boolean;
  hp: number;
  maxHp: number;
}

const FALLBACK_PIXEL_HERO = (
  <div className="w-full h-full relative">
    <div className="absolute top-2 left-6 w-12 h-10 bg-gray-300 border-4 border-black z-20">
      <div className="absolute top-3 left-2 w-8 h-2 bg-black"></div>
      <div className="absolute -top-4 left-4 w-4 h-4 bg-red-600 border-2 border-black"></div>
      <div className="absolute -top-6 left-6 w-4 h-4 bg-red-600 border-2 border-black"></div>
    </div>
    <div className="absolute top-12 left-8 w-8 h-8 bg-blue-800 border-4 border-black z-10">
      <div className="absolute bottom-0 w-full h-2 bg-yellow-500"></div>
    </div>
    <div className="absolute top-14 left-2 w-10 h-10 bg-blue-600 border-4 border-white outline outline-4 outline-black z-30">
      <div className="absolute top-2 left-2 w-2 h-2 bg-white"></div>
      <div className="absolute bottom-2 right-2 w-2 h-2 bg-white"></div>
    </div>
    <div className="absolute top-20 left-8 w-3 h-4 bg-black"></div>
    <div className="absolute top-20 left-13 w-3 h-4 bg-black"></div>
  </div>
);

export const Hero: React.FC<HeroProps> = ({ isAttacking, hp, maxHp }) => {
  const [imgError, setImgError] = useState(false);
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const spriteSrc = isAttacking ? HERO_SPRITES.attack : HERO_SPRITES.idle;

  return (
    <div className={`relative w-24 h-24 transition-transform duration-100 step-end ${isAttacking ? 'translate-x-12' : ''}`}>
       <div className="absolute -top-8 -left-4 w-32 h-5 bg-gray-800 border-2 border-black p-0.5 z-20">
        <div 
          className="h-full bg-green-500 transition-all duration-300 ease-out"
          style={{ width: `${hpPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-['Press_Start_2P'] drop-shadow-[1px_1px_0_black]">
           HP {hp}/{maxHp}
        </div>
      </div>

      <div className="w-full h-full relative">
        {!imgError ? (
          <img
            src={spriteSrc}
            alt="hero"
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          FALLBACK_PIXEL_HERO
        )}
      </div>
    </div>
  );
};
