import React from 'react';
import { MapState, MapNode, MapNodeType } from '../types';

interface MapViewProps {
  mapState: MapState;
  onNodeClick: (nodeId: string) => void;
}

const NODE_TYPE_ICONS: Record<MapNodeType, string> = {
  [MapNodeType.BATTLE]: '⚔️',
  [MapNodeType.ELITE]: '👹',
  [MapNodeType.BOSS]: '💀',
  [MapNodeType.TREASURE]: '📦',
  [MapNodeType.SHOP]: '🏪',
  [MapNodeType.REST]: '🔥',
  [MapNodeType.EVENT]: '❓',
};

const NODE_TYPE_COLORS: Record<MapNodeType, string> = {
  [MapNodeType.BATTLE]: 'bg-gray-600',
  [MapNodeType.ELITE]: 'bg-purple-600',
  [MapNodeType.BOSS]: 'bg-red-700',
  [MapNodeType.TREASURE]: 'bg-yellow-600',
  [MapNodeType.SHOP]: 'bg-blue-600',
  [MapNodeType.REST]: 'bg-green-600',
  [MapNodeType.EVENT]: 'bg-orange-600',
};

export const MapView: React.FC<MapViewProps> = ({ mapState, onNodeClick }) => {
  const currentNodeIndex = mapState.nodes.findIndex(n => n.id === mapState.currentNodeId);
  const nextNode = mapState.nodes[currentNodeIndex + 1];
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-b from-gray-800 to-gray-900 overflow-hidden">
      {/* Linear Path Display - 單一視窗、無捲動 */}
      <div className="w-full max-w-md flex flex-col items-center gap-1">
        {/* 樓層 - 縮小 */}
        <div className="text-white text-[10px] font-['Press_Start_2P']">樓層 {mapState.floor}</div>
        
        {/* Progress Bar - 縮小 */}
        <div className="w-full h-2 bg-gray-700 border-2 border-white relative">
          <div 
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${(currentNodeIndex / (mapState.nodes.length - 1)) * 100}%` }}
          />
        </div>
        
        {/* Nodes - 縮小 */}
        <div className="relative w-full h-14">
          <svg className="absolute w-full h-full">
            <line x1="0" y1="28" x2="100%" y2="28" stroke="#4b5563" strokeWidth="2" strokeDasharray="6,4" />
          </svg>
          {mapState.nodes.map((node, index) => {
            const isCurrent = index === currentNodeIndex;
            const isPast = index < currentNodeIndex;
            const percentage = (index / (mapState.nodes.length - 1)) * 100;
            return (
              <div key={node.id} className="absolute transform -translate-x-1/2" style={{ left: `${percentage}%`, top: '14px' }}>
                <div className={`
                  w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm
                  ${NODE_TYPE_COLORS[node.type]}
                  ${isCurrent ? 'border-yellow-400 scale-110 animate-pulse' : 'border-gray-600'}
                  ${isPast ? 'opacity-40' : ''}
                `}>
                  {isCurrent ? '👤' : NODE_TYPE_ICONS[node.type]}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* 節點進度 - 縮小 */}
        <div className="text-yellow-400 text-[8px] font-['Press_Start_2P']">節點 {currentNodeIndex + 1}/{mapState.nodes.length}</div>
        
        {/* 下一個節點 & 按鈕 - 縮小 */}
        {nextNode && (
          <div className="w-full flex flex-row items-center justify-between gap-2 mt-2 px-2 py-1.5 bg-black/50 border border-white rounded">
            <div className="flex items-center gap-1.5">
              <span className="text-base">{NODE_TYPE_ICONS[nextNode.type]}</span>
              <span className="text-white text-[10px] font-['Press_Start_2P']">{getNodeTypeName(nextNode.type)}</span>
            </div>
            <button
              onClick={() => onNodeClick(nextNode.id)}
              className="bg-green-600 text-white text-[10px] py-1.5 px-3 border-2 border-white font-['Press_Start_2P'] active:translate-y-0.5 shrink-0"
            >
              前往→
            </button>
          </div>
        )}
        {!nextNode && (
          <div className="mt-2 text-red-400 text-[10px] font-['Press_Start_2P']">本層完成！</div>
        )}
      </div>
    </div>
  );
};

const getNodeTypeName = (type: MapNodeType): string => {
  const names: Record<MapNodeType, string> = {
    [MapNodeType.BATTLE]: '戰鬥',
    [MapNodeType.ELITE]: '精英',
    [MapNodeType.BOSS]: '首領',
    [MapNodeType.TREASURE]: '寶藏',
    [MapNodeType.SHOP]: '商店',
    [MapNodeType.REST]: '休息',
    [MapNodeType.EVENT]: '事件',
  };
  return names[type];
};
