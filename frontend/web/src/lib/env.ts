/**
 * Yuding V2 - Frontend Environment Configuration
 *
 * Centralizes and validates environment variable access for the Next.js client.
 * Rules:
 * - Only NEXT_PUBLIC_* variables are exposed to the browser.
 * - Never place credentials, secrets, or private keys in NEXT_PUBLIC_* variables.
 * - Defaults point safely to local Gateway (http://localhost:8888).
 */

export type AppEnvironment = 'development' | 'staging' | 'production' | 'test';

export interface FrontendEnv {
  apiBaseUrl: string;
  appEnv: AppEnvironment;
  isDev: boolean;
  isStaging: boolean;
  isProd: boolean;
  isTest: boolean;
}

function resolveAppEnv(): AppEnvironment {
  const customEnv = process.env.NEXT_PUBLIC_APP_ENV?.toLowerCase();
  if (customEnv === 'staging') return 'staging';
  if (customEnv === 'production' || customEnv === 'prod') return 'production';
  if (customEnv === 'test') return 'test';
  if (process.env.NODE_ENV === 'production') return 'production';
  if (process.env.NODE_ENV === 'test') return 'test';
  return 'development';
}

function resolveApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888';
  return url.replace(/\/+$/, '');
}

const currentAppEnv = resolveAppEnv();

export const env: FrontendEnv = {
  apiBaseUrl: resolveApiBaseUrl(),
  appEnv: currentAppEnv,
  isDev: currentAppEnv === 'development',
  isStaging: currentAppEnv === 'staging',
  isProd: currentAppEnv === 'production',
  isTest: currentAppEnv === 'test',
};
