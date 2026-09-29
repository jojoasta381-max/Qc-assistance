export type AppMode = 'PRODUCTION' | 'DEMO' | 'TEST';

/**
 * Returns the active runtime application mode.
 * Defaults to 'PRODUCTION' unless explicitly overridden.
 */
export function getAppMode(): AppMode {
  const envMode = process.env.APP_MODE?.toUpperCase();
  if (envMode === 'PRODUCTION' || envMode === 'DEMO' || envMode === 'TEST') {
    return envMode;
  }
  if (process.env.NODE_ENV === 'test') {
    return 'TEST';
  }
  // Default to PRODUCTION for security and truthfulness
  return 'PRODUCTION';
}

export function isProduction(): boolean {
  return getAppMode() === 'PRODUCTION';
}

export function isDemo(): boolean {
  return getAppMode() === 'DEMO';
}

export function isTest(): boolean {
  return getAppMode() === 'TEST';
}
