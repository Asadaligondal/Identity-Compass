export default function Dashboard() {
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

      {/* Placeholder Card */}
      <div className="bg-cyber-grey border border-neon-blue/30 rounded-lg p-8 text-center shadow-xl shadow-neon-blue/10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 flex items-center justify-center shadow-lg shadow-neon-blue/30">
          <div className="w-8 h-8 border-4 border-neon-blue border-t-neon-purple rounded-full animate-spin"></div>
        </div>
        <h2 className="text-xl font-semibold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent mb-2">
          Trajectory Engine Initializing
        </h2>
        <p className="text-neon-blue/50">
          Your visualization dashboard will appear here
        </p>
      </div>
    </div>
  );
}
