import { getAppMode, isProduction } from './app-mode';

const INSECURE_FALLBACK_SECRETS = new Set([
  'qc-bot-production-master-secret-key-32-chars-minimum',
  'dev-insecure-secret-key-minimum-32-characters-change-in-prod',
  'dev_razorpay_secret_qc_bot_123',
  'dev_razorpay_webhook_secret_456',
  'rzp_test_qcAssistantDemoKey',
]);

export interface ValidatedConfig {
  appMode: 'PRODUCTION' | 'DEMO' | 'TEST';
  authSecret: string;
  databaseUrl: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
}

let cachedConfig: ValidatedConfig | null = null;

export function getValidatedConfig(): ValidatedConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const appMode = getAppMode();
  const authSecret = process.env.AUTH_SECRET;
  const databaseUrl = process.env.DATABASE_URL;
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
  const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!databaseUrl || (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://'))) {
    throw new Error(
      `[Config Fatal] DATABASE_URL is missing or invalid. Must start with postgresql:// or postgres://`
    );
  }

  if (isProduction()) {
    if (!authSecret || authSecret.length < 32 || INSECURE_FALLBACK_SECRETS.has(authSecret)) {
      throw new Error(
        `[Config Fatal] AUTH_SECRET must be at least 32 characters and cannot use default/fallback values in PRODUCTION mode.`
      );
    }

    if (!razorpayKeyId || INSECURE_FALLBACK_SECRETS.has(razorpayKeyId)) {
      throw new Error(`[Config Fatal] RAZORPAY_KEY_ID is missing or uses insecure default in PRODUCTION mode.`);
    }

    if (!razorpayKeySecret || INSECURE_FALLBACK_SECRETS.has(razorpayKeySecret)) {
      throw new Error(`[Config Fatal] RAZORPAY_KEY_SECRET is missing or uses insecure default in PRODUCTION mode.`);
    }

    if (!razorpayWebhookSecret || INSECURE_FALLBACK_SECRETS.has(razorpayWebhookSecret)) {
      throw new Error(
        `[Config Fatal] RAZORPAY_WEBHOOK_SECRET is missing or uses insecure default in PRODUCTION mode.`
      );
    }
  }

  cachedConfig = {
    appMode,
    authSecret: authSecret || 'test-auth-secret-key-32-chars-minimum-spanqc-secure',
    databaseUrl,
    razorpayKeyId: razorpayKeyId || 'test_key_id',
    razorpayKeySecret: razorpayKeySecret || 'test_key_secret',
    razorpayWebhookSecret: razorpayWebhookSecret || 'test_webhook_secret',
  };

  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}
