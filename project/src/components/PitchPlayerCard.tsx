import React from 'react';
import { FirebasePlayer } from '../types';
import { AlertTriangle, Square } from 'lucide-react';

interface PitchPlayerCardProps {
  player: FirebasePlayer;
  kitColor: string;
  onClick: () => void;
  isDraggable?: boolean;
  positionIndex?: number;
}

export function PitchPlayerCard({ 
  player, 
  kitColor, 
  onClick, 
  isDraggable = false,
  positionIndex 
}: PitchPlayerCardProps) {

  const getPositionAbbreviation = (position: string) => {
    if (!position || typeof position !== 'string') return '?';
    if (position === 'Goalkeeper') return 'GK';
    if (position.includes('Back')) return position.includes('Left') ? 'LB' : position.includes('Right') ? 'RB' : 'CB';
    if (position.includes('Midfield')) {
      if (position.includes('Defensive')) return 'CDM';
      if (position.includes('Attacking')) return 'CAM';
      return 'CM';
    }
    if (position.includes('Winger')) return position.includes('Left') ? 'LW' : 'RW';
    if (position.includes('Forward') || position.includes('Striker')) return 'ST';
    return 'CF';
  };

  const getOverallRating = (attributes: FirebasePlayer['attributes']) => {
    if (!attributes || typeof attributes !== 'object') return 0;
    const values = Object.values(attributes).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);
  };

  const getStaminaBorderColor = (staminaPct: number) => {
    if (staminaPct >= 60) return 'border-green-400';
    if (staminaPct >= 30) return 'border-orange-400';
    return 'border-red-400';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isDraggable) {
      e.dataTransfer.setData('application/json', JSON.stringify({
        player,
        isFromBench: false,
        fromIndex: positionIndex
      }));
    }
  };

  return (
    <div
      className="relative cursor-pointer transform hover:scale-105 transition-all duration-200"
      onClick={onClick}
      draggable={isDraggable}
      onDragStart={handleDragStart}
    >
      {/* Player Card */}
      <div className="w-[68px] h-[84px] bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-600 rounded-lg overflow-hidden shadow-lg hover:border-purple-400 transition-colors">
        {/* Player Image */}
        <div className="h-[50px] overflow-hidden relative">
          <div className={`w-full h-full rounded-t-lg border-4 ${getStaminaBorderColor(player.staminaPct)} overflow-hidden`}>
            {player.image_url ? (
              <img
                src={player.image_url}
                alt={player.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={`w-full h-full flex items-center justify-center text-white font-bold text-xs ${!player.image_url ? 'flex' : 'hidden'}`}
              style={{ backgroundColor: kitColor }}
            >
              {getInitials(player.name)}
            </div>
          </div>
        </div>
        
        {/* Position Label - Top Right */}
        <div className="absolute top-1 right-1 bg-black/70 backdrop-blur-sm rounded px-1.5 py-0.5">
          <span className="text-white text-xs font-bold">{getPositionAbbreviation(player.position)}</span>
        </div>

        {/* Status Indicators - Top Left */}
        <div className="absolute top-1 left-1 flex flex-col gap-1">
          {player.yellowCards > 0 && (
            <div className="flex items-center">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Yellow_card.svg/300px-Yellow_card.svg.png?20230127094700" 
                alt="Yellow card" 
                className="w-2 h-3"
              />
              {player.yellowCards > 1 && (
                <span className="text-yellow-400 text-xs font-bold ml-0.5">{player.yellowCards}</span>
              )}
            </div>
          )}
          {player.redCards > 0 && (
            <div className="flex items-center">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Red_card.svg/640px-Red_card.svg.png" 
                alt="Red card" 
                className="w-2 h-3"
              />
              {player.redCards > 1 && (
                <span className="text-red-400 text-xs font-bold ml-0.5">{player.redCards}</span>
              )}
            </div>
          )}
        </div>

        {/* Player Info */}
        <div className="p-1.5 text-center">
          <div className="text-white text-xs font-bold truncate">{player.name.split(' ').pop()}</div>
        </div>

        {/* Jersey Number */}
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rounded-full flex items-center justify-center">
          <span className="text-slate-800 text-xs font-bold">{player.number || '?'}</span>
        </div>
      </div>
    </div>
  );
}