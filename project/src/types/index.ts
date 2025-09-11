export interface Player {
  id: number;
  number?: number | null;
  name: string;
  position: string;
  nationality: string | string[];
  market_value: string | null;
  age?: number;
  captain?: boolean;
  image_url: string;
  stamina: number;
  gamesPlayed: number;
  attributes: {
    pace?: number;
    shooting?: number;
    passing?: number;
    dribbling?: number;
    defense?: number;
    physique?: number;
    handling?: number;
    positioning?: number;
    diving?: number;
    kicking?: number;
    reflexes?: number;
  };
}

export interface Team {
  name: string;
  logo: string;
  players: Player[];
}

export interface Club {
  id: string;
  userId: string;
  managerName: string;
  clubName: string;
  clubLogo: string;
  colors: {
    home: string;
    away: string;
  };
  playerReward?: FirebasePlayer | null;
}

export interface FirebasePlayer {
  id: number;
  name: string;
  position: string | null;
  nationality: string | string[];
  market_value: string | null;
  age?: number;
  image_url: string | null;
  stamina: number;
  gamesPlayed: number;
  attributes: Player['attributes'];
  isAssigned: boolean;
  clubId?: string;
  originalTeam?: string;
  number?: number | null;
  staminaPct: number;
  yellowCards: number;
  redCards: number;
  isSuspended?: boolean;
  suspensionReason?: 'yellow_cards' | 'red_card';
  squadPosition?: 'starter' | 'substitute' | 'reserve';
}

export interface Formation {
  name: string;
  positions: {
    x: number;
    y: number;
    position: string;
  }[];
}

export interface FriendlyInvite {
  id: string;
  fromUserId: string;
  fromClubName: string;
  fromClubLogo: string;
  toUserId: string;
  toClubName: string;
  toClubLogo: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

export interface MatchResult {
  id: string;
  homeClubId: string;
  awayClubId: string;
  homeClubName: string;
  awayClubName: string;
  homeClubLogo: string;
  awayClubLogo: string;
  homeManagerName: string;
  status: 'scheduled' | 'available' | 'playing' | 'played' | 'forfeited';
  homeScore: number;
  awayScore: number;
  date: Date;
  goalscorers: {
    playerId: number;
    playerName: string;
    minute: number;
    isHome: boolean;
  }[];
  assists: {
    playerId: number;
    playerName: string;
    minute: number;
    isHome: boolean;
  }[];
  cards: {
    playerId: number;
    playerName: string;
    type: 'yellow' | 'red';
    minute: number;
    isHome: boolean;
  }[];
  commentary: string[];
  staminaImpact: {
    playerId: number;
    staminaBefore: number;
    staminaAfter: number;
  }[];
}

export interface Manager {
  id: string;
  userId: string;
  managerName: string;
  clubName: string;
  clubLogo: string;
  colors: { home: string; away: string };
  lastFriendlyDate?: Date;
  budget: number;
}