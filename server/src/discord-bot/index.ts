import { Client, Collection, GatewayIntentBits, REST, Routes } from 'discord.js';
import type { ChatInputCommandInteraction, Message } from 'discord.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import * as progressCmd from './commands/progress.js';
import * as overviewCmd from './commands/overview.js';
import { doneData, doneExecute, proposeData, proposeExecute, applyData, applyExecute } from './commands/forward.js';
import { sendToClaude, getProjectDir, splitMessage } from './claude-bridge.js';

// Read token: env var > cc-connect config
function resolveToken(): string {
  if (process.env.DISCORD_SLASH_BOT_TOKEN) return process.env.DISCORD_SLASH_BOT_TOKEN;

  // Try to read from cc-connect config.toml
  const configPath = resolve(process.env.HOME || '', '.cc-connect/config.toml');
  try {
    const content = readFileSync(configPath, 'utf-8');
    const match = content.match(/token\s*=\s*"([^"]+)"/);
    if (match) return match[1];
  } catch { /* ignore */ }

  console.error('[SlashBot] No token found. Set DISCORD_SLASH_BOT_TOKEN or configure cc-connect.');
  process.exit(1);
}

function resolveGuildId(): string {
  if (process.env.DISCORD_GUILD_ID) return process.env.DISCORD_GUILD_ID;

  const configPath = resolve(process.env.HOME || '', '.cc-connect/config.toml');
  try {
    const content = readFileSync(configPath, 'utf-8');
    const match = content.match(/guild_id\s*=\s*"([^"]+)"/);
    if (match) return match[1];
  } catch { /* ignore */ }

  return '1482462370533212305';
}

const TOKEN = resolveToken();
const GUILD_ID = resolveGuildId();

// Command registry
const commands = new Collection<string, { data: any; execute: (i: ChatInputCommandInteraction) => Promise<void> }>();
commands.set('progress', { data: progressCmd.data, execute: progressCmd.execute });
commands.set('overview', { data: overviewCmd.data, execute: overviewCmd.execute });
commands.set('done', { data: doneData, execute: doneExecute });
commands.set('propose', { data: proposeData, execute: proposeExecute });
commands.set('apply', { data: applyData, execute: applyExecute });

// Register slash commands with Discord API
async function registerCommands() {
  const rest = new REST().setToken(TOKEN!);
  const commandData = [...commands.values()].map((c) => c.data.toJSON());

  try {
    console.log(`[SlashBot] Registering ${commandData.length} commands...`);
    await rest.put(Routes.applicationGuildCommands(await getAppId(rest), GUILD_ID), {
      body: commandData,
    });
    console.log('[SlashBot] Commands registered');
  } catch (err) {
    console.error('[SlashBot] Failed to register commands:', err);
  }
}

async function getAppId(rest: REST): Promise<string> {
  const app = (await rest.get(Routes.currentApplication())) as { id: string };
  return app.id;
}

// Create client with message intents for full bridge
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('clientReady', () => {
  console.log(`[Bridge] Logged in as ${client.user?.tag}`);
  console.log(`[Bridge] Listening for messages + slash commands`);
});

// Message bridge: route Discord messages to claude -p
client.on('messageCreate', async (message: Message) => {
  // Ignore bot messages (including our own)
  if (message.author.bot) return;

  // Only handle messages in mapped channels
  const projectDir = getProjectDir(message.channelId);
  if (!projectDir) return;

  // Ignore empty messages
  if (!message.content.trim()) return;

  // Show typing indicator
  try {
    if ('sendTyping' in message.channel) {
      await message.channel.sendTyping();
    }
  } catch { /* ignore */ }

  try {
    console.log(`[Bridge] Message in #${message.channelId}: ${message.content.slice(0, 80)}`);
    const response = await sendToClaude(message.channelId, message.content);

    if (!response) {
      await message.reply('(無回覆)');
      return;
    }

    // Split long responses
    const chunks = splitMessage(response);
    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) {
        await message.reply(chunks[i]);
      } else {
        if ('send' in message.channel) {
          await message.channel.send(chunks[i]);
        }
      }
    }
  } catch (err: any) {
    console.error(`[Bridge] Error processing message:`, err);
    try {
      await message.reply(`❌ 處理失敗：${(err?.message || String(err)).slice(0, 200)}`);
    } catch { /* ignore reply error */ }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = commands.get(interaction.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(`[SlashBot] Error in /${interaction.commandName}:`, err);
    const reply = { content: `❌ 指令執行失敗：${err}`, ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Start
async function start() {
  await registerCommands();
  await client.login(TOKEN);
}

start().catch((err) => {
  console.error('[SlashBot] Fatal error:', err);
  process.exit(1);
});
