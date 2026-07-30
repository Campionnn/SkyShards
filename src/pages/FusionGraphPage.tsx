import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useUpdateNodeInternals,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Search, X } from "lucide-react";
import { useFusionData } from "../hooks";
import { CalculationService } from "../services";
import { DEFAULT_CALCULATION_PARAMS } from "../constants";
import { ShardGraphNode } from "../components/graph";
import { isBlurCausedByWindow, shardIconUrl } from "../utilities";
import {
  EDGE_COLORS,
  NODE_HEIGHT,
  NODE_WIDTH,
  buildFusionGraph,
  buildGraphElements,
  fusionDataToData,
  getConnectedLine,
  type EdgeFilter,
  type FusionEdge,
  type FusionGraph,
  type ShardNode,
} from "../utilities/fusionGraphLayout";

const nodeTypes = { shard: ShardGraphNode };

const FusionGraphInner: React.FC = () => {
  const { fusionData, rates, loading } = useFusionData();
  const { fitView, setCenter } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const [nodes, setNodes, onNodesChange] = useNodesState<ShardNode>([]);
  const [graph, setGraph] = useState<FusionGraph | null>(null);
  const [baseEdges, setBaseEdges] = useState<FusionEdge[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>("both");
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didFit = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasHeight, setCanvasHeight] = useState("calc(100vh - 3.5rem)");
  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const top = containerRef.current.getBoundingClientRect().top;
      setCanvasHeight(`${Math.max(360, window.innerHeight - top)}px`);
    };
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
    };
  }, [loading]);

  useEffect(() => {
    if (!fusionData || !rates) return;
    const data = fusionDataToData(fusionData, rates);
    // Guard: only prune when rates actually loaded. An empty map would mark every
    // shard unobtainable and cascade-delete the whole graph.
    const hasRates = Object.keys(rates).length > 0;
    // Structural min cost (neutral params) so we can drop backwards "expensive ->
    // cheap" edges; a pricier shard is never used to fuse a cheaper one.
    const { minCosts } = CalculationService.getInstance().computeMinCosts(data, DEFAULT_CALCULATION_PARAMS);
    const g = buildFusionGraph(
      data,
      hasRates
        ? { isDirectlyObtainable: (id) => (rates[id] ?? 0) > 0, minCost: (id) => minCosts.get(id) ?? Infinity }
        : {}
    );
    const { nodes: builtNodes, edges } = buildGraphElements(data, g);
    setGraph(g);
    setBaseEdges(edges);
    setNodes(builtNodes);
    didFit.current = false;
  }, [fusionData, rates, setNodes]);

  const connectedLine = useMemo(() => {
    if (!selectedId || !graph) return null;
    return getConnectedLine(selectedId, graph, edgeFilter);
  }, [selectedId, graph, edgeFilter]);

  const isTypeVisible = useCallback(
    (node: ShardNode) => edgeFilter === "both" || (edgeFilter === "special" ? node.data.inSpecial : node.data.inId),
    [edgeFilter]
  );

  const nodesInitialized = useNodesInitialized();
  useEffect(() => {
    if (didFit.current || !nodesInitialized || nodes.length === 0) return;
    didFit.current = true;
    const ids = nodes.map((n) => n.id);
    fitView({ padding: 0.15, duration: 0 });
    const remeasure = () => {
      for (const id of ids) updateNodeInternals(id);
    };
    const raf = requestAnimationFrame(() => requestAnimationFrame(remeasure));
    const timers = [250, 600].map((ms) => setTimeout(remeasure, ms));
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesInitialized, nodes.length, fitView, updateNodeInternals]);

  const displayNodes = useMemo(
    () =>
      nodes
        .filter(isTypeVisible)
        .map((node) =>
          (connectedLine ? !connectedLine.has(node.id) : false) === node.data.dimmed
            ? node
            : { ...node, data: { ...node.data, dimmed: connectedLine ? !connectedLine.has(node.id) : false } }
        ),
    [nodes, connectedLine, isTypeVisible]
  );

  const displayEdges = useMemo(
    () =>
      baseEdges
        .filter((edge) => edgeFilter === "both" || edge.data?.edgeType === edgeFilter)
        .map((edge) => {
          const color = EDGE_COLORS[edge.data!.edgeType];
          const inLine = connectedLine ? connectedLine.has(edge.source) && connectedLine.has(edge.target) : true;
          return {
            ...edge,
            style: { stroke: color, strokeWidth: inLine ? 2 : 1, opacity: connectedLine ? (inLine ? 0.95 : 0.05) : 0.55 },
            markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14, markerUnits: "userSpaceOnUse" },
          };
        }),
    [baseEdges, edgeFilter, connectedLine]
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nodes
      .filter((n) => n.data.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))
      .sort((a, b) => a.data.name.localeCompare(b.data.name))
      .slice(0, 8);
  }, [query, nodes]);

  const focusShard = useCallback(
    (node: ShardNode) => {
      setSelectedId(node.id);
      setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + NODE_HEIGHT / 2, { zoom: 1.2, duration: 600 });
      setQuery("");
      setShowResults(false);
    },
    [setCenter]
  );

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => setSelectedId((prev) => (prev === node.id ? null : node.id)), []);
  const onPaneClick = useCallback(() => setSelectedId(null), []);

  if (loading || !fusionData) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full bg-slate-950" style={{ height: canvasHeight }}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodesConnectable={false}
        minZoom={0.1}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#334155" gap={24} />
        <Controls className="!bg-slate-800 !border-slate-700" />
        <MiniMap pannable zoomable className="!bg-slate-900" maskColor="rgba(2,6,23,0.7)" />
      </ReactFlow>

      {/* Search + controls overlay */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex w-72 flex-col gap-2">
        <div className="pointer-events-auto relative">
          <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 shadow-lg">
            <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onBlur={() => {
                // Alt-tabbing away shouldn't collapse the results the user was reading.
                if (isBlurCausedByWindow()) return;
                blurTimer.current = setTimeout(() => setShowResults(false), 150);
              }}
              placeholder="Search shards…"
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-slate-400 hover:text-white" aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {showResults && searchResults.length > 0 && (
            <div
              className="absolute mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/98 shadow-xl"
              onMouseDown={() => blurTimer.current && clearTimeout(blurTimer.current)}
            >
              {searchResults.map((node) => (
                <button
                  key={node.id}
                  onClick={() => focusShard(node)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-purple-500/20"
                >
                  <img
                    src={shardIconUrl(node.id)}
                    alt=""
                    className="h-5 w-5 object-contain"
                  />
                  <span className="truncate text-sm text-slate-200">{node.data.name}</span>
                  <span className="ml-auto text-[10px] text-slate-500">{node.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Edge-type toggle */}
        <div className="pointer-events-auto flex gap-1 rounded-lg border border-slate-700 bg-slate-900/95 p-1 shadow-lg">
          {(["both", "special", "id"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setEdgeFilter(opt)}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors ${
                edgeFilter === opt ? "bg-purple-500/30 text-purple-200" : "text-slate-400 hover:bg-slate-700/50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="pointer-events-auto flex flex-col gap-1 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-300 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-5 rounded" style={{ backgroundColor: EDGE_COLORS.special }} />
            <span>Special — family upgrades</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-5 rounded" style={{ backgroundColor: EDGE_COLORS.id }} />
            <span>ID — cross-family ladders</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 text-center text-amber-300">*</span>
            <span>Shared by multiple lines</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Click a shard to highlight its fusion line. Drag to rearrange.</div>
        </div>
      </div>
    </div>
  );
};

export const FusionGraphPage: React.FC = () => (
  <ReactFlowProvider>
    <FusionGraphInner />
  </ReactFlowProvider>
);

export default FusionGraphPage;
