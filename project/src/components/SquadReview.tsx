import React, { useState } from 'react';
import { PlayerCard } from './PlayerCard';
import { FirebasePlayer } from '../types';
import { Users, Check, Shuffle, DollarSign } from 'lucide-react';

interface SquadReviewProps {
  managerName: string;
  clubName: string;
  clubLogo: string;
  colors: { home: string; away: string };
  players: FirebasePlayer[];
  onConfirm: () => void;
  onRegenerate: () => void;
}

export function SquadReview({ managerName, clubName, clubLogo, colors, players, onConfirm, onRegenerate }: SquadReviewProps) {
  const [loading, setLoading] = useState(false);

  const starters = players.slice(0, 11);
  const substitutes = players.slice(11, 17);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  const getPositionCounts = (playerList: FirebasePlayer[]) => {
    const counts = {
      goalkeepers: 0,
      defenders: 0,
      midfielders: 0,
      attackers: 0
    };

    playerList.forEach(player => {
      if (player.position === 'Goalkeeper') counts.goalkeepers++;
      else if (player.position.includes('Back')) counts.defenders++;
      else if (player.position.includes('Midfield')) counts.midfielders++;
      else counts.attackers++;
    });

    return counts;
  };

  const starterCounts = getPositionCounts(starters);
  const totalCounts = getPositionCounts(players);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img
              src={clubLogo}
              alt={clubName}
              className="w-16 h-16 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/64x64/6C63FF/FFFFFF?text=FC';
              }}
            />
            <div className="text-left">
              <h1 className="text-4xl font-bold text-white">{clubName}</h1>
              <p className="text-slate-400">Manager: {managerName}</p>
            </div>
          </div>
          <p className="text-slate-400 mb-4">Review your randomly assigned squad</p>
          
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full border-2 border-white"
                style={{ backgroundColor: colors.home }}
              />
              <span className="text-white text-sm">Home Kit</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full border-2 border-white"
                style={{ backgroundColor: colors.away }}
              />
              <span className="text-white text-sm">Away Kit</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 inline-block">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">{totalCounts.goalkeepers}</div>
                <div className="text-xs text-slate-400">Goalkeepers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">{totalCounts.defenders}</div>
                <div className="text-xs text-slate-400">Defenders</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">{totalCounts.midfielders}</div>
                <div className="text-xs text-slate-400">Midfielders</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{totalCounts.attackers}</div>
                <div className="text-xs text-slate-400">Attackers</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Starting XI</h2>
              <span className="text-slate-400 text-sm">
                (GK: {starterCounts.goalkeepers}, DEF: {starterCounts.defenders}, MID: {starterCounts.midfielders}, ATT: {starterCounts.attackers})
              </span>
            </div>
            <div className="space-y-3">
              {starters.map((player) => (
                <PlayerCard 
                  key={player.id} 
                  player={player} 
                  kitColor={colors.home}
                  isStarter={true}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-white">Substitutes</h2>
              <span className="text-slate-400 text-sm">(6 players)</span>
            </div>
            <div className="space-y-3">
              {substitutes.map((player) => (
                <PlayerCard 
                  key={player.id} 
                  player={player} 
                  kitColor={colors.away}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onRegenerate}
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Shuffle className="w-5 h-5" />
            Regenerate Squad
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            {loading ? 'Creating Club...' : 'Confirm Team'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            Players are randomly assigned from available pool. Once confirmed, these players will be locked to your club.
          </p>
        </div>
      </div>
    </div>
  );
}