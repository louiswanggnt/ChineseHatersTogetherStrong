
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { fetchSentences } from './services/sentenceService';
import { GameState, SentenceRow, Entity, PartOfSpeech, CharacterBlock } from './types';
import { Hero } from './components/Hero';
import { Enemy } from './components/Enemy';
import { Block } from './components/Block';
import { 
  INITIAL_HERO_HP, 
  INITIAL_ENEMY_HP, 
  TOOL_COLORS, 
  TOOL_LABELS, 
  TOOL_NAMES, 
  TOOL_KEYS, 
  DAMAGE_PER_BLOCK, 
  SENTENCE_TIME_LIMIT 
} from './constants';

const SENTENCES_PER_TURN = 3;

interface FeedbackData {
  isPerfect: boolean;
  damage: number;
  correctBlocks: CharacterBlock[];
  userBlocks: CharacterBlock[];
  timeBonus: number;
}

const generateEntityId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  // --- Game State ---
  const [gameState, setGameState] = useState<GameState>({
    status: 'START',
    score: 0,
    combo: 0,
    level: 1,
    roundProgress: 0,
    accumulatedDamage: 0,
    perfectsInRound: 0,
  });

  // --- Entities ---
  const [hero, setHero] = useState<Entity>({ currentHp: INITIAL_HERO_HP, maxHp: INITIAL_HERO_HP, isHit: false, isAttacking: false });
  // Changed to Array of Enemies
  const [enemies, setEnemies] = useState<Entity[]>([]);

  // --- Board State ---
  const [sentences, setSentences] = useState<SentenceRow[]>([]); // Current queue of 3 sentences
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<PartOfSpeech>(PartOfSpeech.Subject);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  
  // --- Timer State ---
  const [timeLeft, setTimeLeft] = useState(SENTENCE_TIME_LIMIT);

  // --- Refs ---
  const containerRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<() => void>(() => {}); // To avoid dependency cycles in interval

  // --- Game Logic ---

  const createEnemy = (hp: number): Entity => ({
    id: generateEntityId(),
    currentHp: hp,
    maxHp: hp,
    isHit: false,
    isAttacking: false,
    lastDamageTaken: null
  });

  const startGame = useCallback(async () => {
    setLoading(true);
    const newSentences = await fetchSentences(SENTENCES_PER_TURN, 'easy');
    setSentences(newSentences);
    setCurrentSentenceIdx(0);
    setLoading(false);
    setTimeLeft(SENTENCE_TIME_LIMIT);
    
    setGameState({
      status: 'PLAYING',
      score: 0,
      combo: 0,
      level: 1,
      roundProgress: 0,
      accumulatedDamage: 0,
      perfectsInRound: 0,
    });
    setHero({ currentHp: INITIAL_HERO_HP, maxHp: INITIAL_HERO_HP, isHit: false, isAttacking: false });
    setEnemies([createEnemy(INITIAL_ENEMY_HP)]);
  }, []);

  const handleNextTurn = async () => {
    // Reset round state but keep game state (HP, score, level)
    setLoading(true);
    
    // Increase difficulty?
    const difficulty = gameState.level > 3 ? 'medium' : 'easy';
    const newSentences = await fetchSentences(SENTENCES_PER_TURN, difficulty);
    
    setSentences(newSentences);
    setCurrentSentenceIdx(0);
    setGameState(prev => ({
      ...prev,
      status: 'PLAYING',
      roundProgress: 0,
      accumulatedDamage: 0,
      perfectsInRound: 0
    }));
    setLoading(false);
    setTimeLeft(SENTENCE_TIME_LIMIT);
  };

  const handleGameOver = () => {
    setGameState(prev => ({ ...prev, status: 'GAMEOVER' }));
  };

  const handleVictory = () => {
    // Level Up!
    setGameState(prev => ({ ...prev, status: 'VICTORY' }));
  };

  const startNextLevel = async () => {
     setLoading(true);
     const newSentences = await fetchSentences(SENTENCES_PER_TURN, 'easy');
     setSentences(newSentences);
     setCurrentSentenceIdx(0);
     
     // Increase Enemy Max HP for next level
     const newMaxHp = Math.floor(INITIAL_ENEMY_HP * 1.5);
     
     setEnemies([createEnemy(newMaxHp)]);
     setGameState(prev => ({
       ...prev,
       status: 'PLAYING',
       roundProgress: 0,
       accumulatedDamage: 0,
       perfectsInRound: 0,
       level: prev.level + 1
     }));
     setLoading(false);
     setTimeLeft(SENTENCE_TIME_LIMIT);
  };

  // --- Interaction Logic ---

  const handleBlockClick = (charIndex: number) => {
    if (gameState.status !== 'PLAYING') return;
    
    // Modify current sentence only
    const sentence = sentences[currentSentenceIdx];
    if (!sentence || sentence.isClearing) return;

    const newChars = [...sentence.characters];
    const block = newChars[charIndex];

    if (block.selectedType === activeTool) {
      block.selectedType = undefined;
    } else {
      block.selectedType = activeTool;
    }

    newChars[charIndex] = block;
    
    const newSentences = [...sentences];
    newSentences[currentSentenceIdx] = { ...sentence, characters: newChars };
    setSentences(newSentences);
  };

  const submitSentence = useCallback(() => {
    if (gameState.status !== 'PLAYING') return;
    
    const sentence = sentences[currentSentenceIdx];
    if (!sentence || sentence.isClearing) return;

    // Validate
    let correctCount = 0;
    let wrongCount = 0;
    let totalTargets = 0;

    // Snapshot user blocks for feedback
    const userBlocks: CharacterBlock[] = sentence.characters.map(c => ({...c}));

    // Helper to generate correct blocks for feedback
    const correctBlocks: CharacterBlock[] = sentence.characters.map(c => ({
      ...c,
      selectedType: undefined // Reset initially
    }));

    const checkType = (indices: number[], type: PartOfSpeech) => {
       totalTargets += indices.length;
       indices.forEach(idx => {
         // Update correct blocks for feedback
         if (correctBlocks[idx]) correctBlocks[idx].selectedType = type;

         const charBlock = sentence.characters.find(c => c.originalIndex === idx);
         if (charBlock?.selectedType === type) {
           correctCount++;
         } 
       });
       
       sentence.characters.forEach(c => {
          if (c.selectedType === type && !indices.includes(c.originalIndex)) {
            wrongCount++;
          }
       });
    };

    checkType(sentence.analysis.subjectIndices, PartOfSpeech.Subject);
    checkType(sentence.analysis.verbIndices, PartOfSpeech.Verb);
    checkType(sentence.analysis.objectIndices, PartOfSpeech.Object);
    checkType(sentence.analysis.helperIndices, PartOfSpeech.Helper);

    // Calculate Accuracy & Perfect Status
    const accuracy = Math.max(0, (correctCount - wrongCount) / Math.max(1, totalTargets));
    const isPerfect = (correctCount === totalTargets) && (wrongCount === 0);

    let damage = Math.floor(correctCount * DAMAGE_PER_BLOCK * (1 + accuracy));
    
    // Multipliers
    if (isPerfect) {
        damage = Math.floor(damage * 2.5); // 2.5x Multiplier for Perfect
    }

    // Time Bonus Multiplier: Max 2x (at 30s), Min 1x (at 0s)
    const currentTime = Math.max(0, timeLeft); // Ensure non-negative
    const timeMultiplier = 1 + (currentTime / SENTENCE_TIME_LIMIT);
    
    damage = Math.floor(damage * timeMultiplier);

    // Update Perfect Count for this round if perfect
    if (isPerfect) {
        setGameState(prev => ({
            ...prev,
            perfectsInRound: prev.perfectsInRound + 1
        }));
    }

    // Set feedback state
    setFeedback({
      isPerfect,
      damage,
      correctBlocks,
      userBlocks,
      timeBonus: timeMultiplier
    });

    // Change status to feedback
    setGameState(prev => ({ ...prev, status: 'FEEDBACK' }));

  }, [gameState.status, sentences, currentSentenceIdx, timeLeft]);

  // Update ref for timer interval
  useEffect(() => {
    submitRef.current = submitSentence;
  }, [submitSentence]);

  // Timer Logic
  useEffect(() => {
    if (gameState.status !== 'PLAYING' || loading) return;
    // Don't run timer if currently clearing/animating (though status check handles mostly)
    
    const timerInterval = setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 0) {
                clearInterval(timerInterval);
                submitRef.current(); // Auto-submit on timeout
                return 0;
            }
            return prev - 0.1;
        });
    }, 100);

    return () => clearInterval(timerInterval);
  }, [gameState.status, loading, currentSentenceIdx]); // Restart timer on new sentence (index change)

  // Reset timer on new sentence logic is handled by unmount/remount of effect due to currentSentenceIdx dependency
  // But we need to ensure it starts at 30.
  useEffect(() => {
     if (gameState.status === 'PLAYING' && !loading) {
         setTimeLeft(SENTENCE_TIME_LIMIT);
     }
  }, [currentSentenceIdx, loading, gameState.status]);

  const handleContinue = useCallback(() => {
    if (gameState.status !== 'FEEDBACK' || !feedback) return;

    // Visual feedback for clear (on the original sentence array for transition)
    setSentences(prev => {
        const next = [...prev];
        next[currentSentenceIdx] = { ...next[currentSentenceIdx], isClearing: true };
        return next;
    });

    // Add damage
    setGameState(prev => ({
        ...prev,
        accumulatedDamage: prev.accumulatedDamage + feedback.damage,
        roundProgress: prev.roundProgress + 1,
        status: 'PLAYING' // Temporarily back to playing for animation or immediate transition
    }));

    // --- Spawn Logic: 20% Chance ---
    if (Math.random() < 0.2) {
        setEnemies(prev => {
            const count = Math.random() < 0.5 ? 1 : 2;
            const newSpawns = [];
            for(let i=0; i<count; i++) {
                // Determine maxHp for spawned monsters (maybe based on level)
                const hp = Math.floor(INITIAL_ENEMY_HP * (1 + (gameState.level - 1) * 0.2));
                newSpawns.push(createEnemy(hp));
            }
            return [...prev, ...newSpawns];
        });
    }

    setFeedback(null);

    // Wait for clear animation then proceed
    setTimeout(() => {
        if (currentSentenceIdx + 1 >= SENTENCES_PER_TURN) {
            setGameState(prev => ({ ...prev, status: 'PLAYER_ATTACK' }));
        } else {
            setCurrentSentenceIdx(prev => prev + 1);
        }
    }, 300);

  }, [gameState.status, feedback, currentSentenceIdx, gameState.level]);

  // Effect to handle combat phases when status changes
  useEffect(() => {
      if (gameState.status === 'PLAYER_ATTACK') {
          resolveCombatPhase();
      }
  }, [gameState.status]);


  const resolveCombatPhase = () => {
      // NOTE: using functional update for values to ensure freshness
      setHero(prev => ({ ...prev, isAttacking: true }));
      setTimeout(() => setHero(prev => ({ ...prev, isAttacking: false })), 400);

      // Enemy Hit delay
      setTimeout(() => {
          setGameState(currentState => {
              const totalDamage = currentState.accumulatedDamage;
              const targetsCount = 1 + currentState.perfectsInRound;
              
              setEnemies(prevEnemies => {
                  let hitCount = 0;
                  // Target existing alive enemies
                  return prevEnemies.map(enemy => {
                      if (enemy.currentHp > 0 && hitCount < targetsCount) {
                          hitCount++;
                          const newHp = Math.max(0, enemy.currentHp - totalDamage);
                          return { 
                              ...enemy, 
                              currentHp: newHp, 
                              isHit: true,
                              lastDamageTaken: totalDamage 
                          };
                      }
                      return enemy;
                  });
              });
              
              // Return updated score
              return { ...currentState, score: currentState.score + totalDamage };
          });

          // Reset Hit Effect & Remove Dead Bodies
          setTimeout(() => {
              setEnemies(prev => {
                  // Filter out dead enemies
                  const living = prev.filter(e => e.currentHp > 0).map(e => ({
                      ...e, 
                      isHit: false, 
                      lastDamageTaken: null
                  }));
                  
                  if (living.length === 0) {
                      // Check if it was the end of level or if we just spawn next wave
                      // For now, if all enemies dead, assume victory/next level
                      handleVictory();
                  } else {
                      startEnemyTurn();
                  }
                  return living;
              });
          }, 800);
      }, 300);
  };

  const startEnemyTurn = () => {
      setGameState(prev => ({ ...prev, status: 'ENEMY_ATTACK' }));
      
      // Delay for pacing
      setTimeout(() => {
          // All enemies attack
          setEnemies(prev => prev.map(e => ({ ...e, isAttacking: true })));
          
          setTimeout(() => setEnemies(prev => prev.map(e => ({ ...e, isAttacking: false }))), 400);
          
          setTimeout(() => {
              // Calculate total damage from all enemies
              // Random 100-200 per enemy
              let totalEnemyDamage = 0;
              setEnemies(currentEnemies => {
                  currentEnemies.forEach(e => {
                      if (e.currentHp > 0) {
                          totalEnemyDamage += Math.floor(Math.random() * 101) + 100;
                      }
                  });
                  return currentEnemies;
              });

              setHero(prev => {
                  const newHp = Math.max(0, prev.currentHp - totalEnemyDamage);
                  return { ...prev, currentHp: newHp, isHit: true };
              });
              
              // Show some damage text on hero (using local var since we don't have separate Hero DamageText component yet, 
              // but we can reuse the existing damageText state if we want, though it's usually for enemy damage.
              // Let's just flash red)
              
              setTimeout(() => {
                  setHero(prev => ({ ...prev, isHit: false }));
                  
                  setHero(currentHero => {
                      if (currentHero.currentHp <= 0) {
                          handleGameOver();
                      } else {
                          handleNextTurn();
                      }
                      return currentHero;
                  });
              }, 500);
          }, 300);
      }, 500);
  };

  // --- Keyboard Listener ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.status === 'PLAYING') {
          const key = e.key.toUpperCase();
          
          if (key === TOOL_KEYS[PartOfSpeech.Subject]) setActiveTool(PartOfSpeech.Subject);
          else if (key === TOOL_KEYS[PartOfSpeech.Verb]) setActiveTool(PartOfSpeech.Verb);
          else if (key === TOOL_KEYS[PartOfSpeech.Object]) setActiveTool(PartOfSpeech.Object);
          else if (key === TOOL_KEYS[PartOfSpeech.Helper]) setActiveTool(PartOfSpeech.Helper);
          else if (key === 'ENTER') submitSentence();
      } else if (gameState.status === 'FEEDBACK') {
          // Space or Click to continue
          if (e.code === 'Space' || e.code === 'Enter') {
              handleContinue();
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.status, submitSentence, handleContinue]);


  // --- Render ---

  const renderCurrentSentence = () => {
    const sentence = sentences[currentSentenceIdx];
    if (!sentence) return null;

    if (sentence.isClearing) {
        return (
            <div className="flex flex-col items-center justify-center h-full animate-ping opacity-0">
               <div className="text-yellow-400 font-bold text-2xl">CHARGED!</div>
            </div>
        );
    }

    const timePercent = (timeLeft / SENTENCE_TIME_LIMIT) * 100;
    const timeColor = timePercent > 60 ? 'bg-green-500' : timePercent > 30 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="flex flex-col items-center gap-4 w-full h-full justify-center">
             {/* Timer Bar */}
             <div className="w-full h-4 bg-gray-700 border-2 border-black relative mb-2 max-w-sm">
                 <div 
                    className={`h-full ${timeColor} transition-all duration-100 ease-linear`}
                    style={{ width: `${timePercent}%` }}
                 />
                 <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold drop-shadow-md">
                    {Math.ceil(timeLeft)}s
                 </span>
             </div>

             <div className="flex flex-wrap justify-center gap-2 mb-4">
                 {sentence.characters.map((block, idx) => (
                     <Block 
                        key={`${sentence.id}-${idx}`} 
                        block={block} 
                        onClick={() => handleBlockClick(idx)}
                     />
                 ))}
             </div>
             
             <button 
                onClick={submitSentence}
                className="w-full max-w-sm bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 rounded-lg border-4 border-black shadow-[4px_4px_0_0_black] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2"
             >
                <span>CHARGE ATTACK (ENTER)</span>
                <span className="text-xl">⚔️</span>
             </button>
        </div>
    );
  };

  const renderFeedback = () => {
    if (!feedback) return null;
    
    const charCount = feedback.correctBlocks.length;
    // Base logic: 6 chars fits normally. >6 scales down.
    // Scale factor: If 12 chars, scale to 0.5.
    // Clamp between 0.5 and 1.
    const scale = Math.max(0.6, Math.min(1, 6 / Math.max(1, charCount)));

    return (
        <div 
          className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center cursor-pointer p-2"
          onClick={handleContinue}
        >
            <div className="w-full flex flex-col items-center space-y-4">
                
                {/* Result Header */}
                <div className="h-16 flex items-center justify-center">
                    {feedback.isPerfect ? (
                        <div className="flex flex-col items-center animate-bounce">
                            <h1 className="text-4xl font-bold italic fire-anim tracking-tighter">
                                PERFECT!
                            </h1>
                            <div className="text-yellow-300 text-xs fire-anim mt-1">
                                MULTIPLIER ACTIVE!
                            </div>
                        </div>
                    ) : (
                        <h2 className="text-2xl text-red-500 font-bold drop-shadow-[2px_2px_0_white] animate-pulse">
                            COMPLETED
                        </h2>
                    )}
                </div>

                {/* Comparison Section - Scaled Container */}
                <div className="w-full flex flex-col items-center gap-6">
                    
                    {/* User Answer */}
                    <div className="flex flex-col items-center w-full">
                        <div className="text-gray-400 text-[10px] mb-1 uppercase tracking-widest">Your Answer</div>
                        <div 
                            className="flex justify-center gap-1 transition-transform origin-center"
                            style={{ transform: `scale(${scale})` }}
                        >
                            {feedback.userBlocks.map((block, idx) => (
                                <Block 
                                    key={`user-${idx}`} 
                                    block={block} 
                                    onClick={() => {}} 
                                    disabled
                                />
                            ))}
                        </div>
                    </div>

                    {/* Correct Answer */}
                    <div className="flex flex-col items-center w-full">
                        <div className="text-green-400 text-[10px] mb-1 uppercase tracking-widest">Correct Answer</div>
                        <div 
                            className="flex justify-center gap-1 transition-transform origin-center"
                            style={{ transform: `scale(${scale})` }}
                        >
                            {feedback.correctBlocks.map((block, idx) => (
                                <Block 
                                    key={`correct-${idx}`} 
                                    block={block} 
                                    onClick={() => {}} 
                                    disabled
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Score Stats */}
                <div className="bg-gray-800 p-2 border-2 border-white text-center w-full max-w-xs mt-2">
                    <div className="flex justify-between items-center mb-1 border-b border-gray-600 pb-1">
                         <span className="text-white text-[10px]">TIME BONUS</span>
                         <span className="text-yellow-400 text-[10px]">x{feedback.timeBonus.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                         <span className="text-white text-xs">DAMAGE</span>
                         <span className="text-xl text-green-400 font-bold">+{feedback.damage}</span>
                    </div>
                </div>
                
                <div className="text-gray-500 text-[10px] animate-pulse">
                   Tap to Continue
                </div>
            </div>
        </div>
    );
  };

  return (
    <div 
        ref={containerRef}
        className="flex flex-col h-screen max-w-md mx-auto bg-gray-900 overflow-hidden relative shadow-2xl font-['Press_Start_2P']"
    >
      {/* Top Bar: Sky/Battle Area */}
      <div className="h-2/5 bg-sky-300 relative overflow-hidden border-b-4 border-black shrink-0">
        {/* Pixel Clouds */}
        <div className="absolute top-4 left-4 w-16 h-8 bg-white opacity-80 border-2 border-black/10"></div>
        <div className="absolute top-10 right-10 w-24 h-6 bg-white opacity-80 border-2 border-black/10"></div>
        
        {/* Ground */}
        <div className="absolute bottom-0 w-full h-8 bg-green-600 border-t-4 border-black">
             <div className="absolute top-0 left-10 w-2 h-2 bg-green-800"></div>
             <div className="absolute top-2 right-20 w-4 h-2 bg-green-800"></div>
        </div>

        {/* Characters */}
        <div className="absolute bottom-6 left-4 z-10">
          <Hero {...hero} hp={hero.currentHp} />
        </div>
        
        {/* Enemies Container */}
        <div className="absolute bottom-6 right-2 z-10 flex gap-2 items-end justify-end max-w-[200px] flex-wrap-reverse">
          {enemies.map((enemy) => (
             <div key={enemy.id} className="relative transform scale-75 origin-bottom">
                 <Enemy 
                    {...enemy} 
                    hp={enemy.currentHp}
                    damageText={enemy.lastDamageTaken || null} 
                 />
             </div>
          ))}
        </div>
        
        {/* Level Indicator */}
        <div className="absolute top-4 left-4 z-20 bg-black/50 p-2 border-2 border-white/50 text-white text-[10px]">
             LVL {gameState.level}
        </div>

        {/* Score */}
        <div className="absolute top-4 right-4 z-20 text-right">
             <div className="text-yellow-400 text-[10px] drop-shadow-[1px_1px_0_black]">SCORE</div>
             <div className="text-white text-sm drop-shadow-[1px_1px_0_black]">{gameState.score}</div>
             <div className="text-green-300 text-[8px] mt-1">TARGETS: {1 + gameState.perfectsInRound}</div>
        </div>
      </div>

      {/* Middle: Analysis/Interaction Area */}
      <div className="flex-1 bg-[#2a2320] relative flex flex-col items-center justify-center p-4 border-x-4 border-black min-h-0">
         {/* Background Pattern */}
         <div className="absolute inset-0 z-0 opacity-10" 
              style={{backgroundImage: 'radial-gradient(#5c4d46 2px, transparent 2px)', backgroundSize: '20px 20px'}}>
         </div>
         
         {/* Main Content Switcher */}
         <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
             
             {gameState.status === 'START' && (
                 <div className="text-center">
                     <h1 className="text-2xl text-yellow-400 mb-8 leading-relaxed shadow-[4px_4px_0_0_#b91c1c] p-2 bg-red-600 border-4 border-white">
                         WORD<br/>WARRIOR
                     </h1>
                     <button 
                        onClick={startGame}
                        className="bg-blue-600 text-white text-sm py-4 px-6 border-4 border-white shadow-[4px_4px_0_0_black] active:translate-y-1 active:shadow-none"
                     >
                        {loading ? 'LOADING...' : 'START GAME'}
                     </button>
                 </div>
             )}

             {gameState.status === 'PLAYING' && !loading && (
                 <>
                    {/* Charge Indicator */}
                    <div className="absolute top-0 left-0 w-full mb-4 flex items-center gap-2">
                        <div className="text-[10px] text-gray-400">CHARGE:</div>
                        <div className="flex-1 h-4 bg-black border-2 border-gray-600 p-0.5 flex gap-1">
                            {[0, 1, 2].map(i => (
                                <div key={i} className={`flex-1 ${i < gameState.roundProgress ? 'bg-yellow-400' : 'bg-gray-800'}`}></div>
                            ))}
                        </div>
                        <div className="text-[10px] text-yellow-400">ATK {gameState.accumulatedDamage}</div>
                    </div>
                    
                    {/* Sentence Area */}
                    {renderCurrentSentence()}
                    
                    <div className="absolute bottom-0 text-center text-gray-500 text-[10px]">
                        Keys: A(Sub) S(Verb) D(Obj) F(Help) | ENTER(Charge)
                    </div>
                 </>
             )}

             {gameState.status === 'FEEDBACK' && renderFeedback()}

             {gameState.status === 'PLAYER_ATTACK' && (
                 <div className="text-2xl text-yellow-400 animate-pulse">ATTACKING!</div>
             )}

             {gameState.status === 'ENEMY_ATTACK' && (
                 <div className="text-2xl text-red-500 animate-pulse">DEFEND!</div>
             )}

             {gameState.status === 'VICTORY' && (
                 <div className="text-center bg-black/80 p-6 border-4 border-yellow-400">
                     <h2 className="text-yellow-400 text-xl mb-4">VICTORY!</h2>
                     <p className="text-white text-xs mb-4">EXP GAINED!</p>
                     <button 
                        onClick={startNextLevel}
                        className="bg-green-600 text-white text-xs py-3 px-4 border-2 border-white shadow-[2px_2px_0_0_black] active:translate-y-1"
                     >
                        NEXT LEVEL
                     </button>
                 </div>
             )}

             {gameState.status === 'GAMEOVER' && (
                 <div className="text-center bg-black/80 p-6 border-4 border-red-500">
                     <h2 className="text-red-500 text-xl mb-4">DEFEAT</h2>
                     <button 
                        onClick={startGame}
                        className="bg-gray-600 text-white text-xs py-3 px-4 border-2 border-white shadow-[2px_2px_0_0_black] active:translate-y-1"
                     >
                        RETRY
                     </button>
                 </div>
             )}

             {loading && gameState.status !== 'START' && (
                 <div className="text-white animate-pulse">SUMMONING WORDS...</div>
             )}

         </div>
      </div>

      {/* Bottom: Control Panel */}
      <div className="h-28 bg-[#1a1a1a] border-t-4 border-black p-2 grid grid-cols-4 gap-2 shrink-0">
         {Object.values(PartOfSpeech).map((pos) => (
             <button
                key={pos}
                onClick={() => setActiveTool(pos)}
                disabled={gameState.status !== 'PLAYING'}
                className={`
                    flex flex-col items-center justify-center
                    border-4 transition-none relative
                    ${activeTool === pos 
                        ? 'border-white bg-gray-700 translate-y-1' 
                        : 'border-black shadow-[0_4px_0_0_black] -translate-y-1 opacity-90'
                    }
                    ${TOOL_COLORS[pos]}
                `}
             >
                 {/* Hotkey Indicator */}
                 <div className="absolute top-1 right-1 bg-black/40 px-1 text-[8px] rounded border border-white/20">
                    {TOOL_KEYS[pos]}
                 </div>
                 
                 <span className="text-xl mb-1">{TOOL_LABELS[pos]}</span>
                 <span className="text-[8px] uppercase tracking-widest">{TOOL_NAMES[pos]}</span>
             </button>
         ))}
      </div>
    </div>
  );
};

export default App;
