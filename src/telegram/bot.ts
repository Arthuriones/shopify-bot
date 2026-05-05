import { Bot } from "grammy";
import { handleStart, handleStatus, handleMessage } from "./handlers.js";
import { handleConfigCommand } from "./config-flow.js";
import { getTelegramConfig } from "./config-db.js";
import { logger } from "../utils/logger.js";

export async function createBot(): Promise<Bot | null> {
  const config = await getTelegramConfig();

  if (!config) {
    logger.warn("No Telegram bot configured. Configure via dashboard.");
    return null;
  }

  const bot = new Bot(config.botToken);

  bot.command("start", handleStart);
  bot.command("status", handleStatus);
  bot.command("config", handleConfigCommand);
  bot.on("message:text", handleMessage);

  bot.catch((err) => {
    logger.error("Bot error", {
      error: err.message,
    });
  });

  return bot;
}
