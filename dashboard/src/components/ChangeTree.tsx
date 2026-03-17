'use client';

import { useState, useMemo } from 'react';
import type { SpecChange, ArchivedChange } from '@/lib/api';

/* ── Constants ── */
const ROW_HEIGHT = 68;
const TASK_ROW_HEIGHT = 36;
const LANE_WIDTH = 28;
const NODE_R = 7;
const RAIL_X = 20;
const CARD_LEFT = 50;

/* ── Colors ── */
const TRUNK_COLOR = '#3b82f6';
const TASK_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const STATUS_NODE: Record<string, { fill: string; stroke: string; pulse?: boolean; icon?: string }> = {
  completed:   { fill: '#22c55e', stroke: '#22c55e', icon: '✓' },
  in_progress: { fill: '#3b82f6', stroke: '#3b82f6', pulse: true },
  draft:       { fill: 'transparent', stroke: '#6b7280' },
  archived:    { fill: '#374151', stroke: '#4b5563' },
};

const STATUS_LABELS: Record<string, string> = {
  completed: '已完成', in_progress: '進行中', draft: '草稿', archived: '已歸檔',
};

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-green-900/60 text-green-300 border-green-700/50',
  in_progress: 'bg-blue-900/60 text-blue-300 border-blue-700/50',
  draft: 'bg-gray-800 text-gray-400 border-gray-700/50',
  archived: 'bg-gray-800 text-gray-500 border-gray-700/50',
};

/* ── Helpers ── */
function parseTasks(rawMd: string | null): { checked: boolean; label: string }[] {
  if (!rawMd) return [];
  return rawMd.split('\n')
    .map(line => {
      const m = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
      if (!m) return null;
      return { checked: m[1].toLowerCase() === 'x', label: m[2].trim() };
    })
    .filter((t): t is { checked: boolean; label: string } => t !== null);
}

/* ── Layout types ── */
interface LayoutRow {
  type: 'change' | 'task';
  y: number;
  x: number;
  lane: number;
  color: string;
  // Change fields
  change?: SpecChange;
  pct?: number;
  // Task fields
  task?: { checked: boolean; label: string };
  parentY?: number;
}

/* ── Compute layout ── */
function computeLayout(
  allChanges: SpecChange[],
  expandedSet: Set<string>,
): LayoutRow[] {
  const rows: LayoutRow[] = [];
  let y = ROW_HEIGHT / 2;

  // Sort: in_progress → draft → completed → archived
  const order: Record<string, number> = { in_progress: 0, draft: 1, completed: 2, archived: 3 };
  const sorted = [...allChanges].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

  for (const change of sorted) {
    const cfg = STATUS_NODE[change.status] || STATUS_NODE.draft;
    const pct = change.tasksStats
      ? change.tasksStats.total > 0
        ? Math.round((change.tasksStats.completed / change.tasksStats.total) * 100)
        : 0
      : 0;

    const changeColor = change.status === 'completed' ? '#22c55e'
      : change.status === 'in_progress' ? TRUNK_COLOR
      : change.status === 'archived' ? '#4b5563'
      : '#6b7280';

    const changeY = y;
    rows.push({
      type: 'change',
      y: changeY,
      x: RAIL_X,
      lane: 0,
      color: changeColor,
      change,
      pct,
    });

    y += ROW_HEIGHT;

    // If expanded, add task rows as branches
    if (expandedSet.has(change.name)) {
      const tasks = parseTasks(change.rawTasksMd);
      for (let i = 0; i < tasks.length; i++) {
        const taskColor = tasks[i].checked ? '#22c55e' : TASK_COLORS[i % TASK_COLORS.length];
        rows.push({
          type: 'task',
          y,
          x: RAIL_X + LANE_WIDTH,
          lane: 1,
          color: taskColor,
          task: tasks[i],
          parentY: changeY,
        });
        y += TASK_ROW_HEIGHT;
      }
    }
  }

  return rows;
}

/* ── SVG Layer ── */
function GraphSvg({ rows, totalHeight }: { rows: LayoutRow[]; totalHeight: number }) {
  const changeRows = rows.filter((r) => r.type === 'change');
  const taskRows = rows.filter((r) => r.type === 'task');

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={CARD_LEFT}
      height={totalHeight}
      style={{ overflow: 'visible' }}
    >
      {/* Trunk vertical line */}
      {changeRows.length > 1 && (
        <line
          x1={RAIL_X} y1={changeRows[0].y}
          x2={RAIL_X} y2={changeRows[changeRows.length - 1].y}
          stroke={TRUNK_COLOR} strokeWidth={2} strokeOpacity={0.3}
        />
      )}

      {/* Task branch fork lines */}
      {taskRows.map((tr, i) => {
        if (tr.parentY == null) return null;
        const x1 = RAIL_X;
        const y1 = tr.parentY;
        const x2 = tr.x;
        const y2 = tr.y;
        const midY = y1 + (y2 - y1) * 0.35;
        const d = `M ${x1},${y1} C ${x1},${midY} ${x2},${midY} ${x2},${y2}`;

        return (
          <path
            key={`fork-${i}`}
            d={d}
            fill="none"
            stroke={tr.color}
            strokeWidth={1.5}
            strokeOpacity={0.4}
          />
        );
      })}

      {/* Change node circles */}
      {changeRows.map((row) => {
        const cfg = STATUS_NODE[row.change!.status] || STATUS_NODE.draft;
        return (
          <g key={`node-${row.change!.name}`}>
            {cfg.pulse && (
              <circle cx={row.x} cy={row.y} r={NODE_R + 4} fill="none" stroke={cfg.stroke} strokeWidth={1.5} strokeOpacity={0.3}>
                <animate attributeName="r" from={String(NODE_R + 2)} to={String(NODE_R + 8)} dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={row.x} cy={row.y} r={NODE_R} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={2} />
            {cfg.icon && (
              <text x={row.x} y={row.y + 1} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight="bold" fill="white">
                {cfg.icon}
              </text>
            )}
          </g>
        );
      })}

      {/* Task node circles (smaller) */}
      {taskRows.map((row, i) => (
        <circle
          key={`task-node-${i}`}
          cx={row.x} cy={row.y} r={4}
          fill={row.task?.checked ? '#22c55e' : 'transparent'}
          stroke={row.task?.checked ? '#22c55e' : '#6b7280'}
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

/* ── Props ── */
interface ChangeTreeProps {
  changes: SpecChange[];
  archived?: ArchivedChange[];
  onStatusChange?: (changeName: string, newStatus: string) => void;
  onImport?: (changeName: string) => void;
  importing?: string | null;
}

/* ── Main Component ── */
export function ChangeTree({ changes, archived, onStatusChange, onImport, importing }: ChangeTreeProps) {
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());

  const allChanges: SpecChange[] = useMemo(() => [
    ...changes,
    ...(archived || []),
  ], [changes, archived]);

  const rows = useMemo(
    () => computeLayout(allChanges, expandedSet),
    [allChanges, expandedSet],
  );

  if (allChanges.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 text-sm">
        <div className="text-3xl mb-2 opacity-30">○</div>
        尚無變更提案
        <div className="text-xs text-gray-600 mt-1">
          使用 <code className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">/opsx:propose</code> 建立第一個
        </div>
      </div>
    );
  }

  const totalHeight = rows.length > 0
    ? rows[rows.length - 1].y + ROW_HEIGHT / 2
    : 100;

  const toggleExpand = (name: string) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="relative" style={{ height: totalHeight, minHeight: 80 }}>
      <GraphSvg rows={rows} totalHeight={totalHeight} />

      {rows.map((row, i) => {
        if (row.type === 'change') {
          const change = row.change!;
          const badgeCls = STATUS_BADGE[change.status] || STATUS_BADGE.draft;
          const statusLabel = STATUS_LABELS[change.status] || change.status;
          const isExpanded = expandedSet.has(change.name);
          const tasks = parseTasks(change.rawTasksMd);

          const nextAction = change.status === 'draft'
            ? { label: '▶ 開始', status: 'in_progress', cls: 'bg-blue-600 hover:bg-blue-500 text-white' }
            : change.status === 'in_progress'
              ? { label: '✓ 完成', status: 'completed', cls: 'bg-green-600 hover:bg-green-500 text-white' }
              : change.status === 'completed'
                ? { label: '◌ 歸檔', status: 'archived', cls: 'bg-gray-600 hover:bg-gray-500 text-white' }
                : null;

          return (
            <div
              key={`card-${change.name}`}
              className="absolute flex items-center"
              style={{ top: row.y - 26, left: CARD_LEFT, right: 0, height: 52 }}
            >
              <div className={`
                flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer
                ${change.status === 'in_progress' ? 'border-blue-500/30 bg-blue-950/20' :
                  change.status === 'completed' ? 'border-green-500/20 bg-green-950/10' :
                  'border-gray-700/40 bg-gray-900/40'}
                hover:bg-white/[0.03]
              `}
                onClick={() => tasks.length > 0 && toggleExpand(change.name)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${
                      change.status === 'completed' || change.status === 'archived' ? 'text-gray-400' : 'text-gray-100'
                    }`}>
                      {change.name}
                    </span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium border ${badgeCls}`}>
                      {statusLabel}
                    </span>
                    {tasks.length > 0 && (
                      <span className={`text-[10px] text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    )}
                  </div>
                  {change.proposalSummary && change.proposalSummary !== change.status && (
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{change.proposalSummary}</p>
                  )}
                  {change.lastModified && (
                    <p className="text-[9px] text-gray-600 mt-0.5">{new Date(change.lastModified).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  )}
                </div>

                {/* Progress + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {change.tasksStats && (
                    <span className="text-[10px] text-gray-400 font-mono">
                      {change.tasksStats.completed}/{change.tasksStats.total}
                    </span>
                  )}
                  {(row.pct ?? 0) > 0 && (
                    <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${row.pct}%`, backgroundColor: row.color }}
                      />
                    </div>
                  )}
                  {nextAction && onStatusChange && change.status !== 'archived' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onStatusChange(change.name, nextAction.status); }}
                      className={`text-[9px] px-2 py-0.5 rounded font-semibold ${nextAction.cls}`}
                    >
                      {nextAction.label}
                    </button>
                  )}
                  {onImport && change.tasksStats && change.status !== 'archived' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onImport(change.name); }}
                      disabled={importing === change.name}
                      className="text-[9px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700 disabled:opacity-50"
                    >
                      {importing === change.name ? '⟳...' : '⟳'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // Task row
        const task = row.task!;
        return (
          <div
            key={`task-${i}`}
            className="absolute flex items-center"
            style={{ top: row.y - 12, left: CARD_LEFT + LANE_WIDTH, right: 0, height: 24 }}
          >
            <span className={`text-xs ${task.checked ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
              {task.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
