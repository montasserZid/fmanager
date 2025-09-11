import React, { useState } from 'react';
import { Trophy, Palette, Users, User } from 'lucide-react';
import logoData from '../../logos/ligue2.json';

interface ClubCreationProps {
  onNext: (managerName: string, clubName: string, clubLogo: string, colors: { home: string; away: string }) => void;
}

export function ClubCreation({ onNext }: ClubCreationProps) {
  const [managerName, setManagerName] = useState('');
  const [clubName, setClubName] = useState('');
  const [selectedLogo, setSelectedLogo] = useState('');
  const [homeColor, setHomeColor] = useState('#6C63FF');
  const [awayColor, setAwayColor] = useState('#FFD369');
  const [error, setError] = useState('');

  const logoOptions = Object.entries(logoData.ligue2).map(([key, url]) => ({
    id: key,
    name: key.replace(/_/g, ' ').toUpperCase(),
    url
  }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerName.trim()) {
      setError('Please enter a manager name');
      return;
    }
    if (managerName.trim().length < 2) {
      setError('Manager name must be at least 2 characters');
      return;
    }
    if (!clubName.trim()) {
      setError('Please enter a club name');
      return;
    }
    if (clubName.trim().length < 3) {
      setError('Club name must be at least 3 characters');
      return;
    }
    if (!selectedLogo) {
      setError('Please select a club logo');
      return;
    }
    
    setError('');
    onNext(managerName.trim(), clubName.trim(), selectedLogo, { home: homeColor, away: awayColor });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-yellow-500 rounded-full mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Your Club</h1>
            <p className="text-slate-400">Design your club identity and colors</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Manager Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-lg"
                  placeholder="Enter your manager name"
                  maxLength={25}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Club Name
              </label>
              <div className="relative">
                <Trophy className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-lg"
                  placeholder="Enter your club name"
                  maxLength={30}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Club Logo
              </label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto bg-slate-700/30 rounded-lg p-4">
                {logoOptions.map((logo) => (
                  <button
                    key={logo.id}
                    type="button"
                    onClick={() => setSelectedLogo(logo.url)}
                    className={`relative p-3 rounded-lg border-2 transition-all duration-200 ${
                      selectedLogo === logo.url
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <img
                      src={logo.url}
                      
                      className="w-12 h-12 object-contain mx-auto mb-2"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/48x48/6C63FF/FFFFFF?text=FC';
                      }}
                    />
                    <div className="text-xs text-slate-300 text-center truncate">
                      
                    </div>
                    {selectedLogo === logo.url && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Home Kit Color
                </label>
                <div className="space-y-3">
                  <div className="relative">
                    <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="color"
                      value={homeColor}
                      onChange={(e) => setHomeColor(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all h-12"
                    />
                  </div>
                  <div 
                    className="w-full h-16 rounded-lg border-2 border-slate-600 flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: homeColor }}
                  >
                    HOME KIT
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Away Kit Color
                </label>
                <div className="space-y-3">
                  <div className="relative">
                    <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="color"
                      value={awayColor}
                      onChange={(e) => setAwayColor(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all h-12"
                    />
                  </div>
                  <div 
                    className="w-full h-16 rounded-lg border-2 border-slate-600 flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: awayColor }}
                  >
                    AWAY KIT
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              Continue to Player Assignment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}