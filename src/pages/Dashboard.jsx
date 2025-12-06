import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { debugTrajectoryScores, calculateTrajectory } from '../services/trajectoryEngine';
import { Calculator, BarChart3 } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [trajectoryData, setTrajectoryData] = useState(null);
  const [error, setError] = useState('');

  // Test trajectory calculation
  const handleCalculateTrajectory = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    setTrajectoryData(null); // Clear old data first
    
    try {
      console.clear(); // Clear console for cleaner output
      console.log('🚀 Starting FRESH trajectory calculation...');
      console.log('👤 User ID:', user.uid);
      console.log('📅 Analyzing last 30 days');
      console.log('-----------------------------------');
      
      // Call debug function (logs detailed info to console)
      const debugData = await debugTrajectoryScores(user.uid, 30);
      
      // Also get formatted trajectory data
      const trajectory = await calculateTrajectory(user.uid, 30);
      
      console.log('-----------------------------------');
      console.log('✅ Trajectory calculation complete!');
      console.log('📊 Results:', trajectory);
      
      setTrajectoryData(trajectory);
      
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message || 'Failed to calculate trajectory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green bg-clip-text text-transparent mb-2">
          Dashboard
        </h1>
        <p className="text-neon-blue/60">
          Your life trajectory visualization
        </p>
      </div>

      {/* Test Trajectory Calculation */}
      <div className="bg-cyber-grey border border-neon-blue/30 rounded-lg p-8 mb-6 shadow-xl shadow-neon-blue/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calculator className="text-neon-blue" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-cyber-text">
                Trajectory Calculator (Step 5)
              </h2>
              <p className="text-sm text-cyber-muted">
                Test the math - calculates last 30 days of logs
              </p>
            </div>
          </div>
          
          <button
            onClick={handleCalculateTrajectory}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-neon-blue/50 transition-all disabled:opacity-50"
          >
            {loading ? 'Calculating...' : 'Calculate Scores'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {trajectoryData && trajectoryData.hasData && (
          <div className="space-y-4">
            <div className="p-4 bg-cyber-dark rounded-lg border border-neon-green/20">
              <p className="text-cyber-muted text-sm mb-2">Total Logs Analyzed</p>
              <p className="text-2xl font-bold text-neon-green">{trajectoryData.totalLogs}</p>
            </div>

            <div className="p-4 bg-cyber-dark rounded-lg border border-neon-blue/20">
              <p className="text-cyber-muted text-sm mb-3">Dimension Scores (Raw Points)</p>
              <div className="space-y-2">
                {Object.entries(trajectoryData.dimensionScores).map(([dimension, score]) => (
                  <div key={dimension} className="flex justify-between items-center">
                    <span className="text-cyber-text">{dimension}</span>
                    <span className="text-neon-blue font-mono font-bold">{score} points</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-cyber-dark rounded-lg border border-neon-purple/20">
              <p className="text-cyber-muted text-sm mb-3">Dimension Distribution</p>
              <div className="space-y-3">
                {Object.entries(trajectoryData.percentages).map(([dimension, percentage]) => (
                  <div key={dimension}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-cyber-text">{dimension}</span>
                      <span className="text-neon-purple font-mono font-bold">{percentage}%</span>
                    </div>
                    <div className="w-full bg-cyber-grey rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          dimension === trajectoryData.dominantDimension 
                            ? 'bg-gradient-to-r from-neon-blue to-neon-purple' 
                            : 'bg-neon-blue/30'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 border border-neon-purple/30 rounded-lg">
              <p className="text-cyber-muted text-sm mb-2">Trajectory Insight</p>
              <p className="text-neon-purple font-medium">{trajectoryData.trajectory}</p>
            </div>

            <div className="p-3 bg-neon-green/10 border border-neon-green/30 rounded-lg">
              <p className="text-neon-green text-sm">
                ✅ Open browser console (F12) to see detailed breakdown with tag frequencies
              </p>
            </div>
          </div>
        )}

        {trajectoryData && !trajectoryData.hasData && (
          <div className="p-6 bg-cyber-dark rounded-lg border border-yellow-500/30 text-center">
            <BarChart3 className="mx-auto mb-3 text-yellow-500" size={32} />
            <p className="text-yellow-500">{trajectoryData.message}</p>
            <p className="text-cyber-muted text-sm mt-2">
              Go to Daily Log and create some entries with tags to see your trajectory!
            </p>
          </div>
        )}
      </div>

      {/* Placeholder Card */}
      <div className="bg-cyber-grey border border-neon-blue/30 rounded-lg p-8 text-center shadow-xl shadow-neon-blue/10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 flex items-center justify-center shadow-lg shadow-neon-blue/30">
          <BarChart3 className="text-neon-blue" size={32} />
        </div>
        <h2 className="text-xl font-semibold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent mb-2">
          Visualization Coming Soon
        </h2>
        <p className="text-neon-blue/50">
          Charts and graphs will appear here in the next step
        </p>
      </div>
    </div>
  );
}
