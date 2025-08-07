import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Application Configuration
  app: {
    name: process.env.APP_NAME || 'service-acl',
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || '',
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.LOG_PRETTY === 'true',
  },

  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
    apiKeySecret: process.env.API_KEY_SECRET || 'fallback-api-secret',
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Platform Configuration
  platforms: {
    hotmart: {
      apiBaseUrl: process.env.HOTMART_API_BASE_URL || 'https://developers.hotmart.com',
      webhookSecret: process.env.HOTMART_WEBHOOK_SECRET || '',
    },
    nuvemshop: {
      apiBaseUrl: process.env.NUVEMSHOP_API_BASE_URL || 'https://api.tiendanube.com',
      webhookSecret: process.env.NUVEMSHOP_WEBHOOK_SECRET || '',
    },
    woocommerce: {
      apiBaseUrl: process.env.WOOCOMMERCE_API_BASE_URL || '',
      webhookSecret: process.env.WOOCOMMERCE_WEBHOOK_SECRET || '',
    },
  },

  // Webhook Configuration
  webhooks: {
    // General webhook settings
    enabled: process.env.WEBHOOK_ENABLED !== 'false',
    maxBodySize: parseInt(process.env.WEBHOOK_MAX_BODY_SIZE || '1048576', 10), // 1MB
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '30000', 10), // 30 seconds

    // Rate limiting
    rateLimitEnabled: process.env.WEBHOOK_RATE_LIMIT_ENABLED !== 'false',

    // Retry configuration
    retryEnabled: process.env.WEBHOOK_RETRY_ENABLED !== 'false',
    maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3', 10),
    retryBaseDelay: parseInt(process.env.WEBHOOK_RETRY_BASE_DELAY || '1000', 10), // 1 second
    retryMaxDelay: parseInt(process.env.WEBHOOK_RETRY_MAX_DELAY || '300000', 10), // 5 minutes
    retryMultiplier: parseFloat(process.env.WEBHOOK_RETRY_MULTIPLIER || '2'),

    // Event queue configuration
    queue: {
      batchSize: parseInt(process.env.WEBHOOK_QUEUE_BATCH_SIZE || '10', 10),
      processingTimeout: parseInt(process.env.WEBHOOK_PROCESSING_TIMEOUT || '30000', 10),
      cleanupInterval: parseInt(process.env.WEBHOOK_CLEANUP_INTERVAL || '300000', 10), // 5 minutes
    },

    // Conflict resolution
    conflictResolution: {
      strategy: process.env.WEBHOOK_CONFLICT_RESOLUTION || 'TIMESTAMP_WINS',
      // Options: TIMESTAMP_WINS, PLATFORM_PRIORITY, MERGE_FIELDS, MANUAL_REVIEW
    },

    // Platform-specific rate limits
    rateLimits: {
      hotmart: {
        maxRequestsPerMinute: parseInt(process.env.HOTMART_RATE_LIMIT_PER_MINUTE || '100', 10),
        maxRequestsPerHour: parseInt(process.env.HOTMART_RATE_LIMIT_PER_HOUR || '1000', 10),
        burstLimit: parseInt(process.env.HOTMART_BURST_LIMIT || '20', 10),
        retryAfter: parseInt(process.env.HOTMART_RETRY_AFTER || '60000', 10), // 1 minute
      },
      nuvemshop: {
        maxRequestsPerMinute: parseInt(process.env.NUVEMSHOP_RATE_LIMIT_PER_MINUTE || '60', 10),
        maxRequestsPerHour: parseInt(process.env.NUVEMSHOP_RATE_LIMIT_PER_HOUR || '1000', 10),
        burstLimit: parseInt(process.env.NUVEMSHOP_BURST_LIMIT || '15', 10),
        retryAfter: parseInt(process.env.NUVEMSHOP_RETRY_AFTER || '60000', 10), // 1 minute
      },
      woocommerce: {
        maxRequestsPerMinute: parseInt(process.env.WOOCOMMERCE_RATE_LIMIT_PER_MINUTE || '120', 10),
        maxRequestsPerHour: parseInt(process.env.WOOCOMMERCE_RATE_LIMIT_PER_HOUR || '2000', 10),
        burstLimit: parseInt(process.env.WOOCOMMERCE_BURST_LIMIT || '25', 10),
        retryAfter: parseInt(process.env.WOOCOMMERCE_RETRY_AFTER || '30000', 10), // 30 seconds
      },
    },
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Monitoring Configuration
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
  },
};

// Validate required configuration
const requiredEnvVars = ['DATABASE_URL', 'REDIS_URL'];

// Validate webhook secrets if webhooks are enabled
if (process.env.WEBHOOK_ENABLED !== 'false') {
  const webhookSecrets = [
    'HOTMART_WEBHOOK_SECRET',
    'NUVEMSHOP_WEBHOOK_SECRET',
    'WOOCOMMERCE_WEBHOOK_SECRET'
  ];

  const missingSecrets = webhookSecrets.filter(secret => !process.env[secret]);
  if (missingSecrets.length > 0) {
    console.warn(`Warning: Missing webhook secrets: ${missingSecrets.join(', ')}`);
    console.warn('Webhook authentication may fail for platforms with missing secrets');
  }
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Validate Redis URL format
if (config.redis.url && !config.redis.url.startsWith('redis://') && !config.redis.url.startsWith('rediss://')) {
  console.warn('Warning: REDIS_URL should start with redis:// or rediss://');
}

export default config;
