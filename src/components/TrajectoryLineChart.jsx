import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Helper functions for date manipulation
const formatDate = (date) => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}/${day}`;
};

const subDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

const startOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

export default function TrajectoryLineChart({ userId, userMappings = {} }) {
  const [chartData, setChartData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (userId) {
      loadTimelineData();
    }
  }, [userId]);

  const loadTimelineData = async () => {
    setLoading(true);
    try {
      // Import here to avoid circular dependencies
      const { getLogsByDateRange } = await import('../services/dailyLogService');
      const { getDimensionFromTag } = await import('../constants/dimensions');
      
      const endDate = new Date();
      const startDate = subDays(endDate, 30);
      
      // Fetch all logs from last 30 days
      const logs = await getLogsByDateRange(userId, startDate, endDate);
      
      // Group logs by date and calculate dimension scores
      const dateMap = {};
      
      // Initialize all dates with zero scores
      for (let i = 0; i <= 30; i++) {
        const date = subDays(endDate, 30 - i);
        const dateKey = formatDate(startOfDay(date));
        dateMap[dateKey] = {
          date: dateKey,
          Career: 0,
          Spiritual: 0,
          Physical: 0,
          Social: 0,
        };
      }
      
      // Count tags per dimension per day
      logs.forEach(log => {
        const logDate = log.date?.toDate?.() || new Date();
        const dateKey = formatDate(startOfDay(logDate));
        
        if (log.tags && Array.isArray(log.tags)) {
          log.tags.forEach(tag => {
            // Check user mapping first, then predefined
            const dimension = userMappings[tag.toLowerCase()] || getDimensionFromTag(tag);
            
            if (dimension && dateMap[dateKey]) {
              dateMap[dateKey][dimension]++;
            }
          });
        }
      });
      
      // Convert to array and calculate cumulative scores for trend
      const timelineData = Object.values(dateMap);
      
      setChartData(timelineData);
    } catch (error) {
      console.error('Error loading timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-cyber-grey border border-neon-blue/50 rounded-lg p-3 shadow-xl shadow-neon-blue/20">
          <p className="text-cyber-text font-semibold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-bold" style={{ color: entry.color }}>{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 via-neon-blue/5 to-neon-green/5 rounded-lg blur-xl" />
      
      <div className="relative bg-cyber-dark/50 rounded-lg p-6 border border-neon-purple/20">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="careerGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="spiritualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B74FFF" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#B74FFF" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="physicalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#39FF14" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#39FF14" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="socialGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF00FF" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#FF00FF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#00D4FF" strokeOpacity={0.1} />
            
            <XAxis 
              dataKey="date" 
              stroke="#9E9E9E"
              tick={{ fill: '#9E9E9E', fontSize: 12 }}
              tickMargin={10}
            />
            
            <YAxis 
              stroke="#9E9E9E"
              tick={{ fill: '#9E9E9E', fontSize: 12 }}
              label={{ value: 'Activity Count', angle: -90, position: 'insideLeft', fill: '#9E9E9E' }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Legend 
              wrapperStyle={{ color: '#E0E0E0' }}
              iconType="line"
            />
            
            <Line 
              type="monotone" 
              dataKey="Career" 
              stroke="#00D4FF"
              strokeWidth={3}
              dot={{ fill: '#00D4FF', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#00D4FF', stroke: '#fff', strokeWidth: 2 }}
            />
            
            <Line 
              type="monotone" 
              dataKey="Spiritual" 
              stroke="#B74FFF"
              strokeWidth={3}
              dot={{ fill: '#B74FFF', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#B74FFF', stroke: '#fff', strokeWidth: 2 }}
            />
            
            <Line 
              type="monotone" 
              dataKey="Physical" 
              stroke="#39FF14"
              strokeWidth={3}
              dot={{ fill: '#39FF14', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#39FF14', stroke: '#fff', strokeWidth: 2 }}
            />
            
            <Line 
              type="monotone" 
              dataKey="Social" 
              stroke="#FF00FF"
              strokeWidth={3}
              dot={{ fill: '#FF00FF', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#FF00FF', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
