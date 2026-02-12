import { MapState, MapNode, MapNodeType, Encounter } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

/**
 * 生成一個關卡的地圖結構（線性路徑）
 * @param floor 樓層數（1-based）
 */
export const generateFloorMap = (floor: number): MapState => {
  const nodes: MapNode[] = [];
  
  // 線性路徑：10個節點
  const totalNodes = 10;
  
  for (let i = 0; i < totalNodes; i++) {
    const id = `node_${floor}_${i}`;
    
    // 決定節點類型
    let type: MapNodeType;
    if (i === totalNodes - 1) {
      type = MapNodeType.BOSS; // 最後是 BOSS
    } else if (i % 4 === 3) {
      type = MapNodeType.REST; // 每4個節點有1個休息
    } else if (i % 3 === 2 && i !== totalNodes - 2) {
      type = MapNodeType.ELITE; // 部分節點為精英
    } else {
      type = MapNodeType.BATTLE; // 其餘為戰鬥
    }
    
    // 線性連接（除了最後一個節點）
    const connections = i < totalNodes - 1 ? [`node_${floor}_${i + 1}`] : [];
    
    nodes.push({
      id,
      type,
      x: i, // 水平位置
      y: 0, // 都在同一行
      connections,
      completed: false,
    });
  }
  
  return {
    nodes,
    currentNodeId: nodes[0].id,
    floor,
  };
};

/**
 * 根據節點類型生成遭遇戰
 */
export const generateEncounter = (nodeType: MapNodeType, floor: number): Encounter | null => {
  if (nodeType === MapNodeType.BATTLE) {
    return {
      id: generateId(),
      enemyTypes: ['slime'], // 簡化：只有一種敵人
      enemyCount: 1 + Math.floor(floor / 3), // 樓層越高，敵人越多
      difficulty: floor,
    };
  }
  
  if (nodeType === MapNodeType.ELITE) {
    return {
      id: generateId(),
      enemyTypes: ['elite_slime'],
      enemyCount: 1,
      difficulty: floor * 1.5,
    };
  }
  
  if (nodeType === MapNodeType.BOSS) {
    return {
      id: generateId(),
      enemyTypes: ['boss_slime'],
      enemyCount: 1,
      difficulty: floor * 2,
    };
  }
  
  return null;
};

/**
 * 取得可到達的節點（從當前節點）
 */
export const getReachableNodes = (mapState: MapState): MapNode[] => {
  const currentNode = mapState.nodes.find(n => n.id === mapState.currentNodeId);
  if (!currentNode) return [];
  
  return mapState.nodes.filter(n => currentNode.connections.includes(n.id));
};

/**
 * 移動到新節點
 */
export const moveToNode = (mapState: MapState, targetNodeId: string): MapState => {
  const currentNode = mapState.nodes.find(n => n.id === mapState.currentNodeId);
  if (!currentNode) return mapState;
  
  // 檢查是否可達
  if (!currentNode.connections.includes(targetNodeId)) {
    console.warn('Target node is not reachable');
    return mapState;
  }
  
  return {
    ...mapState,
    currentNodeId: targetNodeId,
  };
};

/**
 * 標記節點為已完成
 */
export const completeNode = (mapState: MapState, nodeId: string): MapState => {
  return {
    ...mapState,
    nodes: mapState.nodes.map(n => 
      n.id === nodeId ? { ...n, completed: true } : n
    ),
  };
};
