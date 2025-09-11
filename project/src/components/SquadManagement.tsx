import React, { useState, useEffect } from 'react';
import { PitchView } from './PitchView';
import { FormationSelector } from './FormationSelector';
import { TeamStats } from './TeamStats';
import { BenchPlayers } from './BenchPlayers';
import { PlayerCard } from './PlayerCard';
import { BenchPlayerCard } from './BenchPlayerCard'; // Add this import
import { Club, FirebasePlayer } from '../types';
import { Users } from 'lucide-react';
import { ClubService } from '../services/clubService';

interface SquadManagementProps {
  club: Club;
  onUpdateClub: (updatedClub: Club) => void;
}

export interface Formation {
  name: string;
  positions: {
    x: number;
    y: number;
    position: string;
  }[];
}

const formations: Formation[] = [
  {
    name: '4-3-3',
    positions: [
      { x: 50, y: 5, position: 'Goalkeeper' },
      { x: 20, y: 25, position: 'Left-Back' },
      { x: 40, y: 25, position: 'Centre-Back' },
      { x: 60, y: 25, position: 'Centre-Back' },
      { x: 80, y: 25, position: 'Right-Back' },
      { x: 30, y: 50, position: 'Central Midfield' },
      { x: 50, y: 50, position: 'Central Midfield' },
      { x: 70, y: 50, position: 'Central Midfield' },
      { x: 20, y: 75, position: 'Left Winger' },
      { x: 50, y: 75, position: 'Centre-Forward' },
      { x: 80, y: 75, position: 'Right Winger' }
    ]
  },
  {
    name: '4-4-2',
    positions: [
      { x: 50, y: 5, position: 'Goalkeeper' },
      { x: 20, y: 25, position: 'Left-Back' },
      { x: 40, y: 25, position: 'Centre-Back' },
      { x: 60, y: 25, position: 'Centre-Back' },
      { x: 80, y: 25, position: 'Right-Back' },
      { x: 25, y: 50, position: 'Left Winger' },
      { x: 45, y: 50, position: 'Central Midfield' },
      { x: 55, y: 50, position: 'Central Midfield' },
      { x: 75, y: 50, position: 'Right Winger' },
      { x: 40, y: 75, position: 'Centre-Forward' },
      { x: 60, y: 75, position: 'Centre-Forward' }
    ]
  },
  {
    name: '4-2-3-1',
    positions: [
      { x: 50, y: 5, position: 'Goalkeeper' },
      { x: 20, y: 25, position: 'Left-Back' },
      { x: 40, y: 25, position: 'Centre-Back' },
      { x: 60, y: 25, position: 'Centre-Back' },
      { x: 80, y: 25, position: 'Right-Back' },
      { x: 40, y: 45, position: 'Defensive Midfield' },
      { x: 60, y: 45, position: 'Defensive Midfield' },
      { x: 25, y: 65, position: 'Left Winger' },
      { x: 50, y: 65, position: 'Attacking Midfield' },
      { x: 75, y: 65, position: 'Right Winger' },
      { x: 50, y: 80, position: 'Centre-Forward' }
    ]
  },
  {
    name: '3-5-2',
    positions: [
      { x: 50, y: 5, position: 'Goalkeeper' },
      { x: 30, y: 25, position: 'Centre-Back' },
      { x: 50, y: 25, position: 'Centre-Back' },
      { x: 70, y: 25, position: 'Centre-Back' },
      { x: 15, y: 45, position: 'Left-Back' },
      { x: 35, y: 50, position: 'Central Midfield' },
      { x: 50, y: 50, position: 'Central Midfield' },
      { x: 65, y: 50, position: 'Central Midfield' },
      { x: 85, y: 45, position: 'Right-Back' },
      { x: 40, y: 75, position: 'Centre-Forward' },
      { x: 60, y: 75, position: 'Centre-Forward' }
    ]
  },
  {
    name: '4-1-4-1',
    positions: [
      { x: 50, y: 5, position: 'Goalkeeper' },
      { x: 20, y: 25, position: 'Left-Back' },
      { x: 40, y: 25, position: 'Centre-Back' },
      { x: 60, y: 25, position: 'Centre-Back' },
      { x: 80, y: 25, position: 'Right-Back' },
      { x: 50, y: 40, position: 'Defensive Midfield' },
      { x: 25, y: 55, position: 'Left Winger' },
      { x: 45, y: 55, position: 'Central Midfield' },
      { x: 55, y: 55, position: 'Central Midfield' },
      { x: 75, y: 55, position: 'Right Winger' },
      { x: 50, y: 75, position: 'Centre-Forward' }
    ]
  },
  {
    name: '3-4-3',
    positions: [
      { x: 50, y: 5, position: 'Goalkeeper' },
      { x: 30, y: 25, position: 'Centre-Back' },
      { x: 50, y: 25, position: 'Centre-Back' },
      { x: 70, y: 25, position: 'Centre-Back' },
      { x: 25, y: 50, position: 'Left-Back' },
      { x: 45, y: 50, position: 'Central Midfield' },
      { x: 55, y: 50, position: 'Central Midfield' },
      { x: 75, y: 50, position: 'Right-Back' },
      { x: 25, y: 75, position: 'Left Winger' },
      { x: 50, y: 75, position: 'Centre-Forward' },
      { x: 75, y: 75, position: 'Right Winger' }
    ]
  },
  {
    name: '5-4-1',
    positions: [
      { x: 50, y: 5, position: 'Goalkeeper' },
      { x: 15, y: 25, position: 'Left-Back' },
      { x: 35, y: 25, position: 'Centre-Back' },
      { x: 50, y: 25, position: 'Centre-Back' },
      { x: 65, y: 25, position: 'Centre-Back' },
      { x: 85, y: 25, position: 'Right-Back' },
      { x: 30, y: 55, position: 'Left Winger' },
      { x: 45, y: 55, position: 'Central Midfield' },
      { x: 55, y: 55, position: 'Central Midfield' },
      { x: 70, y: 55, position: 'Right Winger' },
      { x: 50, y: 75, position: 'Centre-Forward' }
    ]
  },
  {
    name: '4-5-1',
    positions: [
      { x: 50, y: 5, position: 'Goalkeeper' },
      { x: 20, y: 25, position: 'Left-Back' },
      { x: 40, y: 25, position: 'Centre-Back' },
      { x: 60, y: 25, position: 'Centre-Back' },
      { x: 80, y: 25, position: 'Right-Back' },
      { x: 20, y: 50, position: 'Left Winger' },
      { x: 40, y: 50, position: 'Central Midfield' },
      { x: 50, y: 50, position: 'Central Midfield' },
      { x: 60, y: 50, position: 'Central Midfield' },
      { x: 80, y: 50, position: 'Right Winger' },
      { x: 50, y: 75, position: 'Centre-Forward' }
    ]
  }
];

export function SquadManagement({ club, onUpdateClub }: SquadManagementProps) {
  const [currentFormation, setCurrentFormation] = useState<Formation>(formations[0]);
  const [starters, setStarters] = useState<(FirebasePlayer | null)[]>(new Array(11).fill(null));
  const [substitutes, setSubstitutes] = useState<FirebasePlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<FirebasePlayer | null>(null);
  const [showBench, setShowBench] = useState(false);

  // Define reserves variable
  const reserves = club?.players ? club.players.filter(p => p.squadPosition === 'reserve') : [];

  useEffect(() => {
    // Add safety checks for club and club.players
    if (!club || !club.players) return;

    // Initialize starters and subs from club data
    const clubStarters = club.players.filter(p => p.squadPosition === 'starter');
    const clubSubs = club.players.filter(p => p.squadPosition === 'substitute');
    
    // Ensure we have 11 starter slots (some may be null)
    const starterArray = new Array(11).fill(null);
    clubStarters.forEach((player, index) => {
      if (index < 11) starterArray[index] = player;
    });
    
    setStarters(starterArray);
    setSubstitutes(clubSubs);
  }, [club]);

  const handleFormationChange = (formation: Formation) => {
    setCurrentFormation(formation);
  };

  const updateFirebaseAndClub = async (newStarters: (FirebasePlayer | null)[], newSubs: FirebasePlayer[]) => {
    if (!club || !club.players) return;

    const reserves = club.players.filter(p => p.squadPosition === 'reserve');
    
    const updatedPlayers = [
      ...newStarters.filter(p => p !== null).map(p => ({ ...p!, squadPosition: 'starter' as const })),
      ...newSubs.map(p => ({ ...p, squadPosition: 'substitute' as const })),
      ...reserves.map(p => ({ ...p, squadPosition: 'reserve' as const }))
    ];
    
    const updatedClub = { ...club, players: updatedPlayers };
    onUpdateClub(updatedClub);
    
    try {
      await ClubService.updateClubPlayers(club.id, updatedPlayers);
    } catch (error) {
      console.error('Failed to update club players:', error);
    }
  };

  const handlePlayerSwap = async (toIndex: number, toPlayer: FirebasePlayer | null, isFromBench: boolean) => {
    if (isFromBench && toPlayer) {
      // Moving from bench to starting position
      const newStarters = [...starters];
      const newSubs = [...substitutes];
      
      const currentStarter = newStarters[toIndex];
      newStarters[toIndex] = toPlayer;
      
      // Remove player from bench
      const subIndex = newSubs.findIndex(p => p?.id === toPlayer.id);
      if (subIndex !== -1) {
        if (currentStarter) {
          // Replace with current starter
          newSubs[subIndex] = currentStarter;
        } else {
          // Remove from bench
          newSubs.splice(subIndex, 1);
        }
      }
      
      setStarters(newStarters);
      setSubstitutes(newSubs);
      await updateFirebaseAndClub(newStarters, newSubs);
    } else if (!isFromBench && toPlayer) {
      // Moving from starting position to another starting position
      const newStarters = [...starters];
      const fromIndex = newStarters.findIndex(p => p?.id === toPlayer.id);
      
      if (fromIndex !== -1 && fromIndex !== toIndex) {
        // Swap positions
        const temp = newStarters[toIndex];
        newStarters[toIndex] = toPlayer;
        newStarters[fromIndex] = temp;
        
        setStarters(newStarters);
        await updateFirebaseAndClub(newStarters, substitutes);
      }
    }
  };

  const handleBenchPlayerDrop = async (benchIndex: number, player: FirebasePlayer | null, isFromStarters: boolean) => {
    if (isFromStarters && player) {
      // Moving from starters to bench
      const newStarters = [...starters];
      const newSubs = [...substitutes];
      
      const starterIndex = newStarters.findIndex(p => p?.id === player.id);
      if (starterIndex !== -1) {
        newStarters[starterIndex] = null;
        
        if (benchIndex < newSubs.length) {
          // Replace existing bench player
          const replacedPlayer = newSubs[benchIndex];
          newSubs[benchIndex] = player;
          if (replacedPlayer) {
            newStarters[starterIndex] = replacedPlayer;
          }
        } else {
          // Add to bench
          newSubs.push(player);
        }
        
        setStarters(newStarters);
        setSubstitutes(newSubs);
        await updateFirebaseAndClub(newStarters, newSubs);
      }
    } else if (!isFromStarters && player) {
      // Moving within bench
      const newSubs = [...substitutes];
      const fromIndex = newSubs.findIndex(p => p?.id === player.id);
      
      if (fromIndex !== -1 && fromIndex !== benchIndex) {
        // Swap bench positions
        const temp = newSubs[benchIndex];
        newSubs[benchIndex] = player;
        newSubs[fromIndex] = temp;
        
        setSubstitutes(newSubs);
        await updateFirebaseAndClub(starters, newSubs);
      }
    }
  };

  const calculateTeamStamina = () => {
    const activeStarters = starters.filter(p => p !== null) as FirebasePlayer[];
    if (activeStarters.length === 0) return 0;
    
    const totalStamina = activeStarters.reduce((sum, player) => {
      // Add safety check for staminaPct
      return sum + (player.staminaPct || 0);
    }, 0);
    return Math.round(totalStamina / activeStarters.length);
  };

  const calculatePositionOverall = (positions: string[]) => {
    const activeStarters = starters.filter(p => p !== null) as FirebasePlayer[];
    const positionPlayers = activeStarters.filter(player => {
  if (!player?.position || typeof player.position !== 'string') {
    return false;
  }
  return positions.some(pos => player.position.includes(pos));
});
    
    if (positionPlayers.length === 0) return 0;
    
    const totalRating = positionPlayers.reduce((sum, player) => {
      // Add safety check for attributes
      if (!player?.attributes) return sum;
      
      const attributes = Object.values(player.attributes).filter(v => typeof v === 'number') as number[];
      if (attributes.length === 0) return sum;
      
      const playerRating = Math.round(attributes.reduce((s, v) => s + v, 0) / attributes.length);
      return sum + playerRating;
    }, 0);
    
    return Math.round(totalRating / positionPlayers.length);
  };

  // Add safety check for club data
  if (!club) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-slate-400">Loading club data...</div>
      </div>
    );
  }

  const teamStamina = calculateTeamStamina();
  const attackingOverall = calculatePositionOverall(['Winger', 'Forward', 'Striker']);
  const midfieldOverall = calculatePositionOverall(['Midfield']);
  const defenceOverall = calculatePositionOverall(['Back', 'Goalkeeper']);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-white"
              style={{ backgroundColor: club.colors?.home || '#3B82F6' }}
            >
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{club.clubName || 'Club Name'}</h1>
              <p className="text-slate-400">Squad Management</p>
            </div>
          </div>
          
          <FormationSelector
            formations={formations}
            currentFormation={currentFormation}
            onFormationChange={handleFormationChange}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-2">
            <PitchView
              formation={currentFormation}
              starters={starters}
              clubColors={club.colors || { home: '#3B82F6', away: '#EF4444' }}
              onPlayerClick={setSelectedPlayer}
              onPlayerDrop={handlePlayerSwap}
            />
          </div>
          
          <div className="xl:col-span-1 order-3 xl:order-2">
            <BenchPlayers
              substitutes={substitutes}
              clubColors={club.colors || { home: '#3B82F6', away: '#EF4444' }}
              onPlayerClick={setSelectedPlayer}
              onBenchPlayerDrop={handleBenchPlayerDrop}
              show={true}
              onToggle={() => {}}
            />
            
            {/* Reserve Players */}
            <div className="mt-6 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" />
                Reserves ({reserves.length}/6)
              </h3>
              
              {reserves.length === 0 ? (
                <div className="text-slate-400 text-sm text-center py-8 border-2 border-dashed border-slate-600 rounded-lg">
                  No reserve players
                  <div className="text-xs mt-1">Players from transfers and league rewards appear here</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {reserves.map((player) => (
                    <div
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className="cursor-pointer"
                    >
                      <BenchPlayerCard
                        player={player}
                        kitColor={club.colors?.home || '#3B82F6'}
                        onClick={() => setSelectedPlayer(player)}
                        index={0}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="xl:col-span-1 order-2 xl:order-3 space-y-6">
            <TeamStats
              teamStamina={teamStamina}
              attackingOverall={attackingOverall}
              midfieldOverall={midfieldOverall}
              defenceOverall={defenceOverall}
              formation={currentFormation.name}
            />

            {selectedPlayer && (
              <div className="hidden xl:block bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Player Details</h3>
                <PlayerCard
                  player={selectedPlayer}
                  kitColor={club.colors?.home || '#3B82F6'}
                  showDetailedStats={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile Player Details Modal */}
        {selectedPlayer && (
          <div className="xl:hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Player Details</h3>
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>
              <PlayerCard
                player={selectedPlayer}
                kitColor={club.colors?.home || '#3B82F6'}
                showDetailedStats={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}