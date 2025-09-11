import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdminService } from '../services/adminService';
import { Club, League, Server } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Shield, 
  Users, 
  Trophy, 
  Settings, 
  Trash2, 
  Edit, 
  Plus, 
  LogOut,
  Euro,
  RotateCcw,
  Eye,
  X,
  Save,
  Server as ServerIcon,
  Lock,
  EyeOff,
  Play
} from 'lucide-react';

export function AdminDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'clubs' | 'leagues' | 'servers'>('clubs');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [availableRewardPlayers, setAvailableRewardPlayers] = useState<{id: number, name: string, team: string}[]>([]);
  const [showServerPasswords, setShowServerPasswords] = useState<{[key: string]: boolean}>({});

  // League creation form
  const [leagueName, setLeagueName] = useState('');
  const [leaguePassword, setLeaguePassword] = useState('');
  const [selectedServerId, setSelectedServerId] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(8);
  const [prizeDistribution, setPrizeDistribution] = useState({
    first: 500000,
    second: 300000,
    third: 150000,
    others: 50000
  });
  const [selectedRewardPlayer, setSelectedRewardPlayer] = useState<{id: number, name: string, team: string} | null>(null);

  // Server creation form
  const [serverName, setServerName] = useState('');
  const [serverPassword, setServerPassword] = useState('');
  const [serverMaxCapacity, setServerMaxCapacity] = useState(8);

  useEffect(() => {
    loadData();
    loadRewardPlayers();
  }, []);

  const loadRewardPlayers = async () => {
    try {
      const response = await fetch('/teams/les_equipes.json');
      const teamsData = await response.json();
      
      const players: {id: number, name: string, team: string}[] = [];
      Object.entries(teamsData.teams).forEach(([teamKey, team]: [string, any]) => {
        team.players.forEach((player: any) => {
          players.push({
            id: player.id,
            name: player.name,
            team: teamKey
          });
        });
      });
      
      setAvailableRewardPlayers(players);
    } catch (error) {
      console.error('Failed to load reward players:', error);
    }
  };

  const loadData = async () => {
  console.log('Debug - loadData function called');
  setLoading(true);
  console.log('Debug - loading set to true');
  try {
    console.log('Debug - about to call AdminService methods');
    const [clubsData, leaguesData, serversData] = await Promise.all([
      AdminService.getAllClubs(),
      AdminService.getAllLeagues(),
      AdminService.getAllServers()
    ]);
    console.log('Debug - AdminService calls completed');
    setClubs(clubsData);
    setLeagues(leaguesData);
    setServers(serversData);
    console.log('Debug - servers loaded:', serversData);
    console.log('Debug - servers count:', serversData.length);
  } catch (error) {
    console.error('Failed to load admin data:', error);
    console.log('Debug - error occurred:', error);
  } finally {
    setLoading(false);
    console.log('Debug - loading set to false');
  }
};

  const handleDeleteClub = async (clubId: string) => {
    if (confirm('Are you sure you want to delete this club? This action cannot be undone.')) {
      try {
        await AdminService.deleteClub(clubId);
        loadData();
      } catch (error) {
        console.error('Failed to delete club:', error);
      }
    }
  };

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueName.trim() || !leaguePassword.trim() || !selectedServerId) {
      alert('Please fill in league name, password, and select a server');
      return;
    }

    try {
      await AdminService.createLeague({
        name: leagueName,
        password: leaguePassword,
        serverId: selectedServerId,
        maxCapacity,
        prizeDistribution,
        playerReward: selectedRewardPlayer ? {
          id: selectedRewardPlayer.id,
          name: selectedRewardPlayer.name,
          team: selectedRewardPlayer.team
        } : undefined
      });
      
      setShowCreateLeague(false);
      setLeagueName('');
      setLeaguePassword('');
      setSelectedServerId('');
      setMaxCapacity(8);
      setPrizeDistribution({
        first: 500000,
        second: 300000,
        third: 150000,
        others: 50000
      });
      setSelectedRewardPlayer(null);
      loadData();
    } catch (error) {
      console.error('Failed to create league:', error);
      alert('Failed to create league. Please try again.');
    }
  };

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim() || !serverPassword.trim()) {
      alert('Please fill in server name and password');
      return;
    }

    try {
      await AdminService.createServer(serverName, serverPassword, serverMaxCapacity);
      
      setShowCreateServer(false);
      setServerName('');
      setServerPassword('');
      setServerMaxCapacity(8);
      loadData();
    } catch (error) {
      console.error('Failed to create server:', error);
      alert('Failed to create server. Please try again.');
    }
  };

  const handleUpdateServer = async () => {
    if (!editingServer) return;
    
    try {
      await AdminService.updateServer(editingServer.id, {
        name: editingServer.name,
        password: editingServer.password,
        maxCapacity: editingServer.maxCapacity
      });
      setEditingServer(null);
      loadData();
    } catch (error) {
      console.error('Failed to update server:', error);
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    if (confirm('Are you sure you want to delete this server? This will also delete all clubs in this server. This action cannot be undone.')) {
      try {
        await AdminService.deleteServer(serverId);
        loadData();
      } catch (error) {
        console.error('Failed to delete server:', error);
      }
    }
  };

  const toggleServerPassword = (serverId: string) => {
    setShowServerPasswords(prev => ({
      ...prev,
      [serverId]: !prev[serverId]
    }));
  };

  const handleResetLeague = async (leagueId: string) => {
    if (confirm('Are you sure you want to reset this league? All stats and leaderboard data will be cleared.')) {
      try {
        await AdminService.resetLeague(leagueId);
        loadData();
      } catch (error) {
        console.error('Failed to reset league:', error);
      }
    }
  };

  const handleSaveClubEdit = async () => {
    if (!editingClub) return;
    
    try {
      await AdminService.updateClub(editingClub);
      setEditingClub(null);
      loadData();
    } catch (error) {
      console.error('Failed to update club:', error);
    }
  };

  const handleStartLeague = async (leagueId: string) => {
    try {
      await AdminService.startLeague(leagueId);
      loadLeagues();
    } catch (error) {
      console.error('Error starting league:', error);
    }
  };

  const handleStopLeague = async (leagueId: string) => {
    if (confirm('Are you sure you want to stop this league?')) {
      try {
        await AdminService.terminateLeague(leagueId);
        loadLeagues();
      } catch (error) {
        console.error('Error stopping league:', error);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}m`;
    }
    return `€${(amount / 1000).toFixed(0)}k`;
  };

  const getPositionCounts = (players: any[]) => {
    const counts = { goalkeepers: 0, defenders: 0, midfielders: 0, attackers: 0 };
    players.forEach(player => {
      if (!player || !player.position || typeof player.position !== 'string') return;
      
      if (player.position === 'Goalkeeper') counts.goalkeepers++;
      else if (player.position.includes('Back')) counts.defenders++;
      else if (player.position.includes('Midfield')) counts.midfielders++;
      else counts.attackers++;
    });
    return counts;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-slate-400">Football Manager Administration</p>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('clubs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === 'clubs'
                  ? 'bg-red-600/20 text-red-300 border border-red-500/30'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Clubs Management
            </button>
            <button
              onClick={() => setActiveTab('leagues')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === 'leagues'
                  ? 'bg-red-600/20 text-red-300 border border-red-500/30'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4" />
              League Management
            </button>
            <button
              onClick={() => setActiveTab('servers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === 'servers'
                  ? 'bg-red-600/20 text-red-300 border border-red-500/30'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <ServerIcon className="w-4 h-4" />
              Server Management
            </button>
          </div>
        </div>

        {/* Clubs Management */}
        {activeTab === 'clubs' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Clubs Management</h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-slate-400">Loading clubs...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {clubs.map((club) => {
                  const positionCounts = getPositionCounts(club.players);
                  return (
                    <div key={club.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between">
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
                            <h3 className="text-white font-semibold">{club.clubName}</h3>
                            <p className="text-slate-400 text-sm">Manager: {club.managerName}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-green-400 text-sm">{formatCurrency(club.budget || 300000)}</span>
                              <span className="text-slate-400 text-sm">
                                {club.players.length} players (GK:{positionCounts.goalkeepers} DEF:{positionCounts.defenders} MID:{positionCounts.midfielders} ATT:{positionCounts.attackers})
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedClub(club)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => setEditingClub(club)}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClub(club.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* League Management */}
        {activeTab === 'leagues' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">League Management</h2>
                <button
                  onClick={() => setShowCreateLeague(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create League
                </button>
              </div>
              
              {leagues.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No leagues created yet</p>
              ) : (
                <div className="space-y-4">
                  {leagues.map((league) => (
                    <div key={league.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-semibold">{league.name}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-blue-400 text-sm">Server: {servers.find(s => s.id === league.serverId)?.name || 'Unknown'}</span>
                            <span className="text-green-400 text-sm">1st: {formatCurrency(league.prizeDistribution?.first || league.prizeMoney)}</span>
                            <span className="text-slate-400 text-sm">Max: {league.maxCapacity || 8} clubs</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              (league.status || 'created') === 'created' ? 'bg-yellow-500/20 text-yellow-300' :
                              (league.status || 'created') === 'started' ? 'bg-green-500/20 text-green-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {(league.status || 'created').charAt(0).toUpperCase() + (league.status || 'created').slice(1)}
                            </span>
                            {league.playerReward && typeof league.playerReward === 'object' && (
                              <span className="text-yellow-400 text-sm">Reward: {league.playerReward.name}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {(league.status || 'created') === 'created' && (league.clubs || []).length >= 2 && (
                            <button
                              onClick={() => AdminService.startLeague(league.id).then(() => loadData())}
                              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <Play className="w-4 h-4" />
                              Start League
                            </button>
                          )}
                          
                          {(league.status || 'created') === 'started' && (
                            <button
                              onClick={() => AdminService.terminateLeague(league.id).then(() => loadData())}
                              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <Trophy className="w-4 h-4" />
                              End League
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleResetLeague(league.id)}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Server Management */}
        {activeTab === 'servers' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
           <div className="flex items-center justify-between mb-6">
  <h2 className="text-xl font-bold text-white">Server Management</h2>
  <div className="flex gap-2">
    <button
      onClick={async () => {
        try {
          console.log('=== TESTING SERVER ACCESS ===');
          const serversRef = collection(db, 'servers');
          const snapshot = await getDocs(serversRef);
          const servers = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
          console.log('Direct Firebase servers:', servers);
          console.log('Servers count:', servers.length);
          alert(`Found ${servers.length} servers - check console for details`);
        } catch (error) {
          console.error('Test error:', error);
          alert('Error: ' + error.message);
        }
      }}
      className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg"
    >
      Test Server Access
    </button>
    <button
      onClick={() => setShowCreateServer(true)}
      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
    >
      <Plus className="w-4 h-4" />
      Create Server
    </button>
  </div>
</div>
            
            {servers.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No servers created yet</p>
            ) : (
              <div className="space-y-4">
                {servers.map((server) => (
                  <div key={server.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-semibold text-lg">{server.name}</h3>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            server.currentClubs >= server.maxCapacity ? 'bg-red-500/20 text-red-300' :
                            server.currentClubs >= server.maxCapacity * 0.8 ? 'bg-orange-500/20 text-orange-300' :
                            'bg-green-500/20 text-green-300'
                          }`}>
                            {server.currentClubs >= server.maxCapacity ? 'Full' :
                             server.currentClubs >= server.maxCapacity * 0.8 ? 'Almost Full' : 'Available'}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-400 text-sm">Password:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-mono text-sm">
                                {showServerPasswords[server.id] ? server.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleServerPassword(server.id)}
                                className="text-slate-400 hover:text-white transition-colors"
                              >
                                {showServerPasswords[server.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-400 text-sm">Capacity:</span>
                            <span className="text-white font-medium">
                              {server.currentClubs}/{server.maxCapacity}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">Created:</span>
                            <span className="text-white text-sm">
                              {new Date(server.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                server.currentClubs >= server.maxCapacity ? 'bg-red-500' :
                                server.currentClubs >= server.maxCapacity * 0.8 ? 'bg-orange-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${(server.currentClubs / server.maxCapacity) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setEditingServer(server)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteServer(server.id)}
                          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Club Details Modal */}
        {selectedClub && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedClub.clubLogo}
                    alt={selectedClub.clubName}
                    className="w-12 h-12 object-contain rounded-lg border-2 border-slate-600"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedClub.clubName}</h2>
                    <p className="text-slate-400">Manager: {selectedClub.managerName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClub(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Euro className="w-4 h-4 text-green-400" />
                    <span className="text-slate-300">Budget</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {formatCurrency(selectedClub.budget || 300000)}
                  </div>
                </div>
                
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-slate-300">Squad Size</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-400">
                    {selectedClub.players.length} Players
                  </div>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="text-slate-300">Created</span>
                  </div>
                  <div className="text-sm text-yellow-400">
                    {new Date(selectedClub.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

  
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Squad</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {selectedClub.players.map((player) => (
                    <div key={player.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={player.image_url}
                          alt={player.name}
                          className="w-10 h-10 rounded-lg object-cover border-2 border-slate-600"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/40x40/6C63FF/FFFFFF?text=P';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm truncate">{player.name}</div>
                          <div className="text-slate-400 text-xs">{player.position}</div>
                          <div className="text-yellow-400 text-xs">{player.market_value || 'Free'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white text-sm font-bold">#{player.number || '?'}</div>
                          <div className={`text-xs ${
                            player.squadPosition === 'starter' ? 'text-green-400' :
                            player.squadPosition === 'substitute' ? 'text-yellow-400' : 'text-slate-400'
                          }`}>
                            {player.squadPosition}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Club Modal */}
        {editingClub && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Edit Club</h2>
                <button
                  onClick={() => setEditingClub(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Club Name</label>
                  <input
                    type="text"
                    value={editingClub.clubName}
                    onChange={(e) => setEditingClub({...editingClub, clubName: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Manager Name</label>
                  <input
                    type="text"
                    value={editingClub.managerName}
                    onChange={(e) => setEditingClub({...editingClub, managerName: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Budget</label>
                  <input
                    type="number"
                    value={editingClub.budget || 300000}
                    onChange={(e) => setEditingClub({...editingClub, budget: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingClub(null)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveClubEdit}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Server Modal */}
        {showCreateServer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Create Server</h2>
                <button
                  onClick={() => setShowCreateServer(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateServer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Server Name</label>
                  <input
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                    placeholder="Enter server name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                  <input
                    type="text"
                    value={serverPassword}
                    onChange={(e) => setServerPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                    placeholder="Enter server password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Max Capacity</label>
                  <select
                    value={serverMaxCapacity}
                    onChange={(e) => setServerMaxCapacity(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num} clubs</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateServer(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Server Modal */}
        {editingServer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Edit Server</h2>
                <button
                  onClick={() => setEditingServer(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Server Name</label>
                  <input
                    type="text"
                    value={editingServer.name}
                    onChange={(e) => setEditingServer({...editingServer, name: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                  <input
                    type="text"
                    value={editingServer.password}
                    onChange={(e) => setEditingServer({...editingServer, password: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Max Capacity</label>
                  <select
                    value={editingServer.maxCapacity}
                    onChange={(e) => setEditingServer({...editingServer, maxCapacity: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num} clubs</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingServer(null)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateServer}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create League Modal */}
        {showCreateLeague && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Create League</h2>
                <button
                  onClick={() => setShowCreateLeague(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateLeague} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">League Name</label>
                    <input
                      type="text"
                      value={leagueName}
                      onChange={(e) => setLeagueName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                      placeholder="Enter league name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                    <input
                      type="text"
                      value={leaguePassword}
                      onChange={(e) => setLeaguePassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                      placeholder="Enter league password"
                      required
                    />
                  </div>
                </div>

                           <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Server</label>
                <select
                  value={selectedServerId}
                  onChange={(e) => setSelectedServerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                  required
                >
                  <option value="">Select a server</option>
                  {servers.map(server => (
                    <option key={server.id} value={server.id}>
                      {server.name} ({server.currentClubs}/{server.maxCapacity} clubs)
                    </option>
                  ))}
                </select>
              </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Max Capacity</label>
                  <select
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num} clubs</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Prize Distribution</label>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-300 text-sm">1st Place</span>
                        <span className="text-yellow-400 font-semibold">{formatCurrency(prizeDistribution.first)}</span>
                      </div>
                      <input
                        type="range"
                        min="100000"
                        max="5000000"
                        step="50000"
                        value={prizeDistribution.first}
                        onChange={(e) => setPrizeDistribution({...prizeDistribution, first: parseInt(e.target.value)})}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-300 text-sm">2nd Place</span>
                        <span className="text-slate-400 font-semibold">{formatCurrency(prizeDistribution.second)}</span>
                      </div>
                      <input
                        type="range"
                        min="50000"
                        max="3000000"
                        step="25000"
                        value={prizeDistribution.second}
                        onChange={(e) => setPrizeDistribution({...prizeDistribution, second: parseInt(e.target.value)})}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-300 text-sm">3rd Place</span>
                        <span className="text-orange-400 font-semibold">{formatCurrency(prizeDistribution.third)}</span>
                      </div>
                      <input
                        type="range"
                        min="25000"
                        max="1000000"
                        step="25000"
                        value={prizeDistribution.third}
                        onChange={(e) => setPrizeDistribution({...prizeDistribution, third: parseInt(e.target.value)})}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-300 text-sm">Other Participants</span>
                        <span className="text-slate-500 font-semibold">{formatCurrency(prizeDistribution.others)}</span>
                      </div>
                      <input
                        type="range"
                        min="10000"
                        max="200000"
                        step="10000"
                        value={prizeDistribution.others}
                        onChange={(e) => setPrizeDistribution({...prizeDistribution, others: parseInt(e.target.value)})}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Player Reward (Optional)</label>
                  <select
                    value={selectedRewardPlayer?.id || ''}
                    onChange={(e) => {
                      const playerId = parseInt(e.target.value);
                      const player = availableRewardPlayers.find(p => p.id === playerId);
                      setSelectedRewardPlayer(player || null);
                    }}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">No player reward</option>
                    {availableRewardPlayers.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.name} ({player.team.replace(/_/g, ' ').toUpperCase()})
                      </option>
                    ))}
                  </select>
                  {selectedRewardPlayer && (
                    <p className="text-yellow-400 text-sm mt-2">
                      Winner will receive: {selectedRewardPlayer.name}
                    </p>
                  )}
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">League Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Clubs:</span>
                      <span className="text-white">{maxCapacity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Prize Pool:</span>
                      <span className="text-green-400 font-semibold">
                        {formatCurrency(prizeDistribution.first + prizeDistribution.second + prizeDistribution.third + prizeDistribution.others)}
                      </span>
                    </div>
                    {selectedRewardPlayer && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Player Reward:</span>
                        <span className="text-yellow-400">{selectedRewardPlayer.name} ({selectedRewardPlayer.team.replace(/_/g, ' ').toUpperCase()})</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateLeague(false);
                      setLeagueName('');
                      setLeaguePassword('');
                      setSelectedServerId('');
                      setMaxCapacity(8);
                      setPrizeDistribution({
                        first: 500000,
                        second: 300000,
                        third: 150000,
                        others: 50000
                      });
                      setSelectedRewardPlayer(null);
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create League
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 