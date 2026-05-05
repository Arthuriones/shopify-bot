import { config } from "dotenv";
config();

import { healthCheck } from "./db/client.js";
import { createBot } from "./telegram/bot.js";
import { getTelegramConfig } from "./telegram/config-db.js";
import { logger } from "./utils/logger.js";

async function bootstrap() {
  logger.info("Starting Shopify Bot...");

  // 1. Check database
  const dbOk = await healthCheck();
  if (!dbOk) {
    logger.error("Database not reachable. Exiting.");
    process.exit(1);
  }
  logger.info("Database connected.");

  // 2. Check if Telegram is configured
  const telegramConfig = await getTelegramConfig();
  if (!telegramConfig) {
    logger.warn(
      "No Telegram bot configured yet. Configure via dashboard at /settings, then restart."
    );
    logger.info("Polling for config every 10s...");

    const poll = setInterval(async () => {
      const cfg = await getTelegramConfig();
      if (cfg) {
        clearInterval(poll);
        logger.info("Telegram config detected! Starting bot...");
        await startBot();
      }
    }, 10_000);

    setupShutdown(null);
    return;
  }

  await startBot();
}

async function startBot() {
  const bot = await createBot();
  if (!bot) {
    logger.error("Failed to create bot.");
    return;
  }

  bot.start({
    onStart: () => { logger.info("Telegram bot started (long polling)."); },
  });

  setupShutdown(bot);
}

function setupShutdown(bot: Awaited<ReturnType<typeof createBot>>) {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down...`);
    if (bot) await bot.stop();
    logger.info("Shutdown complete.");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.error("Bootstrap failed", { error: err });
  process.exit(1);
});
