import { getWebhookUrl } from '../routes/discord-webhooks.js';

// Throttle: max 3 notifications per project per 5 minutes
const throttleMap = new Map<string, number[]>();
const THROTTLE_WINDOW_MS = 5 * 60 * 1000;
const THROTTLE_MAX = 3;

function isThrottled(project: string): boolean {
  const now = Date.now();
  const timestamps = throttleMap.get(project) || [];
  const recent = timestamps.filter((t) => now - t < THROTTLE_WINDOW_MS);
  throttleMap.set(project, recent);
  if (recent.length >= THROTTLE_MAX) return true;
  recent.push(now);
  return false;
}

interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
  footer?: { text: string };
}

type NotifyEvent = 'task_completed' | 'progress_updated' | 'night_shift_report';

const EVENT_COLORS: Record<NotifyEvent, number> = {
  task_completed: 0x2ecc71,    // green
  progress_updated: 0x3498db,  // blue
  night_shift_report: 0x9b59b6, // purple
};

export async function discordNotify(
  project: string,
  event: NotifyEvent,
  data: {
    title?: string;
    summary?: string;
    fields?: { name: string; value: string; inline?: boolean }[];
  },
): Promise<void> {
  const webhookUrl = getWebhookUrl(project);
  if (!webhookUrl) return;
  if (isThrottled(project)) return;

  const embed: DiscordEmbed = {
    title: data.title || event,
    description: data.summary,
    color: EVENT_COLORS[event],
    fields: data.fields,
    timestamp: new Date().toISOString(),
    footer: { text: `CC · ${project}` },
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'CC Notify',
        embeds: [embed],
      }),
    });
    if (!res.ok) {
      console.warn(`[Discord] Webhook failed for ${project}: ${res.status}`);
    }
  } catch (err) {
    console.warn(`[Discord] Webhook error for ${project}:`, err);
  }
}
