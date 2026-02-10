
import React from 'react';

interface HeroProps {
  isAttacking: boolean;
  hp: number;
  maxHp: number;
}

export const Hero: React.FC<HeroProps> = ({ isAttacking, hp, maxHp }) => {
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  return (
    <div className={`relative w-24 h-24 transition-transform duration-100 step-end ${isAttacking ? 'translate-x-12' : ''}`}>
       {/* Retro HP Bar */}
       <div className="absolute -top-8 -left-4 w-32 h-5 bg-gray-800 border-2 border-black p-0.5 z-20">
        <div 
          className="h-full bg-green-500 transition-all duration-300 ease-out"
          style={{ width: `${hpPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-['Press_Start_2P'] drop-shadow-[1px_1px_0_black]">
           HP {hp}/{maxHp}
        </div>
      </div>

      {/* Hero Pixel Sprite (Constructed with divs) */}
      <div className="w-full h-full relative">
        
        {/* Helmet/Head */}
        <div className="absolute top-2 left-6 w-12 h-10 bg-gray-300 border-4 border-black z-20">
             {/* Eye Slit */}
             <div className="absolute top-3 left-2 w-8 h-2 bg-black"></div>
             {/* Red Plume (Pixels) */}
             <div className="absolute -top-4 left-4 w-4 h-4 bg-red-600 border-2 border-black"></div>
             <div className="absolute -top-6 left-6 w-4 h-4 bg-red-600 border-2 border-black"></div>
        </div>
        
        {/* Body/Armor */}
        <div className="absolute top-12 left-8 w-8 h-8 bg-blue-800 border-4 border-black z-10">
             {/* Gold Belt */}
             <div className="absolute bottom-0 w-full h-2 bg-yellow-500"></div>
        </div>

        {/* Shield (Blocky) */}
        <div className="absolute top-14 left-2 w-10 h-10 bg-blue-600 border-4 border-white outline outline-4 outline-black z-30">
             <div className="absolute top-2 left-2 w-2 h-2 bg-white"></div>
             <div className="absolute bottom-2 right-2 w-2 h-2 bg-white"></div>
        </div>

        {/* Weapon (Pixel Sword) */}
        <div className={`absolute top-6 right-0 w-4 h-16 origin-bottom-left transition-transform duration-75 z-20 ${isAttacking ? 'rotate-90' : 'rotate-0'}`}>
            {/* Hilt */}
            <div className="absolute bottom-0 left-0 w-4 h-4 bg-yellow-600 border-2 border-black"></div>
            {/* Guard */}
            <div className="absolute bottom-4 -left-2 w-8 h-2 bg-gray-400 border-2 border-black"></div>
            {/* Blade */}
            <div className="absolute bottom-6 left-0 w-4 h-10 bg-gray-200 border-2 border-black"></div>
        </div>

        {/* Legs */}
        <div className="absolute top-20 left-8 w-3 h-4 bg-black"></div>
        <div className="absolute top-20 left-13 w-3 h-4 bg-black"></div>
      </div>
    </div>
  );
};
