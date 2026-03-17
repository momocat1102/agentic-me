import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { fetchCC } from '../utils.js';

export const data = new SlashCommandBuilder()
  .setName('overview')
  .setDescription('所有專案總覽');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const projects = await fetchCC('/api/projects');

    const embed = new EmbedBuilder()
      .setTitle('🗂️ 專案總覽')
      .setColor(0x2ecc71)
      .setTimestamp();

    if (projects.length === 0) {
      embed.setDescription('目前沒有註冊的專案');
    } else {
      for (const p of projects.slice(0, 10)) {
        const pct = p.progressPct ?? 0;
        const tasks = `${p.completedTaskCount ?? 0}/${p.taskCount ?? 0} tasks`;
        embed.addFields({
          name: `${p.name} (${p.status})`,
          value: `進度 ${pct}% · ${tasks}`,
          inline: true,
        });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply(`❌ 無法取得專案列表：${err}`);
  }
}
