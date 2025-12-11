import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllTagConnections } from '../services/tagConnectionService';
import { getTagAnalytics } from '../services/dailyLogService';
import { getUserTagMappings } from '../services/tagMappingService';
import { getCategorizedVideos, buildGraphFromCategories } from '../services/categorizedVideoService';
import { TAG_TYPES, getTagTypeConfig } from '../constants/tagTypes';
import { DIMENSIONS, getDimensionColor, DIMENSION_CONFIG } from '../constants/dimensions';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide, forceX, forceY } from 'd3-force';
import { Brain, RefreshCw, Sliders, Layers } from 'lucide-react';

export default function MindMap() {
  const { user } = useAuth();
  const forceGraphRef = useRef();
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [stats, setStats] = useState({ totalNodes: 0, totalLinks: 0, strongestConnection: null });
  const [minWeight, setMinWeight] = useState(1);
  const [minNodeWeight, setMinNodeWeight] = useState(5);
  const [userMappings, setUserMappings] = useState({});
  const [hoveredNode, setHoveredNode] = useState(null);
  const [groupByCategory, setGroupByCategory] = useState(false);

  useEffect(() => {
    if (user) {
      loadGraphData();
    }
  }, [user, minWeight]);

  // Memoized filtered data for noise reduction
  const filteredGraphData = useMemo(() => {
    if (!graphData.nodes || graphData.nodes.length === 0) {
      return { nodes: [], links: [] };
    }

    // Filter nodes by minimum frequency
    // EXCEPTION: Always show category nodes (isMainNode) and video nodes (type: Video)
    let filteredNodes = graphData.nodes.filter(node => {
      // Always show main category nodes
      if (node.isMainNode || node.type === 'Category') return true;
      // Always show video nodes
      if (node.type === 'Video') return true;
      // For other nodes, apply frequency filter
      return (node.frequency || 0) >= minNodeWeight;
    });

    // Sort by frequency and apply hard cap of 300 nodes
    if (filteredNodes.length > 300) {
      filteredNodes = filteredNodes
        .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
        .slice(0, 300);
    }

    // Create a Set of valid node IDs for fast lookup
    const validNodeIds = new Set(filteredNodes.map(node => node.id));

    // Filter links where both source and target exist in filtered nodes
    const filteredLinks = graphData.links.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return validNodeIds.has(sourceId) && validNodeIds.has(targetId);
    });

    console.log(`🔍 Noise Filter: ${filteredNodes.length}/${graphData.nodes.length} nodes, ${filteredLinks.length}/${graphData.links.length} links`);

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }, [graphData, minNodeWeight]);

  // Inject custom D3 forces for "Big Bang" spreading effect + Semantic Gravity
  useEffect(() => {
    if (forceGraphRef.current && filteredGraphData.nodes.length > 0) {
      const fg = forceGraphRef.current;
      
      // Access the underlying d3 force simulation
      fg.d3Force('charge').strength(-800); // Strong repulsion (anti-gravity)
      fg.d3Force('link').distance(150); // Enforce minimum distance between connected nodes
      
      // Add collision force to prevent node overlap
      fg.d3Force('collide', forceCollide().radius(node => {
        const isMainNode = node.isMainNode || node.type === 'Category';
        const nodeSize = isMainNode ? 20 : 8;
        return nodeSize + 15; // Add padding around nodes
      }));

      // Semantic Gravity: Pull nodes toward their category islands
      if (groupByCategory) {
        // X-axis positioning (horizontal islands)
        fg.d3Force('positioningX', forceX().x(node => {
          const category = node.category || DIMENSIONS.UNASSIGNED;
          const config = DIMENSION_CONFIG[category];
          return config?.gravityX || 0;
        }).strength(0.3)); // Gentle pull strength
        
        // Y-axis positioning (vertical islands)
        fg.d3Force('positioningY', forceY().y(node => {
          const category = node.category || DIMENSIONS.UNASSIGNED;
          const config = DIMENSION_CONFIG[category];
          return config?.gravityY || 0;
        }).strength(0.3));
      } else {
        // Disable positioning forces when grouping is off
        fg.d3Force('positioningX', null);
        fg.d3Force('positioningY', null);
      }

      // Reheat simulation to apply new forces
      fg.d3ReheatSimulation();
    }
  }, [filteredGraphData, groupByCategory]);

  const loadGraphData = async () => {
    setLoading(true);
    try {
      console.log('🌐 Loading Mind Map data...');
      
      // NEW: Load categorized videos directly
      const categorizedVideos = await getCategorizedVideos(user.uid);
      console.log(`🎬 Found ${categorizedVideos.length} categorized videos`);
      
      if (categorizedVideos.length === 0) {
        console.warn('⚠️ No categorized videos found. Please import YouTube history in Settings.');
        setGraphData({ nodes: [], links: [] });
        setStats({ totalNodes: 0, totalLinks: 0, strongestConnection: null });
        setLoading(false);
        return;
      }
      
      // Build graph from categorized videos
      const graphFromCategories = buildGraphFromCategories(categorizedVideos);
      console.log(`📊 Graph: ${graphFromCategories.nodes.length} nodes, ${graphFromCategories.links.length} links`);
      
      setStats({
        totalNodes: graphFromCategories.nodes.length,
        totalLinks: graphFromCategories.links.length,
        strongestConnection: null,
      });
      
      setGraphData(graphFromCategories);
    } catch (error) {
      console.error('Error loading graph data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Custom node rendering - circles colored by life dimension category
  const paintNode = useCallback((node, ctx, globalScale) => {
    // Validate node position
    if (!node || typeof node.x !== 'number' || typeof node.y !== 'number' || 
        !isFinite(node.x) || !isFinite(node.y)) {
      return;
    }
    
    // Show only first word of video titles to avoid clutter
    const fullLabel = node.name || '';
    const label = node.type === 'Video' ? fullLabel.split(' ')[0] : fullLabel;
    const fontSize = 14 / globalScale;
    const isMainNode = node.isMainNode || node.type === 'Category';
    const nodeSize = isMainNode ? 20 : 8; // Bigger white dots for categories, smaller for videos
    const category = node.category || DIMENSIONS.UNASSIGNED;
    const isHovered = hoveredNode === node.id;
    
    // All nodes are white dots now
    const categoryColor = getDimensionColor(category);
    
    // Draw circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
    
    if (isHovered) {
      // Bright white fill on hover with category color glow
      ctx.fillStyle = '#FFFFFF';
    } else {
      // White dots for all nodes
      ctx.fillStyle = '#FFFFFF';
    }
    ctx.fill();
    
    // Stroke with category color on hover
    if (isHovered) {
      ctx.strokeStyle = categoryColor;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    // Always show labels for all nodes (main categories and videos)
    ctx.font = `${isMainNode ? 'bold' : ''} ${fontSize}px 'Inter', -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const labelY = node.y + nodeSize + fontSize + 4;
    
    // White text on hover, light gray otherwise (Obsidian style)
    ctx.fillStyle = isHovered ? '#FFFFFF' : '#D1D5DB';
    ctx.fillText(label, node.x, labelY);
  }, [hoveredNode]);

  // Custom link rendering - almost invisible by default, opaque on hover
  const paintLink = useCallback((link, ctx, globalScale) => {
    const start = link.source;
    const end = link.target;
    
    // Validate link positions
    if (typeof start !== 'object' || typeof end !== 'object') return;
    if (!isFinite(start.x) || !isFinite(start.y) || !isFinite(end.x) || !isFinite(end.y)) return;
    
    const lineWidth = Math.max(Math.sqrt(link.weight || 1) * 2, 1.5); // Thickness based on weight
    
    // Check if either endpoint is hovered
    const sourceId = typeof start === 'object' && start.id ? start.id : start;
    const targetId = typeof end === 'object' && end.id ? end.id : end;
    const isConnectedToHovered = hoveredNode === sourceId || hoveredNode === targetId;
    
    // Obsidian-style links: very subtle gray, bright on hover
    ctx.strokeStyle = isConnectedToHovered ? 'rgba(156, 163, 175, 0.8)' : 'rgba(75, 85, 99, 0.3)';
    ctx.lineWidth = isConnectedToHovered ? lineWidth * 2 : lineWidth * 0.8;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }, [hoveredNode]);

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
          {/* Noise Filter Slider */}
          <div className="flex items-center gap-3 px-4 py-2 bg-cyber-grey border border-neon-green/30 rounded-lg">
            <Sliders className="text-neon-green" size={18} />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neon-green font-semibold">
                Signal Strength: {minNodeWeight}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={minNodeWeight}
                onChange={(e) => setMinNodeWeight(Number(e.target.value))}
                className="w-32 h-1 bg-cyber-dark rounded-lg appearance-none cursor-pointer slider-thumb"
                style={{
                  background: `linear-gradient(to right, #39FF14 0%, #39FF14 ${(minNodeWeight - 1) / 49 * 100}%, #1a1a1a ${(minNodeWeight - 1) / 49 * 100}%, #1a1a1a 100%)`
                }}
              />
              <p className="text-xs text-cyber-muted">
                {filteredGraphData.nodes.length} / {graphData.nodes.length} nodes
              </p>
            </div>
          </div>

          {/* Group by Category Toggle */}
          <button
            onClick={() => setGroupByCategory(!groupByCategory)}
            className={`
              flex items-center gap-2 px-4 py-2 border rounded-lg transition-all font-semibold
              ${groupByCategory 
                ? 'bg-neon-purple/20 border-neon-purple text-neon-purple shadow-lg shadow-neon-purple/20' 
                : 'bg-cyber-grey border-neon-purple/30 text-cyber-muted hover:border-neon-purple/50'
              }
            `}
          >
            <Layers size={18} />
            <span className="text-sm">
              {groupByCategory ? 'Islands: ON' : 'Islands: OFF'}
            </span>
          </button>

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
        <div className="mb-4 grid grid-cols-4 gap-4">
          <div className="p-4 bg-cyber-grey border border-neon-blue/30 rounded-lg">
            <p className="text-cyber-muted text-xs mb-1">Total Nodes</p>
            <p className="text-2xl font-bold text-neon-blue">{stats.totalNodes}</p>
          </div>
          <div className="p-4 bg-cyber-grey border border-neon-green/30 rounded-lg">
            <p className="text-cyber-muted text-xs mb-1">Displayed</p>
            <p className="text-2xl font-bold text-neon-green">{filteredGraphData.nodes.length}</p>
          </div>
          <div className="p-4 bg-cyber-grey border border-neon-purple/30 rounded-lg">
            <p className="text-cyber-muted text-xs mb-1">Connections</p>
            <p className="text-2xl font-bold text-neon-purple">{filteredGraphData.links.length}</p>
          </div>
          <div className="p-4 bg-cyber-grey border border-neon-blue/30 rounded-lg">
            <p className="text-cyber-muted text-xs mb-1">Strongest Link</p>
            <p className="text-sm font-bold text-neon-blue">
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
        <div className="flex-1 bg-[#1E1E1E] border border-gray-800 rounded-lg overflow-hidden shadow-2xl relative">
          {/* Obsidian-style subtle gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#1E1E1E] to-gray-900 opacity-60"></div>
          
          <div className="absolute top-4 left-4 z-10 bg-slate-900/95 border border-neon-blue/50 rounded-lg p-4 text-xs shadow-lg shadow-neon-blue/20 backdrop-blur-sm max-w-xs">
            <p className="text-neon-blue font-semibold mb-3 text-sm">
              Life Dimensions {groupByCategory && <span className="text-neon-purple">(Islands)</span>}
            </p>
            <div className="space-y-2 text-cyber-muted mb-4">
              <p className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{backgroundColor: '#00D4FF', boxShadow: '0 0 10px #00D4FF'}}></span>
                <span>💼 Career/Wealth {groupByCategory && <span className="text-xs opacity-60">↖</span>}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{backgroundColor: '#B026FF', boxShadow: '0 0 10px #B026FF'}}></span>
                <span>🧘 Spiritual/Mind {groupByCategory && <span className="text-xs opacity-60">↗</span>}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{backgroundColor: '#39FF14', boxShadow: '0 0 10px #39FF14'}}></span>
                <span>💪 Health/Body {groupByCategory && <span className="text-xs opacity-60">↙</span>}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{backgroundColor: '#FF10F0', boxShadow: '0 0 10px #FF10F0'}}></span>
                <span>👥 Social/Relationships {groupByCategory && <span className="text-xs opacity-60">↘</span>}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{backgroundColor: '#FFD700', boxShadow: '0 0 10px #FFD700'}}></span>
                <span>📚 Intellectual/Learning {groupByCategory && <span className="text-xs opacity-60">↑</span>}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{backgroundColor: '#808080', boxShadow: '0 0 10px #808080'}}></span>
                <span>🎮 Entertainment/Noise {groupByCategory && <span className="text-xs opacity-60">●</span>}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{backgroundColor: '#666666', boxShadow: '0 0 5px #666666'}}></span>
                <span className="text-gray-500">❓ Unassigned</span>
              </p>
            </div>
            <div className="pt-3 border-t border-neon-blue/20">
              <p className="mb-1"><strong className="text-neon-purple">Node Size:</strong> Usage frequency</p>
              <p><strong className="text-neon-green">Line Opacity:</strong> Hover to reveal</p>
            </div>
          </div>
          
          <ForceGraph2D
            ref={forceGraphRef}
            graphData={filteredGraphData}
            width={window.innerWidth - 400}
            height={window.innerHeight - 350}
            nodeLabel={node => `${node.name} (${node.category || 'Unassigned'}) - used ${node.frequency} times`}
            nodeCanvasObject={paintNode}
            linkCanvasObject={paintLink}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={link => Math.sqrt(link.weight || 1) * 1.5}
            linkDirectionalParticleSpeed={0.003}
            backgroundColor="#1E1E1E"
            nodeRelSize={8}
            linkWidth={0}
            d3VelocityDecay={0.1}
            d3AlphaDecay={0.02}
            warmupTicks={100}
            cooldownTicks={100}
            enableNodeDrag={true}
            enableZoomPanInteraction={true}
            minZoom={0.5}
            maxZoom={3}
            nodeId="id"
            onNodeHover={node => setHoveredNode(node ? node.id : null)}
            onEngineStop={() => forceGraphRef.current?.zoomToFit(400, 50)}
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
