import { collection, doc, setDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Player, FirebasePlayer } from '../types';
import teamsData from '../../teams/les_equipes.json';

export class PlayerService {
  static async getAvailablePlayersForServer(serverId: string): Promise<FirebasePlayer[]> {
    try {
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
      const availablePlayers: FirebasePlayer[] = [];
      Object.entries(teamsData.teams).forEach(([teamKey, team]: [string, any]) => {
        team.players.forEach((player: any) => {
          if (!assignedPlayerIds.has(player.id)) {
            availablePlayers.push({
              ...player,
              staminaPct: 100,
              yellowCards: 0,
              redCards: 0,
              squadPosition: 'starter' as const,
              originalTeam: teamKey,
              stamina: 100,
              gamesPlayed: 0,
              isAssigned: false
            });
          }
        });
      });
      
      return availablePlayers;
    } catch (error) {
      console.error('Error getting available players for server:', error);
      throw new Error('Failed to get available players for server');
    }
  }

  static selectBalancedSquad(availablePlayers: FirebasePlayer[], serverId: string): FirebasePlayer[] {
    const positions = {
      goalkeepers: availablePlayers.filter(p => p.position === 'Goalkeeper'),
      defenders: availablePlayers.filter(p => 
        p.position && (p.position.includes('Back') || p.position === 'Centre-Back')
      ),
      midfielders: availablePlayers.filter(p => 
        p.position && p.position.includes('Midfield')
      ),
      attackers: availablePlayers.filter(p => 
        p.position && (
          p.position.includes('Winger') || 
          p.position.includes('Forward') || 
          p.position.includes('Striker')
        )
      )
    };

    const selectedPlayers: FirebasePlayer[] = [];

    // Helper function to add default match stats to players
    const addMatchStats = (player: FirebasePlayer, squadPosition: 'starter' | 'substitute') => ({
      ...player,
      squadPosition,
      yellowCards: 0,
      redCards: 0,
      isSuspended: false
    });

    // Select starting XI
    selectedPlayers.push(...this.randomSelect(positions.goalkeepers, 1).map(p => addMatchStats(p, 'starter')));
    selectedPlayers.push(...this.randomSelect(positions.defenders, 4).map(p => addMatchStats(p, 'starter')));
    selectedPlayers.push(...this.randomSelect(positions.midfielders, 4).map(p => addMatchStats(p, 'starter')));
    selectedPlayers.push(...this.randomSelect(positions.attackers, 2).map(p => addMatchStats(p, 'starter')));

    // Select 6 substitutes with balanced positions
    const remainingPlayers = availablePlayers.filter(p => 
      !selectedPlayers.some(sp => sp.id === p.id)
    );
    
    const remainingPositions = {
      goalkeepers: remainingPlayers.filter(p => p.position === 'Goalkeeper'),
      defenders: remainingPlayers.filter(p => 
        p.position.includes('Back') || p.position === 'Centre-Back'
      ),
      midfielders: remainingPlayers.filter(p => 
        p.position.includes('Midfield')
      ),
      attackers: remainingPlayers.filter(p => 
        p.position.includes('Winger') || 
        p.position.includes('Forward') || 
        p.position.includes('Striker')
      )
    };

    // Add substitutes: 1 GK, 2 DEF, 2 MID, 1 ATT
    selectedPlayers.push(...this.randomSelect(remainingPositions.goalkeepers, 1).map(p => addMatchStats(p, 'substitute')));
    selectedPlayers.push(...this.randomSelect(remainingPositions.defenders, 2).map(p => addMatchStats(p, 'substitute')));
    selectedPlayers.push(...this.randomSelect(remainingPositions.midfielders, 2).map(p => addMatchStats(p, 'substitute')));
    selectedPlayers.push(...this.randomSelect(remainingPositions.attackers, 1).map(p => addMatchStats(p, 'substitute')));

    return selectedPlayers;
  }

  private static randomSelect<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
  }
}