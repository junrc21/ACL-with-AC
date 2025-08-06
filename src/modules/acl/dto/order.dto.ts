/**
 * Order DTOs for API request/response validation
 */

import { z } from 'zod';
import { Platform } from '@/shared/types/platform.types';
import { 
  OrderStatus, 
  PaymentStatus, 
  PaymentMethod,
  ShippingStatus,
  FulfillmentStatus 
} from '@/shared/types/order.types';

/**
 * Order address validation schema
 */
export const OrderAddressSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  address1: z.string().min(1, 'Address line 1 is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(2, 'Country is required'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

/**
 * Order item validation schema
 */
export const OrderItemSchema = z.object({
  externalId: z.string().optional(),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  name: z.string().min(1, 'Item name is required'),
  sku: z.string().optional(),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  totalPrice: z.number().nonnegative('Total price must be non-negative'),
  taxAmount: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
  productType: z.string().optional(),
  weight: z.number().nonnegative().optional(),
  dimensions: z.object({
    length: z.number().nonnegative().optional(),
    width: z.number().nonnegative().optional(),
    height: z.number().nonnegative().optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Payment validation schema
 */
export const PaymentSchema = z.object({
  externalId: z.string().optional(),
  transactionId: z.string().optional(),
  method: z.nativeEnum(PaymentMethod),
  status: z.nativeEnum(PaymentStatus),
  amount: z.number().positive('Payment amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  processedAt: z.coerce.date().optional(),
  gateway: z.string().optional(),
  gatewayTransactionId: z.string().optional(),
  installments: z.number().int().positive().optional(),
  fees: z.number().nonnegative().optional(),
  netAmount: z.number().nonnegative().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Refund validation schema
 */
export const RefundSchema = z.object({
  externalId: z.string().optional(),
  paymentId: z.string().optional(),
  amount: z.number().positive('Refund amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  reason: z.string().optional(),
  processedAt: z.coerce.date().optional(),
  status: z.string().min(1, 'Refund status is required'),
  metadata: z.record(z.any()).optional(),
});

/**
 * Commission validation schema
 */
export const CommissionSchema = z.object({
  externalId: z.string().optional(),
  userId: z.string().optional(),
  type: z.string().min(1, 'Commission type is required'),
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  amount: z.number().nonnegative('Commission amount must be non-negative'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  status: z.string().min(1, 'Commission status is required'),
  processedAt: z.coerce.date().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Order note validation schema
 */
export const OrderNoteSchema = z.object({
  externalId: z.string().optional(),
  content: z.string().min(1, 'Note content is required'),
  isCustomerNote: z.boolean().default(false),
  author: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Main order validation schema
 */
export const OrderSchema = z.object({
  platform: z.nativeEnum(Platform),
  externalId: z.string().min(1, 'External ID is required'),
  storeId: z.string().optional(),
  customerId: z.string().optional(),
  orderNumber: z.string().optional(),
  token: z.string().optional(),
  status: z.nativeEnum(OrderStatus),
  paymentStatus: z.nativeEnum(PaymentStatus),
  shippingStatus: z.nativeEnum(ShippingStatus).optional(),
  fulfillmentStatus: z.nativeEnum(FulfillmentStatus).optional(),
  orderDate: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  processedAt: z.coerce.date().optional(),
  shippedAt: z.coerce.date().optional(),
  deliveredAt: z.coerce.date().optional(),
  subtotal: z.number().nonnegative('Subtotal must be non-negative'),
  taxAmount: z.number().nonnegative().optional(),
  shippingAmount: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().nonnegative('Total amount must be non-negative'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  billingAddress: OrderAddressSchema.optional(),
  shippingAddress: OrderAddressSchema.optional(),
  items: z.array(OrderItemSchema).min(1, 'Order must have at least one item'),
  payments: z.array(PaymentSchema).optional(),
  refunds: z.array(RefundSchema).optional(),
  notes: z.array(OrderNoteSchema).optional(),
  commissions: z.array(CommissionSchema).optional(),
  shippingMethod: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Order query parameters validation schema
 */
export const OrderQuerySchema = z.object({
  platform: z.nativeEnum(Platform).optional(),
  storeId: z.string().optional(),
  customerId: z.string().optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  shippingStatus: z.nativeEnum(ShippingStatus).optional(),
  fulfillmentStatus: z.nativeEnum(FulfillmentStatus).optional(),
  orderDateFrom: z.coerce.date().optional(),
  orderDateTo: z.coerce.date().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  sortBy: z.enum(['orderDate', 'totalAmount', 'status', 'createdAt', 'updatedAt']).default('orderDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Order sync request validation schema
 */
export const OrderSyncSchema = z.object({
  platform: z.nativeEnum(Platform),
  storeId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  forceUpdate: z.boolean().default(false),
});

/**
 * Order update validation schema
 */
export const OrderUpdateSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  shippingStatus: z.nativeEnum(ShippingStatus).optional(),
  fulfillmentStatus: z.nativeEnum(FulfillmentStatus).optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  shippingMethod: z.string().optional(),
  notes: z.array(OrderNoteSchema).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Order statistics query validation schema
 */
export const OrderStatsQuerySchema = z.object({
  platform: z.nativeEnum(Platform).optional(),
  storeId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  currency: z.string().length(3).optional(),
  groupBy: z.enum(['day', 'week', 'month', 'year']).default('day'),
});

// Export types for use in controllers
export type OrderDto = z.infer<typeof OrderSchema>;
export type OrderQueryDto = z.infer<typeof OrderQuerySchema>;
export type OrderSyncDto = z.infer<typeof OrderSyncSchema>;
export type OrderUpdateDto = z.infer<typeof OrderUpdateSchema>;
export type OrderStatsQueryDto = z.infer<typeof OrderStatsQuerySchema>;
export type OrderAddressDto = z.infer<typeof OrderAddressSchema>;
export type OrderItemDto = z.infer<typeof OrderItemSchema>;
export type PaymentDto = z.infer<typeof PaymentSchema>;
export type RefundDto = z.infer<typeof RefundSchema>;
export type CommissionDto = z.infer<typeof CommissionSchema>;
export type OrderNoteDto = z.infer<typeof OrderNoteSchema>;
