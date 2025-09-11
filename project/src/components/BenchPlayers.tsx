import React from 'react';
import { BenchPlayerCard } from './BenchPlayerCard';
import { FirebasePlayer } from '../types';
import { Users, ChevronUp, ChevronDown } from 'lucide-react';

interface BenchPlayersProps {
  substitutes: FirebasePlayer[];
  clubColors: { home: string; away: string };
  onPlayerClick: (player: FirebasePlayer) => void;
  onBenchPlayerDrop: (benchIndex: number, player: FirebasePlayer | null, isFromStarters: boolean) => void;
  show: boolean;
  onToggle: () => void;
}

export function BenchPlayers({ 
  substitutes, 
  clubColors, 
  onPlayerClick, 
  onBenchPlayerDrop,
  show,
  onToggle 
}: BenchPlayersProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, benchIndex: number) => {
    e.preventDefault();
    const playerData = e.dataTransfer.getData('application/json');
    if (playerData) {
      const { player, isFromBench } = JSON.parse(playerData);
      onBenchPlayerDrop(benchIndex, player, !isFromBench);
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-bold text-white">Substitutes</h3>
          <span className="text-slate-400 text-sm">({substitutes.length}/6)</span>
        </div>
        {show ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {show && (
        <div className="p-4 pt-0">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {substitutes.map((player, index) => (
              <div
                key={player.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                <BenchPlayerCard
                  player={player}
                  kitColor={clubColors.away}
                  onClick={() => onPlayerClick(player)}
                  index={index}
                />
              </div>
            ))}
            
            {/* Empty substitute slots */}
            {Array.from({ length: 6 - substitutes.length }).map((_, index) => (
              <div
                key={`empty-${index}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, substitutes.length + index)}
                className="w-full aspect-[3/4] bg-slate-700/30 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center hover:border-purple-400 transition-colors"
              >
                <span className="text-slate-500 text-xs text-center">Empty</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}