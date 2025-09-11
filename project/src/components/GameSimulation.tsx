import React, { useState, useEffect } from 'react';
import { MatchEvent } from '../services/matchSimulationService';
import { Play, Clock, Trophy, Users, ArrowLeft } from 'lucide-react';

interface SimulationUpdate {
  minute: number;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  event?: MatchEvent;
  isFinished?: boolean;
  result?: any;
}

interface GameSimulationProps {
  homeClub: any;
  awayClub: any;
  isLeagueMatch?: boolean;
  onMatchComplete: (result: any) => void;
  onBack: () => void;
}

export function GameSimulation({ 
  homeClub, 
  awayClub, 
  isLeagueMatch = false, 
  onMatchComplete,
  onBack 
}: GameSimulationProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [latestEvent, setLatestEvent] = useState<MatchEvent | null>(null);
  const [blockRefresh, setBlockRefresh] = useState(false);

  // Auto-scroll to latest event
  const eventsEndRef = React.useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [events]);

  // Block page refresh during simulation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (blockRefresh && isSimulating) {
        e.preventDefault();
        e.returnValue = 'Match simulation is in progress. Are you sure you want to leave?';
        return 'Match simulation is in progress. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [blockRefresh, isSimulating]);
  const startSimulation = async () => {
    setIsSimulating(true);
    setBlockRefresh(true);
    setCurrentMinute(0);
    setHomeScore(0);
    setAwayScore(0);
    setEvents([]);
    setLatestEvent(null);
    setIsComplete(false);

    // Start the real-time simulation
    simulateMatchRealTime();
  };

  const simulateMatchRealTime = () => {
    let minute = 0;
    let currentHomeScore = 0;
    let currentAwayScore = 0;
    let matchEvents: MatchEvent[] = [];

    // Pre-match commentary
    const stadium = `${homeClub.clubName} Stadium`;
    const crowd = Math.floor(Math.random() * 30000) + 20000;
    
    const preMatchEvent: MatchEvent = {
      minute: 0,
      type: 'commentary',
      isHome: true,
      description: `Welcome to ${stadium}! ${homeClub.clubName} host ${awayClub.clubName} in front of ${crowd.toLocaleString()} passionate fans!`
    };
    
    matchEvents.push(preMatchEvent);
    setEvents([preMatchEvent]);
    setLatestEvent(preMatchEvent);

    // Calculate team strengths
    const homeStrength = calculateTeamStrength(homeClub.players.slice(0, 11));
    const awayStrength = calculateTeamStrength(awayClub.players.slice(0, 11));
    
    // Apply home advantage and luck
    const homeAdvantage = homeStrength * 0.15;
    const homeLuck = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
    const awayLuck = 0.85 + Math.random() * 0.3;
    
    const finalHomeStrength = (homeStrength + homeAdvantage) * homeLuck;
    const finalAwayStrength = awayStrength * awayLuck;

    const interval = setInterval(() => {
      minute++;
      setCurrentMinute(minute);

      // Calculate event probabilities
      let goalChance = 0.02; // Base 2% chance per minute
      let cardChance = 0.008; // Base 0.8% chance per minute
      let nearMissChance = 0.015; // 1.5% chance per minute
      let commentaryChance = 0.05; // 5% chance per minute

      // Increase chances in final 15 minutes of each half
      if ((minute >= 30 && minute <= 45) || (minute >= 75 && minute <= 90)) {
        goalChance *= 1.5;
        cardChance *= 1.2;
        nearMissChance *= 1.3;
      }

      let eventOccurred = false;

      // Goal event
      if (Math.random() < goalChance && !eventOccurred) {
        const strengthDiff = finalHomeStrength - finalAwayStrength;
        const homeGoalChance = 0.5 + (strengthDiff * 0.01);
        
        if (Math.random() < homeGoalChance) {
          currentHomeScore++;
          const scorer = getRandomPlayer(homeClub.players.slice(0, 11), ['Forward', 'Winger']);
          const assister = Math.random() < 0.6 ? getRandomPlayer(homeClub.players.slice(0, 11)) : null;
          
          const event: MatchEvent = {
            minute,
            type: 'goal',
            playerId: scorer.id,
            playerName: scorer.name,
            isHome: true,
            description: `[${minute}'] GOAL! ${scorer.name} scores for ${homeClub.clubName}!${assister ? ` Brilliant assist from ${assister.name}!` : ''}`,
            assistPlayerId: assister?.id,
            assistPlayerName: assister?.name
          };
          
          matchEvents.push(event);
          setHomeScore(currentHomeScore);
          setEvents([...matchEvents]);
          setLatestEvent(event);
          eventOccurred = true;
        } else {
          currentAwayScore++;
          const scorer = getRandomPlayer(awayClub.players.slice(0, 11), ['Forward', 'Winger']);
          const assister = Math.random() < 0.6 ? getRandomPlayer(awayClub.players.slice(0, 11)) : null;
          
          const event: MatchEvent = {
            minute,
            type: 'goal',
            playerId: scorer.id,
            playerName: scorer.name,
            isHome: false,
            description: `[${minute}'] GOAL! ${scorer.name} scores for ${awayClub.clubName}!${assister ? ` Brilliant assist from ${assister.name}!` : ''}`,
            assistPlayerId: assister?.id,
            assistPlayerName: assister?.name
          };
          
          matchEvents.push(event);
          setAwayScore(currentAwayScore);
          setEvents([...matchEvents]);
          setLatestEvent(event);
          eventOccurred = true;
        }
      }
      
      // Near miss event
      else if (Math.random() < nearMissChance && !eventOccurred) {
        const isHome = Math.random() < 0.5;
        const player = getRandomPlayer(isHome ? homeClub.players.slice(0, 11) : awayClub.players.slice(0, 11), ['Forward', 'Winger']);
        
        const event: MatchEvent = {
          minute,
          type: 'near_miss',
          playerId: player.id,
          playerName: player.name,
          isHome,
          description: `[${minute}'] Close! ${player.name} almost scores - brilliant save by the goalkeeper!`
        };
        
        matchEvents.push(event);
        setEvents([...matchEvents]);
        setLatestEvent(event);
        eventOccurred = true;
      }
      
      // Card event
      else if (Math.random() < cardChance && !eventOccurred) {
        const isHome = Math.random() < 0.5;
        const player = getRandomPlayer(isHome ? homeClub.players.slice(0, 11) : awayClub.players.slice(0, 11));
        const cardType = Math.random() < 0.85 ? 'yellow_card' : 'red_card';
        
        const event: MatchEvent = {
          minute,
          type: cardType,
          playerId: player.id,
          playerName: player.name,
          isHome,
          description: `[${minute}'] ${cardType === 'yellow_card' ? 'Yellow' : 'RED'} card for ${player.name}!`
        };
        
        matchEvents.push(event);
        setEvents([...matchEvents]);
        setLatestEvent(event);
        eventOccurred = true;
      }
      
      // Match flow commentary
      else if (Math.random() < commentaryChance && !eventOccurred) {
        const commentaries = [
          `[${minute}'] ${homeClub.clubName} enjoying possession but struggling to break through`,
          `[${minute}'] End-to-end action! Both teams pushing forward`,
          `[${minute}'] ${awayClub.clubName} defend well to frustrate the home side`,
          `[${minute}'] The tempo picks up - both teams hunting for a goal`
        ];
        
        if (minute > 80) {
          commentaries.push(`[${minute}'] Final minutes - tension mounting in the stadium!`);
        }
        
        const event: MatchEvent = {
          minute,
          type: 'commentary',
          isHome: true,
          description: commentaries[Math.floor(Math.random() * commentaries.length)]
        };
        
        matchEvents.push(event);
        setEvents([...matchEvents]);
        setLatestEvent(event);
      }

      // End of match
      if (minute >= 90) {
        clearInterval(interval);
        
        // Final whistle
        const finalEvent: MatchEvent = {
          minute: 90,
          type: 'commentary',
          isHome: true,
          description: `[90'] FULL TIME: ${homeClub.clubName} ${currentHomeScore}-${currentAwayScore} ${awayClub.clubName}`
        };
        
        matchEvents.push(finalEvent);
        setEvents([...matchEvents]);
        setLatestEvent(finalEvent);
        setIsComplete(true);
        setIsSimulating(false);
        setBlockRefresh(false);
        
        // Call completion callback
        setTimeout(() => {
          onMatchComplete({
            homeScore: currentHomeScore,
            awayScore: currentAwayScore,
            events: matchEvents,
            staminaImpact: []
          });
        }, 2000);
      }
    }, 667); // 60000ms / 90min = 667ms per minute
  };

  const calculateTeamStrength = (players: any[]): number => {
    if (players.length === 0) return 50;
    
    const totalRating = players.reduce((sum, player) => {
      const attributes = Object.values(player.attributes || {}).filter(v => typeof v === 'number') as number[];
      const playerRating = attributes.reduce((s, v) => s + v, 0) / attributes.length;
      const staminaModifier = (player.staminaPct || 100) / 100;
      return sum + (playerRating * staminaModifier);
    }, 0);
    
    return totalRating / players.length;
  };

  const getRandomPlayer = (players: any[], preferredPositions?: string[]): any => {
    if (preferredPositions) {
      const preferred = players.filter(p => 
        p.position && preferredPositions.some(pos => p.position.includes(pos))
      );
      if (preferred.length > 0) {
        return preferred[Math.floor(Math.random() * preferred.length)];
      }
    }
    return players[Math.floor(Math.random() * players.length)];
  };

  const formatTime = (minute: number) => {
    if (minute === 0) return "0'";
    if (minute <= 45) return `${minute}'`;
    if (minute <= 90) return `${minute}'`;
    return "90'+";
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'goal':
        return '⚽';
      case 'yellow_card':
        return '🟨';
      case 'red_card':
        return '🟥';
      case 'corner':
        return '🚩';
      case 'freekick':
        return '🎯';
      case 'near_miss':
        return '😱';
      case 'penalty':
        return '⚽';
      default:
        return '⚽';
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'goal':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'yellow_card':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'red_card':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'corner':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'freekick':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'near_miss':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">
              {isLeagueMatch ? 'League Match' : 'Friendly Match'}
            </h1>
            <div className="flex items-center gap-2 text-slate-400 mt-1">
              <Clock className="w-4 h-4" />
              <span>{formatTime(currentMinute)}</span>
              {isSimulating && (
                <div className="flex items-center gap-1 ml-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-sm">LIVE</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="w-20" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Match Display */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-6">
              <div className="flex items-center justify-between mb-8">
                {/* Home Team */}
                <div className="text-center flex-1">
                  <img
                    src={homeClub.clubLogo}
                    alt={homeClub.clubName}
                    className="w-16 h-16 object-contain mx-auto mb-3"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/64x64/6C63FF/FFFFFF?text=FC';
                    }}
                  />
                  <h2 className="text-xl font-bold text-white mb-1">{homeClub.clubName}</h2>
                  <p className="text-slate-400 text-sm">Manager: {homeClub.managerName}</p>
                </div>

                {/* Score */}
                <div className="text-center px-8">
                  <div className={`text-6xl font-bold mb-2 transition-all duration-500 ${
                    isSimulating ? 'text-green-400' : 'text-white'
                  }`}>
                    {homeScore} - {awayScore}
                  </div>
                  {isSimulating && (
                    <div className="text-yellow-400 font-semibold animate-pulse">
                      {formatTime(currentMinute)}
                    </div>
                  )}
                  {isComplete && (
                    <div className="text-green-400 font-semibold">
                      FULL TIME
                    </div>
                  )}
                </div>

                {/* Away Team */}
                <div className="text-center flex-1">
                  <img
                    src={awayClub.clubLogo}
                    alt={awayClub.clubName}
                    className="w-16 h-16 object-contain mx-auto mb-3"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/64x64/6C63FF/FFFFFF?text=FC';
                    }}
                  />
                  <h2 className="text-xl font-bold text-white mb-1">{awayClub.clubName}</h2>
                  <p className="text-slate-400 text-sm">Manager: {awayClub.managerName}</p>
                </div>
              </div>

              {/* Progress Bar */}
              {isSimulating && (
                <div className="mb-6">
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-yellow-500 h-3 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${(currentMinute / 90) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-2">
                    <span>Kick Off</span>
                    <span>Half Time (45')</span>
                    <span>Full Time (90')</span>
                  </div>
                </div>
              )}

              {/* Start Button */}
              {!isSimulating && !isComplete && (
                <div className="text-center">
                  <button
                    onClick={startSimulation}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-3 mx-auto"
                  >
                    <Play className="w-6 h-6" />
                    Start Match
                  </button>
                </div>
              )}

              {/* Latest Event Highlight */}
              {latestEvent && isSimulating && (
                <div className={`border rounded-lg p-4 mb-4 ${getEventColor(latestEvent.type)}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getEventIcon(latestEvent.type)}</span>
                    <div className="flex-1">
                      <div className="font-bold text-lg">{latestEvent.description}</div>
                      {latestEvent.type === 'goal' && latestEvent.assistPlayerName && (
                        <div className="text-sm opacity-80 mt-1">
                          Assist: {latestEvent.assistPlayerName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Match Events Timeline */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 h-[600px] flex flex-col">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Match Events
                {events.length > 0 && (
                  <span className="text-slate-400 text-sm">({events.length})</span>
                )}
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {events.length === 0 ? (
                  <div className="text-slate-400 text-center py-8">
                    {isSimulating ? 'Match in progress...' : 'No events yet'}
                  </div>
                ) : (
                  events.map((event, index) => (
                    <div 
                      key={index} 
                      className={`border rounded-lg p-3 transition-all duration-300 ${getEventColor(event.type)} ${
                        event === latestEvent ? 'ring-2 ring-white/20 scale-105' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0">{getEventIcon(event.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-relaxed break-words">
                            {event.description}
                          </p>
                          {event.type === 'goal' && (
                            <div className="mt-2 space-y-1">
                              <div className="text-xs opacity-80">
                                ⚽ Scorer: {event.playerName}
                              </div>
                              {event.assistPlayerName && (
                                <div className="text-xs opacity-80">
                                  🤝 Assist: {event.assistPlayerName}
                                </div>
                              )}
                            </div>
                          )}
                          {(event.type === 'yellow_card' || event.type === 'red_card') && event.playerName && (
                            <div className="text-xs opacity-80 mt-1">
                              Player: {event.playerName}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={eventsEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}