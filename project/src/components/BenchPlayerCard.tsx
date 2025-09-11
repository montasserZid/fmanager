import React from 'react';
import { FirebasePlayer } from '../types';

interface BenchPlayerCardProps {
  player: FirebasePlayer;
  kitColor: string;
  onClick: () => void;
  index: number;
}

export function BenchPlayerCard({ 
  player, 
  kitColor, 
  onClick, 
  index 
}: BenchPlayerCardProps) {
  const getOverallRating = (attributes: FirebasePlayer['attributes']) => {
    if (!attributes || typeof attributes !== 'object') return 0;
    const values = Object.values(attributes).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);
  };

  const getPositionAbbreviation = (position: string | undefined | null) => {
    // Early return for invalid positions
    if (!position || typeof position !== 'string') return '?';
    
    const pos = position.toString(); // Ensure it's a string
    
    if (pos === 'Goalkeeper') return 'GK';
    if (pos.includes('Back')) return pos.includes('Left') ? 'LB' : pos.includes('Right') ? 'RB' : 'CB';
    if (pos.includes('Midfield')) {
      if (pos.includes('Defensive')) return 'CDM';
      if (pos.includes('Attacking')) return 'CAM';
      return 'CM';
    }
    if (pos.includes('Winger')) return pos.includes('Left') ? 'LW' : 'RW';
    if (pos.includes('Forward') || pos.includes('Striker')) return 'ST';
    return 'CF';
  };

  const getStaminaBorderColor = (staminaPct: number) => {
    if (staminaPct >= 60) return 'border-green-400';
    if (staminaPct >= 30) return 'border-orange-400';
    return 'border-red-400';
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      player,
      isFromBench: true,
      fromIndex: index,
      benchIndex: index
    }));
  };

  // Add safety checks for player data
  const safePlayer = {
    ...player,
    name: player.name || 'Unknown Player',
    position: player.position || 'Unknown',
    attributes: player.attributes || {},
    staminaPct: player.staminaPct || 100,
    yellowCards: player.yellowCards || 0,
    redCards: player.redCards || 0,
    number: player.number || 0
  };

  return (
    <div
      className="relative cursor-pointer transform hover:scale-105 transition-all duration-200"
      onClick={onClick}
      draggable={true}
      onDragStart={handleDragStart}
    >
      <div className="w-full aspect-[3/4] bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-600 rounded-lg overflow-hidden shadow-lg hover:border-yellow-400 transition-colors">
        {/* Player Image */}
        <div className="h-2/3 overflow-hidden relative">
          <div className={`w-full h-full border-2 ${getStaminaBorderColor(safePlayer.staminaPct)} overflow-hidden`}>
            {safePlayer.image_url ? (
              <img
                src={safePlayer.image_url}
                alt={safePlayer.name}
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
              className={`w-full h-full flex items-center justify-center text-white font-bold text-xs ${!safePlayer.image_url ? 'flex' : 'hidden'}`}
              style={{ backgroundColor: kitColor }}
            >
              {getInitials(safePlayer.name)}
            </div>
          </div>
        </div>
        
        {/* Position Label - Top Right */}
        <div className="absolute top-0.5 right-0.5 bg-black/70 backdrop-blur-sm rounded px-1 py-0.5">
          <span className="text-white text-xs font-bold">{getPositionAbbreviation(safePlayer.position)}</span>
        </div>

        {/* Player Info */}
        <div className="p-1 text-center h-1/3 flex items-center justify-center">
          <div className="text-white text-xs font-bold truncate px-1">{safePlayer.name.split(' ').pop()}</div>
        </div>

        {/* Rating Badge */}
        <div 
          className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold border border-white"
          style={{ backgroundColor: kitColor }}
        >
          {getOverallRating(safePlayer.attributes)}
        </div>

        {/* Status Indicators */}
        <div className="absolute top-0.5 left-0.5 flex flex-col gap-0.5">
          {safePlayer.yellowCards > 0 && (
            <div className="flex items-center">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Yellow_card.svg/300px-Yellow_card.svg.png?20230127094700" 
                alt="Yellow card" 
                className="w-1.5 h-2"
              />
              {safePlayer.yellowCards > 1 && (
                <span className="text-yellow-400 text-xs font-bold ml-0.5">{safePlayer.yellowCards}</span>
              )}
            </div>
          )}
          {safePlayer.redCards > 0 && (
            <div className="flex items-center">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Red_card.svg/640px-Red_card.svg.png" 
                alt="Red card" 
                className="w-1.5 h-2"
              />
              {safePlayer.redCards > 1 && (
                <span className="text-red-400 text-xs font-bold ml-0.5">{safePlayer.redCards}</span>
              )}
            </div>
          )}
        </div>

        {/* Jersey Number */}
        <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rounded-full flex items-center justify-center">
          <span className="text-slate-800 text-xs font-bold">{safePlayer.number || '?'}</span>
        </div>
      </div>
    </div>
  );
}