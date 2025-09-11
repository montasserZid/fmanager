import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  query,
  where,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Server } from '../types';

export class ServerService {
  static async createServer(
    name: string,
    password: string,
    maxCapacity: number
  ): Promise<string> {
    const serverId = doc(collection(db, 'servers')).id;
    
    const server: Server = {
      id: serverId,
      name,
      password,
      maxCapacity,
      currentClubs: 0,
      createdAt: new Date()
    };

    await setDoc(doc(db, 'servers', serverId), server);
    return serverId;
  }

  static async getAllServers(): Promise<Server[]> {
    const serversRef = collection(db, 'servers');
    const snapshot = await getDocs(serversRef);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Server));
  }

  static async updateServer(
    serverId: string,
    updates: Partial<Pick<Server, 'name' | 'password' | 'maxCapacity'>>
  ): Promise<void> {
    await updateDoc(doc(db, 'servers', serverId), updates);
  }

  static async deleteServer(serverId: string): Promise<void> {
    // First, delete all clubs in this server
    const clubsRef = collection(db, 'clubs');
    const clubsQuery = query(clubsRef, where('serverId', '==', serverId));
    const clubsSnapshot = await getDocs(clubsQuery);
    
    const deletePromises = clubsSnapshot.docs.map(clubDoc => 
      deleteDoc(doc(db, 'clubs', clubDoc.id))
    );
    
    await Promise.all(deletePromises);
    
    // Then delete the server
    await deleteDoc(doc(db, 'servers', serverId));
  }

  static async joinServer(serverId: string, password: string): Promise<boolean> {
    const serversRef = collection(db, 'servers');
    const snapshot = await getDocs(serversRef);
    
    const server = snapshot.docs.find(doc => doc.id === serverId)?.data() as Server;
    if (!server) throw new Error('Server not found');
    
    if (server.password !== password) {
      throw new Error('Incorrect password');
    }
    
    if (server.currentClubs >= server.maxCapacity) {
      throw new Error('Server is full');
    }
    
    return true;
  }

  static async incrementServerClubCount(serverId: string): Promise<void> {
    await updateDoc(doc(db, 'servers', serverId), {
      currentClubs: increment(1)
    });
  }

  static async decrementServerClubCount(serverId: string): Promise<void> {
    await updateDoc(doc(db, 'servers', serverId), {
      currentClubs: increment(-1)
    });
  }

  static async getAvailablePlayersForServer(serverId: string): Promise<any[]> {
    // Get all clubs in this server
    const clubsRef = collection(db, 'clubs');
    const clubsQuery = query(clubsRef, where('serverId', '==', serverId));
    const clubsSnapshot = await getDocs(clubsQuery);
    
    // Get all assigned player IDs in this server
    const assignedPlayerIds = new Set<number>();
    clubsSnapshot.docs.forEach(doc => {
      const club = doc.data();
      club.players?.forEach((player: any) => {
        assignedPlayerIds.add(player.id);
      });
    });
    
    // Load all players from JSON and filter out assigned ones
    const response = await fetch('/teams/les_equipes.json');
    const teamsData = await response.json();
    
    const availablePlayers: any[] = [];
    Object.entries(teamsData.teams).forEach(([teamKey, team]: [string, any]) => {
      team.players.forEach((player: any) => {
        if (!assignedPlayerIds.has(player.id)) {
          availablePlayers.push({
            ...player,
            staminaPct: 100,
            yellowCards: 0,
            redCards: 0,
            squadPosition: 'starter' as const,
            originalTeam: teamKey
          });
        }
      });
    });
    
    return availablePlayers;
  }
}