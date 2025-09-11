import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  deleteDoc,
  orderBy,
  limit,
  or
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FriendlyInvite, MatchResult, Manager, Club, FirebasePlayer } from '../types';
import { ClubService } from './clubService';

export class FriendlyService {
  static async getAllManagers(): Promise<Manager[]> {
    const clubsRef = collection(db, 'clubs');
    const snapshot = await getDocs(clubsRef);
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as Club;
      return {
        id: data.id,
        userId: data.userId,
        managerName: data.managerName,
        clubName: data.clubName,
        clubLogo: data.clubLogo,
        colors: data.colors,
        budget: 300000, // Default budget
        lastFriendlyDate: data.lastFriendlyDate
      };
    });
  }

  static async sendFriendlyInvite(fromUserId: string, fromClubName: string, fromClubLogo: string, toUserId: string, toClubName: string, toClubLogo: string): Promise<void> {
    const inviteId = doc(collection(db, 'friendlyInvites')).id;
    
    const invite: FriendlyInvite = {
      id: inviteId,
      fromUserId,
      fromClubName,
      fromClubLogo,
      toUserId,
      toClubName,
      toClubLogo,
      status: 'pending',
      createdAt: new Date()
    };

    await setDoc(doc(db, 'friendlyInvites', inviteId), invite);
  }

  static async getPendingInvites(userId: string, club?: Club): Promise<FriendlyInvite[]> {
    if (!club) {
      return [];
    }

    const invitesRef = collection(db, 'friendlyInvites');
    const q = query(
      invitesRef, 
      or(
        where('toUserId', '==', userId),
        where('fromUserId', '==', userId)
      ),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.data() as FriendlyInvite);
  }

  static async respondToInvite(inviteId: string, accept: boolean): Promise<void> {
    await updateDoc(doc(db, 'friendlyInvites', inviteId), {
      status: accept ? 'accepted' : 'declined'
    });
  }

  static async canPlayFriendly(userId: string): Promise<boolean> {
    const clubsRef = collection(db, 'clubs');
    const q = query(clubsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return false;
    
    const clubData = snapshot.docs[0].data();
    const lastFriendlyDate = clubData.lastFriendlyDate?.toDate();
    
    if (!lastFriendlyDate) return true;
    
    const now = new Date();
    const twentyFourHoursLater = new Date(lastFriendlyDate.getTime() + 24 * 60 * 60 * 1000);
    
    return now >= twentyFourHoursLater;
  }

  static async getTimeUntilNextFriendly(userId: string): Promise<number> {
    const clubsRef = collection(db, 'clubs');
    const q = query(clubsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return 0;
    
    const clubData = snapshot.docs[0].data();
    const lastFriendlyDate = clubData.lastFriendlyDate?.toDate();
    
    if (!lastFriendlyDate) return 0;
    
    const now = new Date();
    const twentyFourHoursLater = new Date(lastFriendlyDate.getTime() + 24 * 60 * 60 * 1000);
    
    return Math.max(0, twentyFourHoursLater.getTime() - now.getTime());
  }

  static async updateLastFriendlyDate(userId: string): Promise<void> {
    const clubsRef = collection(db, 'clubs');
    const q = query(clubsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      await updateDoc(snapshot.docs[0].ref, {
        lastFriendlyDate: new Date()
      });
    }
  }

  static async simulateMatch(homeClub: Club, awayClub: Club): Promise<MatchResult> {
    const matchId = doc(collection(db, 'matchResults')).id;
    
    // Calculate team strengths
    const homeStrength = this.calculateTeamStrength(homeClub.players.slice(0, 11));
    const awayStrength = this.calculateTeamStrength(awayClub.players.slice(0, 11));
    
    // Simulate match
    const result = this.runMatchSimulation(homeClub, awayClub, homeStrength, awayStrength);
    
    const matchResult: MatchResult = {
      id: matchId,
      homeClubId: homeClub.id,
      awayClubId: awayClub.id,
      homeClubName: homeClub.clubName,
      awayClubName: awayClub.clubName,
      homeClubLogo: homeClub.clubLogo,
      awayClubLogo: awayClub.clubLogo,
      homeManagerName: homeClub.managerName,
      awayManagerName: awayClub.managerName,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      date: new Date(),
      goalscorers: result.goalscorers,
      assists: result.assists,
      cards: result.cards,
      commentary: result.commentary,
      staminaImpact: result.staminaImpact
    };

    await setDoc(doc(db, 'matchResults', matchId), matchResult);
    
    // Update club players with new stamina values
    const updatedHomePlayers = homeClub.players.map(player => {
      const impact = result.staminaImpact.find(i => i.playerId === player.id);
      return impact ? { ...player, staminaPct: impact.staminaAfter } : player;
    });
    
    const updatedAwayPlayers = awayClub.players.map(player => {
      const impact = result.staminaImpact.find(i => i.playerId === player.id);
      return impact ? { ...player, staminaPct: impact.staminaAfter } : player;
    });
    
    // Update clubs in Firebase
    await ClubService.updateClubPlayers(homeClub.id, updatedHomePlayers);
    await ClubService.updateClubPlayers(awayClub.id, updatedAwayPlayers);
    
    return matchResult;
  }

  static async getMatchHistory(userId: string): Promise<MatchResult[]> {
    const resultsRef = collection(db, 'matchResults');
    const q = query(resultsRef, orderBy('date', 'desc'), limit(20));
    const snapshot = await getDocs(q);
    
    const allMatches = snapshot.docs.map(doc => doc.data() as MatchResult);
    
    // Filter matches where user's club participated
    return allMatches.filter(result => {
      // Check if user's club was involved (either as home or away)
      const clubsRef = collection(db, 'clubs');
      return result.homeClubId.includes(userId) || result.awayClubId.includes(userId) ||
             result.homeClubName || result.awayClubName; // Fallback for existing data
    });
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
    const goalscorers: MatchResult['goalscorers'] = [];
    const assists: MatchResult['assists'] = [];
    const cards: MatchResult['cards'] = [];
    const staminaImpact: MatchResult['staminaImpact'] = [];
    
    let homeScore = 0;
    let awayScore = 0;
    
    // Add variability - 15% chance for unexpected outcomes
    const surpriseFactor = Math.random() < 0.15;
    let effectiveHomeStrength = homeStrength;
    let effectiveAwayStrength = awayStrength;
    
    if (surpriseFactor) {
      // Randomly boost the weaker team or handicap the stronger team
      if (homeStrength > awayStrength) {
        effectiveAwayStrength *= 1.3;
        commentary.push(`⚽ ${awayClub.clubName} (Manager: ${awayClub.managerName}) looks surprisingly sharp in the warm-up!`);
      } else {
        effectiveHomeStrength *= 1.3;
        commentary.push(`⚽ The home crowd is really getting behind ${homeClub.clubName} (Manager: ${homeClub.managerName}) today!`);
      }
    }
    
    commentary.push(`⚽ Match kicks off: ${homeClub.clubName} (Manager: ${homeClub.managerName}) vs ${awayClub.clubName} (Manager: ${awayClub.managerName})!`);
    
    // Simulate 90 minutes in 9 periods of 10 minutes
    for (let period = 1; period <= 9; period++) {
      const minute = period * 10;
      
      // Calculate chances based on strength difference
      const strengthDiff = effectiveHomeStrength - effectiveAwayStrength;
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
          
          if (minute > 85) {
            commentary.push(`⚽ GOAL! ${homeClub.clubName} (Manager: ${homeClub.managerName}) - ${scorer.name} scores a dramatic late winner in the ${minute}th minute!`);
          } else if (surpriseFactor && effectiveHomeStrength < homeStrength) {
            commentary.push(`⚽ A shocker! ${homeClub.clubName} (Manager: ${homeClub.managerName}) - ${scorer.name} puts the underdogs ahead in the ${minute}th minute!`);
          } else {
            commentary.push(`⚽ GOAL! ${homeClub.clubName} (Manager: ${homeClub.managerName}) - ${scorer.name} finds the net in the ${minute}th minute!`);
          }
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
          
          if (minute > 85) {
            commentary.push(`⚽ GOAL! ${awayClub.clubName} (Manager: ${awayClub.managerName}) - ${scorer.name} scores a crucial late goal in the ${minute}th minute!`);
          } else if (surpriseFactor && effectiveAwayStrength < awayStrength) {
            commentary.push(`⚽ Against all odds! ${awayClub.clubName} (Manager: ${awayClub.managerName}) - ${scorer.name} gives the visitors the lead in the ${minute}th minute!`);
          } else {
            commentary.push(`⚽ GOAL! ${awayClub.clubName} (Manager: ${awayClub.managerName}) - ${scorer.name} strikes in the ${minute}th minute!`);
          }
        }
      }
      
      // Card events
      if (Math.random() < 0.08) {
        const isHome = Math.random() < 0.5;
        const clubName = isHome ? homeClub.clubName : awayClub.clubName;
        const managerName = isHome ? homeClub.managerName : awayClub.managerName;
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
          commentary.push(`🟥 RED CARD! ${clubName} (Manager: ${managerName}) - ${player.name} is sent off in the ${minute}th minute!`);
          if (surpriseFactor) {
            commentary.push("This could change everything!");
          }
        } else {
          commentary.push(`🟨 Yellow card for ${clubName} (Manager: ${managerName}) - ${player.name} in the ${minute}th minute.`);
        }
      }
    }
    
    // Final commentary
    if (homeScore === awayScore) {
      commentary.push(`⏱️ Full time: ${homeClub.clubName} (Manager: ${homeClub.managerName}) ${homeScore}-${awayScore} ${awayClub.clubName} (Manager: ${awayClub.managerName}). A fair result!`);
    } else if (homeScore > awayScore) {
      commentary.push(`⏱️ Full time: ${homeClub.clubName} (Manager: ${homeClub.managerName}) ${homeScore}-${awayScore} ${awayClub.clubName} (Manager: ${awayClub.managerName}). Victory for ${homeClub.clubName}!`);
    } else {
      commentary.push(`⏱️ Full time: ${homeClub.clubName} (Manager: ${homeClub.managerName}) ${homeScore}-${awayScore} ${awayClub.clubName} (Manager: ${awayClub.managerName}). Victory for ${awayClub.clubName}!`);
    }
    
    // Calculate stamina impact for all players
    const homeStarters = homeClub.players.slice(0, 11);
    const awayStarters = awayClub.players.slice(0, 11);
    const homeBench = homeClub.players.slice(11);
    const awayBench = awayClub.players.slice(11);
    
    // Starters lose 20% stamina
    [...homeStarters, ...awayStarters].forEach(player => {
      const staminaBefore = player.staminaPct;
      const staminaAfter = Math.max(0, staminaBefore - 20);
      
      staminaImpact.push({
        playerId: player.id,
        staminaBefore,
        staminaAfter
      });
    });
    
    // Bench players gain 20% stamina (capped at 100)
    [...homeBench, ...awayBench].forEach(player => {
      const staminaBefore = player.staminaPct;
      const staminaAfter = Math.min(100, staminaBefore + 20);
      
      staminaImpact.push({
        playerId: player.id,
        staminaBefore,
        staminaAfter
      });
    });
    
    return {
      homeScore,
      awayScore,
      goalscorers,
      assists,
      cards,
      commentary,
      staminaImpact
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

  static async updatePlayerStamina(playerId: number, newStamina: number): Promise<void> {
    await updateDoc(doc(db, 'players', playerId.toString()), {
      staminaPct: newStamina
    });
  }

  static async updateClubBudget(clubId: string, newBudget: number): Promise<void> {
    await updateDoc(doc(db, 'clubs', clubId), {
      budget: newBudget
    });
  }

  static async deleteInvite(inviteId: string): Promise<void> {
    await deleteDoc(doc(db, 'friendlyInvites', inviteId));
  }
}