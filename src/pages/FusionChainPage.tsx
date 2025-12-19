import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Search, RotateCcw, Filter, ChevronDown, GitBranch } from "lucide-react";
import { ShardNode } from "../components/chains";
import {
  buildFusionGraph,
  getChainIds,
  getChainEdgeIds,
  getLinearPath,
  getOriginPath,
  formatChainPath,
  RARITY_COLORS,
  type ShardProperties,
  type ShardNodeData,
} from "../utilities/fusionGraphData";

// Custom node types
const nodeTypes = {
  shardNode: ShardNode,
};

// Rarity filter options
const RARITY_OPTIONS = [
  { value: "all", label: "All Rarities" },
  { value: "Common", label: "Common" },
  { value: "Uncommon", label: "Uncommon" },
  { value: "Rare", label: "Rare" },
  { value: "Epic", label: "Epic" },
  { value: "Legendary", label: "Legendary" },
];

export default function FusionChainPage() {
  const [properties, setProperties] = useState<ShardProperties | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<ShardNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [allNodes, setAllNodes] = useState<Node<ShardNodeData>[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);

  const [selectedShard, setSelectedShard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Load fusion properties
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}fusion-properties.json`)
      .then((res) => res.json())
      .then((data: ShardProperties) => {
        setProperties(data);
        const { nodes: graphNodes, edges: graphEdges } = buildFusionGraph(data);
        setAllNodes(graphNodes);
        setAllEdges(graphEdges);
        setNodes(graphNodes);
        setEdges(graphEdges);
      })
      .catch(console.error);
  }, [setNodes, setEdges]);

  // Select/deselect a shard and highlight its chain
  const selectShard = useCallback(
    (shardId: string | null) => {
      if (!properties) return;

      if (shardId === null || selectedShard === shardId) {
        // Deselect
        setSelectedShard(null);
        setNodes(
          allNodes.map((n) => ({
            ...n,
            data: { ...n.data, isHighlighted: false, isDimmed: false },
          }))
        );
        setEdges(
          allEdges.map((e) => ({
            ...e,
            animated: false,
            style: { ...e.style, stroke: "#64748b" },
          }))
        );
      } else {
        // Select new node and highlight chain
        setSelectedShard(shardId);
        const chainIds = getChainIds(properties, shardId);
        const chainEdgeIds = getChainEdgeIds(allEdges, chainIds);

        setNodes(
          allNodes.map((n) => ({
            ...n,
            data: {
              ...n.data,
              isHighlighted: chainIds.has(n.id),
              isDimmed: !chainIds.has(n.id),
            },
          }))
        );

        setEdges(
          allEdges.map((e) => ({
            ...e,
            animated: chainEdgeIds.has(e.id),
            style: {
              ...e.style,
              stroke: chainEdgeIds.has(e.id) ? "#60a5fa" : "#64748b",
              strokeWidth: chainEdgeIds.has(e.id) ? 3 : 2,
            },
          }))
        );
      }
    },
    [properties, selectedShard, allNodes, allEdges, setNodes, setEdges]
  );

  // Handle node click - highlight chain
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<ShardNodeData>) => {
      selectShard(node.id);
    },
    [selectShard]
  );

  // Handle search
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim() || !properties) return;

    const query = searchQuery.toLowerCase();
    const matchingNode = allNodes.find(
      (n) =>
        n.data.label.toLowerCase().includes(query) ||
        n.id.toLowerCase().includes(query)
    );

    if (matchingNode) {
      selectShard(matchingNode.id);
    }
  }, [searchQuery, properties, allNodes, selectShard]);

  // Handle rarity filter
  useEffect(() => {
    if (rarityFilter === "all") {
      setNodes(allNodes);
      setEdges(allEdges);
    } else {
      const filteredNodes = allNodes.filter(
        (n) => n.data.rarity === rarityFilter
      );
      const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
      const filteredEdges = allEdges.filter(
        (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
      );
      setNodes(filteredNodes);
      setEdges(filteredEdges);
    }
    setSelectedShard(null);
  }, [rarityFilter, allNodes, allEdges, setNodes, setEdges]);

  // Reset view
  const handleReset = useCallback(() => {
    setSelectedShard(null);
    setSearchQuery("");
    setRarityFilter("all");
    setNodes(
      allNodes.map((n) => ({
        ...n,
        data: { ...n.data, isHighlighted: false, isDimmed: false },
      }))
    );
    setEdges(
      allEdges.map((e) => ({
        ...e,
        animated: false,
        style: { ...e.style, stroke: "#64748b", strokeWidth: 2 },
      }))
    );
  }, [allNodes, allEdges, setNodes, setEdges]);

  // Get selected shard info
  const selectedShardInfo = useMemo(() => {
    if (!selectedShard || !properties) return null;

    const prop = properties[selectedShard];
    if (!prop) return null;

    const forwardPath = getLinearPath(properties, selectedShard);
    const originPath = getOriginPath(properties, selectedShard);

    return {
      id: selectedShard,
      name: prop.name,
      rarity: prop.rarity,
      category: prop.category,
      family: prop.family,
      forwardPath: formatChainPath(properties, forwardPath),
      originPath: formatChainPath(properties, originPath),
    };
  }, [selectedShard, properties]);

  // MiniMap node color
  const nodeColor = useCallback((node: Node<ShardNodeData>) => {
    return RARITY_COLORS[node.data.rarity] || "#ffffff";
  }, []);

  if (!properties) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-slate-400">Loading fusion data...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-purple-400" />
          <h1 className="text-lg font-bold text-white">Fusion Chains</h1>
          <span className="text-xs text-slate-400">
            {allNodes.length} shards
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search shard..."
              className="pl-9 pr-3 py-1.5 w-48 bg-slate-700/50 border border-slate-600 rounded-md text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {/* Rarity Filter */}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-md text-sm text-slate-300 hover:bg-slate-600 transition-colors"
            >
              <Filter className="w-4 h-4" />
              {RARITY_OPTIONS.find((o) => o.value === rarityFilter)?.label}
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  isFilterOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-slate-800 border border-slate-600 rounded-md shadow-xl z-50 overflow-hidden">
                {RARITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setRarityFilter(option.value);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                      rarityFilter === option.value
                        ? "bg-purple-500/30 text-white"
                        : "text-slate-300 hover:bg-slate-700"
                    }`}
                    style={{
                      color:
                        option.value !== "all"
                          ? RARITY_COLORS[option.value]
                          : undefined,
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-md text-sm text-slate-300 hover:bg-slate-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: "smoothstep",
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#334155" gap={20} />
          <Controls className="!bg-slate-800 !border-slate-600 !rounded-lg [&>button]:!bg-slate-700 [&>button]:!border-slate-600 [&>button]:!text-white [&>button:hover]:!bg-slate-600" />
          <MiniMap
            nodeColor={nodeColor}
            maskColor="rgba(15, 23, 42, 0.8)"
            className="!bg-slate-800 !border-slate-600 !rounded-lg"
          />
        </ReactFlow>

        {/* Selected Shard Info Panel */}
        {selectedShardInfo && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-800/95 backdrop-blur border border-slate-600 rounded-lg p-4 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={`${import.meta.env.BASE_URL}shardIcons/${selectedShardInfo.id}.png`}
                alt={selectedShardInfo.name}
                className="w-10 h-10 object-contain"
              />
              <div>
                <h3
                  className="font-bold text-lg"
                  style={{ color: RARITY_COLORS[selectedShardInfo.rarity] }}
                >
                  {selectedShardInfo.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedShardInfo.id} • {selectedShardInfo.category}
                  {selectedShardInfo.family.length > 0 &&
                    ` • ${selectedShardInfo.family.join(", ")}`}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Origin Path:</span>
                <p className="text-slate-200 text-xs mt-0.5 font-mono">
                  {selectedShardInfo.originPath}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Forward Path:</span>
                <p className="text-slate-200 text-xs mt-0.5 font-mono">
                  {selectedShardInfo.forwardPath}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 p-2 border-t border-slate-700 bg-slate-800/50">
        {Object.entries(RARITY_COLORS).map(([rarity, color]) => (
          <div key={rarity} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full border-2"
              style={{ borderColor: color, backgroundColor: `${color}33` }}
            />
            <span className="text-xs text-slate-400">{rarity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
