import { Platform } from './platform.types';

/**
 * Category status enumeration
 */
export enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

/**
 * Category display type enumeration (WooCommerce specific)
 */
export enum CategoryDisplayType {
  DEFAULT = 'default',
  PRODUCTS = 'products',
  SUBCATEGORIES = 'subcategories',
  BOTH = 'both',
}

/**
 * Unified category data structure
 */
export interface CategoryData {
  // Core identification
  platform: Platform;
  externalId: string;
  storeId?: string;

  // Basic category information
  name: string;
  description?: string;
  slug: string;
  parentId?: string;

  // Hierarchy and ordering
  level?: number;
  menuOrder?: number;
  productCount?: number;

  // SEO and metadata
  seoTitle?: string;
  seoDescription?: string;
  
  // Display settings
  displayType?: CategoryDisplayType;
  status?: CategoryStatus;

  // Image and media
  image?: CategoryImageData;
  
  // Platform-specific metadata
  metadata?: Record<string, any>;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Category image data
 */
export interface CategoryImageData {
  id?: string | number;
  src: string;
  alt?: string;
  thumbnail?: string;
  srcset?: string;
  sizes?: string;
  name?: string;
}

/**
 * Category hierarchy data for tree structures
 */
export interface CategoryHierarchy {
  category: CategoryData;
  children: CategoryHierarchy[];
  parent?: CategoryData;
}

/**
 * Category statistics data
 */
export interface CategoryStatistics {
  totalCategories: number;
  activeCategories: number;
  categoriesWithProducts: number;
  averageProductsPerCategory: number;
  topCategories: Array<{
    category: CategoryData;
    productCount: number;
  }>;
}

// Platform-specific category data structures

/**
 * Hotmart category data (virtual categories derived from product metadata)
 */
export interface HotmartCategoryData {
  // Hotmart doesn't have traditional categories
  // We create virtual categories based on:
  type: 'producer' | 'product_type' | 'tag' | 'custom';
  value: string;
  label: string;
  productCount?: number;
  metadata?: {
    producerId?: string;
    producerName?: string;
    productType?: string;
    tags?: string[];
  };
}

/**
 * Nuvemshop category data
 */
export interface NuvemshopCategoryData {
  id: number;
  name: Record<string, string>; // Multi-language object
  description?: Record<string, string>;
  handle: string;
  parent?: number;
  subcategories?: number[];
  google_shopping_category?: string;
  created_at: string;
  updated_at: string;
  seo_title?: Record<string, string>;
  seo_description?: Record<string, string>;
  image?: {
    id: number;
    src: string;
    alt?: string;
  };
  // Custom fields support
  custom_fields?: Array<{
    name: string;
    value: string;
    type: string;
  }>;
}

/**
 * WooCommerce category data
 */
export interface WooCommerceCategoryData {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: CategoryDisplayType;
  image?: {
    id: number;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    src: string;
    name: string;
    alt: string;
  };
  menu_order: number;
  count: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  // Custom attributes and metadata
  meta_data?: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

/**
 * Category creation request data
 */
export interface CreateCategoryRequest {
  platform: Platform;
  storeId?: string;
  data: HotmartCategoryData | NuvemshopCategoryData | WooCommerceCategoryData;
}

/**
 * Category update request data
 */
export interface UpdateCategoryRequest {
  id: string;
  platform: Platform;
  storeId?: string;
  data: Partial<HotmartCategoryData | NuvemshopCategoryData | WooCommerceCategoryData>;
}

/**
 * Category sync request data
 */
export interface SyncCategoryRequest {
  platform: Platform;
  storeId?: string;
  categories: Array<HotmartCategoryData | NuvemshopCategoryData | WooCommerceCategoryData>;
}

/**
 * Category query parameters
 */
export interface CategoryQueryParams {
  platform?: Platform;
  storeId?: string;
  parentId?: string;
  status?: CategoryStatus;
  search?: string;
  includeEmpty?: boolean;
  includeHierarchy?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'productCount' | 'menuOrder';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Category response with pagination
 */
export interface CategoryResponse {
  categories: CategoryData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  hierarchy?: CategoryHierarchy[];
}
