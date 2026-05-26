"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TagWithMeta } from "@/types";

type TagNode = TagWithMeta & { children?: TagNode[] };

function layoutTree(
  roots: TagNode[],
  x = 0,
  layerHeight = 120,
  siblingGap = 220
): { nodes: Node[]; edges: Edge[]; width: number } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  function walk(
    items: TagNode[],
    depth: number,
    startX: number
  ): { endX: number; centerX: number } {
    if (items.length === 0) return { endX: startX, centerX: startX };

    let cursor = startX;
    const centers: number[] = [];

    for (const item of items) {
      const childResult =
        item.children && item.children.length > 0
          ? walk(item.children, depth + 1, cursor)
          : { endX: cursor + siblingGap, centerX: cursor + siblingGap / 2 };

      const centerX = childResult.centerX;
      centers.push(centerX);

      nodes.push({
        id: item.id,
        position: { x: centerX, y: depth * layerHeight },
        data: {
          label: (
            <div className="text-center">
              <div className="font-semibold">{item.name}</div>
              <div className="text-xs opacity-80">{item._count?.problems ?? 0} problems</div>
            </div>
          ),
        },
        style: {
          background: item.color,
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: 10,
          minWidth: 160,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      if (item.children) {
        for (const child of item.children) {
          edges.push({
            id: `${item.id}-${child.id}`,
            source: item.id,
            target: child.id,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: "#94a3b8" },
          });
        }
      }

      cursor = childResult.endX + siblingGap / 2;
    }

    const min = Math.min(...centers);
    const max = Math.max(...centers);
    return { endX: max + siblingGap / 2, centerX: (min + max) / 2 };
  }

  walk(roots, 0, x);
  const width = nodes.reduce((acc, n) => Math.max(acc, n.position.x + 200), 0);
  return { nodes, edges, width };
}

export function TagHierarchyGraph() {
  const [tree, setTree] = useState<TagNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => setTree(data.tree ?? []))
      .finally(() => setLoading(false));
  }, []);

  const layout = useMemo(() => layoutTree(tree), [tree]);
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);

  useEffect(() => {
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [layout, setNodes, setEdges]);

  const onInit = useCallback(() => {}, []);

  if (loading) return <p className="text-zinc-500">Loading tag graph...</p>;
  if (tree.length === 0) {
    return <p className="text-zinc-500">No tags yet. Create tags with parent relationships.</p>;
  }

  return (
    <div className="h-[600px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap nodeColor={(n) => (n.style?.background as string) ?? "#2563eb"} />
      </ReactFlow>
    </div>
  );
}
