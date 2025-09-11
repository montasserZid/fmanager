import React from 'react';
import { FirebasePlayer } from '../types';
import { Star } from 'lucide-react';

interface PlayerCardProps {
  player: FirebasePlayer;
  kitColor: string;
  isStarter?: boolean;
  showDetailedStats?: boolean;
}

export function PlayerCard({ player, kitColor, isStarter = false, showDetailedStats = false }: PlayerCardProps) {
  const getPositionColor = (position: string) => {
    if (!position || typeof position !== 'string') return 'from-gray-500 to-gray-600';
    if (position === 'Goalkeeper') return 'from-green-500 to-green-600';
    if (position.includes('Back')) return 'from-blue-500 to-blue-600';
    if (position.includes('Midfield')) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getOverallRating = (attributes: FirebasePlayer['attributes']) => {
    if (!attributes || typeof attributes !== 'object') return 0;
    const values = Object.values(attributes).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);
  };

  const formatNationality = (nationality: string | string[]) => {
    if (!nationality) return 'Unknown';
    if (Array.isArray(nationality)) {
      return nationality.join(' / ');
    }
    return nationality;
  };

  const getStatColor = (value: number) => {
    if (value < 30) return 'text-red-400';
    if (value >= 30 && value <= 69) return 'text-orange-400';
    return 'text-green-400';
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStaminaColor = (staminaPct: number) => {
    if (staminaPct >= 60) return 'text-green-400';
    if (staminaPct >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className={`bg-slate-800/60 border border-slate-600 rounded-xl p-4 hover:border-purple-500/50 transition-all duration-300 transform hover:scale-[1.02] ${isStarter ? 'ring-2 ring-purple-500/30' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="relative">
          {player.image_url ? (
            <img
              src={player.image_url}
              alt={player.name}
              className="w-16 h-16 rounded-lg object-cover border-2 border-slate-600"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`w-16 h-16 rounded-lg border-2 border-slate-600 flex items-center justify-center text-white font-bold text-sm ${!player.image_url ? 'flex' : 'hidden'}`}
            style={{ backgroundColor: kitColor }}
          >
            {getInitials(player.name)}
          </div>
          <div 
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white"
            style={{ backgroundColor: kitColor }}
          >
            {player.number || '?'}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold text-sm truncate">{player.name}</h3>
                {player.captain && <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
              </div>
              <p className="text-slate-400 text-xs">{formatNationality(player.nationality)}</p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getPositionColor(player.position)}`}>
                {getOverallRating(player.attributes)}
              </div>
            </div>
          </div>

          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getPositionColor(player.position)} text-white mb-2`}>
            {player.position}
          </div>

          <div className="flex items-center gap-4 mb-2">
            {player.market_value && (
              <p className="text-yellow-400 text-xs font-medium">{player.market_value}</p>
            )}
            <p className={`text-xs font-medium ${getStaminaColor(player.staminaPct)}`}>
              Stamina: {player.staminaPct}%
            </p>
          </div>

          {player.originalTeam && (
            <p className="text-slate-500 text-xs">From: {player.originalTeam.replace('_', ' ').toUpperCase()}</p>
          )}

          {isStarter && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Starting XI
              </span>
            </div>
          )}

          {showDetailedStats && (
            <div className="mt-4 space-y-3">
              {/* Player Status */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-700/30 rounded-lg">
                <div className="text-center">
                  <div className={`text-lg font-bold ${getStaminaColor(player.staminaPct)}`}>
                    {player.staminaPct}%
                  </div>
                  <div className="text-slate-400 text-xs">Stamina</div>
                </div>
                <div className="text-center">
                   <div className="flex items-center justify-center gap-1">
                     {player.yellowCards > 0 && (
                       <img 
                         src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Yellow_card.svg/300px-Yellow_card.svg.png?20230127094700" 
                         alt="Yellow card" 
                         className="w-3 h-4"
                       />
                     )}
                     <span className="text-lg font-bold text-yellow-400">{player.yellowCards}</span>
                   </div>
                  <div className="text-slate-400 text-xs">Yellow Cards</div>
                </div>
                <div className="text-center">
                   <div className="flex items-center justify-center gap-1">
          {player.isSuspended && (
            <div className="bg-red-600 text-white text-xs px-1 py-0.5 rounded font-bold">
              SUSP
            </div>
          )}
                     {player.redCards > 0 && (
                       <img 
                         src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Red_card.svg/640px-Red_card.svg.png" 
                         alt="Red card" 
                         className="w-3 h-4"
                       />
                     )}
                     <span className="text-lg font-bold text-red-400">{player.redCards}</span>
                   </div>
                  <div className="text-slate-400 text-xs">Red Cards</div>
                </div>
              </div>

              {/* Player Attributes */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(player.attributes || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-slate-400 capitalize">{key}:</span>
                    <span className={`font-medium ${getStatColor(value as number)}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}