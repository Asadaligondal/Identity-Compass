import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Brain, TrendingUp, Settings, LogOut, ArrowLeft } from 'lucide-react';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isHomePage = location.pathname === '/';

  return (
    <header className="border-b border-gray-800 bg-cyber-dark sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Back Arrow + Logo */}
          <div className="flex items-center gap-3">
            {!isHomePage && (
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-cyber-grey rounded-lg transition-colors text-cyber-text hover:text-neon-blue"
                title="Back to Home"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <Brain className="text-neon-purple" size={32} />
              <div className="text-left">
                <h1 className="text-xl font-bold bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green bg-clip-text text-transparent">
                  Identity Compass
                </h1>
                <p className="text-xs text-cyber-muted">Life Trajectory Engine</p>
              </div>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-3">
            {user ? (
              // Logged in: Show app navigation
              <>
                <button
                  onClick={() => navigate('/app')}
                  className={`px-5 py-2.5 font-semibold rounded-lg transition-all flex items-center gap-2 ${
                    isActive('/app') && !isActive('/app/analytics') && !isActive('/app/settings')
                      ? 'bg-white text-gray-900 shadow-lg'
                      : 'bg-cyber-grey text-cyber-text hover:bg-white hover:text-gray-900 border border-gray-700'
                  }`}
                >
                  <Brain size={18} />
                  Mind Map
                </button>
                <button
                  onClick={() => navigate('/app/analytics')}
                  className={`px-5 py-2.5 font-semibold rounded-lg transition-all flex items-center gap-2 ${
                    isActive('/app/analytics')
                      ? 'bg-white text-gray-900 shadow-lg'
                      : 'bg-cyber-grey text-cyber-text hover:bg-white hover:text-gray-900 border border-gray-700'
                  }`}
                >
                  <TrendingUp size={18} />
                  Analytics
                </button>
                <button
                  onClick={() => navigate('/app/settings')}
                  className={`px-5 py-2.5 font-semibold rounded-lg transition-all flex items-center gap-2 ${
                    isActive('/app/settings')
                      ? 'bg-white text-gray-900 shadow-lg'
                      : 'bg-cyber-grey text-cyber-text hover:bg-white hover:text-gray-900 border border-gray-700'
                  }`}
                >
                  <Settings size={18} />
                  Settings
                </button>
                
                <div className="ml-4 pl-4 border-l border-gray-700">
                  <p className="text-xs text-cyber-muted">Logged in as</p>
                  <p className="text-sm text-neon-blue truncate max-w-[180px]">{user.email}</p>
                </div>
                
                <button
                  onClick={handleSignOut}
                  className="px-5 py-2.5 bg-cyber-grey text-cyber-text hover:bg-red-500/20 hover:text-red-400 border border-gray-700 hover:border-red-500/50 font-semibold rounded-lg transition-all flex items-center gap-2"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </>
            ) : (
              // Not logged in: Show login/signup
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-5 py-2.5 bg-cyber-grey text-cyber-text hover:bg-gray-700 border border-gray-700 font-semibold rounded-lg transition-all"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 bg-white text-gray-900 font-bold rounded-lg hover:bg-gray-100 transition-all shadow-lg"
                >
                  Sign up
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
