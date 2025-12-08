import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

export default function TrajectoryRadar({ trajectoryData }) {
  if (!trajectoryData || !trajectoryData.hasData) {
    return null;
  }

  // Format data for radar chart
  const chartData = [
    {
      dimension: 'Career',
      score: trajectoryData.percentages.Career || 0,
      fullMark: 100,
    },
    {
      dimension: 'Spiritual',
      score: trajectoryData.percentages.Spiritual || 0,
      fullMark: 100,
    },
    {
      dimension: 'Physical',
      score: trajectoryData.percentages.Physical || 0,
      fullMark: 100,
    },
    {
      dimension: 'Social',
      score: trajectoryData.percentages.Social || 0,
      fullMark: 100,
    },
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-cyber-grey border border-neon-blue/50 rounded-lg p-3 shadow-xl shadow-neon-blue/20">
          <p className="text-cyber-text font-semibold">{payload[0].payload.dimension}</p>
          <p className="text-neon-blue font-bold text-lg">{payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative">
      {/* Glow effect background */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 via-neon-purple/5 to-neon-green/5 rounded-lg blur-xl" />
      
      <div className="relative bg-cyber-dark/50 rounded-lg p-6 border border-neon-blue/20">
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            {/* Grid with neon glow */}
            <PolarGrid 
              stroke="#00D4FF"
              strokeWidth={1}
              strokeOpacity={0.3}
            />
            
            {/* Dimension labels */}
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#E0E0E0', fontSize: 14, fontWeight: 600 }}
              stroke="#00D4FF"
              strokeOpacity={0.5}
            />
            
            {/* Percentage axis */}
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#9E9E9E', fontSize: 12 }}
              stroke="#B74FFF"
              strokeOpacity={0.3}
            />
            
            {/* The actual data visualization */}
            <Radar
              name="Life Trajectory"
              dataKey="score"
              stroke="#00D4FF"
              strokeWidth={3}
              fill="url(#radarGradient)"
              fillOpacity={0.6}
              dot={{
                fill: '#00D4FF',
                stroke: '#B74FFF',
                strokeWidth: 2,
                r: 6,
              }}
              activeDot={{
                fill: '#39FF14',
                stroke: '#00D4FF',
                strokeWidth: 3,
                r: 8,
              }}
            />
            
            {/* Gradient definition */}
            <defs>
              <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.8} />
                <stop offset="50%" stopColor="#B74FFF" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#39FF14" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>

        {/* Center glow effect */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 rounded-full blur-2xl -z-10 animate-pulse" />
      </div>

      {/* Dominant dimension indicator */}
      <div className="mt-4 text-center">
        <p className="text-cyber-muted text-sm mb-1">Dominant Dimension</p>
        <p className="text-2xl font-bold bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green bg-clip-text text-transparent">
          {trajectoryData.dominantDimension}
        </p>
      </div>
    </div>
  );
}
