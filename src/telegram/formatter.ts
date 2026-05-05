import type { Context } from "grammy";

const MAX_LENGTH = 4096;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function splitMessage(text: string): string[] {
  if (text.length <= MAX_LENGTH) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_LENGTH) {
      chunks.push(remaining);
      break;
    }

    // Try to split at newline
    let splitAt = remaining.lastIndexOf("\n", MAX_LENGTH);
    if (splitAt === -1 || splitAt < MAX_LENGTH / 2) {
      splitAt = MAX_LENGTH;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }

  return chunks;
}

export async function sendFormatted(
  ctx: Context,
  text: string
): Promise<void> {
  const chunks = splitMessage(text);

  for (const chunk of chunks) {
    await ctx.reply(chunk, { parse_mode: "HTML" }).catch(async () => {
      // Fallback: send without HTML if parsing fails
      await ctx.reply(chunk.replace(/<[^>]*>/g, ""));
    });
  }
}
