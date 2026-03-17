import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { sendToClaude, getProjectDir, splitMessage } from '../claude-bridge.js';
import { getProjectFromChannel } from '../utils.js';

// /done — execute via claude -p bridge
export const doneData = new SlashCommandBuilder()
  .setName('done')
  .setDescription('回報工作完成')
  .addStringOption((opt) =>
    opt.setName('summary').setDescription('完成摘要').setRequired(false),
  );

export async function doneExecute(interaction: ChatInputCommandInteraction) {
  const summary = interaction.options.getString('summary') || '';
  await executeViaBridge(interaction, `/done ${summary}`.trim());
}

// /propose — execute via claude -p bridge
export const proposeData = new SlashCommandBuilder()
  .setName('propose')
  .setDescription('提出新的變更提案')
  .addStringOption((opt) =>
    opt.setName('name').setDescription('變更名稱 (kebab-case)').setRequired(true),
  )
  .addStringOption((opt) =>
    opt.setName('description').setDescription('變更描述').setRequired(false),
  );

export async function proposeExecute(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);
  const desc = interaction.options.getString('description') || '';
  await executeViaBridge(interaction, `/opsx:propose ${name} ${desc}`.trim());
}

// /apply — execute via claude -p bridge
export const applyData = new SlashCommandBuilder()
  .setName('apply')
  .setDescription('開始實作變更')
  .addStringOption((opt) =>
    opt.setName('change').setDescription('變更名稱').setRequired(true),
  );

export async function applyExecute(interaction: ChatInputCommandInteraction) {
  const change = interaction.options.getString('change', true);
  await executeViaBridge(interaction, `/opsx:apply ${change}`);
}

/** Execute a command via claude -p bridge */
async function executeViaBridge(interaction: ChatInputCommandInteraction, command: string) {
  const project = getProjectFromChannel(interaction.channelId);
  if (!project) {
    await interaction.reply({ content: '❌ 無法判斷專案', ephemeral: true });
    return;
  }

  const projectDir = getProjectDir(interaction.channelId);
  if (!projectDir) {
    await interaction.reply({ content: '❌ 無法找到專案目錄', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  try {
    const response = await sendToClaude(interaction.channelId, command);

    if (!response) {
      await interaction.editReply('(無回覆)');
      return;
    }

    // Split long responses
    const chunks = splitMessage(response);
    await interaction.editReply(chunks[0]);

    // Send remaining chunks as follow-ups
    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp(chunks[i]);
    }
  } catch (err: any) {
    console.error(`[Bridge] Error executing ${command}:`, err);
    const msg = (err?.message || String(err)).slice(0, 200);
    await interaction.editReply(`❌ 執行失敗：${msg}`);
  }
}
