import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllTagConnections } from '../services/tagConnectionService';
import { getTagAnalytics } from '../services/dailyLogService';
import { getUserTagMappings } from '../services/tagMappingService';
import { TAG_TYPES, getTagTypeConfig } from '../constants/tagTypes';
import ForceGraph2D from 'react-force-graph-2d';
import { Brain, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

export default function MindMap() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [stats, setStats] = useState({ totalNodes: 0, totalLinks: 0, strongestConnection: null });
  const [minWeight, setMinWeight] = useState(1);
  const [userMappings, setUserMappings] = useState({});

  useEffect(() => {
    if (user) {
      loadGraphData();
    }
  }, [user, minWeight]);

  const loadGraphData = async () => {
    setLoading(true);
    try {
      console.log('🌐 Loading Mind Map data...');
      
      // Fetch user's custom tag mappings (includes type info)
      const mappings = await getUserTagMappings(user.uid);
      setUserMappings(mappings);
      console.log('📋 User mappings:', mappings);
      
      // Fetch tag connections (edges)
      const connections = await getAllTagConnections(minWeight);
      console.log(`📊 Found ${connections.length} connections with weight >= ${minWeight}`);
      
      // Fetch tag frequencies (for node sizing)
      const tagFrequencies = await getTagAnalytics(user.uid);
      console.log(`🏷️ Found ${Object.keys(tagFrequencies).length} unique tags`);
      
      // Build nodes from unique tags
      const nodeMap = new Map();
      
      // Add nodes from tag frequencies with type information
      Object.entries(tagFrequencies).forEach(([tag, count]) => {
        const mapping = mappings[tag.toLowerCase()];
        const tagType = mapping?.type || 'Concept';
        
        nodeMap.set(tag.toLowerCase(), {
          id: tag.toLowerCase(),
          name: tag,
          val: count, // Node size based on frequency
          frequency: count,
          type: tagType, // Add type for shape rendering
        });
      });
      
      // Build links array
      const links = connections.map(conn => ({
        source: conn.source,
        target: conn.target,
        weight: conn.weight,
        value: conn.weight, // Link thickness
      }));
      
      // Ensure all nodes referenced in links exist
      connections.forEach(conn => {
        const sourceLower = conn.source.toLowerCase();
        const targetLower = conn.target.toLowerCase();
        
        if (!nodeMap.has(sourceLower)) {
          const mapping = mappings[sourceLower];
          nodeMap.set(sourceLower, {
            id: sourceLower,
            name: conn.source,
            val: 1,
            frequency: 1,
            type: mapping?.type || 'Concept',
          });
        }
        if (!nodeMap.has(targetLower)) {
          const mapping = mappings[targetLower];
          nodeMap.set(targetLower, {
            id: targetLower,
            name: conn.target,
            val: 1,
            frequency: 1,
            type: mapping?.type || 'Concept',
          });
        }
      });
      
      const nodes = Array.from(nodeMap.values());
      
      console.log(`✅ Graph ready: ${nodes.length} nodes, ${links.length} links`);
      
      // Calculate statistics
      const strongestConnection = connections.length > 0 
        ? connections[0] 
        : null;
      
      setStats({
        totalNodes: nodes.length,
        totalLinks: links.length,
        strongestConnection,
      });
      
      setGraphData({ nodes, links });
    } catch (error) {
      console.error('Error loading graph data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Custom node rendering - simple solid circles
  const paintNode = (node, ctx, globalScale) => {
    // Validate node position
    if (!node || typeof node.x !== 'number' || typeof node.y !== 'number' || 
        !isFinite(node.x) || !isFinite(node.y)) {
      return;
    }
    
    const label = node.name || '';
    const fontSize = 14 / globalScale;
    const nodeSize = Math.sqrt(node.val || 1) * 4 + 8;
    const tagType = node.type || 'Concept';
    const typeConfig = getTagTypeConfig(tagType);
    const nodeColor = typeConfig.color;
    
    // Draw simple circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
    
    // Solid color fill
    ctx.fillStyle = nodeColor;
    ctx.fill();
    
    // White border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Label text
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const labelY = node.y + nodeSize + fontSize + 4;
    
    // Label text
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText(label, node.x, labelY);
    
    // Add type emoji indicator below label
    if (tagType !== 'Concept') {
      const typeIndicators = {
        'Book': '📚',
        'Person': '👤',
        'Project': '🎯'
      };
      ctx.font = `${fontSize * 0.8}px Inter, sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(typeIndicators[tagType] || '', node.x, labelY + fontSize);
    }
  };

  // Custom link rendering - simple solid white lines
  const paintLink = (link, ctx, globalScale) => {
    const start = link.source;
    const end = link.target;
    
    // Validate link positions
    if (typeof start !== 'object' || typeof end !== 'object') return;
    if (!isFinite(start.x) || !isFinite(start.y) || !isFinite(end.x) || !isFinite(end.y)) return;
    
    const lineWidth = Math.max(Math.sqrt(link.weight || 1) * 2, 1.5); // Thickness based on weight
    
    // Draw solid white line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  };

  return (
    <div className="max-w-7xl mx-auto h-screen flex flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <Brain size={40} className="text-neon-purple" />
            Mind Map
          </h1>
          <p className="text-neon-blue/60">
            The neural network of your life - nodes are thoughts, edges are connections
          </p>
        </div>
        
        <div className="flex gap-3 items-center">
          {/* Weight Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-cyber-muted">Min Weight:</label>
            <select 
              value={minWeight}
              onChange={(e) => setMinWeight(Number(e.target.value))}
              className="px-3 py-2 bg-cyber-dark border border-neon-blue/30 text-cyber-text rounded-lg focus:outline-none focus:border-neon-blue"
            >
              <option value={1}>1+ (All)</option>
              <option value={2}>2+ (Common)</option>
              <option value={3}>3+ (Frequent)</option>
              <option value={5}>5+ (Strong)</option>
            </select>
          </div>
          
          <button
            onClick={loadGraphData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-cyber-grey border border-neon-purple/30 text-neon-purple rounded-lg hover:bg-neon-purple/10 transition-all disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      {!loading && stats.totalNodes > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div className="p-4 bg-cyber-grey border border-neon-blue/30 rounded-lg">
            <p className="text-cyber-muted text-xs mb-1">Nodes (Tags)</p>
            <p className="text-2xl font-bold text-neon-blue">{stats.totalNodes}</p>
          </div>
          <div className="p-4 bg-cyber-grey border border-neon-purple/30 rounded-lg">
            <p className="text-cyber-muted text-xs mb-1">Connections</p>
            <p className="text-2xl font-bold text-neon-purple">{stats.totalLinks}</p>
          </div>
          <div className="p-4 bg-cyber-grey border border-neon-green/30 rounded-lg">
            <p className="text-cyber-muted text-xs mb-1">Strongest Link</p>
            <p className="text-sm font-bold text-neon-green">
              {stats.strongestConnection 
                ? `${stats.strongestConnection.source} ↔ ${stats.strongestConnection.target} (${stats.strongestConnection.weight})`
                : 'N/A'
              }
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex-1 bg-cyber-grey border border-neon-blue/30 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="text-neon-blue">Loading your mind map...</p>
          </div>
        </div>
      )}

      {/* Graph Visualization */}
      {!loading && graphData.nodes.length > 0 && (
        <div className="flex-1 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border border-neon-purple/30 rounded-lg overflow-hidden shadow-xl shadow-neon-purple/20 relative">
          {/* Animated background grid */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}></div>
          </div>
          
          {/* Radial gradient overlay */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-slate-900/50"></div>
          
          <div className="absolute top-4 left-4 z-10 bg-slate-900/95 border border-neon-blue/50 rounded-lg p-4 text-xs shadow-lg shadow-neon-blue/20 backdrop-blur-sm max-w-xs">
            <p className="text-neon-blue font-semibold mb-3 text-sm">Tag Types:</p>
            <div className="space-y-2 text-cyber-muted mb-4">
              <p className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{backgroundColor: '#00D4FF', boxShadow: '0 0 10px #00D4FF'}}></span>
                <span>⚪ Concept (Circle)</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-3 h-3" style={{backgroundColor: '#FFD700', boxShadow: '0 0 10px #FFD700'}}></span>
                <span>📚 Book (Square)</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px]" style={{borderBottomColor: '#FF00FF', filter: 'drop-shadow(0 0 5px #FF00FF)'}}></span>
                <span className="ml-1">👤 Person (Triangle)</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rotate-45" style={{backgroundColor: '#39FF14', boxShadow: '0 0 10px #39FF14'}}></span>
                <span className="ml-1">🎯 Project (Diamond)</span>
              </p>
            </div>
            <div className="pt-3 border-t border-neon-blue/20">
              <p className="mb-1"><strong className="text-neon-purple">Node Size:</strong> Usage frequency</p>
              <p><strong className="text-neon-green">Line Thickness:</strong> Connection strength</p>
            </div>
          </div>
          
          <ForceGraph2D
            graphData={graphData}
            width={window.innerWidth - 400}
            height={window.innerHeight - 350}
            nodeLabel={node => `${node.name} (${node.type || 'Concept'}) - used ${node.frequency} times`}
            nodeCanvasObject={paintNode}
            linkCanvasObject={paintLink}
            linkDirectionalParticles={3}
            linkDirectionalParticleWidth={link => Math.sqrt(link.weight || 1) * 1.5}
            linkDirectionalParticleSpeed={0.003}
            backgroundColor="rgba(10, 10, 10, 0)"
            nodeRelSize={8}
            linkWidth={0}
            linkDistance={2500}
            chargeStrength={-1500}
            d3AlphaDecay={0.01}
            d3VelocityDecay={0.15}
            cooldownTicks={200}
            enableNodeDrag={true}
            enableZoomPanInteraction={true}
            nodeId="id"
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && graphData.nodes.length === 0 && (
        <div className="flex-1 bg-cyber-grey border border-yellow-500/30 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Brain className="mx-auto mb-4 text-yellow-500" size={64} />
            <h3 className="text-xl font-semibold text-yellow-500 mb-2">No Mind Map Yet</h3>
            <p className="text-cyber-muted mb-4">
              Create daily logs with multiple tags to see connections
            </p>
            <a
              href="/daily-log"
              className="inline-block px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-neon-blue/50 transition-all"
            >
              Create Your First Log
            </a>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-4 bg-gradient-to-r from-neon-purple/10 to-neon-blue/10 border border-neon-purple/30 rounded-lg">
        <p className="text-sm text-cyber-muted">
          <strong className="text-neon-purple">Tip:</strong> Drag nodes to explore connections. 
          Zoom with mouse wheel. Larger nodes = more frequently used tags. 
          Thicker connections = tags that often appear together in your logs.
        </p>
      </div>
    </div>
  );
}
