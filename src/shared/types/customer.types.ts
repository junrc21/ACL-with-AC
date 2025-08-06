/**
 * Customer-related type definitions for the ACL service
 * Supports Hotmart, Nuvemshop, and WooCommerce platforms
 */

import { Platform } from './platform.types';

/**
 * Customer status enumeration
 */
export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

/**
 * Address type enumeration
 */
export enum AddressType {
  BILLING = 'billing',
  SHIPPING = 'shipping',
  BOTH = 'both',
}

/**
 * Customer role enumeration
 */
export enum CustomerRole {
  CUSTOMER = 'customer',
  BUYER = 'buyer',
  PRODUCER = 'producer',
  AFFILIATE = 'affiliate',
  CO_PRODUCER = 'co_producer',
  SUBSCRIBER = 'subscriber',
  ADMINISTRATOR = 'administrator',
}

/**
 * Document type enumeration
 */
export enum DocumentType {
  CPF = 'cpf',
  CNPJ = 'cnpj',
  PASSPORT = 'passport',
  ID_CARD = 'id_card',
  TAX_ID = 'tax_id',
}

/**
 * Address information
 */
export interface CustomerAddressData {
  type: AddressType;
  firstName?: string;
  lastName?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  neighborhood?: string;
  number?: string;
  complement?: string;
  phone?: string;
  email?: string;
}

/**
 * Document information
 */
export interface CustomerDocumentData {
  type: DocumentType;
  number: string;
  isVerified?: boolean;
}

/**
 * Phone information
 */
export interface CustomerPhoneData {
  countryCode?: string;
  areaCode?: string;
  number: string;
  type?: 'mobile' | 'landline' | 'work';
  isPrimary?: boolean;
}

/**
 * Customer spending information
 */
export interface CustomerSpendingData {
  totalSpent: number;
  currency: string;
  orderCount: number;
  averageOrderValue: number;
  lastOrderDate?: Date;
  firstOrderDate?: Date;
}

/**
 * Unified customer data interface
 */
export interface CustomerData {
  // Core identification
  platform: Platform;
  externalId: string;
  storeId?: string;

  // Basic customer information
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  username?: string;
  role: CustomerRole;
  status: CustomerStatus;

  // Contact information
  phones?: CustomerPhoneData[];
  documents?: CustomerDocumentData[];

  // Address information
  addresses?: CustomerAddressData[];

  // Account information
  isPayingCustomer?: boolean;
  isVerified?: boolean;
  avatarUrl?: string;
  note?: string;

  // Spending and analytics
  spending?: CustomerSpendingData;

  // Platform-specific metadata
  metadata?: Record<string, any>;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
}

/**
 * Customer processing result
 */
export interface CustomerProcessingResult {
  success: boolean;
  customer?: CustomerData;
  isNew: boolean;
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, any>;
}

/**
 * Customer sync result for batch operations
 */
export interface CustomerSyncResult {
  total: number;
  processed: number;
  created: number;
  updated: number;
  failed: number;
  results: CustomerProcessingResult[];
  errors: string[];
}

/**
 * Platform-specific customer data interfaces
 */

/**
 * Hotmart user data (from sales_users endpoint)
 */
export interface HotmartUserData {
  name: string;
  ucode: string;
  email: string;
  documents?: {
    cpf?: string;
    cnpj?: string;
    passport?: string;
  };
  address?: {
    zipcode?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    neighborhood?: string;
    number?: string;
    complement?: string;
  };
  phone?: {
    country_code?: string;
    area_code?: string;
    number?: string;
  };
}

/**
 * Nuvemshop customer data
 */
export interface NuvemshopCustomerData {
  id: number;
  email: string;
  identification?: string;
  name?: string;
  phone?: string;
  note?: string;
  total_spent?: string;
  total_spent_currency?: string;
  last_order_id?: number;
  active?: boolean;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
  default_address?: any;
  addresses?: any[];
  custom_fields?: Record<string, any>;
}

/**
 * WooCommerce customer data
 */
export interface WooCommerceCustomerData {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  role?: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    email?: string;
    phone?: string;
  };
  shipping?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  is_paying_customer?: boolean;
  avatar_url?: string;
  date_created?: string;
  date_created_gmt?: string;
  date_modified?: string;
  date_modified_gmt?: string;
  meta_data?: any[];
}

/**
 * Customer filter options for queries
 */
export interface CustomerFilterOptions {
  platform?: Platform;
  storeId?: string;
  status?: CustomerStatus;
  role?: CustomerRole;
  email?: string;
  isPayingCustomer?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}
