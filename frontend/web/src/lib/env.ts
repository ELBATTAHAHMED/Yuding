/**
 * Yuding V2 - Frontend Environment Configuration
 *
 * Centralizes and validates environment variable access for the Next.js client.
 * Rules:
 * - Only NEXT_PUBLIC_* variables are exposed to the browser.
 * - Never place credentials, secrets, or private keys in NEXT_PUBLIC_* variables.
 * - Development defaults to local Gateway (http://localhost:8888).
 * - Production and Staging default to same-origin "/api" edge routing via reverse proxy.
 * - Production strictly forbids localhost / 127.0.0.1 fallbacks.
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

export function resolveAppEnv(customEnvValue?: string, nodeEnvValue?: string): AppEnvironment {
  const custom = (customEnvValue ?? process.env.NEXT_PUBLIC_APP_ENV)?.toLowerCase();
  if (custom === 'staging') return 'staging';
  if (custom === 'production' || custom === 'prod') return 'production';
  if (custom === 'test') return 'test';
  
  const nodeEnv = (nodeEnvValue ?? process.env.NODE_ENV)?.toLowerCase();
  if (nodeEnv === 'production') return 'production';
  if (nodeEnv === 'test') return 'test';
  
  return 'development';
}

export function resolveApiBaseUrl(appEnv: AppEnvironment, explicitUrlValue?: string): string {
  const rawUrl = (explicitUrlValue ?? process.env.NEXT_PUBLIC_API_BASE_URL)?.trim();

  if (rawUrl) {
    // In production or staging, prevent silent/accidental localhost fallback
    if ((appEnv === 'production' || appEnv === 'staging') &&
        (rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1'))) {
      throw new Error(
        `[Security Violation] Insecure localhost API base URL "${rawUrl}" is forbidden in ${appEnv} environment. Production must use same-origin "/api" or a secure remote origin.`
      );
    }
    return rawUrl.replace(/\/+$/, '');
  }

  // Environment-based defaults:
  // Production and Staging default to same-origin "/api" routed via edge reverse proxy
  if (appEnv === 'production' || appEnv === 'staging') {
    return '/api';
  }

  // Development and Test default to direct local Gateway
  return 'http://localhost:8888';
}

const currentAppEnv = resolveAppEnv();

export const env: FrontendEnv = {
  apiBaseUrl: resolveApiBaseUrl(currentAppEnv),
  appEnv: currentAppEnv,
  isDev: currentAppEnv === 'development',
  isStaging: currentAppEnv === 'staging',
  isProd: currentAppEnv === 'production',
  isTest: currentAppEnv === 'test',
};
