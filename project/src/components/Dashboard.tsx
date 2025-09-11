import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SquadManagement } from './SquadManagement';
import { FriendlyGames } from './FriendlyGames';
import { LeagueManagement } from './LeagueManagement';
import { Transfers } from './Transfers';
import { FriendlyService } from '../services/friendlyService';
import { ClubService } from '../services/clubService';
import { Club, Player } from '../types';
import { Trophy, Users, LogOut, Star, Menu, X, Gamepad2, ArrowLeftRight, Euro } from 'lucide-react';

interface DashboardProps {
  club: Club;
  onUpdateClub: (updatedClub: Club) => void;
}

interface PlayerCardProps {
  player: Player;
  kitColor: string;
  isStarter?: boolean;
}

function PlayerCard({ player, kitColor, isStarter }: PlayerCardProps) {
  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
      <div className="relative w-10 h-10 flex-shrink-0">
        {player.image_url ? (
          <img
            src={player.image_url}
            alt={player.name}
            className="w-10 h-10 rounded-full object-cover border-2 border-white"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white ${!player.image_url ? 'flex' : 'hidden'}`}
          style={{ backgroundColor: kitColor }}
        >
          {getInitials(player.name)}
        </div>
        {player.number && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
            <span className="text-slate-800 text-xs font-bold">{player.number}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium truncate">{player.name}</span>
          {player.captain && <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
        </div>
        <div className="text-slate-400 text-sm">{player.position}</div>
      </div>
      {isStarter && (
        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
      )}
    </div>
  );
}

export function Dashboard({ club, onUpdateClub }: DashboardProps) {
  const { logout } = useAuth();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'overview' | 'squad' | 'league' | 'friendlies' | 'transfers'>('overview');
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [pendingInvitesCount, setPendingInvitesCount] = React.useState(0);
  const [budget, setBudget] = React.useState(300000);

  React.useEffect(() => {
    if (user) {
      loadPendingInvites();
      loadBudget();
    }
  }, [user]);

  const loadPendingInvites = async () => {
    if (!user) return;
    try {
      const invites = await FriendlyService.getPendingInvites(user.uid);
      setPendingInvitesCount(invites.length);
    } catch (error) {
      console.error('Failed to load pending invites:', error);
    }
  };

  const loadBudget = async () => {
    try {
      const currentBudget = await ClubService.getClubBudget(club.id);
      setBudget(currentBudget);
    } catch (error) {
      console.error('Failed to load budget:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const getPositionCounts = () => {
    const counts = {
      goalkeepers: 0,
      defenders: 0,
      midfielders: 0,
      attackers: 0
    };

    club.players.forEach(player => {
      if (!player?.position || typeof player.position !== 'string') return;
      
      if (player.position === 'Goalkeeper') counts.goalkeepers++;
      else if (player.position.includes('Back')) counts.defenders++;
      else if (player.position.includes('Midfield')) counts.midfielders++;
      else counts.attackers++;
    });

    return counts;
  };

  const formatBudget = (amount: number) => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}m`;
    }
    return `€${(amount / 1000).toFixed(0)}k`;
  };

  const positionCounts = getPositionCounts();
  const captain = club.players.find(p => p.captain);
  const starters = club.players.filter(p => p.squadPosition === 'starter');
  const substitutes = club.players.filter(p => p.squadPosition === 'substitute');
  const reserves = club.players.filter(p => p.squadPosition === 'reserve');

  const navigation = [
    { id: 'overview', name: 'Overview', icon: Trophy },
    { id: 'squad', name: 'Squad', icon: Users },
    { id: 'league', name: 'League', icon: Trophy },
    { id: 'friendlies', name: 'Friendly Games', icon: Gamepad2, badge: pendingInvitesCount },
    { id: 'transfers', name: 'Transfers', icon: ArrowLeftRight },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Header */}
        <header className="flex items-center justify-between mb-6 lg:hidden">
          <div className="flex items-center gap-4">
            <img
              src={club.clubLogo}
              alt={club.clubName}
              className="w-12 h-12 object-contain rounded-lg border-2 border-slate-600"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/48x48/6C63FF/FFFFFF?text=FC';
              }}
            />
            <div>
              <h1 className="text-xl font-bold text-white">{club.clubName}</h1>
              <p className="text-slate-400 text-sm">Manager: {club.managerName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              onClick={handleLogout}
              className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block fixed lg:relative inset-y-0 left-0 z-50 w-64 lg:w-64`}>
            <div className="h-full bg-slate-800/50 border border-slate-700 rounded-xl p-6 lg:sticky lg:top-4">
              {/* Desktop Header */}
              <div className="hidden lg:block mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={club.clubLogo}
                    alt={club.clubName}
                    className="w-12 h-12 object-contain rounded-lg border-2 border-slate-600"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/48x48/6C63FF/FFFFFF?text=FC';
                    }}
                  />
                  <div>
                    <h1 className="text-lg font-bold text-white">{club.clubName}</h1>
                    <p className="text-slate-400 text-sm">Manager: {club.managerName}</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-2 mb-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as 'overview' | 'squad' | 'league' | 'friendlies' | 'transfers');
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                        activeTab === item.id
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        {item.name}
                      </div>
                      {item.badge && item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                          {item.badge}
                          <div className="text-xs mt-1">New signings go here when squad is full</div>
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>

          {/* Overlay for mobile */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'overview' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{positionCounts.goalkeepers}</div>
                        <div className="text-slate-400 text-sm">Goalkeepers</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{positionCounts.defenders}</div>
                        <div className="text-slate-400 text-sm">Defenders</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{positionCounts.midfielders}</div>
                        <div className="text-slate-400 text-sm">Midfielders</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{positionCounts.attackers}</div>
                        <div className="text-slate-400 text-sm">Attackers</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    Club Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h3 className="text-slate-300 font-medium mb-2">Club Colors</h3>
                      <div className="flex gap-3">
                        <div className="text-center">
                          <div 
                            className="w-12 h-12 rounded-lg border-2 border-white mb-1"
                            style={{ backgroundColor: club.colors.home }}
                          />
                          <span className="text-xs text-slate-400">Home</span>
                        </div>
                        <div className="text-center">
                          <div 
                            className="w-12 h-12 rounded-lg border-2 border-white mb-1"
                            style={{ backgroundColor: club.colors.away }}
                          />
                          <span className="text-xs text-slate-400">Away</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-slate-300 font-medium mb-2">Squad Size</h3>
                      <div className="text-2xl font-bold text-white">{club.players.length} Players</div>
                      <div className="text-slate-400 text-sm">{starters.length} Starters + {substitutes.length} Subs + {reserves.length} Reserves</div>
                    </div>

                    <div>
                      <h3 className="text-slate-300 font-medium mb-2">Budget</h3>
                      <div className="flex items-center gap-2">
                        <Euro className="w-4 h-4 text-green-400" />
                        <span className="text-2xl font-bold text-green-400">{formatBudget(budget)}</span>
                      </div>
                      <div className="text-slate-400 text-sm">Available funds</div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      Your Squad
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full" />
                        Starting XI
                      </h3>
                      <div className="space-y-3">
                        {starters.map((player) => (
                          <PlayerCard 
                            key={player.id} 
                            player={player} 
                            kitColor={club.colors.home}
                            isStarter={true}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                        Substitutes
                      </h3>
                      <div className="space-y-3">
                        {substitutes.map((player) => (
                          <PlayerCard 
                            key={player.id} 
                            player={player} 
                            kitColor={club.colors.away}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <div className="w-3 h-3 bg-slate-500 rounded-full" />
                        Reserves ({reserves.length}/6)
                      </h3>
                      <div className="space-y-3">
                        {reserves.map((player) => (
                          <PlayerCard 
                            key={player.id} 
                            player={player} 
                            kitColor={club.colors.home}
                          />
                        ))}
                        {reserves.length === 0 && (
                          <div className="text-slate-400 text-sm text-center py-4 border-2 border-dashed border-slate-600 rounded-lg">
                            No reserve players
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-slate-400 text-sm">
                    Welcome to Football Manager! Your club has been created with a unique squad of {club.players.length} players.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'squad' && (
              <SquadManagement club={club} onUpdateClub={onUpdateClub} />
            )}

            {activeTab === 'league' && (
              <LeagueManagement club={club} onUpdateClub={onUpdateClub} />
            )}

            {activeTab === 'friendlies' && (
              <FriendlyGames club={club} onUpdateClub={onUpdateClub} />
            )}

            {activeTab === 'transfers' && (
              <Transfers club={club} onUpdateClub={onUpdateClub} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}