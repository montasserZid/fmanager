export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'near_miss' | 'commentary' | 'corner' | 'freekick' | 'penalty' | 'substitution';
  playerId?: number;
  playerName?: string;
  isHome: boolean;
  description: string;
  assistPlayerId?: number;
  assistPlayerName?: string;
}

export interface SimulationUpdate {
  minute: number;
  homeScore: number;
  awayScore: number;
  event?: MatchEvent;
  events: MatchEvent[];
  isFinished?: boolean;
}

export interface SimulationResult {
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  finalCommentary: string[];
  staminaImpact: {
    playerId: number;
    staminaBefore: number;
    staminaAfter: number;
  }[];
}

export class MatchSimulationService {
  private static getRandomPlayer(players: any[], preferredPositions?: string[]): any {
    if (preferredPositions) {
      const preferred = players.filter(p => 
        p.position && preferredPositions.some(pos => p.position.includes(pos))
      );
      if (preferred.length > 0) {
        return preferred[Math.floor(Math.random() * preferred.length)];
      }
    }
    return players[Math.floor(Math.random() * players.length)];
  }

  private static calculateTeamStrength(players: any[]): number {
    if (players.length === 0) return 0;
    
    // Player ratings (40%)
    const totalRating = players.reduce((sum, player) => {
      const attributes = Object.values(player.attributes || {}).filter(v => typeof v === 'number') as number[];
      const playerRating = attributes.reduce((s, v) => s + v, 0) / attributes.length;
      return sum + playerRating;
    }, 0);
    const playerRatings = totalRating / players.length;
    
    // Team stamina (25%)
    const totalStamina = players.reduce((sum, player) => sum + (player.staminaPct || 100), 0);
    const teamStamina = totalStamina / players.length;
    
    // Team chemistry (20%) - based on formation balance
    const teamChemistry = this.calculateTeamChemistry(players);
    
    return (playerRatings * 0.4) + (teamStamina * 0.25) + (teamChemistry * 0.20);
  }

  private static calculateTeamChemistry(players: any[]): number {
    // Simple chemistry calculation based on position balance
    const positions = {
      goalkeepers: players.filter(p => p.position === 'Goalkeeper').length,
      defenders: players.filter(p => p.position && p.position.includes('Back')).length,
      midfielders: players.filter(p => p.position && p.position.includes('Midfield')).length,
      attackers: players.filter(p => p.position && (p.position.includes('Winger') || p.position.includes('Forward') || p.position.includes('Striker'))).length
    };
    
    // Ideal formation balance
    const ideal = { goalkeepers: 1, defenders: 4, midfielders: 4, attackers: 2 };
    let chemistry = 100;
    
    Object.keys(ideal).forEach(pos => {
      const diff = Math.abs(positions[pos] - ideal[pos]);
      chemistry -= diff * 5; // Penalty for imbalance
    });
    
    return Math.max(50, chemistry); // Minimum 50 chemistry
  }

  private static getGoalCommentary(scorer: any, assister: any | null, minute: number, isHome: boolean, homeTeam: string, awayTeam: string): string {
    const team = isHome ? homeTeam : awayTeam;
    
    const goalTypes = [
      'thunderbolt from 25 yards - unstoppable!',
      'slots it calmly into the bottom corner',
      'spectacular overhead kick - pure acrobatics!',
      'bends it beautifully into the top corner!',
      'simple tap-in at the right place and time!',
      'weaves through the defense with pure magic!',
      'rockets it into the roof of the net!',
      'curls it perfectly around the keeper!'
    ];
    
    const goalType = goalTypes[Math.floor(Math.random() * goalTypes.length)];
    
    if (assister && assister.id !== scorer.id) {
      return `[${minute}'] ⚽ GOAL! ${scorer.name} scores for ${team}! Brilliant assist from ${assister.name} - ${goalType}`;
    } else {
      return `[${minute}'] ⚽ GOAL! ${scorer.name} finds the net for ${team}! ${goalType}`;
    }
  }

  private static getNearMissCommentary(player: any, minute: number, team: string): string {
    const commentaries = [
      `[${minute}'] 😱 How did that stay out?! ${player.name}'s header crashes off the crossbar!`,
      `[${minute}'] 🧤 Brilliant reflex save! The goalkeeper somehow keeps ${player.name}'s fierce drive out!`,
      `[${minute}'] 🤏 Inches wide! ${player.name} will be kicking himself - had the goal at his mercy!`,
      `[${minute}'] 🛡️ Last-ditch defending! Crucial block denies ${player.name} a certain goal!`,
      `[${minute}'] 😤 ${player.name} blazes over from close range - should have scored for ${team}!`,
      `[${minute}'] 🎯 ${player.name}'s curling effort clips the outside of the post!`
    ];
    
    return commentaries[Math.floor(Math.random() * commentaries.length)];
  }

  private static getCardCommentary(player: any, cardType: 'yellow' | 'red', minute: number, team: string): string {
    if (cardType === 'red') {
      const redCommentaries = [
        `[${minute}'] 🟥 STRAIGHT RED! ${player.name} sees red for that horror tackle - no place for that in football!`,
        `[${minute}'] 🟥 RED CARD! ${player.name} from ${team} is sent off - reckless challenge!`,
        `[${minute}'] 🟥 Off you go! ${player.name} with a moment of madness - straight red card!`,
        `[${minute}'] 🟥 Shocking! ${player.name} loses his head and sees red - ${team} down to 10 men!`
      ];
      return redCommentaries[Math.floor(Math.random() * redCommentaries.length)];
    } else {
      const yellowCommentaries = [
        `[${minute}'] 🟨 Yellow card for ${player.name} from ${team} - reckless challenge!`,
        `[${minute}'] 🟨 ${player.name} goes into the book for cynical foul - ${team} player cautioned`,
        `[${minute}'] 🟨 Booking for ${player.name} - dissent towards the referee`,
        `[${minute}'] 🟨 Clumsy challenge from ${player.name} earns him a caution`
      ];
      return yellowCommentaries[Math.floor(Math.random() * yellowCommentaries.length)];
    }
  }

  private static getCornerCommentary(team: string, minute: number): string {
    const commentaries = [
      `[${minute}'] ⚽ Corner kick for ${team} - dangerous opportunity from the set piece!`,
      `[${minute}'] 🚩 ${team} win a corner - all the big men are up for this one!`,
      `[${minute}'] ⚽ Corner to ${team} - the keeper will be nervous about this delivery!`,
      `[${minute}'] 🚩 Set piece opportunity for ${team} - corner kick awarded!`
    ];
    return commentaries[Math.floor(Math.random() * commentaries.length)];
  }

  private static getFreekickCommentary(team: string, minute: number): string {
    const commentaries = [
      `[${minute}'] ⚽ Free kick awarded to ${team} in a promising position!`,
      `[${minute}'] 🎯 ${team} have a free kick - this could be dangerous!`,
      `[${minute}'] ⚽ Set piece for ${team} - perfect opportunity to test the keeper!`,
      `[${minute}'] 🎯 Free kick to ${team} - the wall is being organized!`
    ];
    return commentaries[Math.floor(Math.random() * commentaries.length)];
  }

  private static getPenaltyCommentary(scorer: any, team: string, minute: number): string {
    const commentaries = [
      `[${minute}'] ⚽ PENALTY GOAL! ${scorer.name} steps up and scores for ${team}! Nerves of steel!`,
      `[${minute}'] 🎯 PENALTY! ${scorer.name} sends the keeper the wrong way - ${team} score!`,
      `[${minute}'] ⚽ Spot kick converted! ${scorer.name} makes no mistake from 12 yards for ${team}!`,
      `[${minute}'] 🎯 PENALTY GOAL! ${scorer.name} buries it in the bottom corner - ${team} celebrate!`
    ];
    return commentaries[Math.floor(Math.random() * commentaries.length)];
  }

  private static getMatchFlowCommentary(homeTeam: string, awayTeam: string, minute: number): string {
    const commentaries = [
      `[${minute}'] 🔄 ${homeTeam} enjoying plenty of possession but struggling to break down this stubborn defense`,
      `[${minute}'] ⚡ End-to-end stuff now! Both teams throwing caution to the wind!`,
      `[${minute}'] 🛡️ ${awayTeam} have everyone behind the ball - frustrating the home crowd`,
      `[${minute}'] 🔥 The tempo has really picked up - both teams desperate for that crucial goal!`,
      `[${minute}'] ⚖️ Play on says the referee! ${homeTeam} players furious but the official waves them away`,
      `[${minute}'] 🤬 Heated exchange between the players - the referee steps in to calm things down`,
      `[${minute}'] 🏃‍♂️ ${awayTeam} break forward at pace - this could be dangerous!`,
      `[${minute}'] 🎯 ${homeTeam} probing for an opening - patient build-up play`
    ];
    
    if (minute > 80) {
      const lateCommentaries = [
        `[${minute}'] ⏰ Into the final 10 minutes - you can feel the tension in the stadium!`,
        `[${minute}'] 🕐 Time running out - both teams throwing everything forward!`,
        `[${minute}'] ⚡ Frantic final minutes - anything could happen!`,
        `[${minute}'] 🔥 Last chance saloon - who will grab the winner?`
      ];
      return lateCommentaries[Math.floor(Math.random() * lateCommentaries.length)];
    }
    
    return commentaries[Math.floor(Math.random() * commentaries.length)];
  }

  private static processMinute(
    minute: number,
    homeClub: any,
    awayClub: any,
    homeStrength: number,
    awayStrength: number
  ): MatchEvent[] {
    const events: MatchEvent[] = [];
    const homeStarters = homeClub.players.slice(0, 11);
    const awayStarters = awayClub.players.slice(0, 11);

    // Event probabilities per minute
    const eventTypes = {
      'goal': { probability: 0.02, positions: ['Forward', 'Winger', 'Midfield'] },
      'penalty': { probability: 0.002, positions: ['Forward', 'Winger', 'Midfield'] },
      'yellow_card': { probability: 0.008 },
      'red_card': { probability: 0.001 },
      'corner': { probability: 0.05 },
      'freekick': { probability: 0.03 },
      'near_miss': { probability: 0.015, positions: ['Forward', 'Winger', 'Midfield'] },
      'commentary': { probability: 0.05 }
    };

    // Increase chances in final 15 minutes of each half
    const isIntenseTime = (minute >= 30 && minute <= 45) || (minute >= 75 && minute <= 90);
    const intensityMultiplier = isIntenseTime ? 1.5 : 1;

    // Calculate team advantage
    const strengthDiff = homeStrength - awayStrength;
    const homeAdvantage = 0.5 + (strengthDiff * 0.01);

    // Process each event type
    Object.entries(eventTypes).forEach(([eventType, config]) => {
      const adjustedProbability = config.probability * intensityMultiplier;
      
      if (Math.random() < adjustedProbability) {
        const isHome = Math.random() < homeAdvantage;
        const team = isHome ? homeClub.clubName : awayClub.clubName;
        const players = isHome ? homeStarters : awayStarters;
        
        let event: MatchEvent;

        switch (eventType) {
          case 'goal':
            const scorer = this.getRandomPlayer(players, config.positions);
            const assister = Math.random() < 0.6 ? this.getRandomPlayer(players) : null;
            
            event = {
              minute,
              type: 'goal',
              playerId: scorer.id,
              playerName: scorer.name,
              isHome,
              description: this.getGoalCommentary(scorer, assister, minute, isHome, homeClub.clubName, awayClub.clubName),
              assistPlayerId: assister?.id,
              assistPlayerName: assister?.name
            };
            break;

          case 'penalty':
            const penaltyTaker = this.getRandomPlayer(players, config.positions);
            
            event = {
              minute,
              type: 'goal', // Penalty counts as goal
              playerId: penaltyTaker.id,
              playerName: penaltyTaker.name,
              isHome,
              description: this.getPenaltyCommentary(penaltyTaker, team, minute)
            };
            break;

          case 'yellow_card':
            const yellowPlayer = this.getRandomPlayer(players);
            
            event = {
              minute,
              type: 'yellow_card',
              playerId: yellowPlayer.id,
              playerName: yellowPlayer.name,
              isHome,
              description: this.getCardCommentary(yellowPlayer, 'yellow', minute, team)
            };
            break;

          case 'red_card':
            const redPlayer = this.getRandomPlayer(players);
            
            event = {
              minute,
              type: 'red_card',
              playerId: redPlayer.id,
              playerName: redPlayer.name,
              isHome,
              description: this.getCardCommentary(redPlayer, 'red', minute, team)
            };
            break;

          case 'corner':
            event = {
              minute,
              type: 'corner',
              isHome,
              description: this.getCornerCommentary(team, minute)
            };
            break;

          case 'freekick':
            event = {
              minute,
              type: 'freekick',
              isHome,
              description: this.getFreekickCommentary(team, minute)
            };
            break;

          case 'near_miss':
            const nearMissPlayer = this.getRandomPlayer(players, config.positions);
            
            event = {
              minute,
              type: 'near_miss',
              playerId: nearMissPlayer.id,
              playerName: nearMissPlayer.name,
              isHome,
              description: this.getNearMissCommentary(nearMissPlayer, minute, team)
            };
            break;

          case 'commentary':
            event = {
              minute,
              type: 'commentary',
              isHome: true,
              description: this.getMatchFlowCommentary(homeClub.clubName, awayClub.clubName, minute)
            };
            break;

          default:
            return;
        }

        events.push(event);
      }
    });

    return events;
  }

  static async simulateMatchRealTime(
    homeClub: any,
    awayClub: any,
    isLeagueMatch: boolean = false,
    onUpdate: (update: SimulationUpdate) => void
  ): Promise<SimulationResult> {
    return new Promise((resolve) => {
      const homeStarters = homeClub.players.slice(0, 11);
      const awayStarters = awayClub.players.slice(0, 11);
      
      // Calculate team strengths
      let homeStrength = this.calculateTeamStrength(homeStarters);
      let awayStrength = this.calculateTeamStrength(awayStarters);
      
      // Home advantage (15%)
      homeStrength += homeStrength * 0.15;
      
      // Apply luck factor (±15%)
      const homeLuck = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
      const awayLuck = 0.85 + Math.random() * 0.3;
      
      homeStrength *= homeLuck;
      awayStrength *= awayLuck;

      let currentMinute = 1;
      let homeScore = 0;
      let awayScore = 0;
      const allEvents: MatchEvent[] = [];

      // Pre-match commentary
      const stadium = `${homeClub.clubName} Stadium`;
      const crowd = Math.floor(Math.random() * 30000) + 20000;
      
      const kickoffEvent: MatchEvent = {
        minute: 0,
        type: 'commentary',
        isHome: true,
        description: `⚽ Welcome to ${stadium}! ${homeClub.clubName} host ${awayClub.clubName} in front of ${crowd.toLocaleString()} passionate fans! The match is about to begin!`
      };
      
      allEvents.push(kickoffEvent);
      onUpdate({
        minute: 0,
        homeScore: 0,
        awayScore: 0,
        event: kickoffEvent,
        events: [...allEvents]
      });

      // Real-time simulation - 60 seconds total (667ms per minute)
      const interval = setInterval(() => {
        // Process current minute
        const minuteEvents = this.processMinute(currentMinute, homeClub, awayClub, homeStrength, awayStrength);
        
        minuteEvents.forEach(event => {
          allEvents.push(event);
          
          // Update score for goals
          if (event.type === 'goal') {
            if (event.isHome) {
              homeScore++;
            } else {
              awayScore++;
            }
          }
          
          // Send update for each event
          onUpdate({
            minute: currentMinute,
            homeScore,
            awayScore,
            event,
            events: [...allEvents]
          });
        });

        currentMinute++;
        
        if (currentMinute > 90) {
          clearInterval(interval);
          
          // Final commentary
          const finalCommentary = [];
          if (homeScore === awayScore) {
            finalCommentary.push(`⏱️ FULL TIME: ${homeClub.clubName} ${homeScore}-${awayScore} ${awayClub.clubName}. A fair result - both teams can be proud!`);
          } else if (homeScore > awayScore) {
            finalCommentary.push(`⏱️ FULL TIME: ${homeClub.clubName} ${homeScore}-${awayScore} ${awayClub.clubName}. Victory for the home side!`);
            if (homeLuck < 0.9 && homeStrength < awayStrength) {
              finalCommentary.push(`🍀 What an upset! ${homeClub.clubName} defied the odds with a brilliant performance!`);
            }
          } else {
            finalCommentary.push(`⏱️ FULL TIME: ${homeClub.clubName} ${homeScore}-${awayScore} ${awayClub.clubName}. Away victory!`);
            if (awayLuck < 0.9 && awayStrength < homeStrength) {
              finalCommentary.push(`🍀 Stunning upset! ${awayClub.clubName} pulled off a remarkable away win!`);
            }
          }

          // Calculate stamina impact
          const staminaImpact = [];
          
          // Starters lose 20% stamina
          [...homeStarters, ...awayStarters].forEach(player => {
            const staminaBefore = player.staminaPct || 100;
            const staminaAfter = Math.max(0, staminaBefore - 20);
            
            staminaImpact.push({
              playerId: player.id,
              staminaBefore,
              staminaAfter
            });
          });
          
          // Bench players gain 20% stamina (capped at 100)
          const homeBench = homeClub.players.slice(11);
          const awayBench = awayClub.players.slice(11);
          
          [...homeBench, ...awayBench].forEach(player => {
            const staminaBefore = player.staminaPct || 100;
            const staminaAfter = Math.min(100, staminaBefore + 20);
            
            staminaImpact.push({
              playerId: player.id,
              staminaBefore,
              staminaAfter
            });
          });

          // Final update
          onUpdate({
            minute: 90,
            homeScore,
            awayScore,
            events: [...allEvents],
            isFinished: true
          });

          // Resolve with final result
          resolve({
            homeScore,
            awayScore,
            events: allEvents,
            finalCommentary,
            staminaImpact
          });
        }
      }, 667); // 60000ms / 90min = 667ms per minute
    });
  }

  // Keep the old method for backward compatibility but make it use the new real-time version
  static async simulateMatch(
    homeClub: any,
    awayClub: any,
    isLeagueMatch: boolean = false,
    onEventCallback?: (event: MatchEvent) => void
  ): Promise<SimulationResult> {
    return new Promise((resolve) => {
      this.simulateMatchRealTime(homeClub, awayClub, isLeagueMatch, (update) => {
        if (update.event && onEventCallback) {
          onEventCallback(update.event);
        }
        
        if (update.isFinished) {
          resolve({
            homeScore: update.homeScore,
            awayScore: update.awayScore,
            events: update.events,
            finalCommentary: [],
            staminaImpact: []
          });
        }
      });
    });
  }
}