import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GameSimulation } from './GameSimulation';
import { FriendlyService } from '../services/friendlyService';
import { ClubService } from '../services/clubService';
import { Manager, FriendlyInvite, MatchResult, Club } from '../types';
import { 
  Users, 
  Send, 
  Clock, 
  Trophy, 
  Target, 
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface FriendlyGamesProps {
  club: Club;
  onUpdateClub: (club: Club) => void;
}

export function FriendlyGames({ club, onUpdateClub }: FriendlyGamesProps) {
  const { user } = useAuth();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [pendingInvites, setPendingInvites] = useState<FriendlyInvite[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchResult[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<FriendlyInvite | null>(null);
  const [opponentClub, setOpponentClub] = useState<Club | null>(null);
  const [error, setError] = useState('');
  const [canPlay, setCanPlay] = useState(true);
  const [timeUntilNext, setTimeUntilNext] = useState(0);

  useEffect(() => {
    loadData();
    
    // Update countdown every minute
    const interval = setInterval(() => {
      if (!canPlay && user) {
        updateTimeUntilNext();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [managersData, invitesData, historyData, canPlayToday] = await Promise.all([
        FriendlyService.getAllManagers(),
        FriendlyService.getPendingInvites(user.uid),
        FriendlyService.getMatchHistory(user.uid),
        FriendlyService.canPlayFriendly(user.uid)
      ]);
      
      // Filter out current user from managers list
      setManagers(managersData.filter(m => m.userId !== user.uid));
      setPendingInvites(invitesData);
      setMatchHistory(historyData);
      setCanPlay(canPlayToday);
      
      if (!canPlayToday) {
        updateTimeUntilNext();
      }
    } catch (err) {
      console.error('Error loading friendly games data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateTimeUntilNext = async () => {
    if (!user) return;
    try {
      const timeLeft = await FriendlyService.getTimeUntilNextFriendly(user.uid);
      setTimeUntilNext(timeLeft);
      
      if (timeLeft <= 0) {
        setCanPlay(true);
      }
    } catch (error) {
      console.error('Error getting time until next friendly:', error);
    }
  };

  const handleSendInvite = async (manager: Manager) => {
    if (!user) return;
    
    if (!canPlay) {
      const timeLeft = await FriendlyService.getTimeUntilNextFriendly(user.uid);
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      setError(`You can only play one friendly game per day. Please wait for the cooldown to end. Time remaining: ${hours}h ${minutes}m`);
      return;
    }
    
    try {
      await FriendlyService.sendFriendlyInvite(
        user.uid,
        club.clubName,
        club.clubLogo,
        manager.userId,
        manager.clubName
      );
      setError('');
      // Refresh data to show updated state
      loadData();
    } catch (err) {
      setError('Failed to send invite');
    }
  };

  const handleAcceptInvite = async (invite: FriendlyInvite) => {
    if (!user) return;
    
    if (!canPlay) {
      const timeLeft = await FriendlyService.getTimeUntilNextFriendly(user.uid);
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      setError(`You can only play one friendly game per day. Please wait for the cooldown to end. Time remaining: ${hours}h ${minutes}m`);
      return;
    }
    
    try {
      // Get opponent's club data
      const opponentClub = await ClubService.getUserClub(invite.fromUserId);
      if (!opponentClub) throw new Error('Opponent club not found');
      
      // Set up simulation
      setCurrentInvite(invite);
      setOpponentClub(opponentClub);
      setShowSimulation(true);
    } catch (err) {
      setError('Failed to simulate match');
    }
  };

  const handleDeclineInvite = async (invite: FriendlyInvite) => {
    try {
      await FriendlyService.respondToInvite(invite.id, false);
      await FriendlyService.deleteInvite(invite.id);
      loadData();
    } catch (err) {
      setError('Failed to decline invite');
    }
  };

  const formatTimeRemaining = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleMatchComplete = async (result: any) => {
    if (!user || !currentInvite || !opponentClub) return;
    
    try {
      // Simulate the match (this will handle stamina updates automatically)
      const matchResult = await FriendlyService.simulateMatch(opponentClub, club);
      
      // Get updated club data with new stamina values
      const updatedClub = await ClubService.getUserClub(user.uid);
      if (updatedClub) {
        onUpdateClub(updatedClub);
      }
      
      // Update budgets
      const homeWon = matchResult.homeScore > matchResult.awayScore;
      const awayWon = matchResult.awayScore > matchResult.homeScore;
      
      if (homeWon) {
        await FriendlyService.updateClubBudget(opponentClub.id, (opponentClub.budget || 300000) + 10000);
      } else if (awayWon) {
        await FriendlyService.updateClubBudget(club.id, (club.budget || 300000) + 10000);
        if (updatedClub) {
          onUpdateClub({ ...updatedClub, budget: (updatedClub.budget || 300000) + 10000 });
        }
      }
      
      // Update last friendly dates
      await Promise.all([
        FriendlyService.updateLastFriendlyDate(user.uid),
        FriendlyService.updateLastFriendlyDate(currentInvite.fromUserId)
      ]);
      
      // Accept invite and clean up
      await FriendlyService.respondToInvite(currentInvite.id, true);
      await FriendlyService.deleteInvite(currentInvite.id);
      
      // Reset simulation state
      setShowSimulation(false);
      setCurrentInvite(null);
      setOpponentClub(null);
      
      // Show the match result
      setSelectedMatch(matchResult);
      
      // Refresh data
      loadData();
    } catch (error) {
      console.error('Error completing match:', error);
      setError('Failed to complete match');
    }
  };

  const handleBackFromSimulation = () => {
    setShowSimulation(false);
    setCurrentInvite(null);
    setOpponentClub(null);
  };

  if (showSimulation && currentInvite && opponentClub) {
    return (
      <GameSimulation
        homeClub={opponentClub}
        awayClub={club}
        isLeagueMatch={false}
        onMatchComplete={handleMatchComplete}
        onBack={handleBackFromSimulation}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Daily Limit Modal */}
      {!canPlay && timeUntilNext > 0 && error.includes('daily') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-md w-full text-center">
            <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Daily Limit Reached</h2>
            <p className="text-slate-400 mb-4">You've already played a friendly game in the last 24 hours.</p>
            <p className="text-slate-300 mb-6">
              Next game available in: <span className="text-yellow-400 font-bold">{formatTimeRemaining(timeUntilNext)}</span>
            </p>
            <button
              onClick={() => setError('')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Invite Managers */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 text-purple-400" />
          Invite Manager for Friendly Game
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managers.map((manager) => (
            <div key={manager.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={manager.clubLogo}
                  alt={manager.clubName}
                  className="w-10 h-10 object-contain rounded-lg border-2 border-slate-600"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/40x40/6C63FF/FFFFFF?text=FC';
                  }}
                />
                <div>
                  <h3 className="text-white font-semibold">{manager.clubName}</h3>
                  <p className="text-slate-400 text-sm">Manager: {manager.managerName}</p>
                </div>
              </div>
              
              <button
                onClick={() => handleSendInvite(manager)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Invite
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            Friendly Game Requests
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {pendingInvites.length}
            </span>
          </h2>
          
          <div className="space-y-4">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={invite.fromClubLogo || 'https://via.placeholder.com/32x32/6C63FF/FFFFFF?text=FC'}
                      alt={invite.fromClubName}
                      className="w-8 h-8 object-contain rounded border border-slate-600"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/32x32/6C63FF/FFFFFF?text=FC';
                      }}
                    />
                    <div>
                    <h3 className="text-white font-semibold">{invite.fromClubName}</h3>
                    <p className="text-slate-400 text-sm">wants to play a friendly match</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInvite(invite)}
                      disabled={simulating}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {simulating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Accept
                    </button>
                    
                    <button
                      onClick={() => handleDeclineInvite(invite)}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match History */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Game Results History
        </h2>
        
        {matchHistory.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No matches played yet</p>
        ) : (
          <div className="space-y-4">
            {matchHistory.map((match) => {
              // Format date to show only date part (e.g., "Sep 3, 2025")
              const matchDate = new Date(match.date);
              const formattedDate = matchDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              
              return (
                <div 
                  key={match.id}
                  onClick={() => setSelectedMatch(match)}
                  className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 cursor-pointer hover:border-purple-500/50 hover:bg-slate-700/50 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={match.homeClubLogo}
                        alt={match.homeClubName}
                        className="w-8 h-8 object-contain rounded border border-slate-600"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/32x32/6C63FF/FFFFFF?text=FC';
                        }}
                      />
                      <span className="text-white font-semibold">{match.homeClubName}</span>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-xl font-bold text-white mb-1">
                        {match.homeScore} - {match.awayScore}
                      </div>
                      <div className="text-slate-400 text-sm">
                        {match.matchType === 'friendly' && (
                          <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs mr-2">
                            FRIENDLY
                          </span>
                        )}
                        {formattedDate}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-white font-semibold">{match.awayClubName}</span>
                      <img
                        src={match.awayClubLogo}
                        alt={match.awayClubName}
                        className="w-8 h-8 object-contain rounded border border-slate-600"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/32x32/6C63FF/FFFFFF?text=FC';
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Match Details Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Match Details</h2>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedMatch.homeClubLogo}
                    alt={selectedMatch.homeClubName}
                    className="w-8 h-8 object-contain rounded border border-slate-600"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/32x32/6C63FF/FFFFFF?text=FC';
                    }}
                  />
                  <div className="text-center">
                    <div className="text-white font-semibold">{selectedMatch.homeClubName}</div>
                    <div className="text-slate-400 text-sm">Manager: {selectedMatch.homeManagerName}</div>
                  </div>
                </div>
                
                <div className="text-3xl font-bold text-white">
                  {selectedMatch.homeScore} - {selectedMatch.awayScore}
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-white font-semibold">{selectedMatch.awayClubName}</div>
                    <div className="text-slate-400 text-sm">Manager: {selectedMatch.awayManagerName}</div>
                  </div>
                  <img
                    src={selectedMatch.awayClubLogo}
                    alt={selectedMatch.awayClubName}
                    className="w-8 h-8 object-contain rounded border border-slate-600"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/32x32/6C63FF/FFFFFF?text=FC';
                    }}
                  />
                </div>
              </div>
              <p className="text-slate-400">
                {new Date(selectedMatch.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })} at {new Date(selectedMatch.date).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>

            {/* Goals */}
            {selectedMatch.goalscorers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-400" />
                  Goalscorers
                </h3>
                <div className="space-y-2">
                  {selectedMatch.goalscorers.map((goal, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={goal.isHome ? selectedMatch.homeClubLogo : selectedMatch.awayClubLogo}
                          alt={goal.isHome ? selectedMatch.homeClubName : selectedMatch.awayClubName}
                          className="w-6 h-6 object-contain rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/24x24/6C63FF/FFFFFF?text=FC';
                          }}
                        />
                        <span className="text-white">{goal.playerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{goal.minute}'</span>
                        <span className={`text-xs px-2 py-1 rounded ${goal.isHome ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                          {goal.isHome ? selectedMatch.homeClubName : selectedMatch.awayClubName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assists */}
            {selectedMatch.assists.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Assists
                </h3>
                <div className="space-y-2">
                  {selectedMatch.assists.map((assist, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={assist.isHome ? selectedMatch.homeClubLogo : selectedMatch.awayClubLogo}
                          alt={assist.isHome ? selectedMatch.homeClubName : selectedMatch.awayClubName}
                          className="w-6 h-6 object-contain rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/24x24/6C63FF/FFFFFF?text=FC';
                          }}
                        />
                        <span className="text-white">{assist.playerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{assist.minute}'</span>
                        <span className={`text-xs px-2 py-1 rounded ${assist.isHome ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                          {assist.isHome ? selectedMatch.homeClubName : selectedMatch.awayClubName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Cards */}
            {selectedMatch.cards.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  Cards
                </h3>
                <div className="space-y-2">
                  {selectedMatch.cards.map((card, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={card.isHome ? selectedMatch.homeClubLogo : selectedMatch.awayClubLogo}
                          alt={card.isHome ? selectedMatch.homeClubName : selectedMatch.awayClubName}
                          className="w-6 h-6 object-contain rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/24x24/6C63FF/FFFFFF?text=FC';
                          }}
                        />
                        <span className="text-white">{card.playerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{card.minute}'</span>
                        <div className={`w-4 h-5 rounded-sm ${card.type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                        <span className={`text-xs px-2 py-1 rounded ${card.isHome ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                          {card.isHome ? selectedMatch.homeClubName : selectedMatch.awayClubName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commentary */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-purple-400" />
                Match Commentary
              </h3>
              <div className="bg-slate-700/30 rounded-lg p-4 max-h-40 overflow-y-auto">
                {selectedMatch.commentary.map((comment, index) => (
                  <p key={index} className="text-slate-300 text-sm mb-2 last:mb-0">
                    {comment}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
   
}