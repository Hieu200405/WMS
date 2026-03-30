import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : process.env.ENV_FILE ?? '.env';
dotenv.config({
  path: path.resolve(process.cwd(), envFile)
});

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: toNumber(process.env.PORT, 4000),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/wms',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES ?? '1h',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-secret-refresh',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads'),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 5000),
  saltRounds: toNumber(process.env.BCRYPT_ROUNDS, 10),
  highValueDisposalThreshold: toNumber(process.env.DISPOSAL_BOARD_THRESHOLD, 50_000),
  defaultPage: toNumber(process.env.DEFAULT_PAGE, 1),
  defaultLimit: toNumber(process.env.DEFAULT_LIMIT, 20)
};

export type EnvConfig = typeof env;
