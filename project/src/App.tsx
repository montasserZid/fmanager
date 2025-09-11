import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SignUpForm } from './components/SignUpForm';
import { LoginForm } from './components/LoginForm';
import { ServerSelection } from './components/ServerSelection';
import { ClubCreation } from './components/ClubCreation';
import { SquadReview } from './components/SquadReview';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { PlayerService } from './services/playerService';
import { ClubService } from './services/clubService';
import { ServerService } from './services/serverService';
import { Club, FirebasePlayer } from './types';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [step, setStep] = useState<'signup' | 'login' | 'server-selection' | 'club-creation' | 'squad-review' | 'dashboard' | 'admin'>('signup');
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [clubData, setClubData] = useState<{
    managerName: string;
    name: string;
    logo: string;
    colors: { home: string; away: string };
  } | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<FirebasePlayer[]>([]);
  const [userClub, setUserClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !isAdmin) {
      checkUserClub();
    } else if (isAdmin) {
      setStep('admin');
    }
  }, [user, isAdmin]);

  const checkUserClub = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const club = await ClubService.getUserClub(user.uid);
      if (club) {
        setUserClub(club);
        setStep('dashboard');
      } else {
        setStep('server-selection');
      }
    } catch (err) {
      console.error('Error checking user club:', err);
      setStep('server-selection');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSuccess = () => {
    setStep('login');
  };

  const handleLoginSuccess = () => {
    if (isAdmin) {
      setStep('admin');
    } else {
      setStep('server-selection');
    }
  };

  const handleServerJoined = (serverId: string) => {
    setSelectedServerId(serverId);
    setStep('club-creation');
  };

  const handleSwitchToLogin = () => {
    setStep('login');
  };

  const handleSwitchToSignup = () => {
    setStep('signup');
  };

  const handleClubCreation = async (
    managerName: string,
    clubName: string, 
    clubLogo: string,
    colors: { home: string; away: string }
  ) => {
    setLoading(true);
    setError('');

    try {
      // Check if club name is already taken
      const isTaken = await ClubService.isClubNameTaken(clubName);
      if (isTaken) {
        setError('Club name is already taken. Please choose another name.');
        setLoading(false);
        return;
      }

      // Get available players and select balanced squad
      const availablePlayers = await PlayerService.getAvailablePlayersForServer(selectedServerId);
      
      if (availablePlayers.length < 17) {
        setError('Not enough players available in the pool. Please try again later.');
        setLoading(false);
        return;
      }

      const squad = PlayerService.selectBalancedSquad(availablePlayers, selectedServerId);
      
      setClubData({ managerName, name: clubName, logo: clubLogo, colors });
      setSelectedPlayers(squad);
      setStep('squad-review');
    } catch (err: any) {
      console.error('Club creation error:', err);
      setError(err.message || 'Failed to create club');
    } finally {
      setLoading(false);
    }
  };

  const handleSquadRegeneration = async () => {
    if (!clubData) return;
    
    setLoading(true);
    setError('');
    try {
      const availablePlayers = await PlayerService.getAvailablePlayersForServer(selectedServerId);
      const squad = PlayerService.selectBalancedSquad(availablePlayers, selectedServerId);
      setSelectedPlayers(squad);
    } catch (err: any) {
      console.error('Squad regeneration error:', err);
      setError(err.message || 'Failed to regenerate squad');
    } finally {
      setLoading(false);
    }
  };

  const handleSquadConfirmation = async () => {
    if (!user || !clubData || !selectedPlayers.length) return;

    setLoading(true);
    setError('');
    try {
      console.log('Starting squad confirmation...', {
        userId: user.uid,
        serverId: selectedServerId,
        clubData,
        playersCount: selectedPlayers.length
      });

      // Create club in Firebase
      const clubId = await ClubService.createClub(
        user.uid,
        selectedServerId,
        clubData.managerName,
        clubData.name,
        clubData.logo,
        clubData.colors,
        selectedPlayers
      );

      console.log('Club created successfully with ID:', clubId);

      // Set user club and go to dashboard
      const club: Club = {
        id: clubId,
        userId: user.uid,
        serverId: selectedServerId,
        managerName: clubData.managerName,
        clubName: clubData.name,
        clubLogo: clubData.logo,
        colors: clubData.colors,
        players: selectedPlayers,
        createdAt: new Date(),
        budget: 300000
      };

      setUserClub(club);
      setStep('dashboard');
    } catch (err: any) {
      console.error('Squad confirmation error:', err);
      setError(err.message || 'Failed to confirm squad');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading Football Manager...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md w-full">
          <p className="text-red-400 text-center">{error}</p>
          <button
            onClick={() => {
              setError('');
              setStep('signup');
            }}
            className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    if (step === 'login') {
      return <LoginForm onSuccess={handleLoginSuccess} onSwitchToSignup={handleSwitchToSignup} />;
    }
    return <SignUpForm onSuccess={handleSignUpSuccess} onSwitchToLogin={handleSwitchToLogin} />;
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  switch (step) {
    case 'server-selection':
      return <ServerSelection onServerJoined={handleServerJoined} />;
    
    case 'club-creation':
      return <ClubCreation onNext={handleClubCreation} />;
    
    case 'squad-review':
      return clubData && selectedPlayers.length > 0 ? (
        <SquadReview
          managerName={clubData.managerName}
          clubName={clubData.name}
          clubLogo={clubData.logo}
          colors={clubData.colors}
          players={selectedPlayers}
          onConfirm={handleSquadConfirmation}
          onRegenerate={handleSquadRegeneration}
        />
      ) : null;
    
    case 'dashboard':
      return userClub ? <Dashboard club={userClub} onUpdateClub={setUserClub} /> : null;
    
    case 'admin':
      return <AdminDashboard />;
    
    default:
      return <SignUpForm onSuccess={handleSignUpSuccess} onSwitchToLogin={handleSwitchToLogin} />;
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;