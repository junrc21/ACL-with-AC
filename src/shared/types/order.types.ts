/**
 * Order-related type definitions for the ACL service
 * Supports Hotmart, Nuvemshop, and WooCommerce platforms
 */

import { Platform } from './platform.types';

/**
 * Order status enumeration matching Prisma schema
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/**
 * Payment status enumeration matching Prisma schema
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

/**
 * Payment method enumeration
 */
export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PIX = 'pix',
  BOLETO = 'boleto',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  OTHER = 'other',
}

/**
 * Shipping status enumeration
 */
export enum ShippingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned',
}

/**
 * Fulfillment status enumeration
 */
export enum FulfillmentStatus {
  UNFULFILLED = 'unfulfilled',
  PARTIAL = 'partial',
  FULFILLED = 'fulfilled',
  RESTOCKED = 'restocked',
}

/**
 * Transaction type enumeration
 */
export enum TransactionType {
  SALE = 'sale',
  REFUND = 'refund',
  CHARGEBACK = 'chargeback',
  COMMISSION = 'commission',
  FEE = 'fee',
}

/**
 * Address information for billing/shipping
 */
export interface OrderAddress {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  phone?: string;
  email?: string;
}

/**
 * Order item data structure
 */
export interface OrderItemData {
  // Identification
  externalId?: string;
  productId?: string;
  variantId?: string;
  
  // Item details
  name: string;
  sku?: string;
  quantity: number;
  
  // Pricing
  unitPrice: number;
  totalPrice: number;
  taxAmount?: number;
  discountAmount?: number;
  
  // Product information
  productType?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  
  // Platform-specific metadata
  metadata?: Record<string, any>;
}

/**
 * Payment data structure
 */
export interface PaymentData {
  // Identification
  externalId?: string;
  transactionId?: string;
  
  // Payment details
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  
  // Processing information
  processedAt?: Date;
  gateway?: string;
  gatewayTransactionId?: string;
  
  // Additional details
  installments?: number;
  fees?: number;
  netAmount?: number;
  
  // Platform-specific metadata
  metadata?: Record<string, any>;
}

/**
 * Refund data structure
 */
export interface RefundData {
  // Identification
  externalId?: string;
  paymentId?: string;
  
  // Refund details
  amount: number;
  currency: string;
  reason?: string;
  
  // Processing information
  processedAt?: Date;
  status: string;
  
  // Platform-specific metadata
  metadata?: Record<string, any>;
}

/**
 * Commission data structure (primarily for Hotmart)
 */
export interface CommissionData {
  // Identification
  externalId?: string;
  userId?: string;
  
  // Commission details
  type: string; // 'producer', 'affiliate', 'co_producer'
  percentage: number;
  amount: number;
  currency: string;
  
  // Processing information
  status: string;
  processedAt?: Date;
  
  // Platform-specific metadata
  metadata?: Record<string, any>;
}

/**
 * Order note data structure
 */
export interface OrderNoteData {
  // Identification
  externalId?: string;
  
  // Note details
  content: string;
  isCustomerNote: boolean;
  author?: string;
  
  // Timestamps
  createdAt?: Date;
  
  // Platform-specific metadata
  metadata?: Record<string, any>;
}

/**
 * Unified order data structure
 */
export interface OrderData {
  // Core identification
  platform: Platform;
  externalId: string;
  storeId?: string;
  customerId?: string;
  
  // Order identification
  orderNumber?: string;
  token?: string;
  
  // Order status
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingStatus?: ShippingStatus;
  fulfillmentStatus?: FulfillmentStatus;
  
  // Timestamps
  orderDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
  processedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  
  // Financial information
  subtotal: number;
  taxAmount?: number;
  shippingAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  currency: string;
  
  // Customer information
  customerEmail?: string;
  customerPhone?: string;
  
  // Addresses
  billingAddress?: OrderAddress;
  shippingAddress?: OrderAddress;
  
  // Order items
  items: OrderItemData[];
  
  // Payments and refunds
  payments?: PaymentData[];
  refunds?: RefundData[];
  
  // Additional data
  notes?: OrderNoteData[];
  commissions?: CommissionData[];
  
  // Shipping information
  shippingMethod?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  
  // Platform-specific metadata
  metadata?: Record<string, any>;
}

/**
 * Order processing result
 */
export interface OrderProcessingResult {
  success: boolean;
  order?: OrderData;
  externalId: string;
  platform: Platform;
  isNew?: boolean;
  errors?: string[];
  warnings?: string[];
  processingTime?: number;
}

/**
 * Order synchronization result
 */
export interface OrderSyncResult {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  errors: number;
  warnings: string[];
  details: OrderProcessingResult[];
  duration: number;
}

/**
 * Order filter options for queries
 */
export interface OrderFilterOptions {
  platform?: Platform;
  storeId?: string;
  customerId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  shippingStatus?: ShippingStatus;
  fulfillmentStatus?: FulfillmentStatus;
  
  // Date filters
  orderDateFrom?: Date;
  orderDateTo?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
  
  // Financial filters
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  
  // Search and pagination
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Order statistics data
 */
export interface OrderStatistics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  currency: string;
  
  // Status breakdown
  statusBreakdown: Record<OrderStatus, number>;
  paymentStatusBreakdown: Record<PaymentStatus, number>;
  
  // Time-based metrics
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  
  // Revenue metrics
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
}
