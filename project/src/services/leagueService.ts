import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { League, LeagueFixture, LeagueMatch, Club, FirebasePlayer } from '../types';
import { ClubService } from './clubService';
import teamsData from '../../teams/les_equipes.json';

export class LeagueService {
static async createLeague(
  name: string,
  password: string,
  serverId: string,  // <- Add this parameter
  maxCapacity: number,
  prizeDistribution: {
    first: number;
    second: number;
    third: number;
    others: number;
  },
    playerReward?: FirebasePlayer
): Promise<string> {
    const leagueId = doc(collection(db, 'leagues')).id;
    
    const league: League = {
      id: leagueId,
      name,
      password,
      serverId,
      prizeMoney: prizeDistribution.first,
      playerReward: playerReward || null,
      prizeDistribution,
      maxCapacity,
      clubs: [],
      fixtures: [],
      matches: [],
      currentMatchDay: 1,
      status: 'created',
      leaderboard: [],
      topScorers: [],
      topAssists: [],
      createdAt: new Date()
    };
    
    await setDoc(doc(db, 'leagues', leagueId), league);
    return leagueId;
  }

  static async getAvailableRewardPlayers(serverId: string): Promise<{id: number, name: string, team: string}[]> {
    // Get all clubs in this server
    const clubsRef = collection(db, 'clubs');
    const clubsQuery = query(clubsRef, where('serverId', '==', serverId));
    const clubsSnapshot = await getDocs(clubsQuery);
    
    // Get all assigned player IDs
    const assignedPlayerIds = new Set<number>();
    clubsSnapshot.docs.forEach(doc => {
      const club = doc.data();
      club.players?.forEach((player: any) => {
        assignedPlayerIds.add(player.id);
      });
    });
    
    // Get available players from JSON
    const availablePlayers: {id: number, name: string, team: string}[] = [];
    Object.entries(teamsData.teams).forEach(([teamKey, team]: [string, any]) => {
      team.players.forEach((player: any) => {
        if (!assignedPlayerIds.has(player.id)) {
          availablePlayers.push({
            id: player.id,
            name: player.name,
            team: teamKey
          });
        }
      });
    });
    
    return availablePlayers;
  }

  static async joinLeague(leagueId: string, clubId: string, password: string): Promise<void> {
    const leagueDoc = await getDoc(doc(db, 'leagues', leagueId));
    if (!leagueDoc.exists()) throw new Error('League not found');
    
    const league = leagueDoc.data() as League;
    
    if (password && league.password !== password) {
      throw new Error('Incorrect password');
    }
    
    if (league.clubs.length >= league.maxCapacity) {
      throw new Error('League is full');
    }
    
    if (league.clubs.includes(clubId)) {
      throw new Error('Club already in league');
    }
    
    const updatedClubs = [...league.clubs, clubId];
    await updateDoc(doc(db, 'leagues', leagueId), {
      clubs: updatedClubs
    });
  }

  static async startLeague(leagueId: string): Promise<void> {
    const leagueDoc = await getDoc(doc(db, 'leagues', leagueId));
    if (!leagueDoc.exists()) throw new Error('League not found');
    
    const league = leagueDoc.data() as League;
    
    if (league.clubs.length < 2) {
      throw new Error('Need at least 2 clubs to start league');
    }
    
    // Generate fixtures
    const fixtures = await this.generateFixtures(league);
    
    // Initialize leaderboard
    const leaderboard = await this.initializeLeaderboard(league.clubs);
    
    await updateDoc(doc(db, 'leagues', leagueId), {
      status: 'started',
      startDate: new Date(),
      fixtures,
      leaderboard,
      currentMatchDay: 1
    });
  }

  private static async generateFixtures(league: League): Promise<LeagueFixture[]> {
    const fixtures: LeagueFixture[] = [];
    const clubs = league.clubs;
    
    // Get club details
    const clubDetails = await Promise.all(
      clubs.map(async (clubId) => {
        const clubsRef = collection(db, 'clubs');
        const clubsSnapshot = await getDocs(query(clubsRef, where('id', '==', clubId)));
        return clubsSnapshot.docs[0]?.data() as Club;
      })
    );
    
    let matchDay = 1;
    const startDate = new Date();
    
    // Generate round-robin fixtures (home and away)
    for (let round = 0; round < 2; round++) { // Two rounds for home and away
      for (let i = 0; i < clubs.length; i++) {
        for (let j = i + 1; j < clubs.length; j++) {
          const homeIndex = round === 0 ? i : j;
          const awayIndex = round === 0 ? j : i;
          
          const homeClub = clubDetails[homeIndex];
          const awayClub = clubDetails[awayIndex];
          
          const fixtureDate = new Date(startDate);
          fixtureDate.setDate(startDate.getDate() + matchDay - 1);
          
          fixtures.push({
            id: doc(collection(db, 'fixtures')).id,
            matchDay,
            homeClubId: homeClub.id,
            awayClubId: awayClub.id,
            homeClubName: homeClub.clubName,
            awayClubName: awayClub.clubName,
            homeClubLogo: homeClub.clubLogo,
            awayClubLogo: awayClub.clubLogo,
            scheduledDate: fixtureDate,
            status: matchDay === 1 ? 'available' : 'scheduled'
          });
          
          matchDay++;
        }
      }
    }
    
    return fixtures;
  }

  private static async initializeLeaderboard(clubIds: string[]) {
    const leaderboard = [];
    
    for (const clubId of clubIds) {
      const clubsRef = collection(db, 'clubs');
      const clubsSnapshot = await getDocs(query(clubsRef, where('id', '==', clubId)));
      const club = clubsSnapshot.docs[0]?.data() as Club;
      
      if (club) {
        leaderboard.push({
          clubId: club.id,
          clubName: club.clubName,
          clubLogo: club.clubLogo,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          yellowCards: 0,
          redCards: 0
        });
      }
    }
    
    return leaderboard;
  }

  static async getLeagueByServerId(serverId: string): Promise<League | null> {
    const leaguesRef = collection(db, 'leagues');
    const q = query(leaguesRef, where('serverId', '==', serverId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as League;
  }

  static async getAllLeagues(): Promise<League[]> {
    const leaguesRef = collection(db, 'leagues');
    const snapshot = await getDocs(leaguesRef);
    
    return snapshot.docs.map(doc => doc.data() as League);
  }

  static async playMatch(fixtureId: string, leagueId: string): Promise<LeagueMatch> {
    const leagueDoc = await getDoc(doc(db, 'leagues', leagueId));
    if (!leagueDoc.exists()) throw new Error('League not found');
    
    const league = leagueDoc.data() as League;
    const fixture = league.fixtures.find(f => f.id === fixtureId);
    
    if (!fixture) throw new Error('Fixture not found');
    if (fixture.status !== 'available') throw new Error('Match not available');
    
    // Get both clubs
    const homeClub = await this.getClubById(fixture.homeClubId);
    const awayClub = await this.getClubById(fixture.awayClubId);
    
    if (!homeClub || !awayClub) throw new Error('Clubs not found');
    
    // Simulate match
    const matchResult = this.simulateLeagueMatch(homeClub, awayClub, fixture);
    
    // Update league with match result
    await this.updateLeagueWithResult(leagueId, matchResult);
    
    return matchResult;
  }

  private static async getClubById(clubId: string): Promise<Club | null> {
    const clubsRef = collection(db, 'clubs');
    const clubsSnapshot = await getDocs(query(clubsRef, where('id', '==', clubId)));
    return clubsSnapshot.docs[0]?.data() as Club || null;
  }

  private static simulateLeagueMatch(homeClub: Club, awayClub: Club, fixture: LeagueFixture): LeagueMatch {
    // Similar to friendly match simulation but for league context
    const homeStrength = this.calculateTeamStrength(homeClub.players.slice(0, 11));
    const awayStrength = this.calculateTeamStrength(awayClub.players.slice(0, 11));
    
    const result = this.runMatchSimulation(homeClub, awayClub, homeStrength, awayStrength);
    
    return {
      id: doc(collection(db, 'leagueMatches')).id,
      fixtureId: fixture.id,
      homeClubId: homeClub.id,
      awayClubId: awayClub.id,
      homeClubName: homeClub.clubName,
      awayClubName: awayClub.clubName,
      homeClubLogo: homeClub.clubLogo,
      awayClubLogo: awayClub.clubLogo,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      matchDay: fixture.matchDay,
      playedAt: new Date(),
      isForfeited: false,
      goalscorers: result.goalscorers,
      assists: result.assists,
      cards: result.cards,
      commentary: result.commentary
    };
  }

  private static calculateTeamStrength(players: FirebasePlayer[]): number {
    if (players.length === 0) return 0;
    
    const totalRating = players.reduce((sum, player) => {
      const attributes = Object.values(player.attributes).filter(v => typeof v === 'number') as number[];
      const playerRating = attributes.reduce((s, v) => s + v, 0) / attributes.length;
      
      // Apply stamina modifier
      const staminaModifier = player.staminaPct >= 60 ? 1 : 
                            player.staminaPct >= 30 ? 0.85 : 0.7;
      
      return sum + (playerRating * staminaModifier);
    }, 0);
    
    return totalRating / players.length;
  }

  private static runMatchSimulation(homeClub: Club, awayClub: Club, homeStrength: number, awayStrength: number) {
    const commentary: string[] = [];
    const goalscorers: LeagueMatch['goalscorers'] = [];
    const assists: LeagueMatch['assists'] = [];
    const cards: LeagueMatch['cards'] = [];
    
    let homeScore = 0;
    let awayScore = 0;
    
    commentary.push(`⚽ Match kicks off: ${homeClub.clubName} vs ${awayClub.clubName}!`);
    
    // Simulate 90 minutes in 9 periods of 10 minutes
    for (let period = 1; period <= 9; period++) {
      const minute = period * 10;
      
      // Calculate chances based on strength difference
      const strengthDiff = homeStrength - awayStrength;
      const homeChance = 0.5 + (strengthDiff * 0.02);
      
      // Random events
      if (Math.random() < 0.15) {
        // Goal chance
        if (Math.random() < homeChance) {
          homeScore++;
          const scorer = this.getRandomPlayer(homeClub.players.slice(0, 11), ['Forward', 'Winger', 'Midfield']);
          const assister = this.getRandomPlayer(homeClub.players.slice(0, 11));
          
          goalscorers.push({
            playerId: scorer.id,
            playerName: scorer.name,
            minute,
            isHome: true
          });
          
          if (assister && assister.id !== scorer.id) {
            assists.push({
              playerId: assister.id,
              playerName: assister.name,
              minute,
              isHome: true
            });
          }
          
          commentary.push(`⚽ GOAL! ${homeClub.clubName} - ${scorer.name} scores in the ${minute}th minute!`);
        } else {
          awayScore++;
          const scorer = this.getRandomPlayer(awayClub.players.slice(0, 11), ['Forward', 'Winger', 'Midfield']);
          const assister = this.getRandomPlayer(awayClub.players.slice(0, 11));
          
          goalscorers.push({
            playerId: scorer.id,
            playerName: scorer.name,
            minute,
            isHome: false
          });
          
          if (assister && assister.id !== scorer.id) {
            assists.push({
              playerId: assister.id,
              playerName: assister.name,
              minute,
              isHome: false
            });
          }
          
          commentary.push(`⚽ GOAL! ${awayClub.clubName} - ${scorer.name} scores in the ${minute}th minute!`);
        }
      }
      
      // Card events
      if (Math.random() < 0.08) {
        const isHome = Math.random() < 0.5;
        const player = this.getRandomPlayer(
          isHome ? homeClub.players.slice(0, 11) : awayClub.players.slice(0, 11)
        );
        const cardType = Math.random() < 0.8 ? 'yellow' : 'red';
        
        cards.push({
          playerId: player.id,
          playerName: player.name,
          type: cardType,
          minute,
          isHome
        });
        
        if (cardType === 'red') {
          commentary.push(`🟥 RED CARD! ${isHome ? homeClub.clubName : awayClub.clubName} - ${player.name} is sent off!`);
        } else {
          commentary.push(`🟨 Yellow card for ${isHome ? homeClub.clubName : awayClub.clubName} - ${player.name}.`);
        }
      }
    }
    
    commentary.push(`⏱️ Full time: ${homeClub.clubName} ${homeScore}-${awayScore} ${awayClub.clubName}`);
    
    return {
      homeScore,
      awayScore,
      goalscorers,
      assists,
      cards,
      commentary
    };
  }

  private static getRandomPlayer(players: FirebasePlayer[], preferredPositions?: string[]): FirebasePlayer {
    if (preferredPositions) {
      const preferred = players.filter(p => 
        preferredPositions.some(pos => p.position.includes(pos))
      );
      if (preferred.length > 0) {
        return preferred[Math.floor(Math.random() * preferred.length)];
      }
    }
    return players[Math.floor(Math.random() * players.length)];
  }

  private static async updateLeagueWithResult(leagueId: string, match: LeagueMatch): Promise<void> {
    const leagueDoc = await getDoc(doc(db, 'leagues', leagueId));
    if (!leagueDoc.exists()) return;
    
    const league = leagueDoc.data() as League;
    
    // Update player cards and suspensions
    await this.updatePlayerCards(match);
    
    // Update fixtures
    const updatedFixtures = league.fixtures.map(fixture => 
      fixture.id === match.fixtureId 
        ? { 
            ...fixture, 
            status: 'played' as const,
            result: {
              homeScore: match.homeScore,
              awayScore: match.awayScore,
              isForfeited: match.isForfeited
            }
          }
        : fixture
    );
    
    // Add match to matches array
    const updatedMatches = [...league.matches, match];
    
    // Update leaderboard
    const updatedLeaderboard = this.updateLeaderboard(league.leaderboard, match);
    
    // Update top scorers and assists
    const updatedTopScorers = this.updateTopScorers(league.topScorers, match);
    const updatedTopAssists = this.updateTopAssists(league.topAssists, match);
    
    // Check if we need to advance to next match day
    const currentDayFixtures = updatedFixtures.filter(f => f.matchDay === league.currentMatchDay);
    const allCurrentDayPlayed = currentDayFixtures.every(f => f.status === 'played' || f.status === 'forfeited');
    
    let nextMatchDay = league.currentMatchDay;
    if (allCurrentDayPlayed) {
      nextMatchDay++;
      // Make next day fixtures available
      updatedFixtures.forEach(fixture => {
        if (fixture.matchDay === nextMatchDay && fixture.status === 'scheduled') {
          fixture.status = 'available';
        }
      });
    }
    
    await updateDoc(doc(db, 'leagues', leagueId), {
      fixtures: updatedFixtures,
      matches: updatedMatches,
      leaderboard: updatedLeaderboard,
      topScorers: updatedTopScorers,
      topAssists: updatedTopAssists,
      currentMatchDay: nextMatchDay
    });
  }

  private static updateLeaderboard(leaderboard: League['leaderboard'], match: LeagueMatch) {
    return leaderboard.map(team => {
      if (team.clubId === match.homeClubId) {
        const points = match.homeScore > match.awayScore ? 3 : match.homeScore === match.awayScore ? 1 : 0;
        const homeYellowCards = match.cards?.filter(c => c.isHome && c.type === 'yellow').length || 0;
        const homeRedCards = match.cards?.filter(c => c.isHome && c.type === 'red').length || 0;
        
        return {
          ...team,
          played: team.played + 1,
          won: match.homeScore > match.awayScore ? team.won + 1 : team.won,
          drawn: match.homeScore === match.awayScore ? team.drawn + 1 : team.drawn,
          lost: match.homeScore < match.awayScore ? team.lost + 1 : team.lost,
          goalsFor: team.goalsFor + match.homeScore,
          goalsAgainst: team.goalsAgainst + match.awayScore,
          goalDifference: team.goalDifference + (match.homeScore - match.awayScore),
          points: team.points + points,
          yellowCards: team.yellowCards + homeYellowCards,
          redCards: team.redCards + homeRedCards
        };
      } else if (team.clubId === match.awayClubId) {
        const points = match.awayScore > match.homeScore ? 3 : match.awayScore === match.homeScore ? 1 : 0;
        const awayYellowCards = match.cards?.filter(c => !c.isHome && c.type === 'yellow').length || 0;
        const awayRedCards = match.cards?.filter(c => !c.isHome && c.type === 'red').length || 0;
        
        return {
          ...team,
          played: team.played + 1,
          won: match.awayScore > match.homeScore ? team.won + 1 : team.won,
          drawn: match.awayScore === match.homeScore ? team.drawn + 1 : team.drawn,
          lost: match.awayScore < match.homeScore ? team.lost + 1 : team.lost,
          goalsFor: team.goalsFor + match.awayScore,
          goalsAgainst: team.goalsAgainst + match.homeScore,
          goalDifference: team.goalDifference + (match.awayScore - match.homeScore),
          points: team.points + points,
          yellowCards: team.yellowCards + awayYellowCards,
          redCards: team.redCards + awayRedCards
        };
      }
      return team;
    }).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
      // Tie-breaker: fewer cards is better
      const aCardTotal = a.yellowCards + (a.redCards * 2);
      const bCardTotal = b.yellowCards + (b.redCards * 2);
      return aCardTotal - bCardTotal;
    });
  }

  private static updateTopScorers(topScorers: League['topScorers'], match: LeagueMatch) {
    const updatedScorers = [...topScorers];
    
    match.goalscorers.forEach(goal => {
      const existingScorer = updatedScorers.find(s => s.playerId === goal.playerId);
      if (existingScorer) {
        existingScorer.goals++;
      } else {
        updatedScorers.push({
          playerId: goal.playerId,
          playerName: goal.playerName,
          clubName: goal.isHome ? match.homeClubName : match.awayClubName,
          clubLogo: goal.isHome ? match.homeClubLogo : match.awayClubLogo,
          goals: 1
        });
      }
    });
    
    return updatedScorers.sort((a, b) => b.goals - a.goals).slice(0, 10);
  }

  private static updateTopAssists(topAssists: League['topAssists'], match: LeagueMatch) {
    const updatedAssists = [...topAssists];
    
    match.assists.forEach(assist => {
      const existingAssister = updatedAssists.find(a => a.playerId === assist.playerId);
      if (existingAssister) {
        existingAssister.assists++;
      } else {
        updatedAssists.push({
          playerId: assist.playerId,
          playerName: assist.playerName,
          clubName: assist.isHome ? match.homeClubName : match.awayClubName,
          clubLogo: assist.isHome ? match.homeClubLogo : match.awayClubLogo,
          assists: 1
        });
      }
    });
    
    return updatedAssists.sort((a, b) => b.assists - a.assists).slice(0, 10);
  }

  static async terminateLeague(leagueId: string): Promise<void> {
    const leagueDoc = await getDoc(doc(db, 'leagues', leagueId));
    if (!leagueDoc.exists()) throw new Error('League not found');
    
    const league = leagueDoc.data() as League;
    
    // Distribute prize money
    await this.distributePrizeMoney(league);
    
    // Award player reward to first place
    if (league.playerReward && league.leaderboard.length > 0) {
      await this.awardPlayerReward(league.leaderboard[0].clubId, league.playerReward);
    }
    
    // Mark league as finished
    await updateDoc(doc(db, 'leagues', leagueId), {
      status: 'finished'
    });
  }

  private static async distributePrizeMoney(league: League): Promise<void> {
    const sortedLeaderboard = [...league.leaderboard].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    });
    
    for (let i = 0; i < sortedLeaderboard.length; i++) {
      const team = sortedLeaderboard[i];
      let prize = 0;
      
      if (i === 0) prize = league.prizeDistribution.first;
      else if (i === 1) prize = league.prizeDistribution.second;
      else if (i === 2) prize = league.prizeDistribution.third;
      else prize = league.prizeDistribution.others;
      
      // Update club budget
      const currentBudget = await ClubService.getClubBudget(team.clubId);
      await ClubService.updateClubBudget(team.clubId, currentBudget + prize);
    }
  }

  private static async updatePlayerCards(match: LeagueMatch): Promise<void> {
    if (!match.cards || match.cards.length === 0) return;
    
    // Get both clubs
    const homeClub = await this.getClubById(match.homeClubId);
    const awayClub = await this.getClubById(match.awayClubId);
    
    if (!homeClub || !awayClub) return;
    
    // Update home club players
    const updatedHomePlayers = homeClub.players.map(player => {
      const playerCards = match.cards.filter(c => c.playerId === player.id && c.isHome);
      if (playerCards.length === 0) return player;
      
      let updatedPlayer = { ...player };
      
      playerCards.forEach(card => {
        if (card.type === 'yellow') {
          updatedPlayer.yellowCards = (updatedPlayer.yellowCards || 0) + 1;
          // Check for suspension (2 yellow cards)
          if (updatedPlayer.yellowCards >= 2) {
            updatedPlayer.isSuspended = true;
            updatedPlayer.suspensionReason = 'yellow_cards';
            updatedPlayer.yellowCards = 0; // Reset after suspension
          }
        } else if (card.type === 'red') {
          updatedPlayer.redCards = (updatedPlayer.redCards || 0) + 1;
          updatedPlayer.isSuspended = true;
          updatedPlayer.suspensionReason = 'red_card';
        }
      });
      
      return updatedPlayer;
    });
    
    // Update away club players
    const updatedAwayPlayers = awayClub.players.map(player => {
      const playerCards = match.cards.filter(c => c.playerId === player.id && !c.isHome);
      if (playerCards.length === 0) return player;
      
      let updatedPlayer = { ...player };
      
      playerCards.forEach(card => {
        if (card.type === 'yellow') {
          updatedPlayer.yellowCards = (updatedPlayer.yellowCards || 0) + 1;
          // Check for suspension (2 yellow cards)
          if (updatedPlayer.yellowCards >= 2) {
            updatedPlayer.isSuspended = true;
            updatedPlayer.suspensionReason = 'yellow_cards';
            updatedPlayer.yellowCards = 0; // Reset after suspension
          }
        } else if (card.type === 'red') {
          updatedPlayer.redCards = (updatedPlayer.redCards || 0) + 1;
          updatedPlayer.isSuspended = true;
          updatedPlayer.suspensionReason = 'red_card';
        }
      });
      
      return updatedPlayer;
    });
    
    // Update both clubs in database
    await ClubService.updateClubPlayers(homeClub.id, updatedHomePlayers);
    await ClubService.updateClubPlayers(awayClub.id, updatedAwayPlayers);
  }

  private static async awardPlayerReward(clubId: string, playerReward: FirebasePlayer): Promise<void> {
    // Get the winning club by ID
    const clubsRef = collection(db, 'clubs');
    const clubQuery = query(clubsRef, where('id', '==', clubId));
    const clubSnapshot = await getDocs(clubQuery);
    
    if (clubSnapshot.empty) return;
    const club = clubSnapshot.docs[0].data() as Club;
    
    // Use the stored complete player data directly
    const newPlayer: FirebasePlayer = {
      ...playerReward, // Already has all attributes, image_url, position, etc.
      staminaPct: 100,
      yellowCards: 0,
      redCards: 0,
      squadPosition: club.players.length >= 17 ? 'reserve' as const : 'substitute' as const,
      stamina: 100,
      gamesPlayed: 0,
      isAssigned: true,
      isSuspended: false,
      clubId: clubId
    };
    
    // Ensure we don't exceed 23 players total
    if (club.players.length >= 23) {
      console.warn('Club already has maximum players, cannot add reward player');
      return;
    }
    
    const updatedPlayers = [...club.players, newPlayer];
    await ClubService.updateClubPlayers(clubId, updatedPlayers);
  }

  static async resetLeague(leagueId: string): Promise<void> {
    await updateDoc(doc(db, 'leagues', leagueId), {
      clubs: [],
      fixtures: [],
      matches: [],
      leaderboard: [],
      topScorers: [],
      topAssists: [],
      currentMatchDay: 1,
      status: 'created',
      resetAt: new Date()
    });
  }
}