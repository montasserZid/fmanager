import React from 'react';
import { PitchPlayerCard } from './PitchPlayerCard';
import { Formation, FirebasePlayer } from '../types';

interface PitchViewProps {
  formation: Formation;
  starters: (FirebasePlayer | null)[];
  clubColors: { home: string; away: string };
  onPlayerClick: (player: FirebasePlayer | null) => void;
  onPlayerDrop: (index: number, player: FirebasePlayer | null, isFromBench: boolean) => void;
}

export function PitchView({ 
  formation, 
  starters, 
  clubColors, 
  onPlayerClick, 
  onPlayerDrop 
}: PitchViewProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const playerData = e.dataTransfer.getData('application/json');
    if (playerData) {
      const { player, isFromBench } = JSON.parse(playerData);
      onPlayerDrop(index, player, isFromBench);
    }
  };

  const handlePlayerClick = (player: FirebasePlayer | null) => {
    if (player) {
      onPlayerClick(player);
    }
  };
  return (
    <div className="relative">
      {/* Pitch Background */}
      <div 
        className="relative w-full h-[600px] bg-gradient-to-b from-green-600 to-green-700 rounded-xl border-4 border-white overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      >
        {/* Pitch Markings */}
        <div className="absolute inset-0">
          {/* Center Circle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/30 rounded-full" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/30 rounded-full" />
          
          {/* Goal Areas */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-16 border-2 border-white/30 border-t-0" />
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-16 border-2 border-white/30 border-b-0" />
          
          {/* Penalty Areas */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-24 border-2 border-white/30 border-t-0" />
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-40 h-24 border-2 border-white/30 border-b-0" />
          
          {/* Center Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30" />
        </div>

        {/* Player Positions */}
        {formation.positions.map((position, index) => (
          <div
            key={index}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-in-out"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            {starters[index] ? (
              <PitchPlayerCard
                player={starters[index]!}
                kitColor={clubColors.home}
                onClick={() => handlePlayerClick(starters[index])}
                isDraggable={true}
                positionIndex={index}
              />
            ) : (
              <div 
                className="w-16 h-20 bg-slate-800/60 border-2 border-dashed border-slate-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 transition-colors"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                <span className="text-slate-400 text-xs font-medium">Empty</span>
                <span className="text-slate-500 text-xs">{position.position.split(' ')[0]}</span>
              </div>
            )}
          </div>
        ))}

        {/* Formation Label */}
        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
          <span className="text-white font-semibold text-sm">{formation.name}</span>
        </div>
      </div>
    </div>
  );
}