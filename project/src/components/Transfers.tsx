import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TransferService } from '../services/transferService';
import { ClubService } from '../services/clubService';
import { Club, TransferOffer, TransferRecord, FirebasePlayer } from '../types';
import { 
  ArrowLeftRight, 
  Search, 
  Filter, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock,
  Euro,
  Users,
  Info,
  Loader2,
  Star,
  Plus,
  Minus
} from 'lucide-react';

interface TransfersProps {
  club: Club;
  onUpdateClub: (club: Club) => void;
}

export function Transfers({ club, onUpdateClub }: TransfersProps) {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<'received' | 'made' | 'search' | 'history'>('received');
  const [receivedOffers, setReceivedOffers] = useState<TransferOffer[]>([]);
  const [madeOffers, setMadeOffers] = useState<TransferOffer[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<{ player: FirebasePlayer; clubName: string; clubLogo: string; canDirectBuy: boolean }[]>([]);
  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState<'all' | 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker'>('all');
  const [selectedOffer, setSelectedOffer] = useState<TransferOffer | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ player: FirebasePlayer; clubName: string; clubLogo: string; canDirectBuy: boolean } | null>(null);
  const [offerType, setOfferType] = useState<'direct' | 'swap'>('direct');
  const [selectedSwapPlayer, setSelectedSwapPlayer] = useState<FirebasePlayer | null>(null);
  const [additionalMoney, setAdditionalMoney] = useState(0);
  const [maxAdditionalMoney, setMaxAdditionalMoney] = useState(0);
  const [budget, setBudget] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadTransferData();
      loadBudget();
    }
  }, [user]);

  const loadBudget = async () => {
    try {
      const currentBudget = await ClubService.getClubBudget(club.id);
      setBudget(currentBudget);
    } catch (error) {
      console.error('Failed to load budget:', error);
    }
  };

  const loadTransferData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [received, made, available, history] = await Promise.all([
        TransferService.getReceivedOffers(user.uid),
        TransferService.getMadeOffers(user.uid),
        TransferService.getAvailablePlayersForTransfer(user.uid),
        TransferService.getTransferHistory()
      ]);
      
      setReceivedOffers(received);
      setMadeOffers(made);
      setAvailablePlayers(available);
      setTransferHistory(history);
    } catch (error) {
      console.error('Error loading transfer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (offer: TransferOffer) => {
    try {
      setSubmitting(true);
      await TransferService.processTransfer(offer, club);
      
      // Refresh club data and transfer data
      const updatedClub = await ClubService.getUserClub(user!.uid);
      if (updatedClub) {
        onUpdateClub(updatedClub);
      }
      
      loadTransferData();
      loadBudget();
    } catch (error) {
      console.error('Error accepting offer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclineOffer = async (offer: TransferOffer) => {
    try {
      await TransferService.respondToOffer(offer.id, false);
      loadTransferData();
    } catch (error) {
      console.error('Error declining offer:', error);
    }
  };

  const handleMakeOffer = (player: { player: FirebasePlayer; clubName: string; clubLogo: string; canDirectBuy: boolean }) => {
    setSelectedPlayer(player);
    setOfferType(player.canDirectBuy ? 'direct' : 'swap');
    setSelectedSwapPlayer(null);
    setAdditionalMoney(0);
    
    if (!player.canDirectBuy) {
      // Calculate max additional money for swap (30% of value difference)
      const targetValue = TransferService.parseMarketValue(player.player.market_value);
      setMaxAdditionalMoney(Math.floor(targetValue * 0.3));
    }
    
    setShowOfferModal(true);
  };

  const handleSwapPlayerSelect = (swapPlayer: FirebasePlayer) => {
    setSelectedSwapPlayer(swapPlayer);
    
    if (selectedPlayer) {
      const targetValue = TransferService.parseMarketValue(selectedPlayer.player.market_value);
      const swapValue = TransferService.parseMarketValue(swapPlayer.market_value);
      
      if (targetValue > swapValue) {
        const difference = targetValue - swapValue;
        const maxAdditional = Math.floor(difference * 0.3);
        setMaxAdditionalMoney(maxAdditional);
      } else {
        setMaxAdditionalMoney(0);
        setAdditionalMoney(0);
      }
    }
  };

  const handleSubmitOffer = async () => {
    if (!selectedPlayer || !user) return;
    
    setSubmitting(true);
    try {
      if (offerType === 'direct') {
        const targetValue = TransferService.parseMarketValue(selectedPlayer.player.market_value);
        await TransferService.makeDirectOffer(
          user.uid,
          club.clubName,
          club.clubLogo,
          selectedPlayer.player.clubId!,
          selectedPlayer.clubName,
          selectedPlayer.player,
          targetValue
        );
      } else if (selectedSwapPlayer) {
        await TransferService.makeSwapOffer(
          user.uid,
          club.clubName,
          club.clubLogo,
          selectedPlayer.player.clubId!,
          selectedPlayer.clubName,
          selectedPlayer.player,
          selectedSwapPlayer,
          additionalMoney
        );
      }
      
      setShowOfferModal(false);
      setSelectedPlayer(null);
      setSelectedSwapPlayer(null);
      loadTransferData();
    } catch (error) {
      console.error('Error submitting offer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getPositionFilter = (position: string) => {
    if (!position || typeof position !== 'string') return 'Attacker';
    if (position === 'Goalkeeper') return 'Goalkeeper';
    if (position.includes('Back')) return 'Defender';
    if (position.includes('Midfield')) return 'Midfielder';
    return 'Attacker';
  };

  const filteredPlayers = availablePlayers.filter(item => {
    if (searchFilter === 'all') return true;
    return getPositionFilter(item.player.position) === searchFilter;
  });

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}m`;
    }
    return `€${(amount / 1000).toFixed(0)}k`;
  };

  const sections = [
    { id: 'received', name: 'Offers Received', icon: ArrowLeftRight, badge: receivedOffers.length },
    { id: 'made', name: 'Offers Made', icon: Send },
    { id: 'search', name: 'Search Players', icon: Search },
    { id: 'history', name: 'Transfer Info', icon: Info },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  activeSection === section.id
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {section.name}
                {section.badge && section.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {section.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Offers Received */}
      {activeSection === 'received' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Transfer Offers Received</h2>
          
          {receivedOffers.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No transfer offers received</p>
          ) : (
            <div className="space-y-4">
              {receivedOffers.map((offer) => (
                <div key={offer.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={offer.targetPlayerImage}
                        alt={offer.targetPlayerName}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-slate-600"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/48x48/6C63FF/FFFFFF?text=P';
                        }}
                      />
                      <div>
                        <h3 className="text-white font-semibold">{offer.targetPlayerName}</h3>
                        <p className="text-slate-400 text-sm">{offer.targetPlayerPosition}</p>
                        <p className="text-yellow-400 text-sm">{offer.targetPlayerValue}</p>
                      </div>
                      
                      <div className="text-slate-400">→</div>
                      
                      <div className="flex items-center gap-2">
                        <img
                          src={offer.fromClubLogo}
                          alt={offer.fromClubName}
                          className="w-8 h-8 object-contain rounded border border-slate-600"
                        />
                        <div>
                          <p className="text-white font-medium">{offer.fromClubName}</p>
                          {offer.offerType === 'direct' ? (
                            <p className="text-green-400 font-semibold">{formatCurrency(offer.offerAmount || 0)}</p>
                          ) : (
                            <div className="flex items-center gap-2">
                              <img
                                src={offer.swapPlayerImage}
                                alt={offer.swapPlayerName}
                                className="w-6 h-6 rounded object-cover"
                              />
                              <span className="text-blue-400 text-sm">{offer.swapPlayerName}</span>
                              {offer.offerAmount && offer.offerAmount > 0 && (
                                <span className="text-green-400 text-sm">+ {formatCurrency(offer.offerAmount)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptOffer(offer)}
                        disabled={submitting}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Accept
                      </button>
                      
                      <button
                        onClick={() => handleDeclineOffer(offer)}
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
          )}
        </div>
      )}

      {/* Offers Made */}
      {activeSection === 'made' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Transfer Offers Made</h2>
          
          {madeOffers.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No transfer offers made</p>
          ) : (
            <div className="space-y-4">
              {madeOffers.map((offer) => (
                <div key={offer.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={offer.targetPlayerImage}
                        alt={offer.targetPlayerName}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-slate-600"
                      />
                      <div>
                        <h3 className="text-white font-semibold">{offer.targetPlayerName}</h3>
                        <p className="text-slate-400 text-sm">{offer.targetPlayerPosition}</p>
                        <p className="text-slate-400 text-sm">To: {offer.toClubName}</p>
                        {offer.offerType === 'swap' && offer.swapPlayerName && (
                          <p className="text-blue-400 text-sm">Swap: {offer.swapPlayerName}</p>
                        )}
                        {offer.offerAmount && offer.offerAmount > 0 && (
                          <p className="text-green-400 text-sm">+ {formatCurrency(offer.offerAmount)}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        offer.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                        offer.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                        offer.status === 'declined' ? 'bg-red-500/20 text-red-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        <Clock className="w-4 h-4 mr-1" />
                        {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Players */}
      {activeSection === 'search' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Search Players</h2>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-semibold">{formatCurrency(budget)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value as any)}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="all">All Positions</option>
                  <option value="Goalkeeper">Goalkeepers</option>
                  <option value="Defender">Defenders</option>
                  <option value="Midfielder">Midfielders</option>
                  <option value="Attacker">Attackers</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlayers.map((item) => (
              <div key={item.player.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={item.player.image_url}
                    alt={item.player.name}
                    className="w-12 h-12 rounded-lg object-cover border-2 border-slate-600"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/48x48/6C63FF/FFFFFF?text=P';
                    }}
                  />
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{item.player.name}</h3>
                    <p className="text-slate-400 text-sm">{item.player.position}</p>
                    <p className="text-yellow-400 text-sm">{item.player.market_value || 'Free'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <img
                    src={item.clubLogo}
                    alt={item.clubName}
                    className="w-6 h-6 object-contain rounded border border-slate-600"
                  />
                  <span className="text-slate-300 text-sm">{item.clubName}</span>
                </div>
                
                <button
                  onClick={() => handleMakeOffer(item)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Make Offer
                </button>
                
                {!item.canDirectBuy && (
                  <p className="text-orange-400 text-xs mt-2 text-center">Swap + money only</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer History */}
      {activeSection === 'history' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Recent Transfers</h2>
          
          {transferHistory.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No recent transfers</p>
          ) : (
            <div className="space-y-4">
              {transferHistory.map((transfer) => (
                <div key={transfer.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={transfer.playerImage}
                      alt={transfer.playerName}
                      className="w-12 h-12 rounded-lg object-cover border-2 border-slate-600"
                    />
                    
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">{transfer.playerName}</h3>
                      <div className="flex items-center gap-2 text-sm">
                        <img
                          src={transfer.fromClubLogo}
                          alt={transfer.fromClubName}
                          className="w-5 h-5 object-contain rounded"
                        />
                        <span className="text-slate-400">{transfer.fromClubName}</span>
                        <span className="text-slate-500">→</span>
                        <img
                          src={transfer.toClubLogo}
                          alt={transfer.toClubName}
                          className="w-5 h-5 object-contain rounded"
                        />
                        <span className="text-slate-400">{transfer.toClubName}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-green-400 font-semibold">{formatCurrency(transfer.transferFee)}</p>
                      <p className="text-slate-400 text-sm">{new Date(transfer.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Make Offer Modal */}
      {showOfferModal && selectedPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Make Transfer Offer</h2>
            
            {/* Target Player Info */}
            <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={selectedPlayer.player.image_url}
                  alt={selectedPlayer.player.name}
                  className="w-12 h-12 rounded-lg object-cover border-2 border-slate-600"
                />
                <div>
                  <h3 className="text-white font-semibold">{selectedPlayer.player.name}</h3>
                  <p className="text-slate-400 text-sm">{selectedPlayer.player.position}</p>
                  <p className="text-yellow-400 text-sm">{selectedPlayer.player.market_value}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <img
                  src={selectedPlayer.clubLogo}
                  alt={selectedPlayer.clubName}
                  className="w-6 h-6 object-contain rounded"
                />
                <span className="text-slate-300">{selectedPlayer.clubName}</span>
              </div>
            </div>

            {/* Offer Type Selection */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3">Offer Type</h3>
              <div className="flex gap-2">
                {selectedPlayer.canDirectBuy && (
                  <button
                    onClick={() => setOfferType('direct')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      offerType === 'direct'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Direct Purchase
                  </button>
                )}
                <button
                  onClick={() => setOfferType('swap')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    offerType === 'swap'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Player Swap + Money
                </button>
              </div>
            </div>

            {/* Direct Purchase */}
            {offerType === 'direct' && (
              <div className="mb-6">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white">Transfer Fee:</span>
                    <span className="text-green-400 font-semibold">
                      {formatCurrency(TransferService.parseMarketValue(selectedPlayer.player.market_value))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-slate-400">Your Budget:</span>
                    <span className={`font-semibold ${
                      budget >= TransferService.parseMarketValue(selectedPlayer.player.market_value)
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}>
                      {formatCurrency(budget)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Player Swap */}
            {offerType === 'swap' && (
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3">Select Player to Swap</h3>
                
                {!selectedSwapPlayer ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {club.players.map((player) => (
                      <button
                        key={player.id}
                        onClick={() => handleSwapPlayerSelect(player)}
                        className="flex items-center gap-3 p-3 bg-slate-700/30 border border-slate-600 rounded-lg hover:border-purple-500/50 transition-colors text-left"
                      >
                        <img
                          src={player.image_url}
                          alt={player.name}
                          className="w-10 h-10 rounded-lg object-cover border-2 border-slate-600"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/40x40/6C63FF/FFFFFF?text=P';
                          }}
                        />
                        <div>
                          <div className="text-white font-medium">{player.name}</div>
                          <div className="text-slate-400 text-sm">{player.position}</div>
                          <div className="text-yellow-400 text-sm">{player.market_value || 'Free'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selected Swap Player */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={selectedSwapPlayer.image_url}
                          alt={selectedSwapPlayer.name}
                          className="w-10 h-10 rounded-lg object-cover border-2 border-slate-600"
                        />
                        <div>
                          <div className="text-white font-semibold">{selectedSwapPlayer.name}</div>
                          <div className="text-slate-400 text-sm">{selectedSwapPlayer.position}</div>
                          <div className="text-yellow-400 text-sm">{selectedSwapPlayer.market_value || 'Free'}</div>
                        </div>
                        <button
                          onClick={() => setSelectedSwapPlayer(null)}
                          className="ml-auto text-slate-400 hover:text-white"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Additional Money Slider */}
                    {maxAdditionalMoney > 0 && (
                      <div className="bg-slate-700/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-white font-medium">Additional Money</span>
                          <span className="text-green-400 font-semibold">{formatCurrency(additionalMoney)}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setAdditionalMoney(Math.max(0, additionalMoney - 5000))}
                            className="bg-slate-600 hover:bg-slate-500 text-white p-2 rounded-lg"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          
                          <div className="flex-1">
                            <input
                              type="range"
                              min="0"
                              max={Math.min(maxAdditionalMoney, budget)}
                              step="5000"
                              value={additionalMoney}
                              onChange={(e) => setAdditionalMoney(parseInt(e.target.value))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                              <span>€0</span>
                              <span>{formatCurrency(Math.min(maxAdditionalMoney, budget))}</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setAdditionalMoney(Math.min(maxAdditionalMoney, budget, additionalMoney + 5000))}
                            className="bg-slate-600 hover:bg-slate-500 text-white p-2 rounded-lg"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <p className="text-slate-400 text-xs mt-2">
                          Maximum additional: {formatCurrency(maxAdditionalMoney)} (30% of value difference)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOfferModal(false);
                  setSelectedPlayer(null);
                  setSelectedSwapPlayer(null);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSubmitOffer}
                disabled={submitting || (offerType === 'swap' && !selectedSwapPlayer) || (offerType === 'direct' && budget < TransferService.parseMarketValue(selectedPlayer.player.market_value))}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Submit Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}