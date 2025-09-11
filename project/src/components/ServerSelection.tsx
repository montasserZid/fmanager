import React, { useState, useEffect } from 'react';
import { ServerService } from '../services/serverService';
import { Server } from '../types';
import { Server as ServerIcon, Lock, Users, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface ServerSelectionProps {
  onServerJoined: (serverId: string) => void;
}

export function ServerSelection({ onServerJoined }: ServerSelectionProps) {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setLoading(true);
    try {
      const serversData = await ServerService.getAllServers();
      setServers(serversData);
    } catch (error) {
      console.error('Failed to load servers:', error);
      setError('Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServer || !password.trim()) {
      setError('Please select a server and enter the password');
      return;
    }

    setJoining(true);
    setError('');

    try {
      await ServerService.joinServer(selectedServer.id, password);
      onServerJoined(selectedServer.id);
    } catch (err: any) {
      setError(err.message || 'Failed to join server');
    } finally {
      setJoining(false);
    }
  };

  const getServerStatus = (server: Server) => {
    if (server.currentClubs >= server.maxCapacity) {
      return { text: 'Full', color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/30' };
    }
    if (server.currentClubs >= server.maxCapacity * 0.8) {
      return { text: 'Almost Full', color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/30' };
    }
    return { text: 'Available', color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/30' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading servers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-yellow-500 rounded-full mb-4">
              <ServerIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Select Server</h1>
            <p className="text-slate-400">Choose a server to join and create your club</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {servers.map((server) => {
              const status = getServerStatus(server);
              const isFull = server.currentClubs >= server.maxCapacity;
              
              return (
                <button
                  key={server.id}
                  onClick={() => !isFull && setSelectedServer(server)}
                  disabled={isFull}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                    selectedServer?.id === server.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : isFull
                      ? 'border-slate-600 bg-slate-700/30 opacity-50 cursor-not-allowed'
                      : 'border-slate-600 hover:border-purple-400 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold text-lg">{server.name}</h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color} border ${status.borderColor}`}>
                      {status.text}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Clubs:</span>
                      <span className="text-white font-medium">
                        {server.currentClubs}/{server.maxCapacity}
                      </span>
                    </div>
                    
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isFull ? 'bg-red-500' : 
                          server.currentClubs >= server.maxCapacity * 0.8 ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${(server.currentClubs / server.maxCapacity) * 100}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-400 text-sm">Password protected</span>
                    </div>
                  </div>
                  
                  {isFull && (
                    <div className="mt-3 text-center">
                      <span className="text-red-400 text-sm font-medium">Server Full</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedServer && (
            <form onSubmit={handleJoinServer} className="space-y-6">
              <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-6">
                <h3 className="text-white font-bold text-lg mb-4">Join {selectedServer.name}</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Server Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Enter server password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={joining}
                  className="w-full mt-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {joining ? 'Joining Server...' : 'Join Server & Create Club'}
                </button>
              </div>
            </form>
          )}

          {servers.length === 0 && (
            <div className="text-center py-8">
              <ServerIcon className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No servers available. Please contact an administrator.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}