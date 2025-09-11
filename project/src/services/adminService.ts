import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  deleteDoc, 
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Club, League, Server } from '../types';
import { ServerService } from './serverService';
import { LeagueService } from './leagueService';

export class AdminService {
  static async getAllClubs(): Promise<Club[]> {
    const clubsRef = collection(db, 'clubs');
    const snapshot = await getDocs(clubsRef);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Club));
  }

  static async deleteClub(clubId: string): Promise<void> {
    try {
      const clubsRef = collection(db, 'clubs');
      const clubQuery = query(clubsRef, where('id', '==', clubId));
      const clubDoc = await getDocs(clubQuery);
      
      if (!clubDoc.empty) {
        // Players are stored within the club document, so deleting the club automatically removes the players
        await deleteDoc(clubDoc.docs[0].ref);
        console.log(`Club ${clubId} deleted successfully`);
      } else {
        console.warn(`Club ${clubId} not found`);
      }
    } catch (error) {
      console.error('Error deleting club:', error);
      throw error;
    }
  }

  static async updateClub(club: Club): Promise<void> {
    await updateDoc(doc(db, 'clubs', club.id), {
      clubName: club.clubName,
      managerName: club.managerName,
      budget: club.budget
    });
  }

  static async getAllLeagues(): Promise<League[]> {
    const leaguesRef = collection(db, 'leagues');
    const snapshot = await getDocs(leaguesRef);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as League));
  }

  static async createLeague(leagueData: {
    name: string;
    password: string;
    serverId: string;
    maxCapacity: number;
    prizeDistribution: {
      first: number;
      second: number;
      third: number;
      others: number;
    };
    playerReward?: {
      id: number;
      name: string;
      team: string;
    };
  }): Promise<void> {
    await LeagueService.createLeague(
      leagueData.name,
      leagueData.password,
      leagueData.serverId,
      leagueData.maxCapacity,
      leagueData.prizeDistribution,
      leagueData.playerReward
    );
  }

  static async startLeague(leagueId: string): Promise<void> {
    try {
      await LeagueService.startLeague(leagueId);
    } catch (error) {
      console.error('Error starting league:', error);
      throw error;
    }
  }

  static async terminateLeague(leagueId: string): Promise<void> {
    try {
      await LeagueService.terminateLeague(leagueId);
    } catch (error) {
      console.error('Error terminating league:', error);
      throw error;
    }
  }

  static async resetLeague(leagueId: string): Promise<void> {
    await LeagueService.resetLeague(leagueId);
  }

  static async getAvailableRewardPlayers(serverId: string): Promise<FirebasePlayer[]> {
    try {
      return await LeagueService.getAvailableRewardPlayers(serverId);
    } catch (error) {
      console.error('Error getting available reward players:', error);
      return [];
    }
  }

  static async getAllServers(): Promise<Server[]> {
    return ServerService.getAllServers();
  }

  static async createServer(
    name: string,
    password: string,
    maxCapacity: number
  ): Promise<string> {
    return ServerService.createServer(name, password, maxCapacity);
  }

  static async updateServer(
    serverId: string,
    updates: Partial<Pick<Server, 'name' | 'password' | 'maxCapacity'>>
  ): Promise<void> {
    return ServerService.updateServer(serverId, updates);
  }

  static async deleteServer(serverId: string): Promise<void> {
    return ServerService.deleteServer(serverId);
  }
}

