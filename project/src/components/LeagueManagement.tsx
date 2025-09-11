import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GameSimulation } from './GameSimulation';
import { LeagueService } from '../services/leagueService';
import { ClubService } from '../services/clubService';
import { League, LeagueMatch, Club } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore'; // Add this line
import { 
  Trophy, 
  Users, 
  Calendar, 
  Target, 
  Medal,
  Clock,
  Play,
  Eye,
  X,
  AlertCircle,
  Star
} from 'lucide-react';

interface LeagueManagementProps {
  club: Club;
  onUpdateClub: (club: Club) => void;
}

export function LeagueManagement({ club, onUpdateClub }: LeagueManagementProps) {
  const { user } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [joiningLeague, setJoiningLeague] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [currentFixtureId, setCurrentFixtureId] = useState<string | null>(null);
  const [opponentClub, setOpponentClub] = useState<Club | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<LeagueMatch | null>(null);
  const [canPlayMatch, setCanPlayMatch] = useState<string | null>(null);

  useEffect(() => {
    if (club.serverId) {
      loadLeague();
    }
  }, [club.serverId]);

  const loadLeague = async () => {
    setLoading(true);
    try {
      const leagueData = await LeagueService.getLeagueByServerId(club.serverId);
      console.log('League data loaded:', leagueData); // Debug log
      setLeague(leagueData);
      
      // Check if user can play any matches - only if fixtures exist and league is started
      if (leagueData && leagueData.status === 'started' && leagueData.fixtures && leagueData.fixtures.length > 0) {
        const availableFixtures = leagueData.fixtures.filter(
          f => f.status === 'available' && f.homeClubId === club.id && canPlayToday(f.scheduledDate)
        );
        if (availableFixtures.length > 0) {
          setCanPlayMatch(availableFixtures[0].id);
        } else {
          setCanPlayMatch(null);
        }
      }
    } catch (error) {
      console.error('Error loading league:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayMatch = async (fixtureId: string) => {
    if (!league) return;
    
    try {
      // Get fixture details
      const fixture = league.fixtures.find(f => f.id === fixtureId);
      if (!fixture) throw new Error('Fixture not found');
      
      // Double-check match can be played today
      if (!canPlayToday(fixture.scheduledDate)) {
        throw new Error('Match date has not arrived yet');
      }
      
      // Check if match already played or being played
      if (fixture.status === 'played' || fixture.status === 'playing') {
        throw new Error('This match has already been played or is currently being played');
      }
      
      // Get opponent club
      const opponentClubId = fixture.homeClubId === club.id ? fixture.awayClubId : fixture.homeClubId;
      const clubsRef = collection(db, 'clubs');
      const clubsSnapshot = await getDocs(query(clubsRef, where('id', '==', opponentClubId)));
      
      if (clubsSnapshot.empty) throw new Error('Opponent club not found');
      const opponent = clubsSnapshot.docs[0].data() as Club;
      
      // Set up simulation
      setCurrentFixtureId(fixtureId);
      setOpponentClub(opponent);
      setShowSimulation(true);
    } catch (error) {
      console.error('Error setting up match:', error);
      alert('Error setting up match: ' + (error as Error).message);
    }
  };

  const handleMatchComplete = async (result: any) => {
    if (!league || !currentFixtureId) return;
    
    try {
      // Play the match in the league system
      const matchResult = await LeagueService.playMatch(currentFixtureId, league.id);
      
      // Update club with new player stamina
      const updatedClub = await ClubService.getUserClub(user!.uid);
      if (updatedClub) {
        onUpdateClub(updatedClub);
      }
      
      // Reload league data
      loadLeague();
      
      // Reset simulation state
      setShowSimulation(false);
      setCurrentFixtureId(null);
      setOpponentClub(null);
      
      // Show match result
      setSelectedMatch(matchResult);
    } catch (error) {
      console.error('Error playing match:', error);
      alert('Error playing match: ' + (error as Error).message);
    }
  };

  const handleJoinLeague = async () => {
    if (!league || !user) return;
    
    setJoiningLeague(true);
    try {
      await LeagueService.joinLeague(league.id, club.id, '');
      loadLeague();
    } catch (error) {
      console.error('Error joining league:', error);
      alert('Error joining league: ' + (error as Error).message);
    } finally {
      setJoiningLeague(false);
    }
  };

 const formatDate = (date: Date | string | any) => {
  try {
    // Handle Firestore timestamp
    if (date && typeof date === 'object' && date.toDate) {
      return date.toDate().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
    // Handle regular date
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'TBD';
  }
};

  const getRecentMatches = () => {
    if (!league || !league.matches || league.matches.length === 0) return [];
    // Return last 5 matches, sorted by most recent first
    return league.matches
      .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
      .slice(0, 5);
  };

  const getUpcomingFixtures = () => {
    if (!league || !league.fixtures || league.fixtures.length === 0) return [];
    return league.fixtures
      .filter(f => f.status === 'scheduled' || f.status === 'available')
      .sort((a, b) => {
        const dateA = a.scheduledDate && typeof a.scheduledDate === 'object' && a.scheduledDate.toDate 
          ? a.scheduledDate.toDate() 
          : new Date(a.scheduledDate);
        const dateB = b.scheduledDate && typeof b.scheduledDate === 'object' && b.scheduledDate.toDate 
          ? b.scheduledDate.toDate() 
          : new Date(b.scheduledDate);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
  };

  const handleBackFromSimulation = () => {
    setShowSimulation(false);
    setCurrentFixtureId(null);
    setOpponentClub(null);
  };

  const getDaysUntilMatch = (scheduledDate: Date | string | any): number | null => {
  try {
    const now = new Date();
    const matchDate = scheduledDate && typeof scheduledDate === 'object' && scheduledDate.toDate 
      ? scheduledDate.toDate() 
      : new Date(scheduledDate);
    
    // Reset time to compare only dates
    now.setHours(0, 0, 0, 0);
    matchDate.setHours(0, 0, 0, 0);
    
    const timeDiff = matchDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    return daysDiff > 0 ? daysDiff : 0; // Return 0 if match is today or past
  } catch (error) {
    console.error('Error calculating days until match:', error);
    return null;
  }
};

const canPlayToday = (scheduledDate: Date | string | any): boolean => {
  const daysLeft = getDaysUntilMatch(scheduledDate);
  return daysLeft === 0;
};

  if (showSimulation && currentFixtureId && opponentClub) {
    const fixture = league?.fixtures.find(f => f.id === currentFixtureId);
    const isHome = fixture?.homeClubId === club.id;
    
    return (
      <GameSimulation
        homeClub={isHome ? club : opponentClub}
        awayClub={isHome ? opponentClub : club}
        isLeagueMatch={true}
        onMatchComplete={handleMatchComplete}
        onBack={handleBackFromSimulation}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading league...</p>
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
        <Trophy className="w-16 h-16 text-slate-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No League Available</h2>
        <p className="text-slate-400">League not created yet for your server.</p>
      </div>
    );
  }

  if (league.status === 'created') {
    const isClubInLeague = league.clubs && league.clubs.some(c => c.id === club.id);
    
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
        <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">League Starting Soon</h2>
        <p className="text-slate-400 mb-4">Hold tight, the league will start soon.</p>
        <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
          <h3 className="text-white font-semibold mb-2">{league.name}</h3>
          <p className="text-slate-400 text-sm">
            {league.clubs ? league.clubs.length : 0}/{league.maxCapacity} clubs joined
          </p>
        </div>
        
        {!isClubInLeague && (
          <button
            onClick={handleJoinLeague}
            disabled={joiningLeague}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            {joiningLeague ? 'Joining...' : 'Join League'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* League Header */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">{league.name}</h1>
            <p className="text-slate-400">Match Day {league.currentMatchDay || 1}</p>
          </div>
        </div>

        {/* Prize Information */}
        {league.prizeDistribution && (
          <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Medal className="w-5 h-5 text-yellow-400" />
              Prize Distribution
            </h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-yellow-400 font-bold">${league.prizeDistribution.first?.toLocaleString()}</div>
                <div className="text-slate-400 text-xs">1st Place</div>
              </div>
              <div>
                <div className="text-slate-300 font-bold">${league.prizeDistribution.second?.toLocaleString()}</div>
                <div className="text-slate-400 text-xs">2nd Place</div>
              </div>
              <div>
                <div className="text-orange-400 font-bold">${league.prizeDistribution.third?.toLocaleString()}</div>
                <div className="text-slate-400 text-xs">3rd Place</div>
              </div>
              <div>
                <div className="text-slate-400 font-bold">${league.prizeDistribution.others?.toLocaleString()}</div>
                <div className="text-slate-400 text-xs">Others</div>
              </div>
            </div>
          </div>
        )}

        {/* Player Reward */}
        {league.playerReward && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-white font-semibold">Special Reward Player</div>
                <div className="text-purple-300">
                  {league.playerReward.name} - {league.playerReward.team}
                </div>
              </div>
            </div>
          </div>
        )}

{/* Available Match Alert */}
{canPlayMatch && (
  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Play className="w-5 h-5 text-green-400" />
        <span className="text-green-400 font-semibold">Match Available!</span>
      </div>
      {(() => {
        const fixture = league?.fixtures.find(f => f.id === canPlayMatch);
        const daysLeft = fixture ? getDaysUntilMatch(fixture.scheduledDate) : null;
        const canPlay = fixture ? canPlayToday(fixture.scheduledDate) : false;
        
        return (
          <button
            onClick={() => canPlay ? handlePlayMatch(canPlayMatch) : undefined}
            disabled={!canPlay}
            className={`font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 ${
              canPlay 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
          >
            {canPlay ? (
              <>
                <Play className="w-4 h-4" />
                Play Match
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                {daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
              </>
            )}
          </button>
        );
      })()}
    </div>
  </div>
)}
      </div>

      {/* League Table - Only show if leaderboard exists and has data */}
      {league.leaderboard && league.leaderboard.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            League Table
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left text-slate-300 font-medium py-3 px-2">POS</th>
                  <th className="text-left text-slate-300 font-medium py-3 px-2">CLUB</th>
                  <th className="text-center text-slate-300 font-medium py-3 px-2">P</th>
                  <th className="text-center text-slate-300 font-medium py-3 px-2">W</th>
                  <th className="text-center text-slate-300 font-medium py-3 px-2">D</th>
                  <th className="text-center text-slate-300 font-medium py-3 px-2">L</th>
                  <th className="text-center text-slate-300 font-medium py-3 px-2">⚽</th>
                  <th className="text-center text-slate-300 font-medium py-3 px-2">🛡️</th>
                  <th className="text-center text-slate-300 font-medium py-3 px-2">Diff</th>
                  <th className="text-center text-slate-300 font-medium py-3 px-2">🟨</th>
                  <th className="text-center text-slate-300 font-medium py-3 px-2">🟥</th>
                  <th className="text-center text-slate-300 font-medium py-3 px-2">PTS</th>
                </tr>
              </thead>
              <tbody>
                {league.leaderboard.map((team, index) => (
                  <tr 
                    key={team.clubId} 
                    className={`border-b border-slate-700/50 hover:bg-slate-700/20 ${
                      team.clubId === club.id ? 'bg-purple-500/10' : ''
                    }`}
                  >
                    <td className="py-3 px-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-slate-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={team.clubLogo || 'https://via.placeholder.com/24x24/6C63FF/FFFFFF?text=FC'}
                          alt={team.clubName}
                          className="w-6 h-6 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/24x24/6C63FF/FFFFFF?text=FC';
                          }}
                        />
                        <span className="text-white font-medium">{team.clubName}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-2 text-white">{team.played || 0}</td>
                    <td className="text-center py-3 px-2 text-green-400">{team.won || 0}</td>
                    <td className="text-center py-3 px-2 text-yellow-400">{team.drawn || 0}</td>
                    <td className="text-center py-3 px-2 text-red-400">{team.lost || 0}</td>
                    <td className="text-center py-3 px-2 text-white">{team.goalsFor || 0}</td>
                    <td className="text-center py-3 px-2 text-white">{team.goalsAgainst || 0}</td>
                    <td className={`text-center py-3 px-2 font-medium ${
                      (team.goalDifference || 0) > 0 ? 'text-green-400' :
                      (team.goalDifference || 0) < 0 ? 'text-red-400' : 'text-white'
                    }`}>
                      {(team.goalDifference || 0) > 0 ? '+' : ''}{team.goalDifference || 0}
                    </td>
                    <td className="text-center py-3 px-2 text-yellow-400">{team.yellowCards || 0}</td>
                    <td className="text-center py-3 px-2 text-red-400">{team.redCards || 0}</td>
                    <td className="text-center py-3 px-2 text-white font-bold">{team.points || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state for when league is started but no leaderboard yet */}
      {league.status === 'started' && (!league.leaderboard || league.leaderboard.length === 0) && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
          <Trophy className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">League Started!</h2>
          <p className="text-slate-400">Matches will appear here once they begin.</p>
        </div>
      )}

      {/* Stats Tables - Only show if data exists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Scorers */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-red-400" />
            Top Scorers
          </h3>
          
          {!league.topScorers || league.topScorers.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No goals scored yet</p>
          ) : (
            <div className="space-y-3">
              {league.topScorers.slice(0, 5).map((scorer, index) => (
                <div key={scorer.playerId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <img
                      src={scorer.clubLogo}
                      alt={scorer.clubName}
                      className="w-5 h-5 object-contain"
                    />
                    <div>
                      <div className="text-white font-medium">{scorer.playerName}</div>
                      <div className="text-slate-400 text-xs">{scorer.clubName}</div>
                    </div>
                  </div>
                  <div className="text-white font-bold">{scorer.goals}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Assists */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Top Assists
          </h3>
          
          {!league.topAssists || league.topAssists.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No assists recorded yet</p>
          ) : (
            <div className="space-y-3">
              {league.topAssists.slice(0, 5).map((assister, index) => (
                <div key={assister.playerId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <img
                      src={assister.clubLogo}
                      alt={assister.clubName}
                      className="w-5 h-5 object-contain"
                    />
                    <div>
                      <div className="text-white font-medium">{assister.playerName}</div>
                      <div className="text-slate-400 text-xs">{assister.clubName}</div>
                    </div>
                  </div>
                  <div className="text-white font-bold">{assister.assists}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Today's Matches */}
      {getRecentMatches().length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-green-400" />
            Recent Results
          </h3>
          
          <div className="space-y-3">
            {getRecentMatches().map((match) => (
              <div 
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 cursor-pointer hover:border-purple-500/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={match.homeClubLogo}
                      alt={match.homeClubName}
                      className="w-6 h-6 object-contain"
                    />
                    <span className="text-white font-medium">{match.homeClubName}</span>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">
                      {match.homeScore} - {match.awayScore}
                    </div>
                    <div className="text-slate-400 text-xs">
                      Match Day {match.matchDay} • {formatDate(match.playedAt)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{match.awayClubName}</span>
                    <img
                      src={match.awayClubLogo}
                      alt={match.awayClubName}
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Fixtures */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-400" />
          Upcoming Fixtures
        </h3>
        
        {getUpcomingFixtures().length === 0 ? (
          <p className="text-slate-400 text-center py-4">No upcoming fixtures</p>
        ) : (
          <div className="space-y-3">
            {getUpcomingFixtures().map((fixture) => (
              <div key={fixture.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={fixture.homeClubLogo}
                      alt={fixture.homeClubName}
                      className="w-6 h-6 object-contain"
                    />
                    <span className="text-white font-medium">{fixture.homeClubName}</span>
                  </div>
                  
                  <div className="text-center">
                    {fixture.status === 'played' && fixture.result ? (
                      <div 
                        className="text-xl font-bold text-white cursor-pointer hover:text-purple-300 transition-colors"
                        onClick={() => {
                          const match = league.matches.find(m => m.fixtureId === fixture.id);
                          if (match) setSelectedMatch(match);
                        }}
                      >
                        {fixture.result.homeScore} - {fixture.result.awayScore}
                      </div>
                    ) : fixture.status === 'playing' ? (
                      <div className="text-yellow-400 text-sm font-medium animate-pulse">
                        LIVE
                      </div>
                    ) : (
                      <div className="text-slate-400 text-sm">vs</div>
                    )}
                    <div className="text-slate-400 text-xs">
                      {fixture.scheduledDate ? formatDate(fixture.scheduledDate) : 'TBD'}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{fixture.awayClubName}</span>
                    <img
                      src={fixture.awayClubLogo}
                      alt={fixture.awayClubName}
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                </div>
                
                {fixture.status === 'available' && fixture.homeClubId === club.id && !fixture.result && (
  <div className="mt-3 text-center">
    {(() => {
      const daysLeft = getDaysUntilMatch(fixture.scheduledDate);
      const canPlay = canPlayToday(fixture.scheduledDate);
      
      return (
        <button
          onClick={() => canPlay ? handlePlayMatch(fixture.id) : undefined}
          disabled={!canPlay}
          className={`font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 mx-auto text-sm ${
            canPlay 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
          }`}
        >
          {canPlay ? (
            <>
              <Play className="w-4 h-4" />
              Play Match
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              {daysLeft === 0 ? 'Available today' : 
               daysLeft === 1 ? '1 day left' : 
               `${daysLeft} days left`}
            </>
          )}
        </button>
      );
    })()}
  </div>
)}
                
                {fixture.status === 'playing' && (
                  <div className="mt-3 text-center">
                    <div className="text-yellow-400 text-sm font-medium animate-pulse">
                      Match in Progress...
                    </div>
                  </div>
                )}
              </div>
            ))}
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
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedMatch.homeClubLogo}
                    alt={selectedMatch.homeClubName}
                    className="w-8 h-8 object-contain"
                  />
                  <div className="text-center">
                    <div className="text-white font-semibold">{selectedMatch.homeClubName}</div>
                  </div>
                </div>
                
                <div className="text-3xl font-bold text-white">
                  {selectedMatch.homeScore} - {selectedMatch.awayScore}
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-white font-semibold">{selectedMatch.awayClubName}</div>
                  </div>
                  <img
                    src={selectedMatch.awayClubLogo}
                    alt={selectedMatch.awayClubName}
                    className="w-8 h-8 object-contain"
                  />
                </div>
              </div>
              <p className="text-slate-400">
                Match Day {selectedMatch.matchDay} • {formatDate(selectedMatch.playedAt)}
              </p>
            </div>

            {/* Goals */}
            {selectedMatch.goalscorers && selectedMatch.goalscorers.length > 0 && (
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
                          className="w-5 h-5 object-contain"
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

            {/* Cards */}
            {selectedMatch.cards && selectedMatch.cards.length > 0 && (
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
                          className="w-5 h-5 object-contain"
                        />
                        <span className="text-white">{card.playerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{card.minute}'</span>
                        <div className={`w-4 h-5 rounded-sm ${card.type === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commentary */}
            {selectedMatch.commentary && selectedMatch.commentary.length > 0 && (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}