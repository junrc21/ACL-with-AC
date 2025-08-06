import { Platform } from './platform.types';

/**
 * Product type enumeration matching Prisma schema
 */
export enum ProductType {
  SIMPLE = 'SIMPLE',
  VARIABLE = 'VARIABLE',
  GROUPED = 'GROUPED',
  EXTERNAL = 'EXTERNAL',
  DIGITAL = 'DIGITAL',
  PHYSICAL = 'PHYSICAL',
  SERVICE = 'SERVICE',
}

/**
 * Product status enumeration
 */
export enum ProductStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

/**
 * Stock status enumeration
 */
export enum StockStatus {
  IN_STOCK = 'instock',
  OUT_OF_STOCK = 'outofstock',
  ON_BACKORDER = 'onbackorder',
}

/**
 * Unified product data structure
 */
export interface ProductData {
  // Core identification
  platform: Platform;
  externalId: string;
  storeId?: string;

  // Basic product information
  name: string;
  description?: string;
  shortDescription?: string;
  slug?: string;
  sku?: string;
  type: ProductType;
  status: ProductStatus;

  // Pricing information
  regularPrice?: number;
  salePrice?: number;
  currency?: string;

  // Inventory management
  manageStock?: boolean;
  stockQuantity?: number;
  stockStatus?: StockStatus;

  // Physical properties
  weight?: number;
  length?: number;
  width?: number;
  height?: number;

  // SEO and visibility
  featured?: boolean;
  catalogVisibility?: string;
  seoTitle?: string;
  seoDescription?: string;

  // Sales metrics
  totalSales?: number;

  // Categories and images
  categories?: ProductCategoryData[];
  images?: ProductImageData[];
  variants?: ProductVariantData[];

  // Advanced features
  attributes?: ProductAttributeData[];
  reviews?: ProductReviewData[];
  customFields?: ProductCustomFieldData[];
  tags?: string[];
  averageRating?: number;
  reviewCount?: number;

  // Platform-specific metadata
  metadata?: Record<string, any>;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Product category data
 */
export interface ProductCategoryData {
  externalId: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
}

/**
 * Product image data
 */
export interface ProductImageData {
  id?: string | number;
  src: string;
  alt?: string;
  position?: number;
  name?: string;
  caption?: string;
  srcset?: string;
  sizes?: string;
}

/**
 * Product attribute data
 */
export interface ProductAttributeData {
  id?: string | number;
  name: string;
  slug?: string;
  position?: number;
  visible?: boolean;
  variation?: boolean;
  options: string[];
}

/**
 * Product review data
 */
export interface ProductReviewData {
  id?: string | number;
  reviewer: string;
  reviewerEmail?: string;
  rating: number;
  review: string;
  status?: 'approved' | 'pending' | 'spam' | 'trash';
  verified?: boolean;
  dateCreated?: Date;
  reviewerAvatarUrls?: Record<string, string>;
}

/**
 * Product custom field data
 */
export interface ProductCustomFieldData {
  name: string;
  value: any;
  type?: string;
}

/**
 * Product variant data
 */
export interface ProductVariantData {
  externalId?: string;
  sku?: string;
  name?: string;
  regularPrice?: number;
  salePrice?: number;
  stockQuantity?: number;
  stockStatus?: StockStatus;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  metadata?: Record<string, any>;
}

/**
 * Platform-specific product data types
 */

// Hotmart product data (from sales/products API)
export interface HotmartProductData {
  id: number;
  name: string;
  ucode?: string;
  status?: string;
  created_at?: number;
  format?: string;
  is_subscription?: boolean;
  warranty_period?: number;
}

// Hotmart sales data containing product info
export interface HotmartSalesData {
  product: {
    name: string;
    id: number;
  };
  buyer: {
    name: string;
    ucode: string;
    email: string;
  };
  producer: {
    name: string;
    ucode: string;
  };
  purchase: {
    transaction: string;
    order_date: number;
    approved_date: number;
    status: string;
    price: {
      value: number;
      currency_code: string;
    };
    payment: {
      method: string;
      installments_number: number;
      type: string;
    };
  };
}

// Nuvemshop product data
export interface NuvemshopProductData {
  id: number;
  name: Record<string, string>; // Multi-language object
  description: Record<string, string>;
  handle: string;
  attributes: any[];
  published: boolean;
  free_shipping: boolean;
  requires_shipping: boolean;
  canonical_url: string;
  video_url?: string;
  seo_title: Record<string, string>;
  seo_description: Record<string, string>;
  brand?: string;
  created_at: string;
  updated_at: string;
  variants: NuvemshopVariantData[];
  tags: string;
  images: NuvemshopImageData[];
  categories: NuvemshopCategoryData[];
}

export interface NuvemshopVariantData {
  id: number;
  image_id?: number;
  product_id: number;
  position: number;
  price: string;
  compare_at_price?: string;
  promotional_price?: string;
  stock_management: boolean;
  stock: number;
  weight?: string;
  width?: string;
  height?: string;
  depth?: string;
  sku?: string;
  values: any[];
  barcode?: string;
  mpn?: string;
  age_group?: string;
  gender?: string;
  size_type?: string;
  size_system?: string;
  mobile_size_type?: string;
  created_at: string;
  updated_at: string;
}

export interface NuvemshopImageData {
  id: number;
  product_id: number;
  src: string;
  position: number;
  alt: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface NuvemshopCategoryData {
  id: number;
  name: Record<string, string>;
  description?: Record<string, string>;
  handle: string;
  parent?: number;
  subcategories: any[];
  google_shopping_category?: string;
  created_at: string;
  updated_at: string;
}

// WooCommerce product data
export interface WooCommerceProductData {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from?: string;
  date_on_sale_to?: string;
  date_on_sale_from_gmt?: string;
  date_on_sale_to_gmt?: string;
  total_sales: number;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity?: number;
  stock_status: string;
  weight?: string;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  categories: WooCommerceCategoryData[];
  images: WooCommerceImageData[];
  attributes: any[];
  default_attributes: any[];
  variations: number[];
  meta_data: any[];
}

export interface WooCommerceCategoryData {
  id: number;
  name: string;
  slug: string;
}

export interface WooCommerceImageData {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  src: string;
  name: string;
  alt: string;
  position: number;
}

/**
 * Product processing result
 */
export interface ProductProcessingResult {
  success: boolean;
  productId?: string;
  externalId: string;
  platform: Platform;
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, any>;
}
