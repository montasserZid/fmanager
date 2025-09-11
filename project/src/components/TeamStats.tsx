import React from 'react';
import { TrendingUp, Zap, Grid3X3, Activity, Shield, Target } from 'lucide-react';
import { FirebasePlayer } from '../types';

interface TeamStatsProps {
  teamStamina: number;
  attackingOverall: number;
  midfieldOverall: number;
  defenceOverall: number;
  formation: string;
}

export function TeamStats({ 
  teamStamina, 
  attackingOverall, 
  midfieldOverall, 
  defenceOverall, 
  formation 
}: TeamStatsProps) {
  const getStatPercentage = (stat: number) => {
    if (typeof stat !== 'number' || isNaN(stat)) return 0;
    return Math.min((stat / 99) * 100, 100);
  };

  const getStatColor = (stat: number) => {
    if (typeof stat !== 'number' || isNaN(stat)) return 'text-gray-400';
    const percentage = (stat / 99) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 70) return 'text-yellow-400';
    if (percentage >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  const getStaminaColor = (stamina: number) => {
    if (typeof stamina !== 'number' || isNaN(stamina)) return 'text-gray-400';
    if (stamina >= 80) return 'text-green-400';
    if (stamina >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-purple-400" />
        Team Overview
      </h3>

      <div className="space-y-6">
        {/* Team Stamina */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-300 text-sm font-medium">Team Stamina</span>
            <span className={`text-lg font-bold ${getStaminaColor(teamStamina)}`}>
              {teamStamina}%
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                teamStamina >= 80 ? 'bg-green-400' :
                teamStamina >= 60 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${teamStamina}%` }}
            />
          </div>
        </div>

        {/* Attacking Overall */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-red-400" />
              <span className="text-slate-300 text-sm font-medium">Attacking</span>
            </div>
            <span className={`text-lg font-bold ${getStatColor(attackingOverall)}`}>
              {attackingOverall}/99
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                getStatPercentage(attackingOverall) >= 80 ? 'bg-green-400' :
                getStatPercentage(attackingOverall) >= 70 ? 'bg-yellow-400' :
                getStatPercentage(attackingOverall) >= 60 ? 'bg-orange-400' : 'bg-red-400'
              }`}
              style={{ width: `${getStatPercentage(attackingOverall)}%` }}
            />
          </div>
        </div>

        {/* Midfield Overall */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-slate-300 text-sm font-medium">Midfield</span>
            </div>
            <span className={`text-lg font-bold ${getStatColor(midfieldOverall)}`}>
              {midfieldOverall}/99
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                getStatPercentage(midfieldOverall) >= 80 ? 'bg-green-400' :
                getStatPercentage(midfieldOverall) >= 70 ? 'bg-yellow-400' :
                getStatPercentage(midfieldOverall) >= 60 ? 'bg-orange-400' : 'bg-red-400'
              }`}
              style={{ width: `${getStatPercentage(midfieldOverall)}%` }}
            />
          </div>
        </div>

        {/* Defence Overall */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300 text-sm font-medium">Defence</span>
            </div>
            <span className={`text-lg font-bold ${getStatColor(defenceOverall)}`}>
              {defenceOverall}/99
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                getStatPercentage(defenceOverall) >= 80 ? 'bg-green-400' :
                getStatPercentage(defenceOverall) >= 70 ? 'bg-yellow-400' :
                getStatPercentage(defenceOverall) >= 60 ? 'bg-orange-400' : 'bg-red-400'
              }`}
              style={{ width: `${getStatPercentage(defenceOverall)}%` }}
            />
          </div>
        </div>

        {/* Formation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm font-medium">Formation</span>
          </div>
          <span className="text-white font-semibold">{formation}</span>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-slate-700">
          <h4 className="text-slate-300 text-sm font-medium mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <button className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors">
              Auto-Fill Formation
            </button>
            <button className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors">
              Reset Squad
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}