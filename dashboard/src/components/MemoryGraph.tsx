'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { api, type MemoryGraphData } from '@/lib/api';
import dynamic from 'next/dynamic';

const SigmaGraph = dynamic(() => import('./SigmaGraph'), { ssr: false });

const IMPORTANCE_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#6b7280',
};

const EDGE_COLORS: Record<string, string> = {
  semantic: '#8b5cf6',
  temporal: '#06b6d4',
  causal: '#f59e0b',
  entity: '#10b981',
};

interface MemoryGraphProps {
  projectFilter?: string;
  edgeTypeFilter?: string;
}

export interface SelectedNodeData {
  id: string;
  content: string;
  summary: string;
  category: string;
  importance: string;
  effective_importance: number;
  tags: string[];
  entities: string[];
  project: string;
  session: string;
  token_count: number;
  access_count: number;
  created_at: string;
  feedback_score: number;
  color: string;
}

export function MemoryGraph({ projectFilter, edgeTypeFilter }: MemoryGraphProps) {
  const [data, setData] = useState<MemoryGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SelectedNodeData | null>(null);

  useEffect(() => {
    setLoading(true);
    api.memory
      .graph(projectFilter || undefined)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectFilter]);

  const filteredData = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      edges: edgeTypeFilter ? data.edges.filter(e => e.edge_type === edgeTypeFilter) : data.edges,
    };
  }, [data, edgeTypeFilter]);

  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">載入知識圖譜中...</div>;
  }

  if (!filteredData || filteredData.nodes.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">沒有圖譜資料</div>;
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border border-gray-700 overflow-hidden"
        style={{ height: 600, backgroundColor: '#050510' }}
      >
        <SigmaGraph
          data={filteredData}
          importanceColors={IMPORTANCE_COLORS}
          edgeColors={EDGE_COLORS}
          onNodeSelect={setSelectedNode}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 text-xs">
        <div className="space-y-1">
          <p className="text-gray-500 font-medium">重要性（節點顏色）</p>
          <div className="flex gap-3">
            {Object.entries(IMPORTANCE_COLORS).map(([key, color]) => (
              <span key={key} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                <span className="text-gray-400">{key}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-gray-500 font-medium">邊的類型</p>
          <div className="flex gap-3">
            {Object.entries(EDGE_COLORS).map(([key, color]) => (
              <span key={key} className="flex items-center gap-1">
                <span className="w-4 h-0.5 inline-block" style={{ backgroundColor: color }} />
                <span className="text-gray-400">{key}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Selected node detail */}
      {selectedNode && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedNode.color }} />
            <span className="text-sm font-semibold text-gray-100">{selectedNode.category}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{selectedNode.importance}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-900 text-green-300">{selectedNode.project}</span>
            <span className="text-xs text-gray-500 ml-auto">{new Date(selectedNode.created_at).toLocaleString('zh-TW')}</span>
          </div>

          {/* Content */}
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{selectedNode.content}</p>

          {/* Summary */}
          {selectedNode.summary && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">摘要</p>
              <p className="text-xs text-gray-400">{selectedNode.summary}</p>
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="rounded-lg bg-gray-900/60 px-2 py-1.5">
              <span className="text-gray-500">有效重要性</span>
              <span className="block text-gray-300 font-medium">{selectedNode.effective_importance.toFixed(2)}</span>
            </div>
            <div className="rounded-lg bg-gray-900/60 px-2 py-1.5">
              <span className="text-gray-500">存取次數</span>
              <span className="block text-gray-300 font-medium">{selectedNode.access_count}</span>
            </div>
            <div className="rounded-lg bg-gray-900/60 px-2 py-1.5">
              <span className="text-gray-500">Token 數</span>
              <span className="block text-gray-300 font-medium">{selectedNode.token_count}</span>
            </div>
            <div className="rounded-lg bg-gray-900/60 px-2 py-1.5">
              <span className="text-gray-500">回饋分數</span>
              <span className="block text-gray-300 font-medium">{selectedNode.feedback_score}</span>
            </div>
          </div>

          {/* Tags & Entities */}
          <div className="flex flex-wrap gap-3 text-xs">
            {selectedNode.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-gray-500">Tags:</span>
                {selectedNode.tags.map((t) => (
                  <span key={t} className="px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300">{t}</span>
                ))}
              </div>
            )}
            {selectedNode.entities.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-gray-500">Entities:</span>
                {selectedNode.entities.map((e) => (
                  <span key={e} className="px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-300">{e}</span>
                ))}
              </div>
            )}
          </div>

          {/* ID & Session */}
          <div className="text-[10px] text-gray-600 flex gap-4">
            <span>ID: {selectedNode.id.slice(0, 12)}…</span>
            {selectedNode.session && <span>Session: {selectedNode.session.slice(0, 12)}…</span>}
          </div>
        </div>
      )}
    </div>
  );
}
