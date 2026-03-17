import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getProjectFromChannel, fetchCC } from '../utils.js';

export const data = new SlashCommandBuilder()
  .setName('progress')
  .setDescription('查看專案進度')
  .addStringOption((opt) =>
    opt.setName('project').setDescription('專案 ID（留空則從頻道推斷）').setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const project = interaction.options.getString('project') || getProjectFromChannel(interaction.channelId);
  if (!project) {
    await interaction.reply({ content: '❌ 無法判斷專案，請指定 project 參數', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  try {
    const [progressData, tasksData, projectInfo] = await Promise.all([
      fetchCC(`/api/progress?project=${project}`),
      fetchCC(`/api/tasks?project=${project}&limit=3`),
      fetchCC(`/api/projects/${project}`).catch(() => null),
    ]);

    const projectName = projectInfo?.name || project;
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${projectName}`)
      .setColor(0x3498db)
      .setTimestamp();

    // Progress: top-level items only, skip openspec parents (they duplicate manual phases)
    const topLevel = progressData
      .filter((p: any) => !p.parentId)
      .filter((p: any) => !isOpenspecParent(p.label, progressData));

    if (topLevel.length > 0) {
      const lines = topLevel.slice(0, 6).map((p: any) => {
        const pct = p.progressPct ?? 0;
        const bar = progressBar(pct);
        const label = cleanLabel(p.label, 40);
        return `${bar} ${label}`;
      });
      const remaining = topLevel.length - 6;
      if (remaining > 0) lines.push(`…還有 ${remaining} 項`);
      embed.addFields({ name: '進度', value: lines.join('\n').slice(0, 1024) || '無' });
    }

    // Overall progress summary from top-level items
    if (topLevel.length > 0) {
      const avgPct = Math.round(topLevel.reduce((sum: number, p: any) => sum + (p.progressPct ?? 0), 0) / topLevel.length);
      embed.setDescription(`整體進度：**${avgPct}%**（${topLevel.length} 項）`);
    }

    // Recent tasks
    if (tasksData.length > 0) {
      const lines = tasksData.map((t: any) => {
        const time = relativeTime(t.createdAt || t.created_at);
        const summary = truncate(t.summary || t.prompt, 60);
        return `• ${summary} (${time})`;
      });
      embed.addFields({ name: '最近任務', value: lines.join('\n').slice(0, 1024) || '無' });
    }

    if (topLevel.length === 0 && tasksData.length === 0) {
      embed.setDescription('目前沒有進度資料或任務記錄');
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err: any) {
    console.error('[SlashBot] /progress error:', err);
    const msg = err?.message || String(err);
    await interaction.editReply(`❌ 無法取得進度：${truncate(msg, 200)}`);
  }
}

function progressBar(pct: number): string {
  const filled = Math.round(pct / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${pct}%`;
}

/** Clean up openspec-style labels: [openspec:name:hash] Description → Description */
function cleanLabel(label: string, max: number): string {
  if (!label) return '(無)';
  // Strip [openspec:...] prefix
  const cleaned = label.replace(/^\[openspec:[^\]]*\]\s*/, '');
  return truncate(cleaned, max);
}

/** Check if a progress item is an openspec parent that just groups child tasks */
function isOpenspecParent(label: string, allItems: any[]): boolean {
  if (!label?.startsWith('[openspec:')) return false;
  // It's an openspec parent if it has children
  const item = allItems.find((p: any) => p.label === label);
  if (!item) return false;
  return allItems.some((p: any) => p.parentId === item.id);
}

function truncate(s: string | undefined, max: number): string {
  if (!s) return '(無)';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function relativeTime(iso: string): string {
  if (!iso) return '?';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
