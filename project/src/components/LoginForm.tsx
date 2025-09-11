import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Shield, Eye, EyeOff, Settings } from 'lucide-react';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToSignup: () => void;
}

export function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const { signIn, signInAsAdmin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (adminMode) {
        // Admin login
        if (email !== 'admin' || password !== 'Heriot0929') {
          setError('Invalid admin credentials');
          setLoading(false);
          return;
        }
        await signInAsAdmin();
      } else {
        // Regular user login
        const userEmail = email.includes('@') ? email : `${email.toLowerCase().replace(/\s+/g, '')}@manager.local`;
        await signIn(userEmail, password);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-yellow-500 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-slate-400">Sign in to your manager account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {adminMode ? 'Admin Username' : 'Manager Pseudonym'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder={adminMode ? "Enter admin username" : "Enter your manager name"}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToSignup}
              className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
            >
              Don't have an account? Create one
            </button>
          </div>

          {/* Admin Toggle - Almost Hidden */}
          <div className="mt-8 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setAdminMode(!adminMode)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-500 transition-colors opacity-30 hover:opacity-50"
            >
              <Settings className="w-3 h-3" />
              <span className="text-xs">Admin</span>
              <div className={`w-6 h-3 rounded-full transition-colors ${adminMode ? 'bg-purple-600' : 'bg-slate-700'}`}>
                <div className={`w-2 h-2 bg-white rounded-full mt-0.5 transition-transform ${adminMode ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}