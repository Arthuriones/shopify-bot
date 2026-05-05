import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z
    .enum(["development", "production"])
    .default("development"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
