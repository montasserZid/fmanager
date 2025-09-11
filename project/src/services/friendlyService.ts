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
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FriendlyInvite, MatchResult, Manager, Club, FirebasePlayer } from '../types';
import { MatchSimulationService } from './matchSimulationService';

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
        budget: data.budget || 300000,
        lastFriendlyDate: data.lastFriendlyDate
      };
    });
  }

  static async sendFriendlyInvite(fromUserId: string, fromClubName: string, fromClubLogo: string, toUserId: string, toClubName: string): Promise<void> {
    const inviteId = doc(collection(db, 'friendlyInvites')).id;
    
    const invite: FriendlyInvite = {
      id: inviteId,
      fromUserId,
      fromClubName,
      fromClubLogo,
      toUserId,
      toClubName,
      status: 'pending',
      createdAt: new Date()
    };

    await setDoc(doc(db, 'friendlyInvites', inviteId), invite);
  }

  static async getPendingInvites(userId: string): Promise<FriendlyInvite[]> {
    const invitesRef = collection(db, 'friendlyInvites');
    const q = query(
      invitesRef, 
      where('toUserId', '==', userId),
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
    const lastFriendlyDate = clubData.lastFriendlyDate?.toDate ? clubData.lastFriendlyDate.toDate() : clubData.lastFriendlyDate;
    
    if (!lastFriendlyDate) return true;
    
    const today = new Date();
    const twentyFourHoursAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    return lastFriendlyDate < twentyFourHoursAgo;
  }

  static async getTimeUntilNextFriendly(userId: string): Promise<number> {
    const clubsRef = collection(db, 'clubs');
    const q = query(clubsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return 0;
    
    const clubData = snapshot.docs[0].data();
    const lastFriendlyDate = clubData.lastFriendlyDate?.toDate ? clubData.lastFriendlyDate.toDate() : clubData.lastFriendlyDate;
    
    if (!lastFriendlyDate) return 0;
    
    const now = new Date();
    const nextAllowedTime = new Date(lastFriendlyDate.getTime() + 24 * 60 * 60 * 1000);
    
    return Math.max(0, nextAllowedTime.getTime() - now.getTime());
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
    
    // Use the enhanced simulation service
    const simulationResult = await MatchSimulationService.simulateMatch(homeClub, awayClub, false);
    
    const matchResult: MatchResult = {
      id: matchId,
      homeClubId: homeClub.id,
      awayClubId: awayClub.id,
      homeClubName: homeClub.clubName,
      awayClubName: awayClub.clubName,
      homeManagerName: homeClub.managerName,
      awayManagerName: awayClub.managerName,
      homeClubLogo: homeClub.clubLogo,
      awayClubLogo: awayClub.clubLogo,
      homeScore: simulationResult.homeScore,
      awayScore: simulationResult.awayScore,
      date: new Date(),
      matchType: 'friendly',
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
      ],
      staminaImpact: []
    };

    await setDoc(doc(db, 'matchResults', matchId), matchResult);
    
    // Update player stamina - Friendly matches: 10% loss for starters
    const updatedHomePlayers = homeClub.players.map(player => {
      if (player.squadPosition === 'starter') {
        const currentStamina = player.staminaPct || 100;
        const newStamina = Math.max(0, currentStamina - 10);
        return { ...player, staminaPct: newStamina };
      }
      // Bench players gain stamina
      else if (player.squadPosition === 'substitute' || player.squadPosition === 'reserve') {
        const currentStamina = player.staminaPct || 100;
        const newStamina = Math.min(100, currentStamina + 5);
        return { ...player, staminaPct: newStamina };
      }
      return player;
    });
    
    const updatedAwayPlayers = awayClub.players.map(player => {
      if (player.squadPosition === 'starter') {
        const currentStamina = player.staminaPct || 100;
        const newStamina = Math.max(0, currentStamina - 10);
        return { ...player, staminaPct: newStamina };
      }
      // Bench players gain stamina
      else if (player.squadPosition === 'substitute' || player.squadPosition === 'reserve') {
        const currentStamina = player.staminaPct || 100;
        const newStamina = Math.min(100, currentStamina + 5);
        return { ...player, staminaPct: newStamina };
      }
      return player;
    });
    
    // Update clubs in Firebase
    await ClubService.updateClubPlayers(homeClub.id, updatedHomePlayers);
    await ClubService.updateClubPlayers(awayClub.id, updatedAwayPlayers);
    
    return matchResult;
  }

  static async getMatchHistory(userId: string): Promise<MatchResult[]> {
    try {
      // First, get the user's club ID
      const clubsRef = collection(db, 'clubs');
      const clubQuery = query(clubsRef, where('userId', '==', userId));
      const clubSnapshot = await getDocs(clubQuery);
      
      if (clubSnapshot.empty) {
        console.log('No club found for user:', userId);
        return [];
      }
      
      const userClubId = clubSnapshot.docs[0].id;
      
      // Then get match results
      const resultsRef = collection(db, 'matchResults');
      const q = query(
        resultsRef,
        orderBy('date', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      
      const allMatches = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Convert Firestore timestamp to JavaScript Date
        let convertedDate;
        if (data.date && data.date.toDate) {
          // Firestore Timestamp object
          convertedDate = data.date.toDate();
        } else if (data.date instanceof Date) {
          // Already a Date object
          convertedDate = data.date;
        } else if (typeof data.date === 'string') {
          // String date
          convertedDate = new Date(data.date);
        } else {
          // Fallback to current date
          convertedDate = new Date();
        }
        
        return {
          ...data,
          date: convertedDate
        } as MatchResult;
      });
      
      // Filter matches where this user's club played
      const userMatches = allMatches.filter(result => 
        result.homeClubId === userClubId || result.awayClubId === userClubId
      );
      
      return userMatches;
      
    } catch (error) {
      console.error('Error in getMatchHistory:', error);
      return [];
    }
  }

  static async updatePlayerStamina(playerId: number, newStamina: number): Promise<void> {
    // Find the club that contains this player and update the player's stamina
    const clubsRef = collection(db, 'clubs');
    const snapshot = await getDocs(clubsRef);
    
    for (const clubDoc of snapshot.docs) {
      const club = clubDoc.data() as Club;
      const playerIndex = club.players.findIndex(p => p.id === playerId);
      
      if (playerIndex !== -1) {
        const updatedPlayers = [...club.players];
        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          staminaPct: newStamina
        };
        
        await updateDoc(clubDoc.ref, {
          players: updatedPlayers
        });
        break;
      }
    }
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