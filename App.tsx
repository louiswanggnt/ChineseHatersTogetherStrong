
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { fetchSentences, fetchQuestionsByCards } from './services/sentenceService';
import { GameState, SentenceRow, Entity, PartOfSpeech, CharacterBlock, Card, CardResult, CardType, EnemyIntent, MapState, MapNodeType } from './types';
import { Hero } from './components/Hero';
import { Enemy } from './components/Enemy';
import { Block } from './components/Block';
import { Hand } from './components/Hand';
import { MapView } from './components/MapView';
import { CardSelection } from './components/CardSelection';
import { initializeDeck, shuffleDeck, drawCardsWithReshuffle } from './services/deckService';
import { updateQuestionStats } from './services/statsService';
import { generateFloorMap, generateEncounter, moveToNode, completeNode } from './services/mapService';
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

const SENTENCES_PER_TURN = 5;

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

  // --- Deck System ---
  const [deck, setDeck] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [cardResults, setCardResults] = useState<CardResult[]>([]);
  
  // --- Card Selection System ---
  const [availableCards, setAvailableCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);

  // --- Map System ---
  const [mapState, setMapState] = useState<MapState | null>(null);

  // --- Board State ---
  const [sentences, setSentences] = useState<SentenceRow[]>([]); // Current queue of 3 sentences
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<PartOfSpeech>(PartOfSpeech.Subject);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  
  // --- Timer State ---
  const [timeLeft, setTimeLeft] = useState(SENTENCE_TIME_LIMIT);
  const [previousStatus, setPreviousStatus] = useState<GameState['status'] | null>(null);

  // --- Refs ---
  const containerRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<() => void>(() => {}); // To avoid dependency cycles in interval

  // --- Game Logic ---

  const createEnemy = (hp: number, enemyType: string = 'slime'): Entity => ({
    id: generateEntityId(),
    currentHp: hp,
    maxHp: hp,
    isHit: false,
    isAttacking: false,
    lastDamageTaken: null,
    intent: EnemyIntent.UNKNOWN,
    enemyType,
  });

  // 計算敵人意圖
  const calculateEnemyIntent = (enemy: Entity): { intent: EnemyIntent; intentValue: number } => {
    const rand = Math.random();
    
    // 70% 攻擊, 20% 防禦, 10% 施法
    if (rand < 0.7) {
      const damage = Math.floor(Math.random() * 101) + 100; // 100-200
      return { intent: EnemyIntent.ATTACK, intentValue: damage };
    } else if (rand < 0.9) {
      const block = Math.floor(Math.random() * 51) + 50; // 50-100
      return { intent: EnemyIntent.DEFEND, intentValue: block };
    } else {
      const castValue = Math.floor(Math.random() * 51) + 30; // 30-80
      return { intent: EnemyIntent.CAST, intentValue: castValue };
    }
  };

  // 為所有敵人設定意圖
  const setEnemiesIntent = () => {
    setEnemies(prev => prev.map(enemy => {
      if (enemy.currentHp > 0) {
        const { intent, intentValue } = calculateEnemyIntent(enemy);
        return { ...enemy, intent, intentValue };
      }
      return enemy;
    }));
  };

  const startGame = useCallback(async () => {
    // 初始化遊戲狀態
    setGameState({
      status: 'MAP',
      score: 0,
      combo: 0,
      level: 1,
      roundProgress: 0,
      accumulatedDamage: 0,
      perfectsInRound: 0,
    });
    
    // 初始化英雄
    setHero({ currentHp: INITIAL_HERO_HP, maxHp: INITIAL_HERO_HP, isHit: false, isAttacking: false });
    
    // 生成第一層地圖
    const newMap = generateFloorMap(1);
    setMapState(newMap);
  }, []);

  // 進入戰鬥節點
  const startBattle = useCallback(async (nodeId: string) => {
    if (!mapState) return;
    
    setLoading(true);
    
    // 移動到該節點
    const updatedMap = moveToNode(mapState, nodeId);
    setMapState(updatedMap);
    
    // 取得節點資訊
    const node = updatedMap.nodes.find(n => n.id === nodeId);
    if (!node) {
      setLoading(false);
      return;
    }
    
    // 生成敵人（根據節點類型）
    const encounter = generateEncounter(node.type, updatedMap.floor);
    if (encounter) {
      const enemyCount = encounter.enemyCount;
      const enemyHp = INITIAL_ENEMY_HP + (updatedMap.floor - 1) * 50; // 樓層越高血量越多
      const type = encounter.enemyTypes[0] || 'slime';
      setEnemies(Array.from({ length: enemyCount }, () => createEnemy(enemyHp, type)));
    } else {
      // 非戰鬥節點（寶藏、商店、休息等）暫時跳過
      const completedMap = completeNode(updatedMap, nodeId);
      setMapState(completedMap);
      setGameState(prev => ({ ...prev, status: 'MAP' }));
      setLoading(false);
      return;
    }
    
    // 初始化牌庫
    const initialDeck = initializeDeck();
    const shuffledDeck = shuffleDeck(initialDeck);
    
    // 抽 8 張供選擇
    const [drawnCards, remainingDeck, newDiscardPile] = drawCardsWithReshuffle(shuffledDeck, [], 8);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/719fb5fc-5553-4fc1-863a-2b62e502ec55',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:172',message:'startBattle deck initialization',data:{initialDeckSize:initialDeck.length,drawnForSelection:drawnCards.length,remainingDeckSize:remainingDeck.length},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    
    setDeck(remainingDeck);
    setDiscardPile(newDiscardPile);
    setAvailableCards(drawnCards);
    setSelectedCards([]);
    setCardResults([]);
    
    setLoading(false);
    setGameState(prev => ({ ...prev, status: 'CARD_SELECTION' }));
    
    // 設定敵人意圖
    setTimeout(() => setEnemiesIntent(), 100);
  }, [mapState]);

  const handleNextTurn = useCallback(() => {
    // 將本回合使用的 5 張手牌放入棄牌堆
    const discardWithHand = [...discardPile, ...hand];
    
    // 抽 8 張供選擇（不足 8 張時會抽盡牌庫+洗牌補足）
    const [drawnCards, remainingDeck, newDiscardPile] = drawCardsWithReshuffle(deck, discardWithHand, 8);
    
    // 若一張都沒抽到（牌庫+棄牌皆空），防呆：直接勝利
    if (drawnCards.length === 0) {
      handleVictory();
      return;
    }
    
    setDeck(remainingDeck);
    setDiscardPile(newDiscardPile);
    setAvailableCards(drawnCards);
    setSelectedCards([]);
    setCardResults([]);
    setGameState(prev => ({
      ...prev,
      status: 'CARD_SELECTION',
      roundProgress: 0,
      accumulatedDamage: 0,
      perfectsInRound: 0,
    }));
  }, [deck, discardPile, hand]);

  const handleGameOver = () => {
    setGameState(prev => ({ ...prev, status: 'GAMEOVER' }));
  };

  const handleVictory = () => {
    if (!mapState) {
      setGameState(prev => ({ ...prev, status: 'VICTORY' }));
      return;
    }
    
    // 標記當前節點為已完成
    const completedMap = completeNode(mapState, mapState.currentNodeId);
    
    // 檢查是否為 BOSS 節點
    const currentNode = completedMap.nodes.find(n => n.id === mapState.currentNodeId);
    
    if (currentNode?.type === MapNodeType.BOSS) {
      // BOSS 戰勝利 → 前往下一層
      const nextFloor = completedMap.floor + 1;
      const newMap = generateFloorMap(nextFloor);
      setMapState(newMap);
      setGameState(prev => ({ ...prev, level: nextFloor, status: 'MAP' }));
    } else {
      // 一般戰鬥勝利 → 回到地圖
      setMapState(completedMap);
      setGameState(prev => ({ ...prev, status: 'MAP' }));
    }
  };

  const handlePause = () => {
    if (gameState.status === 'PLAYING' || gameState.status === 'FEEDBACK') {
      setPreviousStatus(gameState.status);
      setGameState(prev => ({ ...prev, status: 'PAUSED' }));
    }
  };

  const handleResume = () => {
    if (gameState.status === 'PAUSED' && previousStatus) {
      setGameState(prev => ({ ...prev, status: previousStatus }));
      setPreviousStatus(null);
    }
  };

  const handleQuitToMenu = () => {
    setGameState({
      status: 'START',
      score: 0,
      combo: 0,
      level: 1,
      roundProgress: 0,
      accumulatedDamage: 0,
      perfectsInRound: 0,
    });
    setPreviousStatus(null);
  };

  // 卡牌選擇處理
  const handleCardClick = (card: Card) => {
    setSelectedCards(prev => {
      const isSelected = prev.some(c => c.id === card.id);
      if (isSelected) {
        // 取消選擇
        return prev.filter(c => c.id !== card.id);
      } else if (prev.length < 5) {
        // 選擇卡牌（最多5張）
        return [...prev, card];
      }
      return prev;
    });
  };

  const handleCardSelectionConfirm = async () => {
    if (selectedCards.length < 1) return;
    
    setLoading(true);
    
    // 設定手牌（可能 1~5 張）
    setHand(selectedCards);
    
    // 將未選擇的卡放入棄牌堆
    const unselectedCards = availableCards.filter(c => !selectedCards.some(sc => sc.id === c.id));
    setDiscardPile(prev => [...prev, ...unselectedCards]);
    
    // 生成題目（依據手牌數量，可能不足 5 題）
    const newSentences = await fetchQuestionsByCards(selectedCards);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/719fb5fc-5553-4fc1-863a-2b62e502ec55',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:confirm',message:'Card selection confirmed',data:{selectedCount:selectedCards.length,sentenceCount:newSentences.length},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    setSentences(newSentences);
    setCurrentSentenceIdx(0);
    
    const firstCardTimeLimit = newSentences[0]?.timeLimit || SENTENCE_TIME_LIMIT;
    setTimeLeft(firstCardTimeLimit);
    
    setLoading(false);
    setGameState(prev => ({ ...prev, status: 'PLAYING' }));
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

    // Get the corresponding card
    const currentCard = hand[currentSentenceIdx];
    if (!currentCard) return;

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

    // 更新題目統計（自適應出題）
    updateQuestionStats(sentence.id, isPerfect);

    // Time Bonus Multiplier
    const currentTimeLimit = sentence.timeLimit || SENTENCE_TIME_LIMIT;
    const currentTime = Math.max(0, timeLeft);
    const timeMultiplier = 1 + (currentTime / currentTimeLimit);

    // Create CardResult based on card type
    const cardResult: CardResult = {
      cardId: currentCard.id,
      cardType: currentCard.type,
      timeMultiplier,
    };

    let damage = 0;

    if (currentCard.type === CardType.ATTACK) {
      // 攻擊牌計算
      const baseAttack = currentCard.baseAttack || 0;
      const attackPower = Math.floor(baseAttack * accuracy);
      const attackCount = (currentCard.attackCount || 1) + (isPerfect ? 1 : 0);
      
      cardResult.attack = attackPower;
      cardResult.attackCount = attackCount;
      
      damage = attackPower; // For display
    } else if (currentCard.type === CardType.DEFENSE) {
      // 防禦牌計算
      const baseBlock = currentCard.baseBlock || 0;
      const blockPower = Math.floor(baseBlock * accuracy);
      const hpConversion = (currentCard.hpConversionRate || 0) + (isPerfect ? 0.01 : 0);
      
      cardResult.block = blockPower;
      cardResult.hpConversion = hpConversion;
      
      damage = blockPower; // For display
    }

    // Store card result
    setCardResults(prev => [...prev, cardResult]);

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

  }, [gameState.status, sentences, currentSentenceIdx, timeLeft, hand]);

  // Update ref for timer interval
  useEffect(() => {
    submitRef.current = submitSentence;
  }, [submitSentence]);

  // Timer Logic
  useEffect(() => {
    if (gameState.status !== 'PLAYING' || loading || gameState.status === 'PAUSED') return;
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
  // Use sentence's timeLimit if available
  useEffect(() => {
     if (gameState.status === 'PLAYING' && !loading) {
         const currentSentence = sentences[currentSentenceIdx];
         const limit = currentSentence?.timeLimit || SENTENCE_TIME_LIMIT;
         setTimeLeft(limit);
     }
  }, [currentSentenceIdx, loading, gameState.status, sentences]);

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
        // 完成所有可用題目即進入戰鬥結算（手牌不足5張時依實際題數結束）
        const isLastQuestion = currentSentenceIdx + 1 >= sentences.length;
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/719fb5fc-5553-4fc1-863a-2b62e502ec55',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:518',message:'handleContinue check',data:{currentIdx:currentSentenceIdx,sentencesLength:sentences.length,isLastQuestion,nextAction:isLastQuestion?'PLAYER_ATTACK':'nextQuestion'},timestamp:Date.now(),hypothesisId:'H3,H5'})}).catch(()=>{});
        // #endregion
        if (isLastQuestion) {
            setGameState(prev => ({ ...prev, status: 'PLAYER_ATTACK' }));
        } else {
            setCurrentSentenceIdx(prev => prev + 1);
        }
    }, 300);

  }, [gameState.status, feedback, currentSentenceIdx, gameState.level, sentences.length]);

  // Effect to handle combat phases when status changes
  useEffect(() => {
      if (gameState.status === 'PLAYER_ATTACK') {
          resolveCombatPhase();
      }
  }, [gameState.status]);


  const resolveCombatPhase = () => {
      // Phase 9: Balatro 式加總乘法結算
      const attackResults = cardResults.filter(r => r.cardType === CardType.ATTACK);
      const defenseResults = cardResults.filter(r => r.cardType === CardType.DEFENSE);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/719fb5fc-5553-4fc1-863a-2b62e502ec55',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:537',message:'resolveCombatPhase start',data:{totalCardResults:cardResults.length,attackCount:attackResults.length,defenseCount:defenseResults.length},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      
      // === 攻擊牌 Balatro 式結算 ===
      // 步驟 1: 加總所有攻擊力
      const totalBaseAttack = attackResults.reduce((sum, r) => sum + (r.attack || 0), 0);
      
      // 步驟 2: 加總所有時間倍率
      const totalTimeMultiplier = attackResults.reduce((sum, r) => sum + (r.timeMultiplier || 1), 0);
      
      // 步驟 3: 相乘得到最終攻擊力
      const totalAttack = Math.floor(totalBaseAttack * totalTimeMultiplier);
      
      // 攻擊次數：直接加總
      const totalAttackCount = attackResults.reduce((sum, r) => sum + (r.attackCount || 0), 0);
      
      // === 防禦牌 Balatro 式結算 ===
      // 步驟 1: 加總所有防禦力
      const totalBaseBlock = defenseResults.reduce((sum, r) => sum + (r.block || 0), 0);
      
      // 步驟 2: 加總所有時間倍率
      const totalDefenseTimeMultiplier = defenseResults.reduce((sum, r) => sum + (r.timeMultiplier || 1), 0);
      
      // 步驟 3: 相乘得到最終防禦力
      const totalBlock = Math.floor(totalBaseBlock * totalDefenseTimeMultiplier);
      
      // 生命轉化率：直接加總
      const totalHpConversion = defenseResults.reduce((sum, r) => sum + (r.hpConversion || 0), 0);
      
      // 套用防禦（護盾）
      setHero(prev => ({ ...prev, block: (prev.block || 0) + totalBlock }));
      
      // 生命轉化
      if (totalHpConversion > 0) {
        const hpGain = Math.floor(totalBlock * totalHpConversion);
        setHero(prev => ({
          ...prev,
          currentHp: Math.min(prev.currentHp + hpGain, prev.maxHp)
        }));
      }
      
      // 只在有攻擊力時才攻擊
      const finalDamage = Math.floor(totalAttack);
      const targetsCount = Math.min(totalAttackCount, 10);
      
      if (finalDamage > 0 && targetsCount > 0) {
        // 攻擊動畫
        setHero(prev => ({ ...prev, isAttacking: true }));
        setTimeout(() => setHero(prev => ({ ...prev, isAttacking: false })), 400);

        // Enemy Hit delay
        setTimeout(() => {
            setGameState(currentState => {
                setEnemies(prevEnemies => {
                    let remainingAttacks = targetsCount;
                    let currentEnemyIdx = 0;
                    const updatedEnemies = [...prevEnemies];
                    
                    // 連續攻擊邏輯
                    while (remainingAttacks > 0 && currentEnemyIdx < updatedEnemies.length) {
                      const enemy = updatedEnemies[currentEnemyIdx];
                      if (enemy.currentHp > 0) {
                        const newHp = Math.max(0, enemy.currentHp - finalDamage);
                        updatedEnemies[currentEnemyIdx] = {
                          ...enemy,
                          currentHp: newHp,
                          isHit: true,
                          lastDamageTaken: finalDamage
                        };
                        remainingAttacks--;
                        
                        // 如果敵人死亡，轉往下一隻
                        if (newHp <= 0) {
                          currentEnemyIdx++;
                        }
                      } else {
                        currentEnemyIdx++;
                      }
                    }
                    
                    return updatedEnemies;
                });
                
                // Return updated score
                return { ...currentState, score: currentState.score + finalDamage };
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
                        handleVictory();
                    } else {
                        startEnemyTurn();
                    }
                    return living;
                });
            }, 800);
        }, 300);
      } else {
        // 沒有造成傷害，直接進入敵人回合
        setTimeout(() => {
          startEnemyTurn();
        }, 500);
      }
  };

  const startEnemyTurn = () => {
      setGameState(prev => ({ ...prev, status: 'ENEMY_ATTACK' }));
      
      // Delay for pacing
      setTimeout(() => {
          // 依意圖執行不同行動
          let totalEnemyDamage = 0;
          
          setEnemies(prev => prev.map(e => {
              if (e.currentHp <= 0) return e;
              
              const intent = e.intent || EnemyIntent.ATTACK;
              const intentValue = e.intentValue || 0;
              
              if (intent === EnemyIntent.ATTACK) {
                  // 攻擊：累積傷害
                  totalEnemyDamage += intentValue;
                  return { ...e, isAttacking: true };
              } else if (intent === EnemyIntent.DEFEND) {
                  // 防禦：為自己加護盾
                  return { ...e, block: (e.block || 0) + intentValue };
              } else if (intent === EnemyIntent.CAST) {
                  // 施法：多段傷害（簡化版：2倍傷害）
                  totalEnemyDamage += intentValue * 2;
                  return { ...e, isAttacking: true };
              }
              
              return e;
          }));
          
          setTimeout(() => setEnemies(prev => prev.map(e => ({ ...e, isAttacking: false }))), 400);
          
          setTimeout(() => {
              // 對英雄造成傷害（先扣護盾）
              setHero(prev => {
                  const currentBlock = prev.block || 0;
                  const remainingDamage = Math.max(0, totalEnemyDamage - currentBlock);
                  const newHp = Math.max(0, prev.currentHp - remainingDamage);
                  return { 
                      ...prev, 
                      currentHp: newHp, 
                      isHit: remainingDamage > 0,
                      block: Math.max(0, currentBlock - totalEnemyDamage) // 護盾扣除
                  };
              });
              
              setTimeout(() => {
                  setHero(prev => ({ ...prev, isHit: false }));
                  
                  setHero(currentHero => {
                      if (currentHero.currentHp <= 0) {
                          handleGameOver();
                      } else {
                          // 為下回合設定新意圖
                          setEnemiesIntent();
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

    const currentTimeLimit = sentence.timeLimit || SENTENCE_TIME_LIMIT;
    const timePercent = (timeLeft / currentTimeLimit) * 100;
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
                    intent={enemy.intent}
                    intentValue={enemy.intentValue}
                    enemyType={enemy.enemyType}
                 />
             </div>
          ))}
        </div>
        
        {/* Level Indicator */}
        <div className="absolute top-4 left-4 z-20 bg-black/50 p-2 border-2 border-white/50 text-white text-[10px]">
             LVL {gameState.level}
        </div>

        {/* Score & Pause Button */}
        <div className="absolute top-4 right-4 z-20 flex items-start gap-2">
             <div className="text-right">
                 <div className="text-yellow-400 text-[10px] drop-shadow-[1px_1px_0_black]">SCORE</div>
                 <div className="text-white text-sm drop-shadow-[1px_1px_0_black]">{gameState.score}</div>
                 <div className="text-green-300 text-[8px] mt-1">TARGETS: {1 + gameState.perfectsInRound}</div>
             </div>
             {(gameState.status === 'PLAYING' || gameState.status === 'FEEDBACK') && (
                 <button
                    onClick={handlePause}
                    className="bg-gray-700/80 hover:bg-gray-600 text-white text-[8px] px-2 py-1 border-2 border-white/50 shadow-[2px_2px_0_0_black] active:translate-y-0.5"
                 >
                    ⏸
                 </button>
             )}
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

             {gameState.status === 'MAP' && mapState && (
                 <MapView mapState={mapState} onNodeClick={startBattle} />
             )}

             {gameState.status === 'CARD_SELECTION' && (
                 <CardSelection
                   availableCards={availableCards}
                   selectedCards={selectedCards}
                   onCardClick={handleCardClick}
                   onConfirm={handleCardSelectionConfirm}
                 />
             )}

             {gameState.status === 'PLAYING' && !loading && (
                 <>
                    {/* Charge Indicator - 移到最上面 */}
                    <div className="absolute top-0 left-0 w-full flex items-center gap-2 px-2 bg-black/30 py-1">
                        <div className="text-[10px] text-gray-400">CHARGE:</div>
                        <div className="flex-1 h-3 bg-black border-2 border-gray-600 p-0.5 flex gap-1">
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} className={`flex-1 ${i < gameState.roundProgress ? 'bg-yellow-400' : 'bg-gray-800'}`}></div>
                            ))}
                        </div>
                    </div>
                    
                    {/* ATK Balatro 顯示 - CHARGE 下方 */}
                    <div className="absolute top-8 left-0 w-full flex items-center justify-center gap-1 px-2">
                        <span className="text-yellow-400 text-[10px]">ATK</span>
                        {(() => {
                          const attackResults = cardResults.filter(r => r.cardType === CardType.ATTACK);
                          const baseAtk = attackResults.reduce((sum, r) => sum + (r.attack || 0), 0);
                          const timeBonus = attackResults.reduce((sum, r) => sum + (r.timeMultiplier || 1), 0);
                          const times = attackResults.reduce((sum, r) => sum + (r.attackCount || 0), 0);
                          const total = Math.floor(baseAtk * timeBonus);
                          
                          return (
                            <span className="text-yellow-300 text-xs font-bold">
                              {baseAtk} x {timeBonus.toFixed(2)} x{times} = {total}
                            </span>
                          );
                        })()}
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

             {gameState.status === 'PAUSED' && (
                 <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
                     <h2 className="text-white text-2xl mb-8">PAUSED</h2>
                     <div className="flex flex-col gap-4">
                         <button 
                            onClick={handleResume}
                            className="bg-green-600 text-white text-sm py-3 px-8 border-4 border-white shadow-[4px_4px_0_0_black] active:translate-y-1 active:shadow-none"
                         >
                            RESUME
                         </button>
                         <button 
                            onClick={handleQuitToMenu}
                            className="bg-red-600 text-white text-sm py-3 px-8 border-4 border-white shadow-[4px_4px_0_0_black] active:translate-y-1 active:shadow-none"
                         >
                            QUIT TO MENU
                         </button>
                     </div>
                 </div>
             )}

             {loading && gameState.status !== 'START' && (
                 <div className="text-white animate-pulse">SUMMONING WORDS...</div>
             )}

         </div>
      </div>

      {/* Bottom: Control Panel */}
      <div className="h-14 bg-[#1a1a1a] border-t-4 border-black p-1 grid grid-cols-4 gap-1 shrink-0">
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
