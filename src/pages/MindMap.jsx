import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllTagConnections } from '../services/tagConnectionService';
import { getTagAnalytics } from '../services/dailyLogService';
import { getUserTagMappings } from '../services/tagMappingService';
import { getDimensionFromTag } from '../constants/dimensions';
import ForceGraph2D from 'react-force-graph-2d';
import { Brain, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

export default function MindMap() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [stats, setStats] = useState({ totalNodes: 0, totalLinks: 0, strongestConnection: null });
  const [minWeight, setMinWeight] = useState(1);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
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
      
      // Fetch user's custom tag mappings
      const mappings = await getUserTagMappings(user.uid);
      setUserMappings(mappings);
      
      // Fetch tag connections (edges)
      const connections = await getAllTagConnections(minWeight);
      console.log(`📊 Found ${connections.length} connections with weight >= ${minWeight}`);
      
      // Fetch tag frequencies (for node sizing)
      const tagFrequencies = await getTagAnalytics(user.uid);
      console.log(`🏷️ Found ${Object.keys(tagFrequencies).length} unique tags`);
      
      // Build nodes from unique tags
      const nodeMap = new Map();
      
      // Add nodes from tag frequencies with dimension
      Object.entries(tagFrequencies).forEach(([tag, count]) => {
        const dimension = mappings[tag.toLowerCase()] || getDimensionFromTag(tag);
        nodeMap.set(tag.toLowerCase(), {
          id: tag.toLowerCase(),
          name: tag,
          val: count, // Node size based on frequency
          frequency: count,
          dimension: dimension, // Add dimension for color coding
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
          const dimension = mappings[sourceLower] || getDimensionFromTag(conn.source);
          nodeMap.set(sourceLower, {
            id: sourceLower,
            name: conn.source,
            val: 1,
            frequency: 1,
            dimension: dimension,
          });
        }
        if (!nodeMap.has(targetLower)) {
          const dimension = mappings[targetLower] || getDimensionFromTag(conn.target);
          nodeMap.set(targetLower, {
            id: targetLower,
            name: conn.target,
            val: 1,
            frequency: 1,
            dimension: dimension,
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

  // Get dimension color
  const getDimensionColor = (dimension) => {
    switch(dimension) {
      case 'Career': return { primary: '#00D4FF', light: 'rgba(0, 212, 255, 0.4)', glow: 'rgba(0, 212, 255, 0.6)' };
      case 'Spiritual': return { primary: '#B74FFF', light: 'rgba(183, 79, 255, 0.4)', glow: 'rgba(183, 79, 255, 0.6)' };
      case 'Physical': return { primary: '#39FF14', light: 'rgba(57, 255, 20, 0.4)', glow: 'rgba(57, 255, 20, 0.6)' };
      case 'Social': return { primary: '#FF00FF', light: 'rgba(255, 0, 255, 0.4)', glow: 'rgba(255, 0, 255, 0.6)' };
      default: return { primary: '#9E9E9E', light: 'rgba(158, 158, 158, 0.4)', glow: 'rgba(158, 158, 158, 0.6)' };
    }
  };

  // Handle node click
  const handleNodeClick = (node) => {
    if (selectedNode === node) {
      // Deselect - show all nodes
      setSelectedNode(null);
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
    } else {
      // Select node - highlight connected nodes
      const connectedNodeIds = new Set();
      const connectedLinkIds = new Set();
      
      connectedNodeIds.add(node.id);
      
      graphData.links.forEach(link => {
        if (link.source.id === node.id || link.target.id === node.id) {
          connectedLinkIds.add(`${link.source.id}-${link.target.id}`);
          connectedNodeIds.add(link.source.id);
          connectedNodeIds.add(link.target.id);
        }
      });
      
      setSelectedNode(node);
      setHighlightNodes(connectedNodeIds);
      setHighlightLinks(connectedLinkIds);
    }
  };

  // Custom node rendering with dimension-based colors and highlighting
  const paintNode = (node, ctx, globalScale) => {
    // Validate node position
    if (!node || typeof node.x !== 'number' || typeof node.y !== 'number' || 
        !isFinite(node.x) || !isFinite(node.y)) {
      return;
    }
    
    const label = node.name || '';
    const fontSize = 14 / globalScale;
    const nodeSize = Math.sqrt(node.val || 1) * 4 + 8;
    
    // Determine if node should be dimmed
    const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
    const opacity = isHighlighted ? 1.0 : 0.2;
    
    // Get dimension-based color
    const colors = getDimensionColor(node.dimension);
    const nodeColor = colors.primary;
    
    ctx.globalAlpha = opacity;
    
    // Outer glow (larger)
    if (isHighlighted) {
      try {
        ctx.beginPath();
        const outerGlow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeSize * 3);
        outerGlow.addColorStop(0, colors.light);
        outerGlow.addColorStop(0.3, colors.light);
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = outerGlow;
        ctx.arc(node.x, node.y, nodeSize * 3, 0, 2 * Math.PI);
        ctx.fill();
      } catch (e) {
        // Skip glow if gradient fails
      }
    }
    
    // Inner glow
    if (isHighlighted) {
      try {
        ctx.beginPath();
        const innerGlow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeSize * 1.5);
        innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        innerGlow.addColorStop(0.5, colors.glow);
        innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        ctx.fillStyle = innerGlow;
        ctx.arc(node.x, node.y, nodeSize * 1.5, 0, 2 * Math.PI);
        ctx.fill();
      } catch (e) {
        // Skip if fails
      }
    }
    
    // Main node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
    
    // Gradient fill for depth
    try {
      const gradient = ctx.createRadialGradient(node.x - nodeSize/3, node.y - nodeSize/3, 0, node.x, node.y, nodeSize);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.4, nodeColor);
      gradient.addColorStop(1, nodeColor);
      ctx.fillStyle = gradient;
    } catch (e) {
      ctx.fillStyle = nodeColor;
    }
    ctx.fill();
    
    // Bright border (thicker if selected)
    ctx.strokeStyle = selectedNode === node ? '#FFD700' : '#ffffff';
    ctx.lineWidth = selectedNode === node ? 3 : 2;
    ctx.stroke();
    
    ctx.globalAlpha = 1.0;
    
    // Label text only (no background or border)
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const labelY = node.y + nodeSize + fontSize + 4;
    
    // Label text
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText(label, node.x, labelY);
  };

  // Custom link rendering with thickness based on weight and highlighting
  const paintLink = (link, ctx, globalScale) => {
    const start = link.source;
    const end = link.target;
    
    // Validate link positions
    if (typeof start !== 'object' || typeof end !== 'object') return;
    if (!isFinite(start.x) || !isFinite(start.y) || !isFinite(end.x) || !isFinite(end.y)) return;
    
    const lineWidth = Math.max(Math.sqrt(link.weight || 1) * 2, 1.5);
    const linkId = `${start.id}-${end.id}`;
    const reverseId = `${end.id}-${start.id}`;
    
    // Determine if link should be dimmed
    const isHighlighted = highlightLinks.size === 0 || 
                         highlightLinks.has(linkId) || 
                         highlightLinks.has(reverseId);
    const opacity = isHighlighted ? 0.8 : 0.1;
    
    // Draw glow
    try {
      const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      gradient.addColorStop(0, 'rgba(0, 212, 255, 0.6)');
      gradient.addColorStop(0.5, 'rgba(183, 79, 255, 0.7)');
      gradient.addColorStop(1, 'rgba(57, 255, 20, 0.6)');
      
      // Outer glow
      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth + 4;
      ctx.globalAlpha = opacity * 0.3;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      
      // Main line
      ctx.globalAlpha = opacity;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      
      ctx.globalAlpha = 1.0;
    } catch (e) {
      // Fallback to simple line
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
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
            <p className="text-neon-blue font-semibold mb-2 text-sm">Dimension Colors:</p>
            <div className="space-y-2 text-cyber-muted mb-3">
              <p className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-[#00D4FF] shadow-lg shadow-blue-500/50"></span>
                <span>Career</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-[#B74FFF] shadow-lg shadow-purple-500/50"></span>
                <span>Spiritual</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-[#39FF14] shadow-lg shadow-green-500/50"></span>
                <span>Physical</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-[#FF00FF] shadow-lg shadow-pink-500/50"></span>
                <span>Social</span>
              </p>
            </div>
            <div className="pt-3 border-t border-neon-blue/20 space-y-2">
              <p><strong className="text-neon-purple">Click</strong> a node to explore its connections</p>
              <p><strong className="text-neon-green">Drag</strong> nodes to rearrange</p>
              <p><strong className="text-neon-blue">Scroll</strong> to zoom in/out</p>
            </div>
            {selectedNode && (
              <div className="mt-3 pt-3 border-t border-neon-purple/30">
                <p className="text-neon-purple font-semibold">Selected:</p>
                <p className="text-neon-blue">{selectedNode.name}</p>
                <p className="text-cyber-muted text-xs mt-1">
                  {selectedNode.dimension || 'Uncategorized'}
                </p>
              </div>
            )}
          </div>
          
          <ForceGraph2D
            graphData={graphData}
            width={window.innerWidth - 400}
            height={window.innerHeight - 350}
            nodeLabel={node => `${node.name} (${node.dimension || 'Uncategorized'}) - used ${node.frequency} times`}
            nodeCanvasObject={paintNode}
            linkCanvasObject={paintLink}
            onNodeClick={handleNodeClick}
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
          <strong className="text-neon-purple">Interactive Exploration:</strong> Click any node to see its context - 
          connected nodes will remain bright while others dim. Node colors represent Life Dimensions 
          (Blue=Career, Purple=Spiritual, Green=Physical, Pink=Social). 
          Click again to deselect and view all connections.
        </p>
      </div>
    </div>
  );
}
