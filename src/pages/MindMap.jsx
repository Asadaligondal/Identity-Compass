import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getCategorizedVideos, buildGraphFromCategories } from '../services/categorizedVideoService';
import { DIMENSIONS, getDimensionColor } from '../constants/dimensions';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide } from 'd3-force';
import { Brain, RefreshCw } from 'lucide-react';

export default function MindMap() {
  const { user } = useAuth();
  const forceGraphRef = useRef();
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [stats, setStats] = useState({ totalNodes: 0, totalLinks: 0, strongestConnection: null });
  const [minWeight, setMinWeight] = useState(1);
  const [minNodeWeight, setMinNodeWeight] = useState(1); // STEP 22: Show all nodes including newly imported
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

  // STEP 23: Heavy, localized physics - nodes move slowly and stop quickly
  useEffect(() => {
    if (forceGraphRef.current && filteredGraphData.nodes.length > 0) {
      const fg = forceGraphRef.current;
      
      // Heavy movement physics
      fg.d3Force('charge').strength(-200); // Moderate repulsion
      
      // STEP 23: Loose links (low strength = ropes, not springs)
      fg.d3Force('link').distance(link => {
        // Temporal links are shorter, regular links have breathing room
        return link.type === 'temporal' ? 50 : 100;
      }).strength(0.2); // Low strength prevents distant nodes from yanking
      
      // Collision force for spacing
      fg.d3Force('collide', forceCollide().radius(node => {
        const isMainNode = node.isMainNode || node.type === 'Category';
        const nodeSize = isMainNode ? 25 : 10;
        return nodeSize + 8;
      }).strength(0.8));

      // Reheat simulation
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

  // STEP 21: Obsidian-style custom node rendering with glow effects
  const paintNode = useCallback((node, ctx, globalScale) => {
    if (!node || typeof node.x !== 'number' || typeof node.y !== 'number' || 
        !isFinite(node.x) || !isFinite(node.y)) {
      return;
    }
    
    const isMainNode = node.isMainNode || node.type === 'Category';
    const nodeSize = isMainNode ? 25 : 10;
    const category = node.category || DIMENSIONS.UNASSIGNED;
    const categoryColor = getDimensionColor(category);
    const isHovered = hoveredNode === node.id;
    
    // Check if node should be faded (spotlight effect)
    const shouldFade = hoveredNode && !isHovered && !isNodeConnected(node.id);
    
    // GLOW EFFECT: shadowBlur for Obsidian aesthetic
    ctx.save();
    if (!shouldFade) {
      ctx.shadowBlur = isHovered ? 25 : 15;
      ctx.shadowColor = categoryColor;
    }
    
    // Draw glowing circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
    
    if (shouldFade) {
      // Faded for spotlight effect
      ctx.fillStyle = 'rgba(100, 100, 100, 0.1)';
    } else if (isHovered) {
      ctx.fillStyle = categoryColor;
    } else {
      ctx.fillStyle = isMainNode ? categoryColor : 'rgba(255, 255, 255, 0.8)';
    }
    ctx.fill();
    
    // Subtle stroke
    if (!shouldFade) {
      ctx.strokeStyle = isHovered ? '#FFFFFF' : categoryColor;
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();
    }
    ctx.restore();
    
    // LABELS: Show for large nodes, hide for small
    const showLabel = node.val > 5 || isMainNode || isHovered;
    if (showLabel && !shouldFade) {
      const fullLabel = node.name || '';
      const label = node.type === 'Video' ? fullLabel.split(' ')[0] : fullLabel;
      const fontSize = (isMainNode ? 16 : 12) / globalScale;
      
      ctx.font = `${isMainNode ? 'bold' : ''} ${fontSize}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const labelY = node.y + nodeSize + fontSize + 4;
      
      // Semi-transparent text, brighter on hover
      ctx.fillStyle = isHovered ? '#FFFFFF' : 'rgba(200, 200, 200, 0.7)';
      ctx.fillText(label, node.x, labelY);
    }
  }, [hoveredNode]);
  
  // Helper: Check if node is connected to hovered node
  const isNodeConnected = useCallback((nodeId) => {
    if (!hoveredNode) return false;
    
    return filteredGraphData.links.some(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return (sourceId === hoveredNode && targetId === nodeId) || 
             (targetId === hoveredNode && sourceId === nodeId);
    });
  }, [hoveredNode, filteredGraphData]);

  // STEP 21: Spotlight effect - fade non-connected links
  const paintLink = useCallback((link, ctx, globalScale) => {
    const start = link.source;
    const end = link.target;
    
    if (typeof start !== 'object' || typeof end !== 'object') return;
    if (!isFinite(start.x) || !isFinite(start.y) || !isFinite(end.x) || !isFinite(end.y)) return;
    
    const sourceId = typeof start === 'object' && start.id ? start.id : start;
    const targetId = typeof end === 'object' && end.id ? end.id : end;
    const isConnectedToHovered = hoveredNode === sourceId || hoveredNode === targetId;
    
    // SPOTLIGHT: If hovered and NOT connected, fade to almost invisible
    const shouldFade = hoveredNode && !isConnectedToHovered;
    
    const lineWidth = Math.max(Math.sqrt(link.weight || 1) * 1.5, 1);
    
    if (shouldFade) {
      // Almost invisible
      ctx.strokeStyle = 'rgba(50, 50, 50, 0.1)';
      ctx.lineWidth = lineWidth * 0.5;
    } else if (isConnectedToHovered) {
      // Bright and prominent
      const color = getDimensionColor(start.category || end.category || 'Unassigned');
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * 2;
    } else {
      // Normal subtle state
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
      ctx.lineWidth = lineWidth;
    }
    
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
          
          <ForceGraph2D
            ref={forceGraphRef}
            graphData={filteredGraphData}
            width={window.innerWidth - 400}
            height={window.innerHeight - 350}
            nodeLabel={node => `${node.name} (${node.category || 'Unassigned'})`}
            nodeCanvasObject={paintNode}
            linkCanvasObject={paintLink}
            linkDirectionalParticles={1}
            linkDirectionalParticleWidth={link => Math.sqrt(link.weight || 1) * 1.2}
            linkDirectionalParticleSpeed={0.002}
            backgroundColor="#1E1E1E"
            nodeRelSize={10}
            linkWidth={0}
            d3VelocityDecay={0.6}
            d3AlphaDecay={0.02}
            dagMode={null}
            warmupTicks={150}
            cooldownTicks={200}
            enableNodeDrag={true}
            enableZoomPanInteraction={true}
            d3AlphaMin={0.001}
            minZoom={0.1}
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
