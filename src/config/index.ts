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
    },
    nuvemshop: {
      apiBaseUrl: process.env.NUVEMSHOP_API_BASE_URL || 'https://api.tiendanube.com',
    },
    woocommerce: {
      apiBaseUrl: process.env.WOOCOMMERCE_API_BASE_URL || '',
    },
  },

  // Webhook Configuration
  webhooks: {
    secret: process.env.WEBHOOK_SECRET || 'fallback-webhook-secret',
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
const requiredEnvVars = ['DATABASE_URL'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export default config;
