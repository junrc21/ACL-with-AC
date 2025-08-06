/**
 * Platform enumeration matching Prisma schema
 */
export enum Platform {
  HOTMART = 'HOTMART',
  NUVEMSHOP = 'NUVEMSHOP',
  WOOCOMMERCE = 'WOOCOMMERCE',
}

/**
 * Platform-specific headers for request identification
 */
export interface PlatformHeaders {
  'x-source-platform': string;
  'x-store-id'?: string;
  'x-webhook-signature'?: string;
  'user-agent'?: string;
}

/**
 * Base interface for all platform data
 */
export interface BasePlatformData {
  platform: Platform;
  externalId: string;
  metadata?: Record<string, any>;
}

/**
 * Platform strategy context
 */
export interface StrategyContext {
  platform: Platform;
  storeId?: string;
  headers: PlatformHeaders;
  timestamp: Date;
}

/**
 * Platform-specific error types
 */
export class PlatformError extends Error {
  constructor(
    public platform: Platform,
    public code: string,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}

/**
 * Data validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Platform capabilities
 */
export interface PlatformCapabilities {
  supportsProducts: boolean;
  supportsCustomers: boolean;
  supportsOrders: boolean;
  supportsPayments: boolean;
  supportsCommissions: boolean;
  supportsCoupons: boolean;
  supportsCategories: boolean;
  supportsWebhooks: boolean;
}

/**
 * Platform capabilities mapping
 */
export const PLATFORM_CAPABILITIES: Record<Platform, PlatformCapabilities> = {
  [Platform.HOTMART]: {
    supportsProducts: true,
    supportsCustomers: true,
    supportsOrders: true,
    supportsPayments: true,
    supportsCommissions: true,
    supportsCoupons: true,
    supportsCategories: false,
    supportsWebhooks: true,
  },
  [Platform.NUVEMSHOP]: {
    supportsProducts: true,
    supportsCustomers: true,
    supportsOrders: true,
    supportsPayments: true,
    supportsCommissions: false,
    supportsCoupons: true,
    supportsCategories: true,
    supportsWebhooks: true,
  },
  [Platform.WOOCOMMERCE]: {
    supportsProducts: true,
    supportsCustomers: true,
    supportsOrders: true,
    supportsPayments: true,
    supportsCommissions: false,
    supportsCoupons: true,
    supportsCategories: true,
    supportsWebhooks: true,
  },
};
