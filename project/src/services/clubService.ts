import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Club, FirebasePlayer } from '../types';
import { ServerService } from './serverService'; // Add this import

export class ClubService {
  static async createClub(
    userId: string,
    serverId: string,
    managerName: string,
    clubName: string,
    clubLogo: string,
    colors: { home: string; away: string },
    players: FirebasePlayer[]
  ): Promise<string> {
    try {
      const clubId = doc(collection(db, 'clubs')).id;
      
      const club: Club = {
        id: clubId,
        userId,
        serverId,
        managerName,
        clubName,
        clubLogo,
        colors,
        players,
        createdAt: new Date(),
        budget: 300000
      };
      console.log('Creating club with data:', club);
      await setDoc(doc(db, 'clubs', clubId), club);
      
      // Increment server club count
      await ServerService.incrementServerClubCount(serverId);
      
      console.log('Club created and server count updated');
      return clubId;
    } catch (error) {
      console.error('Error in createClub:', error);
      throw error;
    }
  }

  static async isClubNameTaken(clubName: string): Promise<boolean> {
    const clubsRef = collection(db, 'clubs');
    const q = query(clubsRef, where('clubName', '==', clubName));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  static async getUserClub(userId: string): Promise<Club | null> {
    const clubsRef = collection(db, 'clubs');
    const q = query(clubsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Club;
  }

  static async updateClubPlayers(clubId: string, players: FirebasePlayer[]): Promise<void> {
    await updateDoc(doc(db, 'clubs', clubId), {
      players
    });
  }

  // Add the missing getClubBudget method that Dashboard is trying to call
  static async getClubBudget(clubId: string): Promise<number> {
    try {
      const clubsRef = collection(db, 'clubs');
      const q = query(clubsRef, where('id', '==', clubId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const club = snapshot.docs[0].data() as Club;
        return club.budget || 300000; // Default to 300k if budget not set
      }
      return 300000;
    } catch (error) {
      console.error('Error getting club budget:', error);
      return 300000;
    }
  }

  // Add the missing updateClubBudget method that TransferService is trying to call
  static async updateClubBudget(clubId: string, newBudget: number): Promise<void> {
    try {
      await updateDoc(doc(db, 'clubs', clubId), {
        budget: newBudget
      });
    } catch (error) {
      console.error('Error updating club budget:', error);
      throw error;
    }
  }
}