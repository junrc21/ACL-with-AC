import { z } from 'zod';
import { Platform } from '@/shared/types/platform.types';
import { ProductType, ProductStatus, StockStatus } from '@/shared/types/product.types';

/**
 * Base product request schema
 */
export const BaseProductRequestSchema = z.object({
  platform: z.nativeEnum(Platform),
  storeId: z.string().optional(),
  data: z.record(z.any()), // Platform-specific data
});

/**
 * Product creation request schema
 */
export const CreateProductRequestSchema = BaseProductRequestSchema.extend({
  data: z.record(z.any()).refine(
    (data) => {
      // Basic validation - specific validation happens in strategies
      return typeof data === 'object' && data !== null;
    },
    {
      message: 'Product data must be a valid object',
    }
  ),
});

/**
 * Product update request schema
 */
export const UpdateProductRequestSchema = BaseProductRequestSchema.extend({
  productId: z.string(),
  data: z.record(z.any()).optional(),
});

/**
 * Product query parameters schema
 */
export const ProductQuerySchema = z.object({
  platform: z.nativeEnum(Platform).optional(),
  storeId: z.string().optional(),
  externalId: z.string().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  type: z.nativeEnum(ProductType).optional(),
  featured: z.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'price']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Product response schema
 */
export const ProductResponseSchema = z.object({
  id: z.string(),
  platform: z.nativeEnum(Platform),
  externalId: z.string(),
  storeId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  slug: z.string().optional(),
  sku: z.string().optional(),
  type: z.nativeEnum(ProductType),
  status: z.nativeEnum(ProductStatus),
  regularPrice: z.number().optional(),
  salePrice: z.number().optional(),
  currency: z.string().optional(),
  manageStock: z.boolean().optional(),
  stockQuantity: z.number().optional(),
  stockStatus: z.nativeEnum(StockStatus).optional(),
  weight: z.number().optional(),
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  featured: z.boolean().optional(),
  catalogVisibility: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  totalSales: z.number().optional(),
  categories: z.array(z.object({
    externalId: z.string(),
    name: z.string(),
    slug: z.string().optional(),
    description: z.string().optional(),
    parentId: z.string().optional(),
  })).optional(),
  images: z.array(z.object({
    src: z.string(),
    alt: z.string().optional(),
    position: z.number().optional(),
  })).optional(),
  variants: z.array(z.object({
    externalId: z.string().optional(),
    sku: z.string().optional(),
    name: z.string().optional(),
    regularPrice: z.number().optional(),
    salePrice: z.number().optional(),
    stockQuantity: z.number().optional(),
    stockStatus: z.nativeEnum(StockStatus).optional(),
    weight: z.number().optional(),
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    metadata: z.record(z.any()).optional(),
  })).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Product list response schema
 */
export const ProductListResponseSchema = z.object({
  products: z.array(ProductResponseSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
  filters: z.object({
    platform: z.nativeEnum(Platform).optional(),
    storeId: z.string().optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    type: z.nativeEnum(ProductType).optional(),
    featured: z.boolean().optional(),
  }),
});

/**
 * Product processing result schema
 */
export const ProductProcessingResultSchema = z.object({
  success: z.boolean(),
  productId: z.string().optional(),
  externalId: z.string(),
  platform: z.nativeEnum(Platform),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Bulk product processing request schema
 */
export const BulkProductRequestSchema = z.object({
  platform: z.nativeEnum(Platform),
  storeId: z.string().optional(),
  products: z.array(z.record(z.any())).min(1).max(100),
  options: z.object({
    skipValidation: z.boolean().default(false),
    continueOnError: z.boolean().default(true),
    updateExisting: z.boolean().default(true),
  }).optional(),
});

/**
 * Bulk product processing response schema
 */
export const BulkProductResponseSchema = z.object({
  totalProcessed: z.number(),
  successful: z.number(),
  failed: z.number(),
  results: z.array(ProductProcessingResultSchema),
  summary: z.object({
    platform: z.nativeEnum(Platform),
    storeId: z.string().optional(),
    processingTime: z.number(),
    errors: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional(),
  }),
});

/**
 * Platform-specific validation schemas
 */

// Hotmart product validation
export const HotmartProductSchema = z.object({
  // Sales data format
  product: z.object({
    id: z.number(),
    name: z.string(),
  }).optional(),
  buyer: z.object({
    name: z.string(),
    ucode: z.string(),
    email: z.string().email(),
  }).optional(),
  purchase: z.object({
    transaction: z.string(),
    order_date: z.number(),
    approved_date: z.number(),
    status: z.string(),
    price: z.object({
      value: z.number(),
      currency_code: z.string(),
    }),
    payment: z.object({
      method: z.string(),
      installments_number: z.number(),
      type: z.string(),
    }),
  }).optional(),
  
  // OR catalog data format
  id: z.number().optional(),
  name: z.string().optional(),
  ucode: z.string().optional(),
  status: z.string().optional(),
  format: z.string().optional(),
  is_subscription: z.boolean().optional(),
  warranty_period: z.number().optional(),
  created_at: z.number().optional(),
}).refine(
  (data) => {
    // Must be either sales data or catalog data
    const hasSalesData = data.product && data.buyer && data.purchase;
    const hasCatalogData = data.id && data.name;
    return hasSalesData || hasCatalogData;
  },
  {
    message: 'Must provide either sales data (product, buyer, purchase) or catalog data (id, name)',
  }
);

// Nuvemshop product validation
export const NuvemshopProductSchema = z.object({
  id: z.number(),
  name: z.record(z.string()),
  description: z.record(z.string()).optional(),
  handle: z.string(),
  attributes: z.array(z.any()).optional(),
  published: z.boolean(),
  free_shipping: z.boolean().optional(),
  requires_shipping: z.boolean().optional(),
  canonical_url: z.string().optional(),
  video_url: z.string().optional(),
  seo_title: z.record(z.string()).optional(),
  seo_description: z.record(z.string()).optional(),
  brand: z.string().optional(),
  tags: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  variants: z.array(z.object({
    id: z.number(),
    price: z.string(),
    stock: z.number(),
    sku: z.string().optional(),
    weight: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    depth: z.string().optional(),
  })).optional(),
  images: z.array(z.object({
    id: z.number(),
    src: z.string(),
    position: z.number(),
    alt: z.record(z.string()).optional(),
  })).optional(),
  categories: z.array(z.object({
    id: z.number(),
    name: z.record(z.string()),
    handle: z.string(),
  })).optional(),
});

// WooCommerce product validation
export const WooCommerceProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  type: z.string(),
  status: z.string(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  sku: z.string().optional(),
  price: z.string().optional(),
  regular_price: z.string().optional(),
  sale_price: z.string().optional(),
  featured: z.boolean().optional(),
  catalog_visibility: z.string().optional(),
  manage_stock: z.boolean().optional(),
  stock_quantity: z.number().optional(),
  stock_status: z.string().optional(),
  weight: z.string().optional(),
  dimensions: z.object({
    length: z.string(),
    width: z.string(),
    height: z.string(),
  }).optional(),
  categories: z.array(z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
  })).optional(),
  images: z.array(z.object({
    id: z.number(),
    src: z.string(),
    alt: z.string(),
    position: z.number(),
  })).optional(),
  date_created: z.string(),
  date_modified: z.string(),
});

/**
 * Type exports for TypeScript
 */
export type CreateProductRequest = z.infer<typeof CreateProductRequestSchema>;
export type UpdateProductRequest = z.infer<typeof UpdateProductRequestSchema>;
export type ProductQuery = z.infer<typeof ProductQuerySchema>;
export type ProductResponse = z.infer<typeof ProductResponseSchema>;
export type ProductListResponse = z.infer<typeof ProductListResponseSchema>;
export type ProductProcessingResult = z.infer<typeof ProductProcessingResultSchema>;
export type BulkProductRequest = z.infer<typeof BulkProductRequestSchema>;
export type BulkProductResponse = z.infer<typeof BulkProductResponseSchema>;
export type HotmartProduct = z.infer<typeof HotmartProductSchema>;
export type NuvemshopProduct = z.infer<typeof NuvemshopProductSchema>;
export type WooCommerceProduct = z.infer<typeof WooCommerceProductSchema>;
