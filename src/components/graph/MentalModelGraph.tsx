"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Handle,
  Position,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Brain, FileCode2, Tag as TagIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import Prism from '@/components/ui/Prism';

// Custom Nodes Design
const MentalModelNode = ({ data }: any) => {
  const isMastered = data.masteryScore > 80;
  const isWeak = data.masteryScore < 40;
  
  return (
    <div className={cn(
      "px-4 py-3 rounded-xl border-2 bg-zinc-950 shadow-2xl min-w-[200px] transition-all",
      isMastered ? "border-emerald-500/50 shadow-emerald-500/20" : 
      isWeak ? "border-rose-500/50 shadow-rose-500/20" : "border-indigo-500/50 shadow-indigo-500/20"
    )}>
      <Handle type="target" position={Position.Top} className="!bg-zinc-700" />
      <div className="flex items-center gap-2 mb-2">
        <Brain className={cn(
          "w-5 h-5",
          isMastered ? "text-emerald-400" : isWeak ? "text-rose-400" : "text-indigo-400"
        )} />
        <h3 className="text-sm font-bold text-zinc-100">{data.label}</h3>
      </div>
      <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono mb-2">
        {data.type}
      </div>
      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full",
            isMastered ? "bg-emerald-500" : isWeak ? "bg-rose-500" : "bg-indigo-500"
          )}
          style={{ width: `${data.masteryScore}%` }}
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-700" />
    </div>
  );
};

const ProblemNode = ({ data }: any) => (
  <div className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 shadow-sm flex items-center gap-2">
    <Handle type="target" position={Position.Top} className="!bg-zinc-700 !w-2 !h-2" />
    <FileCode2 className="w-3.5 h-3.5 text-zinc-400" />
    <span className="text-xs font-medium text-zinc-300">{data.label}</span>
  </div>
);

const TagNode = ({ data }: any) => (
  <div className="px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900 shadow-sm flex items-center gap-2">
    <TagIcon className="w-3 h-3" style={{ color: data.color || '#a1a1aa' }} />
    <span className="text-xs font-medium text-zinc-300">{data.label}</span>
    <Handle type="source" position={Position.Bottom} className="!bg-zinc-700 !w-2 !h-2" />
  </div>
);

const nodeTypes = {
  mentalModel: MentalModelNode,
  problem: ProblemNode,
  tag: TagNode,
};

export function MentalModelGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGraphData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/mental-models/graph');
      const data = await res.json();
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch (error) {
      console.error("Failed to fetch graph", error);
    } finally {
      setIsLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  if (isLoading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-zinc-950 rounded-xl border border-zinc-800">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="w-full h-[800px] bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        className="dark"
        minZoom={0.2}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#27272a" />
        <Controls className="!bg-zinc-900 !border-zinc-800 !fill-zinc-400" />
        <MiniMap 
          className="!bg-zinc-900 !border-zinc-800 rounded-lg overflow-hidden" 
          maskColor="rgba(9, 9, 11, 0.7)"
          nodeColor={(n) => {
            if (n.type === 'mentalModel') return '#6366f1';
            if (n.type === 'problem') return '#3f3f46';
            return '#a1a1aa';
          }}
        />
      </ReactFlow>

      {/* Analytics Overlay (Mocked UI Shell) */}
      <div className="absolute top-4 left-4 p-4 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-xl pointer-events-none">
        <h2 className="text-sm font-bold text-zinc-100 mb-1">Cognitive Analytics</h2>
        <p className="text-xs text-zinc-400 mb-4">{(nodes as any[]).filter((n: any) => n.type === 'mentalModel').length} Reasoning Patterns Discovered</p>
        
        <div className="flex gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Strongest Cluster</div>
            <div className="text-sm font-medium text-emerald-400">Prefix Optimizations</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Weakest Cluster</div>
            <div className="text-sm font-medium text-rose-400">State Machine DP</div>
          </div>
        </div>
      </div>

      {/* Floating Prism AI Engine Graphic */}
      <div className="absolute bottom-4 right-4 w-48 h-48 pointer-events-none opacity-80 mix-blend-screen transition-opacity duration-1000 ease-in-out">
        <Prism
          animationType="3drotate"
          timeScale={0.3}
          height={3}
          baseWidth={5.5}
          scale={2.5}
          hueShift={-0.3} // Shifts default hue to align with the indigo/purple CodeRev vibe
          colorFrequency={0.6}
          noise={0.1}
          glow={1.5}
        />
        <div className="absolute bottom-2 right-4 text-[10px] text-zinc-500 uppercase tracking-widest font-mono text-right">
          Cognitive Engine <br/><span className="text-indigo-400">Online</span>
        </div>
      </div>
    </div>
  );
}
