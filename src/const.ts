import { config } from "dotenv";
import path from "path";

const envPath = process.env.DOTENV_CONFIG_PATH || ".env";
config({ path: path.resolve(process.cwd(), envPath) });

export const appType = process.env.TYPE;
export const redisPrefix = process.env.REDIS_PREFIX || "";
