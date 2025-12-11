import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText,
  Brain,
  TrendingUp,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar() {
  const { signOut, user } = useAuth();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/daily-log', icon: FileText, label: 'Daily Log' },
    { path: '/mind-map', icon: Brain, label: 'Mind Map' },
    { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <aside className="w-64 bg-cyber-grey border-r border-neon-blue/20 flex flex-col shadow-lg shadow-neon-blue/5">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-neon-purple/20">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green bg-clip-text text-transparent animate-pulse">
          Identity Compass
        </h1>
        <p className="text-xs text-neon-blue/60 mt-1 font-light">Life Trajectory Engine</p>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-4 border-b border-neon-purple/20">
          <p className="text-xs text-cyber-muted">Logged in as</p>
          <p className="text-sm text-neon-blue/80 truncate font-medium">{user.email}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <li key={path}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-neon-blue/20 to-neon-purple/10 text-neon-blue border-l-4 border-neon-blue shadow-lg shadow-neon-blue/20'
                      : 'text-cyber-text hover:bg-gradient-to-r hover:from-cyber-dark hover:to-neon-purple/5 hover:text-neon-purple hover:border-l-2 hover:border-neon-purple/50'
                  }`
                }
              >
                <Icon size={20} />
                <span className="font-medium">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Sign Out Button */}
        <div className="mt-6">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-cyber-text hover:bg-gradient-to-r hover:from-red-500/10 hover:to-red-500/5 hover:text-red-400 hover:border-l-2 hover:border-red-500/50"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-neon-green/20">
        <p className="text-xs text-center">
          <span className="text-neon-green">v1.0.0</span> <span className="text-cyber-muted">MVP •</span> <span className="text-neon-purple/70">Cyberpunk Zen</span>
        </p>
      </div>
    </aside>
  );
}
