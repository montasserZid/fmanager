import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  orderBy,
  limit,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TransferOffer, TransferRecord, FirebasePlayer, Club } from '../types';
import { ClubService } from './clubService';

export class TransferService {
  static async makeDirectOffer(
    fromUserId: string,
    fromClubName: string,
    fromClubLogo: string,
    toClubId: string,
    toClubName: string,
    targetPlayer: FirebasePlayer,
    offerAmount: number
  ): Promise<void> {
    const offerId = doc(collection(db, 'transferOffers')).id;
    
    // Get the target club's userId
    const toClub = await this.getClubByPlayerId(targetPlayer.id);
    if (!toClub) throw new Error('Target club not found');
    
    const offer: TransferOffer = {
      id: offerId,
      fromUserId,
      fromClubName,
      fromClubLogo,
      toUserId: toClub.userId,
      toClubName,
      targetPlayerId: targetPlayer.id,
      targetPlayerName: targetPlayer.name,
      targetPlayerPosition: targetPlayer.position,
      targetPlayerValue: targetPlayer.market_value || '€0',
      targetPlayerImage: targetPlayer.image_url,
      offerType: 'direct',
      offerAmount,
      status: 'pending',
      createdAt: new Date()
    };

    await setDoc(doc(db, 'transferOffers', offerId), offer);
  }

  static async makeSwapOffer(
    fromUserId: string,
    fromClubName: string,
    fromClubLogo: string,
    toClubId: string,
    toClubName: string,
    targetPlayer: FirebasePlayer,
    swapPlayer: FirebasePlayer,
    additionalMoney: number = 0
  ): Promise<void> {
    const offerId = doc(collection(db, 'transferOffers')).id;
    
    // Get the target club's userId
    const toClub = await this.getClubByPlayerId(targetPlayer.id);
    if (!toClub) throw new Error('Target club not found');
    
    const offer: TransferOffer = {
      id: offerId,
      fromUserId,
      fromClubName,
      fromClubLogo,
      toUserId: toClub.userId,
      toClubName,
      targetPlayerId: targetPlayer.id,
      targetPlayerName: targetPlayer.name,
      targetPlayerPosition: targetPlayer.position,
      targetPlayerValue: targetPlayer.market_value || '€0',
      targetPlayerImage: targetPlayer.image_url,
      offerType: 'swap',
      offerAmount: additionalMoney,
      swapPlayerId: swapPlayer.id,
      swapPlayerName: swapPlayer.name,
      swapPlayerPosition: swapPlayer.position,
      swapPlayerValue: swapPlayer.market_value || '€0',
      swapPlayerImage: swapPlayer.image_url,
      status: 'pending',
      createdAt: new Date()
    };

    await setDoc(doc(db, 'transferOffers', offerId), offer);
  }

  static async getReceivedOffers(userId: string): Promise<TransferOffer[]> {
    const offersRef = collection(db, 'transferOffers');
    const q = query(
      offersRef,
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.data() as TransferOffer);
  }

  static async getMadeOffers(userId: string): Promise<TransferOffer[]> {
    const offersRef = collection(db, 'transferOffers');
    const q = query(
      offersRef,
      where('fromUserId', '==', userId)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.data() as TransferOffer);
  }

  static async respondToOffer(offerId: string, accept: boolean): Promise<void> {
    await updateDoc(doc(db, 'transferOffers', offerId), {
      status: accept ? 'accepted' : 'declined'
    });
  }

  static async processTransfer(offer: TransferOffer, receivingClub: Club): Promise<void> {
    // Get the offering club
    const offeringClub = await ClubService.getUserClub(offer.fromUserId);
    if (!offeringClub) throw new Error('Offering club not found');

    if (offer.offerType === 'direct') {
      await this.processDirectTransfer(offer, offeringClub, receivingClub);
    } else {
      await this.processSwapTransfer(offer, offeringClub, receivingClub);
    }

    // Mark offer as accepted and delete it
    await updateDoc(doc(db, 'transferOffers', offer.id), { status: 'accepted' });
    await deleteDoc(doc(db, 'transferOffers', offer.id));
  }

  private static async processDirectTransfer(
    offer: TransferOffer, 
    buyingClub: Club, 
    sellingClub: Club
  ): Promise<void> {
    const transferFee = offer.offerAmount || 0;
    
    // Check if buying club has enough budget
    const buyingBudget = await ClubService.getClubBudget(buyingClub.id);
    if (buyingBudget < transferFee) {
      throw new Error('Insufficient budget for transfer');
    }

    // Find the target player
    const targetPlayer = sellingClub.players.find(p => p.id === offer.targetPlayerId);
    if (!targetPlayer) throw new Error('Target player not found');

    // Update budgets
    await ClubService.updateClubBudget(buyingClub.id, buyingBudget - transferFee);
    const sellingBudget = await ClubService.getClubBudget(sellingClub.id);
    await ClubService.updateClubBudget(sellingClub.id, sellingBudget + transferFee);

    // Transfer player
    const updatedSellingPlayers = sellingClub.players.filter(p => p.id !== targetPlayer.id);
    
    // Determine squad position based on current squad size
    let squadPosition: 'starter' | 'substitute' | 'reserve' = 'reserve';
    const currentSquadSize = buyingClub.players.length;
    
    if (currentSquadSize < 11) {
      squadPosition = 'starter';
    } else if (currentSquadSize < 17) {
      squadPosition = 'substitute';
    } else {
      squadPosition = 'reserve';
    }
    
    const updatedBuyingPlayers = [...buyingClub.players, { 
      ...targetPlayer, 
      squadPosition, 
      clubId: buyingClub.id 
    }];

    // Ensure buying club doesn't exceed 23 players
    if (updatedBuyingPlayers.length > 23) {
      throw new Error('Cannot exceed maximum squad size of 23 players');
    }

    // Update both clubs
    await ClubService.updateClubPlayers(sellingClub.id, updatedSellingPlayers);
    await ClubService.updateClubPlayers(buyingClub.id, updatedBuyingPlayers);

    // Record transfer in history
    await this.recordTransfer(
      targetPlayer,
      sellingClub,
      buyingClub,
      transferFee,
      'direct'
    );
  }

  private static async processSwapTransfer(
    offer: TransferOffer, 
    offeringClub: Club, 
    receivingClub: Club
  ): Promise<void> {
    const additionalMoney = offer.offerAmount || 0;
    
    // Check if offering club has enough budget for additional money
    if (additionalMoney > 0) {
      const offeringBudget = await ClubService.getClubBudget(offeringClub.id);
      if (offeringBudget < additionalMoney) {
        throw new Error('Insufficient budget for additional money');
      }
    }

    // Find both players
    const targetPlayer = receivingClub.players.find(p => p.id === offer.targetPlayerId);
    const swapPlayer = offeringClub.players.find(p => p.id === offer.swapPlayerId);
    
    if (!targetPlayer) throw new Error('Target player not found');
    if (!swapPlayer) throw new Error('Swap player not found');

    // Preserve squad positions during swap
    const targetPlayerPosition = targetPlayer.squadPosition;
    const swapPlayerPosition = swapPlayer.squadPosition;

    // Update budgets if additional money is involved
    if (additionalMoney > 0) {
      const offeringBudget = await ClubService.getClubBudget(offeringClub.id);
      const receivingBudget = await ClubService.getClubBudget(receivingClub.id);
      
      await ClubService.updateClubBudget(offeringClub.id, offeringBudget - additionalMoney);
      await ClubService.updateClubBudget(receivingClub.id, receivingBudget + additionalMoney);
    }

    // Swap players between clubs
    const updatedReceivingPlayers = receivingClub.players.map(p => 
      p.id === targetPlayer.id 
        ? { ...swapPlayer, squadPosition: targetPlayerPosition }
        : p
    );

    const updatedOfferingPlayers = offeringClub.players.map(p => 
      p.id === swapPlayer.id 
        ? { ...targetPlayer, squadPosition: swapPlayerPosition }
        : p
    );

    // Update both clubs
    await ClubService.updateClubPlayers(receivingClub.id, updatedReceivingPlayers);
    await ClubService.updateClubPlayers(offeringClub.id, updatedOfferingPlayers);

    // Record both transfers in history
    await Promise.all([
      this.recordTransfer(targetPlayer, receivingClub, offeringClub, additionalMoney, 'swap'),
      this.recordTransfer(swapPlayer, offeringClub, receivingClub, 0, 'swap')
    ]);
  }

  private static async recordTransfer(
    player: FirebasePlayer,
    fromClub: Club,
    toClub: Club,
    transferFee: number,
    transferType: 'direct' | 'swap'
  ): Promise<void> {
    const transferId = doc(collection(db, 'transferHistory')).id;
    
    const transfer: TransferRecord = {
      id: transferId,
      playerId: player.id,
      playerName: player.name,
      playerImage: player.image_url,
      fromClubId: fromClub.id,
      fromClubName: fromClub.clubName,
      fromClubLogo: fromClub.clubLogo,
      toClubId: toClub.id,
      toClubName: toClub.clubName,
      toClubLogo: toClub.clubLogo,
      transferFee,
      transferType,
      date: new Date()
    };

    await setDoc(doc(db, 'transferHistory', transferId), transfer);
  }

  private static async getClubByPlayerId(playerId: number): Promise<Club | null> {
    const clubsRef = collection(db, 'clubs');
    const snapshot = await getDocs(clubsRef);
    
    for (const clubDoc of snapshot.docs) {
      const club = clubDoc.data() as Club;
      if (club.players.some(p => p.id === playerId)) {
        return club;
      }
    }
    
    return null;
  }

  static async getAvailablePlayersForTransfer(excludeUserId: string): Promise<{ player: FirebasePlayer; clubName: string; clubLogo: string; canDirectBuy: boolean }[]> {
    const clubsRef = collection(db, 'clubs');
    const snapshot = await getDocs(clubsRef);
    
    const availablePlayers: { player: FirebasePlayer; clubName: string; clubLogo: string; canDirectBuy: boolean }[] = [];
    
    snapshot.docs.forEach(doc => {
      const club = doc.data() as Club;
      if (club.userId !== excludeUserId) {
        const canDirectBuy = club.players.length > 17;
        club.players.forEach(player => {
          availablePlayers.push({
            player: { ...player, clubId: club.id },
            clubName: club.clubName,
            clubLogo: club.clubLogo,
            canDirectBuy
          });
        });
      }
    });
    
    return availablePlayers;
  }

  static async getTransferHistory(): Promise<TransferRecord[]> {
    const transfersRef = collection(db, 'transferHistory');
    const q = query(
      transfersRef,
      orderBy('date', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.data() as TransferRecord);
  }

  static parseMarketValue(marketValue: string | null): number {
    if (!marketValue) return 0;
    
    const value = marketValue.replace(/[€,]/g, '');
    if (value.includes('m')) {
      return parseFloat(value.replace('m', '')) * 1000000;
    }
    if (value.includes('k')) {
      return parseFloat(value.replace('k', '')) * 1000;
    }
    return parseFloat(value) || 0;
  }

  static formatCurrency(amount: number): string {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}m`;
    }
    if (amount >= 1000) {
      return `€${(amount / 1000).toFixed(0)}k`;
    }
    return `€${amount}`;
  }
}