import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getCategorizedVideos } from '../services/categorizedVideoService';
import { 
  calculateCategoryTrends, 
  calculateCategoryTotals, 
  getDominantArchetype,
  calculateSummaryStats 
} from '../services/analyticsEngine';
import { DIMENSION_CONFIG } from '../constants/dimensions';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, Calendar } from 'lucide-react';

// Sketchy stroke dasharray pattern for hand-drawn effect
const sketchyStroke = '4 2';

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trendsData, setTrendsData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [archetype, setArchetype] = useState('Explorer');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      console.log('📊 Loading analytics data...');
      
      // Get categorized videos
      const videos = await getCategorizedVideos(user.uid);
      console.log(`📹 Loaded ${videos.length} categorized videos`);

      if (videos.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate trends
      const trends = calculateCategoryTrends(videos);
      setTrendsData(trends);

      // Calculate pie chart data
      const pie = calculateCategoryTotals(videos);
      setPieData(pie);

      // Determine archetype
      const dominantArchetype = getDominantArchetype(pie);
      setArchetype(dominantArchetype);

      // Calculate stats
      const summary = calculateSummaryStats(videos);
      setStats(summary);

      console.log('✅ Analytics loaded:', { trends: trends.length, pie: pie.length, archetype: dominantArchetype });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Custom tooltip for area chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a1a] border-2 border-gray-700 rounded-lg p-3 shadow-xl" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
          <p className="text-white font-semibold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
          <TrendingUp size={40} className="text-blue-400" />
          Life Analytics
        </h1>
        <p className="text-gray-300" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
          Visualize your life trajectory over time
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-300" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Loading analytics...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && trendsData.length === 0 && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Calendar className="mx-auto mb-4 text-orange-400" size={64} />
            <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Comic Sans MS, cursive' }}>No Data Yet</h3>
            <p className="text-gray-300 mb-4" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
              Import your YouTube history to see your life trajectory
            </p>
            <a
              href="/settings"
              className="inline-block px-6 py-3 bg-white border-2 border-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-all"
              style={{ fontFamily: 'Comic Sans MS, cursive' }}
            >
              Import Data
            </a>
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      {!loading && trendsData.length > 0 && (
        <div className="space-y-6">
          {/* Summary Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#1a1a1a] border-2 border-gray-700 rounded-lg p-4" style={{ borderStyle: 'dashed' }}>
                <p className="text-gray-400 text-sm mb-1" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Total Videos</p>
                <p className="text-3xl font-bold text-white" style={{ fontFamily: 'Comic Sans MS, cursive' }}>{stats.totalVideos}</p>
              </div>
              <div className="bg-[#1a1a1a] border-2 border-gray-700 rounded-lg p-4" style={{ borderStyle: 'dashed' }}>
                <p className="text-gray-400 text-sm mb-1" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Top Category</p>
                <p className="text-2xl font-bold" style={{ color: DIMENSION_CONFIG[stats.topCategory]?.color, fontFamily: 'Comic Sans MS, cursive' }}>
                  {stats.topCategory}
                </p>
                <p className="text-sm text-gray-400" style={{ fontFamily: 'Comic Sans MS, cursive' }}>{stats.topCategoryPercentage}%</p>
              </div>
              <div className="bg-[#1a1a1a] border-2 border-gray-700 rounded-lg p-4" style={{ borderStyle: 'dashed' }}>
                <p className="text-gray-400 text-sm mb-1" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Your Archetype</p>
                <p className="text-2xl font-bold text-blue-400" style={{ fontFamily: 'Comic Sans MS, cursive' }}>{archetype}</p>
              </div>
            </div>
          )}

          {/* Main Charts */}
          <div className="flex gap-6">
            {/* Pie Chart - Life Composition */}
            <div className="w-[30%] bg-[#1a1a1a] border-2 border-gray-700 rounded-lg p-6" style={{ borderStyle: 'dashed' }}>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                <PieChartIcon size={20} />
                Life Composition
              </h2>
              
              <div className="relative sketchy-chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="#2d2d2d"
                      strokeWidth={2}
                      strokeDasharray={sketchyStroke}
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          fillOpacity={0.7}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '2px solid #555', 
                        borderRadius: '4px',
                        fontFamily: 'Comic Sans MS, cursive'
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center Archetype */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-gray-400 text-sm" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Archetype</p>
                  <p className="text-xl font-bold text-white" style={{ fontFamily: 'Comic Sans MS, cursive' }}>{archetype}</p>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 space-y-2">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color, border: '1px solid #555' }}></div>
                      <span className="text-sm text-gray-300" style={{ fontFamily: 'Comic Sans MS, cursive' }}>{entry.name}</span>
                    </div>
                    <span className="text-sm text-gray-400" style={{ fontFamily: 'Comic Sans MS, cursive' }}>{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Area Chart - River of Life */}
            <div className="flex-1 bg-[#1a1a1a] border-2 border-gray-700 rounded-lg p-6" style={{ borderStyle: 'dashed' }}>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                <TrendingUp size={20} />
                The River of Life
              </h2>
              
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart
                  data={trendsData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCareer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B9BD1" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#6B9BD1" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorSpiritual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B88CD8" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#B88CD8" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#90C695" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#90C695" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorSocial" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E89AC7" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#E89AC7" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorIntellectual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F4C95D" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#F4C95D" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorEntertainment" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#999999" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#999999" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="5 5" stroke="#444" strokeWidth={1.5} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#888" 
                    strokeWidth={2}
                    style={{ fontSize: '12px', fontFamily: 'Comic Sans MS, cursive' }}
                  />
                  <YAxis 
                    stroke="#888" 
                    strokeWidth={2}
                    style={{ fontSize: '12px', fontFamily: 'Comic Sans MS, cursive' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Career" stackId="1" stroke="#4A7BA7" fill="url(#colorCareer)" strokeWidth={2.5} strokeDasharray={sketchyStroke} />
                  <Area type="monotone" dataKey="Spiritual" stackId="1" stroke="#9966CC" fill="url(#colorSpiritual)" strokeWidth={2.5} strokeDasharray={sketchyStroke} />
                  <Area type="monotone" dataKey="Health" stackId="1" stroke="#6B9B6E" fill="url(#colorHealth)" strokeWidth={2.5} strokeDasharray={sketchyStroke} />
                  <Area type="monotone" dataKey="Social" stackId="1" stroke="#D467A5" fill="url(#colorSocial)" strokeWidth={2.5} strokeDasharray={sketchyStroke} />
                  <Area type="monotone" dataKey="Intellectual" stackId="1" stroke="#D4A942" fill="url(#colorIntellectual)" strokeWidth={2.5} strokeDasharray={sketchyStroke} />
                  <Area type="monotone" dataKey="Entertainment" stackId="1" stroke="#777" fill="url(#colorEntertainment)" strokeWidth={2.5} strokeDasharray={sketchyStroke} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-[#1a1a1a] border-2 border-gray-700 rounded-lg p-6" style={{ borderStyle: 'dashed' }}>
            <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Insights</h2>
            <p className="text-gray-300" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
              Your life trajectory shows a focus on <span className="font-semibold" style={{ color: DIMENSION_CONFIG[stats.topCategory]?.color }}>{stats.topCategory}</span> with {stats.topCategoryPercentage}% of your attention. 
              As a <span className="font-semibold text-blue-400">{archetype}</span>, you're naturally drawn to these areas of growth.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
