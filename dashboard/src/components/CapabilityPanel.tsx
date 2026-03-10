'use client';

import { useState } from 'react';
import type { AgentCapabilities } from '@/lib/api';

export function CapabilityPanel({ caps }: { caps: AgentCapabilities }) {
  return (
    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      {/* Skills */}
      <Section title="Skills" count={caps.skills.length}>
        {caps.skills.length === 0 ? (
          <EmptyNote>無自訂 Skills</EmptyNote>
        ) : (
          <div className="flex flex-wrap gap-2">
            {caps.skills.map((s) => (
              <span
                key={s.name}
                title={s.description}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 cursor-default"
              >
                {s.name}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Commands */}
      <Section title="Commands" count={caps.commands.length}>
        {caps.commands.length === 0 ? (
          <EmptyNote>無自訂 Commands</EmptyNote>
        ) : (
          <div className="space-y-1.5">
            {caps.commands.map((cmd) => (
              <div key={`${cmd.source}-${cmd.name}`} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs text-gray-900 dark:text-gray-100 min-w-[100px]">
                  {cmd.name}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  cmd.source === 'project'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {cmd.source}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-xs truncate">
                  {cmd.description}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* MCP Tools */}
      <Section title="MCP Tools" count={caps.mcpTools.reduce((sum, g) => sum + g.toolCount, 0)}>
        {caps.mcpTools.length === 0 ? (
          <EmptyNote>無 MCP Tools</EmptyNote>
        ) : (
          <div className="space-y-2">
            {caps.mcpTools.map((group) => (
              <McpGroup key={group.serverName} group={group} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h4>
        <span className="text-xs text-gray-400 dark:text-gray-500">{count}</span>
      </div>
      {children}
    </div>
  );
}

function McpGroup({ group }: { group: { serverName: string; toolCount: number; tools: string[] } }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-800">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
      >
        <span className="font-mono text-xs text-gray-900 dark:text-gray-100">{group.serverName}</span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{group.toolCount} tools</span>
          <span className="text-gray-400 text-xs">{open ? '\u25B2' : '\u25BC'}</span>
        </span>
      </button>
      {open && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {group.tools.map((t) => (
            <span
              key={t}
              className="inline-block px-2 py-0.5 text-[11px] font-mono rounded bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-400 dark:text-gray-500">{children}</p>;
}
