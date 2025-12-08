import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { debugTrajectoryScores, calculateTrajectory } from '../services/trajectoryEngine';
import { getUserTagMappings } from '../services/tagMappingService';
import { debugTagConnections } from '../services/tagConnectionService';
import { Calculator, BarChart3, RefreshCw, TrendingUp } from 'lucide-react';
import TrajectoryRadar from '../components/TrajectoryRadar';
import TrajectoryLineChart from '../components/TrajectoryLineChart';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [trajectoryData, setTrajectoryData] = useState(null);
  const [userMappings, setUserMappings] = useState({});
  const [error, setError] = useState('');

  // Auto-load trajectory on mount
  useEffect(() => {
    if (user) {
      loadTrajectory();
      loadUserMappings();
    }
  }, [user]);

  // Load user's custom tag mappings
  const loadUserMappings = async () => {
    if (!user) return;
    try {
      const mappings = await getUserTagMappings(user.uid);
      setUserMappings(mappings);
    } catch (err) {
      console.error('Error loading user mappings:', err);
    }
  };

  // Load trajectory data
  const loadTrajectory = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      const trajectory = await calculateTrajectory(user.uid, 30);
      setTrajectoryData(trajectory);
    } catch (err) {
      console.error('Error loading trajectory:', err);
      setError(err.message || 'Failed to load trajectory');
    } finally {
      setLoading(false);
    }
  };

  // Test trajectory calculation with debug output
  const handleDebugCalculation = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.clear();
      console.log('🚀 DEBUG: Detailed trajectory calculation...');
      await debugTrajectoryScores(user.uid, 30);
      await loadTrajectory();
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message || 'Failed to calculate trajectory');
    } finally {
      setLoading(false);
    }
  };

  // Debug tag connections network
  const handleDebugConnections = async () => {
    console.clear();
    console.log('🔗 DEBUG: Tag Connection Network...\n');
    await debugTagConnections();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-neon-blue/60">
            Your life trajectory visualization
          </p>
        </div>
        
        <button
          onClick={loadTrajectory}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-cyber-grey border border-neon-blue/30 text-neon-blue rounded-lg hover:bg-neon-blue/10 transition-all disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Main Radar Chart Visualization */}
      {loading && !trajectoryData && (
        <div className="bg-cyber-grey border border-neon-blue/30 rounded-lg p-12 text-center shadow-xl shadow-neon-blue/10 mb-6">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neon-blue">Loading your trajectory...</p>
        </div>
      )}

      {trajectoryData && trajectoryData.hasData && (
        <div className="mb-6">
          <div className="bg-cyber-grey border border-neon-blue/30 rounded-lg p-6 shadow-xl shadow-neon-blue/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-neon-blue" size={24} />
                <div>
                  <h2 className="text-2xl font-bold text-cyber-text">Life Trajectory Radar</h2>
                  <p className="text-sm text-cyber-muted">Based on your last 30 days ({trajectoryData.totalLogs} logs)</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleDebugConnections}
                  className="px-4 py-2 bg-cyber-dark border border-neon-green/30 text-neon-green text-sm rounded-lg hover:bg-neon-green/10 transition-all"
                  title="View tag co-occurrence network in console"
                >
                  🔗 Connections
                </button>
                
                <button
                  onClick={handleDebugCalculation}
                  className="px-4 py-2 bg-cyber-dark border border-neon-purple/30 text-neon-purple text-sm rounded-lg hover:bg-neon-purple/10 transition-all"
                >
                  <Calculator size={16} className="inline mr-1" />
                  Debug Console
                </button>
              </div>
            </div>

            <TrajectoryRadar trajectoryData={trajectoryData} />

            <div className="mt-6 p-4 bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 border border-neon-purple/30 rounded-lg">
              <p className="text-cyber-muted text-sm mb-1">Trajectory Insight</p>
              <p className="text-neon-purple font-medium">{trajectoryData.trajectory}</p>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-4">
              {Object.entries(trajectoryData.percentages).map(([dimension, percentage]) => (
                <div 
                  key={dimension}
                  className="p-3 bg-cyber-dark rounded-lg border border-neon-blue/20 text-center hover:border-neon-blue/50 transition-all"
                >
                  <p className="text-cyber-muted text-xs mb-1">{dimension}</p>
                  <p className="text-2xl font-bold text-neon-blue">{percentage}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timeline Chart */}
      {trajectoryData && trajectoryData.hasData && (
        <div className="mb-6">
          <div className="bg-cyber-grey border border-neon-purple/30 rounded-lg p-6 shadow-xl shadow-neon-purple/10">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="text-neon-purple" size={24} />
              <div>
                <h2 className="text-2xl font-bold text-cyber-text">30-Day Trajectory Timeline</h2>
                <p className="text-sm text-cyber-muted">Track how each dimension evolves over time</p>
              </div>
            </div>

            <TrajectoryLineChart userId={user.uid} userMappings={userMappings} />
          </div>
        </div>
      )}

      {trajectoryData && !trajectoryData.hasData && (
        <div className="bg-cyber-grey border border-yellow-500/30 rounded-lg p-12 text-center shadow-xl shadow-yellow-500/10 mb-6">
          <BarChart3 className="mx-auto mb-4 text-yellow-500" size={48} />
          <h3 className="text-xl font-semibold text-yellow-500 mb-2">No Data Yet</h3>
          <p className="text-cyber-muted mb-4">{trajectoryData.message}</p>
          <a
            href="/daily-log"
            className="inline-block px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-neon-blue/50 transition-all"
          >
            Create Your First Log
          </a>
        </div>
      )}
    </div>
  );
}
