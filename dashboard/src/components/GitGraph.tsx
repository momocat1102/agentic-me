'use client';

import { useMemo } from 'react';
import type { Progress } from '@/lib/api';

/* ── Constants ── */
const ROW_HEIGHT = 68;
const LANE_WIDTH = 28;
const NODE_R = 7;
const RAIL_X = 20;        // x position of trunk line
const CARD_LEFT = 80;     // left margin for cards (enough for branch labels)

/* ── Colors ── */
const BRANCH_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const TRUNK_COLOR = '#3b82f6';

const STATUS_NODE: Record<string, { fill: string; stroke: string; pulse?: boolean; icon?: string }> = {
  completed:   { fill: '#22c55e', stroke: '#22c55e', icon: '✓' },
  in_progress: { fill: '#3b82f6', stroke: '#3b82f6', pulse: true },
  review:      { fill: '#a855f7', stroke: '#a855f7' },
  draft:       { fill: 'transparent', stroke: '#eab308' },
  not_started: { fill: 'transparent', stroke: '#6b7280' },
};

const STATUS_LABELS: Record<string, string> = {
  completed: '已完成', in_progress: '進行中', review: '審閱中',
  draft: '草稿', not_started: '未開始',
};

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-green-900/60 text-green-300 border-green-700/50',
  in_progress: 'bg-blue-900/60 text-blue-300 border-blue-700/50',
  review: 'bg-purple-900/60 text-purple-300 border-purple-700/50',
  draft: 'bg-yellow-900/60 text-yellow-300 border-yellow-700/50',
  not_started: 'bg-gray-800 text-gray-400 border-gray-700/50',
};

/* ── Layout types ── */
interface LayoutNode {
  item: Progress;
  row: number;
  lane: number;         // 0 = trunk, 1+ = branch
  x: number;
  y: number;
  color: string;
  type: 'trunk' | 'branch';
  parentRow?: number;   // row of parent (for branch fork line)
  branchLabel?: string;
  children?: LayoutNode[];
}

/* ── Compute layout ── */
function computeLayout(
  items: Progress[],
  childrenMap: Record<string, Progress[]>,
): LayoutNode[] {
  const nodes: LayoutNode[] = [];
  let row = 0;

  // Trunk nodes (no parentId), sorted by sortOrder then createdAt
  const trunkItems = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  for (const item of trunkItems) {
    const trunkRow = row;
    const x = RAIL_X;
    const y = row * ROW_HEIGHT + ROW_HEIGHT / 2;

    const trunkNode: LayoutNode = {
      item,
      row: trunkRow,
      lane: 0,
      x,
      y,
      color: item.status === 'completed' ? '#22c55e' : TRUNK_COLOR,
      type: 'trunk',
    };

    // Branch children
    const children = childrenMap[item.id];
    if (children && children.length > 0) {
      const branchNodes: LayoutNode[] = [];
      for (let i = 0; i < children.length; i++) {
        row++;
        const lane = i + 1;
        const bx = RAIL_X + lane * LANE_WIDTH;
        const by = row * ROW_HEIGHT + ROW_HEIGHT / 2;
        const branchColor = children[i].status === 'completed'
          ? '#22c55e'
          : BRANCH_COLORS[i % BRANCH_COLORS.length];

        branchNodes.push({
          item: children[i],
          row,
          lane,
          x: bx,
          y: by,
          color: branchColor,
          type: 'branch',
          parentRow: trunkRow,
          branchLabel: children[i].label,
        });
      }
      trunkNode.children = branchNodes;
      nodes.push(trunkNode, ...branchNodes);
    } else {
      nodes.push(trunkNode);
    }

    row++;
  }

  return nodes;
}

/* ── SVG Paths ── */
function GraphSvg({ nodes, totalHeight }: { nodes: LayoutNode[]; totalHeight: number }) {
  const trunkNodes = nodes.filter((n) => n.type === 'trunk');
  const branchNodes = nodes.filter((n) => n.type === 'branch');

  // Find next trunk node after a given row
  const nextTrunkAfter = (row: number): LayoutNode | undefined =>
    trunkNodes.find((n) => n.row > row);

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={CARD_LEFT}
      height={totalHeight}
      style={{ overflow: 'visible' }}
    >
      {/* Trunk vertical line */}
      {trunkNodes.length > 1 && (
        <line
          x1={RAIL_X} y1={trunkNodes[0].y}
          x2={RAIL_X} y2={trunkNodes[trunkNodes.length - 1].y}
          stroke={TRUNK_COLOR} strokeWidth={2} strokeOpacity={0.4}
        />
      )}

      {/* Branch fork lines (from trunk node to branch node) */}
      {branchNodes.map((bn) => {
        const parentTrunk = trunkNodes.find((t) => t.row === bn.parentRow);
        if (!parentTrunk) return null;

        const x1 = parentTrunk.x;
        const y1 = parentTrunk.y;
        const x2 = bn.x;
        const y2 = bn.y;

        // Cubic bezier: go down then curve right
        const midY = y1 + (y2 - y1) * 0.4;
        const d = `M ${x1},${y1} C ${x1},${midY} ${x2},${midY} ${x2},${y2}`;

        return (
          <path
            key={`fork-${bn.item.id}`}
            d={d}
            fill="none"
            stroke={bn.color}
            strokeWidth={2}
            strokeOpacity={0.5}
          />
        );
      })}

      {/* Merge lines (completed branches merge back to next trunk) */}
      {branchNodes
        .filter((bn) => bn.item.status === 'completed')
        .map((bn) => {
          const nextTrunk = nextTrunkAfter(bn.row);
          if (!nextTrunk) return null;

          const x1 = bn.x;
          const y1 = bn.y;
          const x2 = nextTrunk.x;
          const y2 = nextTrunk.y;
          const midY = y1 + (y2 - y1) * 0.6;
          const d = `M ${x1},${y1} C ${x1},${midY} ${x2},${midY} ${x2},${y2}`;

          return (
            <path
              key={`merge-${bn.item.id}`}
              d={d}
              fill="none"
              stroke="#22c55e"
              strokeWidth={1.5}
              strokeOpacity={0.3}
              strokeDasharray="4 3"
            />
          );
        })}

      {/* Node circles */}
      {nodes.map((node) => {
        const cfg = STATUS_NODE[node.item.status] || STATUS_NODE.not_started;
        return (
          <g key={`node-${node.item.id}`}>
            {/* Pulse ring for in_progress */}
            {cfg.pulse && (
              <circle
                cx={node.x} cy={node.y} r={NODE_R + 4}
                fill="none" stroke={cfg.stroke} strokeWidth={1.5} strokeOpacity={0.3}
              >
                <animate attributeName="r" from={String(NODE_R + 2)} to={String(NODE_R + 8)} dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={node.x} cy={node.y} r={NODE_R}
              fill={cfg.fill} stroke={cfg.stroke} strokeWidth={2}
            />
            {cfg.icon && (
              <text
                x={node.x} y={node.y + 1}
                textAnchor="middle" dominantBaseline="central"
                fontSize={9} fontWeight="bold" fill="white"
              >
                {cfg.icon}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Node Card ── */
function NodeCard({ node }: { node: LayoutNode }) {
  const { item } = node;
  const badgeCls = STATUS_BADGE[item.status] || STATUS_BADGE.not_started;
  const statusLabel = STATUS_LABELS[item.status] || item.status;

  return (
    <div
      className="absolute flex items-center gap-2"
      style={{
        top: node.y - 24,
        left: CARD_LEFT,
        right: 0,
        height: 48,
      }}
    >
      {/* Branch label (for branches only) */}
      {node.type === 'branch' && (
        <div
          className="absolute text-[9px] font-mono text-gray-500 truncate"
          style={{
            right: '100%',
            marginRight: 8,
            width: CARD_LEFT - node.x - NODE_R - 12,
            textAlign: 'right',
          }}
        />
      )}

      {/* Card content */}
      <div className={`
        flex-1 flex items-center gap-3 px-3 py-2 rounded-lg border transition-all
        ${node.type === 'trunk'
          ? item.status === 'in_progress'
            ? 'border-blue-500/30 bg-blue-950/20'
            : item.status === 'completed'
              ? 'border-green-500/20 bg-green-950/10'
              : 'border-gray-700/40 bg-gray-900/40'
          : 'border-gray-700/30 bg-gray-900/30'
        }
        hover:bg-white/[0.03]
      `}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate ${
              item.status === 'completed' ? 'text-gray-400' : 'text-gray-100'
            }`}>
              {node.type === 'branch' && (
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: node.color }} />
              )}
              {item.label}
            </span>
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium border ${badgeCls}`}>
              {statusLabel}
            </span>
          </div>
          {item.description && (
            <p className="text-[10px] text-gray-500 truncate mt-0.5">{item.description}</p>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${item.progressPct}%`,
                backgroundColor: node.color,
              }}
            />
          </div>
          <span className="text-[10px] text-gray-400 font-mono w-8 text-right">
            {item.progressPct}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Props ── */
interface GitGraphProps {
  items: Progress[];
  childrenMap: Record<string, Progress[]>;
}

/* ── Main Component ── */
export function GitGraph({ items, childrenMap }: GitGraphProps) {
  const nodes = useMemo(
    () => computeLayout(items, childrenMap),
    [items, childrenMap],
  );

  if (nodes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">尚無進度項目</div>
    );
  }

  const totalHeight = (Math.max(...nodes.map((n) => n.row)) + 1) * ROW_HEIGHT;

  return (
    <div className="relative" style={{ height: totalHeight, minHeight: 120 }}>
      <GraphSvg nodes={nodes} totalHeight={totalHeight} />
      {nodes.map((node) => (
        <NodeCard key={node.item.id} node={node} />
      ))}
    </div>
  );
}
