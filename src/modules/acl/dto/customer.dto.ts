/**
 * Customer Data Transfer Objects (DTOs) for API validation
 */

import { z } from 'zod';
import { Platform } from '@/shared/types/platform.types';
import { CustomerStatus, CustomerRole, AddressType, DocumentType } from '@/shared/types/customer.types';

/**
 * Base customer request schema
 */
export const BaseCustomerRequestSchema = z.object({
  platform: z.nativeEnum(Platform),
  storeId: z.string().optional(),
  data: z.record(z.any()), // Platform-specific data
});

/**
 * Customer sync request schema
 */
export const CustomerSyncRequestSchema = BaseCustomerRequestSchema.extend({
  customers: z.array(z.record(z.any())).optional(),
});

/**
 * Update customer request schema
 */
export const UpdateCustomerRequestSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  username: z.string().optional(),
  role: z.nativeEnum(CustomerRole).optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  isPayingCustomer: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  avatarUrl: z.string().url().optional(),
  note: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Customer filter query schema
 */
export const CustomerFilterQuerySchema = z.object({
  platform: z.nativeEnum(Platform).optional(),
  storeId: z.string().optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  role: z.nativeEnum(CustomerRole).optional(),
  email: z.string().optional(),
  isPayingCustomer: z.boolean().optional(),
  search: z.string().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

/**
 * Customer address schema
 */
export const CustomerAddressSchema = z.object({
  type: z.nativeEnum(AddressType),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  address1: z.string(),
  address2: z.string().optional(),
  city: z.string(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string(),
  neighborhood: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

/**
 * Customer document schema
 */
export const CustomerDocumentSchema = z.object({
  type: z.nativeEnum(DocumentType),
  number: z.string(),
  isVerified: z.boolean().optional(),
});

/**
 * Customer phone schema
 */
export const CustomerPhoneSchema = z.object({
  countryCode: z.string().optional(),
  areaCode: z.string().optional(),
  number: z.string(),
  type: z.enum(['mobile', 'landline', 'work']).optional(),
  isPrimary: z.boolean().optional(),
});

/**
 * Customer spending schema
 */
export const CustomerSpendingSchema = z.object({
  totalSpent: z.number(),
  currency: z.string(),
  orderCount: z.number().int(),
  averageOrderValue: z.number(),
  lastOrderDate: z.string().datetime().optional(),
  firstOrderDate: z.string().datetime().optional(),
});

/**
 * Complete customer data schema
 */
export const CustomerDataSchema = z.object({
  platform: z.nativeEnum(Platform),
  externalId: z.string(),
  storeId: z.string().optional(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  username: z.string().optional(),
  role: z.nativeEnum(CustomerRole),
  status: z.nativeEnum(CustomerStatus),
  phones: z.array(CustomerPhoneSchema).optional(),
  documents: z.array(CustomerDocumentSchema).optional(),
  addresses: z.array(CustomerAddressSchema).optional(),
  isPayingCustomer: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  avatarUrl: z.string().url().optional(),
  note: z.string().optional(),
  spending: CustomerSpendingSchema.optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  lastLoginAt: z.string().datetime().optional(),
});

/**
 * Customer response schema
 */
export const CustomerResponseSchema = z.object({
  success: z.boolean(),
  data: CustomerDataSchema.optional(),
  message: z.string().optional(),
  errors: z.array(z.string()).optional(),
});

/**
 * Customer list response schema
 */
export const CustomerListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(CustomerDataSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  message: z.string().optional(),
});

/**
 * Customer sync response schema
 */
export const CustomerSyncResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    total: z.number().int(),
    processed: z.number().int(),
    created: z.number().int(),
    updated: z.number().int(),
    failed: z.number().int(),
    results: z.array(z.object({
      success: z.boolean(),
      customer: CustomerDataSchema.optional(),
      isNew: z.boolean(),
      errors: z.array(z.string()).optional(),
      warnings: z.array(z.string()).optional(),
    })),
  }),
  message: z.string().optional(),
  errors: z.array(z.string()).optional(),
});

/**
 * Customer statistics response schema
 */
export const CustomerStatisticsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    totalCustomers: z.number().int(),
    activeCustomers: z.number().int(),
    payingCustomers: z.number().int(),
    customersByPlatform: z.record(z.number().int()),
    recentCustomers: z.number().int(),
    payingCustomerRate: z.number(),
    timestamp: z.string(),
  }),
  message: z.string().optional(),
});

/**
 * Type exports for use in controllers
 */
export type BaseCustomerRequest = z.infer<typeof BaseCustomerRequestSchema>;
export type CustomerSyncRequest = z.infer<typeof CustomerSyncRequestSchema>;
export type UpdateCustomerRequest = z.infer<typeof UpdateCustomerRequestSchema>;
export type CustomerFilterQuery = z.infer<typeof CustomerFilterQuerySchema>;
export type CustomerResponse = z.infer<typeof CustomerResponseSchema>;
export type CustomerListResponse = z.infer<typeof CustomerListResponseSchema>;
export type CustomerSyncResponse = z.infer<typeof CustomerSyncResponseSchema>;
export type CustomerStatisticsResponse = z.infer<typeof CustomerStatisticsResponseSchema>;

/**
 * Validation helper functions
 */
export const validateCustomerSyncRequest = (data: unknown) => {
  return CustomerSyncRequestSchema.parse(data);
};

export const validateUpdateCustomerRequest = (data: unknown) => {
  return UpdateCustomerRequestSchema.parse(data);
};

export const validateCustomerFilterQuery = (data: unknown) => {
  return CustomerFilterQuerySchema.parse(data);
};

/**
 * Transform functions for API responses
 */
export const transformCustomerToResponse = (customer: any): CustomerResponse => {
  return {
    success: true,
    data: customer,
    message: 'Customer retrieved successfully',
  };
};

export const transformCustomersToListResponse = (
  customers: any[], 
  total: number, 
  limit: number, 
  offset: number
): CustomerListResponse => {
  return {
    success: true,
    data: customers,
    total,
    limit,
    offset,
    message: 'Customers retrieved successfully',
  };
};

export const transformSyncResultToResponse = (result: any): CustomerSyncResponse => {
  return {
    success: result.failed === 0,
    data: result,
    message: `Processed ${result.processed} of ${result.total} customers`,
    errors: result.errors,
  };
};

export const transformStatisticsToResponse = (stats: any): CustomerStatisticsResponse => {
  return {
    success: true,
    data: {
      ...stats,
      timestamp: new Date().toISOString(),
    },
    message: 'Customer statistics retrieved successfully',
  };
};
