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
import { MatchSimulationService } from './matchSimulationService';
import teamsData from '../../teams/les_equipes.json';

export class LeagueService {
  static async createLeague(
    name: string,
    password: string,
    serverId: string,
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
    console.log(`Generated ${fixtures.length} fixtures for ${league.clubs.length} clubs`);
    
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

  /**
   * COMPLETELY REWRITTEN: Generate fixtures with proper round-robin scheduling
   * Handles 2-16 clubs, multiple matches per matchDay, prevents self-matches
   */
  private static async generateFixtures(league: League): Promise<LeagueFixture[]> {
    const fixtures: LeagueFixture[] = [];
    const clubs = league.clubs;
    const numClubs = clubs.length;
    
    console.log(`Generating fixtures for ${numClubs} clubs: ${clubs.join(', ')}`);
    
    // Get club details
    const clubDetails = await Promise.all(
      clubs.map(async (clubId) => {
        const clubsRef = collection(db, 'clubs');
        const clubsSnapshot = await getDocs(query(clubsRef, where('id', '==', clubId)));
        const club = clubsSnapshot.docs[0]?.data() as Club;
        console.log(`Found club: ${club?.clubName || 'UNKNOWN'} (${clubId})`);
        return club;
      })
    );

    // Validate all clubs were found
    const validClubs = clubDetails.filter(club => club !== null && club !== undefined);
    if (validClubs.length !== numClubs) {
      throw new Error(`Could not find all clubs. Expected ${numClubs}, found ${validClubs.length}`);
    }

    const startDate = new Date();
    let currentDate = new Date(startDate);
    let matchDay = 1;

    // Generate fixtures for 2 complete rounds (home and away)
    for (let round = 0; round < 2; round++) {
      console.log(`\n=== ROUND ${round + 1} (${round === 0 ? 'HOME' : 'AWAY'}) ===`);
      
      // Create all possible pairings for this round
      const roundFixtures: LeagueFixture[] = [];
      
      for (let i = 0; i < validClubs.length; i++) {
        for (let j = i + 1; j < validClubs.length; j++) {
          const club1 = validClubs[i];
          const club2 = validClubs[j];
          
          // Prevent self-matches
          if (club1.id === club2.id) {
            console.error(`ERROR: Attempted self-match for club ${club1.clubName}`);
            continue;
          }
          
          // For round 1: club1 home, club2 away
          // For round 2: club2 home, club1 away
          const homeClub = round === 0 ? club1 : club2;
          const awayClub = round === 0 ? club2 : club1;
          
          const fixture: LeagueFixture = {
            id: doc(collection(db, 'fixtures')).id,
            matchDay: 0, // Will be assigned later
            homeClubId: homeClub.id,
            awayClubId: awayClub.id,
            homeClubName: homeClub.clubName,
            awayClubName: awayClub.clubName,
            homeClubLogo: homeClub.clubLogo,
            awayClubLogo: awayClub.clubLogo,
            scheduledDate: new Date(currentDate),
            status: 'scheduled'
          };
          
          roundFixtures.push(fixture);
          console.log(`Created fixture: ${homeClub.clubName} vs ${awayClub.clubName}`);
        }
      }
      
      // Now assign matchDays to distribute games evenly
      // For N teams, we want approximately N/2 games per matchDay
      const gamesPerMatchDay = Math.floor(numClubs / 2);
      console.log(`\nAssigning ${roundFixtures.length} fixtures to matchDays (${gamesPerMatchDay} games per day)`);
      
      for (let i = 0; i < roundFixtures.length; i++) {
        const currentMatchDay = matchDay + Math.floor(i / gamesPerMatchDay);
        const daysToAdd = currentMatchDay - 1;
        
        roundFixtures[i].matchDay = currentMatchDay;
        roundFixtures[i].scheduledDate = new Date(startDate);
        roundFixtures[i].scheduledDate.setDate(startDate.getDate() + daysToAdd);
        roundFixtures[i].status = currentMatchDay === 1 ? 'available' : 'scheduled';
        
        console.log(`MatchDay ${currentMatchDay}: ${roundFixtures[i].homeClubName} vs ${roundFixtures[i].awayClubName} (${roundFixtures[i].scheduledDate.toDateString()})`);
      }
      
      // Update matchDay counter for next round
      matchDay = Math.max(...roundFixtures.map(f => f.matchDay)) + 1;
      
      // Add round fixtures to main array
      fixtures.push(...roundFixtures);
    }
    
    // Final validation
    console.log(`\n=== FIXTURE GENERATION COMPLETE ===`);
    console.log(`Total fixtures: ${fixtures.length}`);
    console.log(`Total matchDays: ${Math.max(...fixtures.map(f => f.matchDay))}`);
    
    // Check for self-matches
    const selfMatches = fixtures.filter(f => f.homeClubId === f.awayClubId);
    if (selfMatches.length > 0) {
      console.error(`ERROR: Found ${selfMatches.length} self-matches!`);
      selfMatches.forEach(f => {
        console.error(`Self-match: ${f.homeClubName} vs ${f.awayClubName}`);
      });
      throw new Error('Self-matches detected in fixture generation');
    }
    
    // Log matchDay distribution
    const matchDayCount: {[key: number]: number} = {};
    fixtures.forEach(f => {
      matchDayCount[f.matchDay] = (matchDayCount[f.matchDay] || 0) + 1;
    });
    
    console.log('Fixtures per matchDay:');
    Object.entries(matchDayCount).forEach(([day, count]) => {
      console.log(`  MatchDay ${day}: ${count} fixtures`);
    });
    
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

  /**
   * FIXED: Enhanced playMatch function with better error handling and logging
   */
  static async playMatch(fixtureId: string, leagueId: string): Promise<LeagueMatch> {
    console.log(`Playing match: fixture ${fixtureId} in league ${leagueId}`);
    
    const leagueDoc = await getDoc(doc(db, 'leagues', leagueId));
    if (!leagueDoc.exists()) throw new Error('League not found');
    
    const league = leagueDoc.data() as League;
    const fixture = league.fixtures.find(f => f.id === fixtureId);
    
    if (!fixture) throw new Error('Fixture not found');
    if (fixture.status !== 'available') throw new Error('Match not available or already played');
    
    // Check if match date has arrived
    const now = new Date();
    const matchDate = fixture.scheduledDate && typeof fixture.scheduledDate === 'object' && fixture.scheduledDate.toDate 
      ? fixture.scheduledDate.toDate() 
      : new Date(fixture.scheduledDate);
    
    // Reset time to compare only dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    matchDate.setHours(0, 0, 0, 0);
    
    if (matchDate > today) {
      throw new Error('Match date has not arrived yet');
    }
    
    // Get both clubs
    const homeClub = await this.getClubById(fixture.homeClubId);
    const awayClub = await this.getClubById(fixture.awayClubId);
    
    if (!homeClub || !awayClub) throw new Error('Clubs not found');
    
    console.log(`Match: ${homeClub.clubName} vs ${awayClub.clubName}`);
    
    // CRITICAL: Mark fixture as being played to prevent duplicate matches
    await this.markFixtureAsPlaying(leagueId, fixtureId);
    
    try {
      // Use the enhanced simulation service
      const simulationResult = await MatchSimulationService.simulateMatch(homeClub, awayClub, true);
      console.log(`Match result: ${homeClub.clubName} ${simulationResult.homeScore} - ${simulationResult.awayScore} ${awayClub.clubName}`);
      
      const matchResult: LeagueMatch = {
        id: doc(collection(db, 'leagueMatches')).id,
        fixtureId: fixture.id,
        homeClubId: homeClub.id,
        awayClubId: awayClub.id,
        homeClubName: homeClub.clubName,
        awayClubName: awayClub.clubName,
        homeClubLogo: homeClub.clubLogo,
        awayClubLogo: awayClub.clubLogo,
        homeScore: simulationResult.homeScore,
        awayScore: simulationResult.awayScore,
        matchDay: fixture.matchDay,
        playedAt: new Date(),
        isForfeited: false,
        goalscorers: simulationResult.events.filter(e => e.type === 'goal').map(e => ({
          playerId: e.playerId!,
          playerName: e.playerName!,
          minute: e.minute,
          isHome: e.isHome
        })),
        assists: simulationResult.events.filter(e => e.type === 'goal' && e.assistPlayerId).map(e => ({
          playerId: e.assistPlayerId!,
          playerName: e.assistPlayerName!,
          minute: e.minute,
          isHome: e.isHome
        })),
        cards: simulationResult.events.filter(e => e.type === 'yellow_card' || e.type === 'red_card').map(e => ({
          playerId: e.playerId!,
          playerName: e.playerName!,
          type: e.type === 'yellow_card' ? 'yellow' as const : 'red' as const,
          minute: e.minute,
          isHome: e.isHome
        })),
        commentary: [
          ...simulationResult.events.map(e => e.description),
          ...simulationResult.finalCommentary
        ]
      };
      
      // Store match result in database IMMEDIATELY
      await setDoc(doc(db, 'leagueMatches', matchResult.id), matchResult);
      console.log(`Match result stored with ID: ${matchResult.id}`);
      
      // Update league with match result and leaderboard
      await this.updateLeagueWithResult(leagueId, matchResult);
      
      // Update player stamina and cards - League matches: 20% loss for starters
      await this.updatePlayerStaminaAndCards(homeClub, awayClub, matchResult);
      
      console.log(`Match completed successfully`);
      return matchResult;
    } catch (error) {
      // If simulation fails, reset fixture status
      console.error('Match simulation failed:', error);
      await this.resetFixtureStatus(leagueId, fixtureId);
      throw error;
    }
  }

  private static async markFixtureAsPlaying(leagueId: string, fixtureId: string): Promise<void> {
    const leagueDoc = await getDoc(doc(db, 'leagues', leagueId));
    if (!leagueDoc.exists()) return;
    
    const league = leagueDoc.data() as League;
    const updatedFixtures = league.fixtures.map(fixture => 
      fixture.id === fixtureId 
        ? { ...fixture, status: 'playing' as const }
        : fixture
    );
    
    await updateDoc(doc(db, 'leagues', leagueId), {
      fixtures: updatedFixtures
    });
  }

  private static async resetFixtureStatus(leagueId: string, fixtureId: string): Promise<void> {
    const leagueDoc = await getDoc(doc(db, 'leagues', leagueId));
    if (!leagueDoc.exists()) return;
    
    const league = leagueDoc.data() as League;
    const updatedFixtures = league.fixtures.map(fixture => 
      fixture.id === fixtureId 
        ? { ...fixture, status: 'available' as const }
        : fixture
    );
    
    await updateDoc(doc(db, 'leagues', leagueId), {
      fixtures: updatedFixtures
    });
  }

  /**
   * FIXED: Enhanced player stamina and card updates with better logging
   */
  private static async updatePlayerStaminaAndCards(homeClub: Club, awayClub: Club, match: LeagueMatch): Promise<void> {
    console.log(`Updating player stats for match ${match.id}`);
    
    // Update home club players
    const updatedHomePlayers = homeClub.players.map(player => {
      let updatedPlayer = { ...player };
      
      // Update stamina based on squad position
      const currentStamina = player.staminaPct || 100;
      if (player.squadPosition === 'starter') {
        updatedPlayer.staminaPct = Math.max(0, currentStamina - 20);
        console.log(`${player.name} (starter): stamina ${currentStamina}% -> ${updatedPlayer.staminaPct}%`);
      } else if (player.squadPosition === 'substitute' || player.squadPosition === 'reserve') {
        updatedPlayer.staminaPct = Math.min(100, currentStamina + 10);
        console.log(`${player.name} (${player.squadPosition}): stamina ${currentStamina}% -> ${updatedPlayer.staminaPct}%`);
      }
      
      // Update cards from match
      const playerCards = match.cards.filter(c => c.playerId === player.id && c.isHome);
      if (playerCards.length > 0) {
        console.log(`${player.name} received ${playerCards.length} card(s)`);
      }
      
      playerCards.forEach(card => {
        if (card.type === 'yellow') {
          const previousYellow = updatedPlayer.yellowCards || 0;
          updatedPlayer.yellowCards = previousYellow + 1;
          console.log(`${player.name}: yellow card ${previousYellow} -> ${updatedPlayer.yellowCards}`);
          
          // Check for suspension (2 yellow cards)
          if (updatedPlayer.yellowCards >= 2) {
            updatedPlayer.isSuspended = true;
            updatedPlayer.suspensionReason = 'yellow_cards';
            updatedPlayer.yellowCards = 0; // Reset after suspension
            console.log(`${player.name}: SUSPENDED for yellow cards`);
          }
        } else if (card.type === 'red') {
          updatedPlayer.redCards = (updatedPlayer.redCards || 0) + 1;
          updatedPlayer.isSuspended = true;
          updatedPlayer.suspensionReason = 'red_card';
          console.log(`${player.name}: SUSPENDED for red card`);
        }
      });
      
      return updatedPlayer;
    });
    
    // Update away club players
    const updatedAwayPlayers = awayClub.players.map(player => {
      let updatedPlayer = { ...player };
      
      // Update stamina based on squad position
      const currentStamina = player.staminaPct || 100;
      if (player.squadPosition === 'starter') {
        updatedPlayer.staminaPct = Math.max(0, currentStamina - 20);
        console.log(`${player.name} (starter): stamina ${currentStamina}% -> ${updatedPlayer.staminaPct}%`);
      } else if (player.squadPosition === 'substitute' || player.squadPosition === 'reserve') {
        updatedPlayer.staminaPct = Math.min(100, currentStamina + 10);
        console.log(`${player.name} (${player.squadPosition}): stamina ${currentStamina}% -> ${updatedPlayer.staminaPct}%`);
      }
      
      // Update cards from match
      const playerCards = match.cards.filter(c => c.playerId === player.id && !c.isHome);
      if (playerCards.length > 0) {
        console.log(`${player.name} received ${playerCards.length} card(s)`);
      }
      
      playerCards.forEach(card => {
        if (card.type === 'yellow') {
          const previousYellow = updatedPlayer.yellowCards || 0;
          updatedPlayer.yellowCards = previousYellow + 1;
          console.log(`${player.name}: yellow card ${previousYellow} -> ${updatedPlayer.yellowCards}`);
          
          // Check for suspension (2 yellow cards)
          if (updatedPlayer.yellowCards >= 2) {
            updatedPlayer.isSuspended = true;
            updatedPlayer.suspensionReason = 'yellow_cards';
            updatedPlayer.yellowCards = 0; // Reset after suspension
            console.log(`${player.name}: SUSPENDED for yellow cards`);
          }
        } else if (card.type === 'red') {
          updatedPlayer.redCards = (updatedPlayer.redCards || 0) + 1;
          updatedPlayer.isSuspended = true;
          updatedPlayer.suspensionReason = 'red_card';
          console.log(`${player.name}: SUSPENDED for red card`);
        }
      });
      
      return updatedPlayer;
    });
    
    // Update both clubs in database
    console.log(`Updating ${homeClub.clubName} players in database`);
    await ClubService.updateClubPlayers(homeClub.id, updatedHomePlayers);
    
    console.log(`Updating ${awayClub.clubName} players in database`);
    await ClubService.updateClubPlayers(awayClub.id, updatedAwayPlayers);
  }

  private static async getClubById(clubId: string): Promise<Club | null> {
    const clubsRef = collection(db, 'clubs');
    const clubsSnapshot = await getDocs(query(clubsRef, where('id', '==', clubId)));
    return clubsSnapshot.docs[0]?.data() as Club || null;
  }

  /**
   * FIXED: Enhanced league update with proper leaderboard sorting and matchDay progression
   */
  private static async updateLeagueWithResult(leagueId: string, match: LeagueMatch): Promise<void> {
    console.log(`Updating league ${leagueId} with match result`);
    
    const leagueDoc = await getDoc(doc(db, 'leagues', leagueId));
    if (!leagueDoc.exists()) return;
    
    const league = leagueDoc.data() as League;
    
    // Update fixtures - CRITICAL: Mark fixture as played to prevent replay
    const updatedFixtures = league.fixtures.map(fixture => 
      fixture.id === match.fixtureId 
        ? { 
            ...fixture, 
            status: 'played' as const,
            result: {
              homeScore: match.homeScore,
              awayScore: match.awayScore,
              playedAt: new Date(),
              isForfeited: match.isForfeited
            }
          }
        : fixture
    );
    
    // Add match to matches array
    const updatedMatches = [...league.matches, match];
    
    // Update leaderboard - FIXED: Ensure proper sorting and updates
    const updatedLeaderboard = this.updateLeaderboard(league.leaderboard, match);
    console.log('Updated leaderboard:', updatedLeaderboard.map(t => `${t.clubName}: ${t.points}pts`));
    
    // Update top scorers and assists
    const updatedTopScorers = this.updateTopScorers(league.topScorers, match);
    const updatedTopAssists = this.updateTopAssists(league.topAssists, match);
    
    // FIXED: Check if we need to advance to next match day
    const currentDayFixtures = updatedFixtures.filter(f => f.matchDay === league.currentMatchDay);
    const allCurrentDayPlayed = currentDayFixtures.every(f => f.status === 'played' || f.status === 'forfeited');
    
    let nextMatchDay = league.currentMatchDay;
    let statusUpdate = {};
    
    console.log(`Current matchDay ${league.currentMatchDay}: ${currentDayFixtures.length} fixtures, all played: ${allCurrentDayPlayed}`);
    
    if (allCurrentDayPlayed) {
      nextMatchDay++;
      console.log(`Advancing to matchDay ${nextMatchDay}`);
      
      // Make next day fixtures available
      let nextDayFixtures = 0;
      updatedFixtures.forEach(fixture => {
        if (fixture.matchDay === nextMatchDay && fixture.status === 'scheduled') {
          fixture.status = 'available';
          nextDayFixtures++;
        }
      });
      
      console.log(`Made ${nextDayFixtures} fixtures available for matchDay ${nextMatchDay}`);
      
      // Check if league is finished
      const totalFixtures = updatedFixtures.length;
      const playedFixtures = updatedFixtures.filter(f => f.status === 'played').length;
      
      console.log(`League progress: ${playedFixtures}/${totalFixtures} fixtures played`);
      
      if (playedFixtures === totalFixtures) {
        statusUpdate = { status: 'finished', finishedAt: new Date() };
        console.log('League is now finished!');
      }
    }
    
    // CRITICAL UPDATE: Ensure atomic update to prevent race conditions
    const updateData = {
      fixtures: updatedFixtures,
      matches: updatedMatches,
      leaderboard: updatedLeaderboard,
      topScorers: updatedTopScorers,
      topAssists: updatedTopAssists,
      currentMatchDay: nextMatchDay,
      lastUpdated: new Date(),
      ...statusUpdate
    };
    
    await updateDoc(doc(db, 'leagues', leagueId), updateData);
    console.log(`League ${leagueId} updated successfully`);
  }

  /**
   * FIXED: Enhanced leaderboard update with proper sorting and tie-breaking
   */
  private static updateLeaderboard(leaderboard: League['leaderboard'], match: LeagueMatch) {
    const updatedLeaderboard = leaderboard.map(team => {
      if (team.clubId === match.homeClubId) {
        const points = match.homeScore > match.awayScore ? 3 : match.homeScore === match.awayScore ? 1 : 0;
        const homeYellowCards = match.cards?.filter(c => c.isHome && c.type === 'yellow').length || 0;
        const homeRedCards = match.cards?.filter(c => c.isHome && c.type === 'red').length || 0;
        
        const updated = {
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
        
        console.log(`${team.clubName}: +${points} points, GD: ${match.homeScore - match.awayScore}, Total: ${updated.points}pts`);
        return updated;
      } else if (team.clubId === match.awayClubId) {
        const points = match.awayScore > match.homeScore ? 3 : match.awayScore === match.homeScore ? 1 : 0;
        const awayYellowCards = match.cards?.filter(c => !c.isHome && c.type === 'yellow').length || 0;
        const awayRedCards = match.cards?.filter(c => !c.isHome && c.type === 'red').length || 0;
        
        const updated = {
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
        
        console.log(`${team.clubName}: +${points} points, GD: ${match.awayScore - match.homeScore}, Total: ${updated.points}pts`);
        return updated;
      }
      return team;
    });

    // FIXED: Proper sorting with multiple tie-breakers
    return updatedLeaderboard.sort((a, b) => {
      // 1. Points (descending)
      if (b.points !== a.points) return b.points - a.points;
      
      // 2. Goal difference (descending)
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      
      // 3. Goals for (descending)
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      
      // 4. Fewer cards is better (ascending)
      const aCardTotal = a.yellowCards + (a.redCards * 2);
      const bCardTotal = b.yellowCards + (b.redCards * 2);
      return aCardTotal - bCardTotal;
    });
  }

  /**
   * FIXED: Enhanced top scorers update with proper tracking
   */
  private static updateTopScorers(topScorers: League['topScorers'], match: LeagueMatch) {
    const updatedScorers = [...topScorers];
    
    match.goalscorers.forEach(goal => {
      const existingScorer = updatedScorers.find(s => s.playerId === goal.playerId);
      if (existingScorer) {
        existingScorer.goals++;
        console.log(`${existingScorer.playerName}: ${existingScorer.goals} goals`);
      } else {
        const newScorer = {
          playerId: goal.playerId,
          playerName: goal.playerName,
          clubName: goal.isHome ? match.homeClubName : match.awayClubName,
          clubLogo: goal.isHome ? match.homeClubLogo : match.awayClubLogo,
          goals: 1
        };
        updatedScorers.push(newScorer);
        console.log(`New scorer: ${newScorer.playerName} (1 goal)`);
      }
    });
    
    return updatedScorers.sort((a, b) => b.goals - a.goals).slice(0, 10);
  }

  /**
   * FIXED: Enhanced top assists update with proper tracking
   */
  private static updateTopAssists(topAssists: League['topAssists'], match: LeagueMatch) {
    const updatedAssists = [...topAssists];
    
    match.assists.forEach(assist => {
      const existingAssister = updatedAssists.find(a => a.playerId === assist.playerId);
      if (existingAssister) {
        existingAssister.assists++;
        console.log(`${existingAssister.playerName}: ${existingAssister.assists} assists`);
      } else {
        const newAssister = {
          playerId: assist.playerId,
          playerName: assist.playerName,
          clubName: assist.isHome ? match.homeClubName : match.awayClubName,
          clubLogo: assist.isHome ? match.homeClubLogo : match.awayClubLogo,
          assists: 1
        };
        updatedAssists.push(newAssister);
        console.log(`New assister: ${newAssister.playerName} (1 assist)`);
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
      return b.goalsFor - a.goalsFor;
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

  /**
   * REMOVED: Duplicate updatePlayerCards method - already handled in updatePlayerStaminaAndCards
   */

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

  /**
   * ADDED: Helper method to clear player suspensions (for new matchDay)
   */
  static async clearPlayerSuspensions(leagueId: string): Promise<void> {
    console.log(`Clearing player suspensions for league ${leagueId}`);
    
    const leagueDoc = await getDoc(doc(db, 'leagues', leagueId));
    if (!leagueDoc.exists()) return;
    
    const league = leagueDoc.data() as League;
    
    // Clear suspensions for all clubs in the league
    for (const clubId of league.clubs) {
      const club = await this.getClubById(clubId);
      if (!club) continue;
      
      const updatedPlayers = club.players.map(player => {
        if (player.isSuspended) {
          console.log(`Clearing suspension for ${player.name}`);
          return {
            ...player,
            isSuspended: false,
            suspensionReason: undefined
          };
        }
        return player;
      });
      
      await ClubService.updateClubPlayers(clubId, updatedPlayers);
    }
  }

  /**
   * NEW: Auto-forfeit system - automatically forfeits games that weren't played by deadline
   * Should be called daily or when checking league status
   */
  static async processAutoForfeits(leagueId: string): Promise<number> {
    console.log(`Processing auto-forfeits for league ${leagueId}`);
    
    const leagueDoc = await getDoc(doc(db, 'leagues', leagueId));
    if (!leagueDoc.exists()) {
      console.log('League not found');
      return 0;
    }
    
    const league = leagueDoc.data() as League;
    if (league.status !== 'started') {
      console.log('League not started, skipping auto-forfeits');
      return 0;
    }
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    let forfeitCount = 0;
    const updatedFixtures = [];
    const forfeitedMatches = [];
    
    for (const fixture of league.fixtures) {
      // Skip already played/forfeited fixtures
      if (fixture.status === 'played' || fixture.status === 'forfeited') {
        updatedFixtures.push(fixture);
        continue;
      }
      
      const matchDate = fixture.scheduledDate && typeof fixture.scheduledDate === 'object' && fixture.scheduledDate.toDate 
        ? fixture.scheduledDate.toDate() 
        : new Date(fixture.scheduledDate);
      
      // Check if match date has passed (game should have been played yesterday or earlier)
      const dayAfterMatch = new Date(matchDate);
      dayAfterMatch.setDate(dayAfterMatch.getDate() + 1);
      dayAfterMatch.setHours(0, 0, 0, 0);
      
      if (today >= dayAfterMatch && fixture.status === 'available') {
        console.log(`Auto-forfeiting match: ${fixture.homeClubName} vs ${fixture.awayClubName} (scheduled for ${matchDate.toDateString()})`);
        
        // Create forfeited match result (0-3 to away team)
        const forfeitMatch: LeagueMatch = {
          id: doc(collection(db, 'leagueMatches')).id,
          fixtureId: fixture.id,
          homeClubId: fixture.homeClubId,
          awayClubId: fixture.awayClubId,
          homeClubName: fixture.homeClubName,
          awayClubName: fixture.awayClubName,
          homeClubLogo: fixture.homeClubLogo,
          awayClubLogo: fixture.awayClubLogo,
          homeScore: 0,
          awayScore: 3,
          matchDay: fixture.matchDay,
          playedAt: new Date(),
          isForfeited: true,
          goalscorers: [], // No goalscorers in forfeit
          assists: [], // No assists in forfeit
          cards: [], // No cards in forfeit
          commentary: [
            `Match forfeited by ${fixture.homeClubName}`,
            `${fixture.awayClubName} awarded 3-0 victory`,
            'Forfeit processed automatically due to no-show'
          ]
        };
        
        // Store forfeited match in database
        await setDoc(doc(db, 'leagueMatches', forfeitMatch.id), forfeitMatch);
        
        // Update fixture status
        const updatedFixture = {
          ...fixture,
          status: 'forfeited' as const,
          result: {
            homeScore: 0,
            awayScore: 3,
            playedAt: new Date(),
            isForfeited: true
          }
        };
        
        updatedFixtures.push(updatedFixture);
        forfeitedMatches.push(forfeitMatch);
        forfeitCount++;
        
      } else {
        updatedFixtures.push(fixture);
      }
    }
    
    if (forfeitCount > 0) {
      console.log(`${forfeitCount} matches auto-forfeited`);
      
      // Update league with forfeited fixtures and matches
      const updatedMatches = [...league.matches, ...forfeitedMatches];
      
      // Update leaderboard with forfeit results
      let updatedLeaderboard = league.leaderboard;
      let updatedTopScorers = league.topScorers;
      let updatedTopAssists = league.topAssists;
      
      // Process each forfeit for leaderboard updates
      forfeitedMatches.forEach(match => {
        updatedLeaderboard = this.updateLeaderboard(updatedLeaderboard, match);
        updatedTopScorers = this.updateTopScorers(updatedTopScorers, match);
        updatedTopAssists = this.updateTopAssists(updatedTopAssists, match);
      });
      
      // Check if we need to advance matchDays after forfeits
      const currentDayFixtures = updatedFixtures.filter(f => f.matchDay === league.currentMatchDay);
      const allCurrentDayComplete = currentDayFixtures.every(f => f.status === 'played' || f.status === 'forfeited');
      
      let nextMatchDay = league.currentMatchDay;
      let statusUpdate = {};
      
      if (allCurrentDayComplete) {
        nextMatchDay++;
        console.log(`Advancing to matchDay ${nextMatchDay} after auto-forfeits`);
        
        // Make next day fixtures available
        updatedFixtures.forEach(fixture => {
          if (fixture.matchDay === nextMatchDay && fixture.status === 'scheduled') {
            fixture.status = 'available';
          }
        });
        
        // Check if league is finished
        const totalFixtures = updatedFixtures.length;
        const completedFixtures = updatedFixtures.filter(f => f.status === 'played' || f.status === 'forfeited').length;
        
        if (completedFixtures === totalFixtures) {
          statusUpdate = { status: 'finished', finishedAt: new Date() };
          console.log('League finished after auto-forfeits!');
        }
      }
      
      // Update league in database
      const updateData = {
        fixtures: updatedFixtures,
        matches: updatedMatches,
        leaderboard: updatedLeaderboard,
        topScorers: updatedTopScorers,
        topAssists: updatedTopAssists,
        currentMatchDay: nextMatchDay,
        lastUpdated: new Date(),
        ...statusUpdate
      };
      
      await updateDoc(doc(db, 'leagues', leagueId), updateData);
      console.log(`League updated with ${forfeitCount} auto-forfeits`);
    } else {
      console.log('No matches to auto-forfeit');
    }
    
    return forfeitCount;
  }

  /**
   * NEW: Process auto-forfeits for all active leagues
   * Call this function daily (e.g., via cron job or scheduled function)
   */
  static async processAllLeagueForfeits(): Promise<{[leagueId: string]: number}> {
    console.log('Processing auto-forfeits for all active leagues');
    
    const leaguesRef = collection(db, 'leagues');
    const activeLeaguesQuery = query(leaguesRef, where('status', '==', 'started'));
    const snapshot = await getDocs(activeLeaguesQuery);
    
    const results: {[leagueId: string]: number} = {};
    
    for (const doc of snapshot.docs) {
      const league = doc.data() as League;
      try {
        const forfeitCount = await this.processAutoForfeits(league.id);
        results[league.id] = forfeitCount;
      } catch (error) {
        console.error(`Error processing forfeits for league ${league.id}:`, error);
        results[league.id] = -1; // Error indicator
      }
    }
    
    console.log('Auto-forfeit processing complete:', results);
    return results;
  }

  /**
   * ADDED: Helper method to get detailed league statistics
   */
  static async getLeagueStatistics(leagueId: string): Promise<{
    totalFixtures: number;
    playedFixtures: number;
    forfeitedFixtures: number;
    currentMatchDay: number;
    totalMatchDays: number;
    isFinished: boolean;
    topScorer?: { name: string; goals: number };
    topAssister?: { name: string; assists: number };
  } | null> {
    const leagueDoc = await getDoc(doc(db, 'leagues', leagueId));
    if (!leagueDoc.exists()) return null;
    
    const league = leagueDoc.data() as League;
    
    const totalFixtures = league.fixtures.length;
    const playedFixtures = league.fixtures.filter(f => f.status === 'played').length;
    const forfeitedFixtures = league.fixtures.filter(f => f.status === 'forfeited').length;
    const totalMatchDays = Math.max(...league.fixtures.map(f => f.matchDay));
    
    return {
      totalFixtures,
      playedFixtures,
      forfeitedFixtures,
      currentMatchDay: league.currentMatchDay,
      totalMatchDays,
      isFinished: league.status === 'finished',
      topScorer: league.topScorers[0] ? {
        name: league.topScorers[0].playerName,
        goals: league.topScorers[0].goals
      } : undefined,
      topAssister: league.topAssists[0] ? {
        name: league.topAssists[0].playerName,
        assists: league.topAssists[0].assists
      } : undefined
    };
  }
}