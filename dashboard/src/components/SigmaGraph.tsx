'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { MemoryGraphData } from '@/lib/api';
import type { SelectedNodeData } from './MemoryGraph';

interface SigmaGraphProps {
  data: MemoryGraphData;
  importanceColors: Record<string, string>;
  edgeColors: Record<string, string>;
  onNodeSelect: (node: SelectedNodeData | null) => void;
}

const IMPORTANCE_SIZE: Record<string, number> = {
  critical: 6,
  high: 4.5,
  medium: 3.5,
  low: 2.5,
};

const IMPORTANCE_TEXT: Record<string, number> = {
  critical: 3.5,
  high: 2.8,
  medium: 2.2,
  low: 1.8,
};

interface GraphNode {
  id: string;
  name: string;
  color: string;
  size: number;
  textSize: number;
  _nodeData: MemoryGraphData['nodes'][0];
  x?: number;
  y?: number;
  z?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

interface GraphLink {
  source: string;
  target: string;
  color: string;
  width: number;
  particles: number;
}

export default function SigmaGraph({ data, importanceColors, edgeColors, onNodeSelect }: SigmaGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const onNodeSelectRef = useRef(onNodeSelect);
  onNodeSelectRef.current = onNodeSelect;

  const initGraph = useCallback(async () => {
    if (!containerRef.current) return;

    // Dynamic imports (browser only)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ForceGraph3D = (await import('3d-force-graph')).default as any;
    const THREE = await import('three');
    const { default: SpriteText } = await import('three-spritetext');

    // Clean up previous
    if (graphRef.current) {
      graphRef.current._destructor();
      graphRef.current = null;
    }

    // Clear container
    containerRef.current.innerHTML = '';

    // Build nodes
    const nodeIds = new Set(data.nodes.map(n => n.id));
    const nodes: GraphNode[] = data.nodes.map(node => ({
      id: node.id,
      name: node.content.length > 30 ? node.content.slice(0, 30) + '…' : node.content,
      color: importanceColors[node.importance] || '#6b7280',
      size: IMPORTANCE_SIZE[node.importance] || 3.5,
      textSize: IMPORTANCE_TEXT[node.importance] || 2.2,
      _nodeData: node,
    }));

    // Build links
    const links: GraphLink[] = data.edges
      .filter(e => nodeIds.has(e.source_id) && nodeIds.has(e.target_id) && e.source_id !== e.target_id)
      .map(edge => ({
        source: edge.source_id,
        target: edge.target_id,
        color: edgeColors[edge.edge_type] || 'rgba(75,85,99,0.6)',
        width: Math.max(0.3, edge.weight * 0.8),
        particles: edge.weight >= 0.5 ? 2 : 1,
      }));

    // Deduplicate links
    const linkSet = new Set<string>();
    const uniqueLinks = links.filter(l => {
      const key = `${l.source}-${l.target}`;
      if (linkSet.has(key)) return false;
      linkSet.add(key);
      return true;
    });

    const graphData = { nodes, links: uniqueLinks };

    // Initialize 3D Graph
    const Graph = ForceGraph3D()(containerRef.current)
      .graphData(graphData)
      .backgroundColor('#050510')
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight)
      .nodeLabel('')
      .nodeColor('color')
      .nodeThreeObject((node: GraphNode) => {
        const group = new THREE.Group();

        // Glowing sphere
        const geometry = new THREE.SphereGeometry(node.size, 16, 16);
        const material = new THREE.MeshLambertMaterial({
          color: node.color,
          transparent: true,
          opacity: 0.75,
          emissive: node.color,
          emissiveIntensity: 0.3,
        });
        group.add(new THREE.Mesh(geometry, material));

        // Floating text label
        const sprite = new SpriteText(node.name);
        sprite.color = '#ffffff';
        sprite.textHeight = node.textSize;
        sprite.position.y = -(node.size + 2);
        sprite.material.depthWrite = false;
        group.add(sprite);

        return group;
      })
      .linkColor((link: GraphLink) => link.color)
      .linkWidth((link: GraphLink) => link.width)
      .linkOpacity(0.6)
      .linkDirectionalParticles((link: GraphLink) => link.particles)
      .linkDirectionalParticleWidth(1.2)
      .linkDirectionalParticleSpeed(0.004)
      .onNodeClick((node: GraphNode) => {
        // Camera zoom to node
        const distance = 80;
        const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);
        Graph.cameraPosition(
          { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
          node as unknown as { x: number; y: number; z: number },
          1500,
        );

        // Notify parent
        const nd = node._nodeData;
        onNodeSelectRef.current({
          id: node.id,
          content: nd.content,
          summary: nd.summary || '',
          category: nd.category,
          importance: nd.importance,
          effective_importance: nd.effective_importance || 0,
          tags: nd.tags || [],
          entities: nd.entities || [],
          project: nd.project,
          session: nd.session || '',
          token_count: nd.token_count || 0,
          access_count: nd.access_count || 0,
          created_at: nd.created_at,
          feedback_score: nd.feedback_score || 0,
          color: node.color,
        });
      })
      .onBackgroundClick(() => {
        onNodeSelectRef.current(null);
      })
      .onNodeDragEnd((node: GraphNode) => {
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
      });

    // Adjust forces
    Graph.d3Force('charge')?.strength(-150);

    // Add lighting
    const scene = Graph.scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 100, 100);
    scene.add(dirLight);

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        Graph.width(containerRef.current.clientWidth);
        Graph.height(containerRef.current.clientHeight);
      }
    });
    resizeObserver.observe(containerRef.current);

    graphRef.current = Graph;

    return () => {
      resizeObserver.disconnect();
    };
  }, [data, importanceColors, edgeColors]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initGraph().then(fn => { cleanup = fn; });

    return () => {
      cleanup?.();
      if (graphRef.current) {
        graphRef.current._destructor();
        graphRef.current = null;
      }
    };
  }, [initGraph]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: 600 }}
    />
  );
}
