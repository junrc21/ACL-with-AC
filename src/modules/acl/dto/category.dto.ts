import { z } from 'zod';
import { Platform } from '@/shared/types/platform.types';
import { CategoryStatus, CategoryDisplayType } from '@/shared/types/category.types';

/**
 * Base category request schema
 */
export const BaseCategoryRequestSchema = z.object({
  platform: z.nativeEnum(Platform),
  storeId: z.string().optional(),
  data: z.record(z.any()), // Platform-specific data
});

/**
 * Category creation request schema
 */
export const CreateCategoryRequestSchema = BaseCategoryRequestSchema.extend({
  data: z.record(z.any()).refine(
    (data) => {
      // Basic validation - specific validation happens in strategies
      return typeof data === 'object' && data !== null;
    },
    {
      message: 'Category data must be a valid object',
    }
  ),
});

/**
 * Category update request schema
 */
export const UpdateCategoryRequestSchema = BaseCategoryRequestSchema.extend({
  categoryId: z.string(),
  data: z.record(z.any()).optional(),
});

/**
 * Category sync request schema
 */
export const SyncCategoryRequestSchema = z.object({
  platform: z.nativeEnum(Platform),
  storeId: z.string().optional(),
  categories: z.array(z.record(z.any())),
});

/**
 * Category query parameters schema
 */
export const CategoryQuerySchema = z.object({
  platform: z.nativeEnum(Platform).optional(),
  storeId: z.string().optional(),
  parentId: z.string().optional(),
  status: z.nativeEnum(CategoryStatus).optional(),
  search: z.string().optional(),
  includeEmpty: z.boolean().default(true),
  includeHierarchy: z.boolean().default(false),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'productCount', 'menuOrder']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Category image schema
 */
export const CategoryImageSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  src: z.string().url(),
  alt: z.string().optional(),
  thumbnail: z.string().url().optional(),
  srcset: z.string().optional(),
  sizes: z.string().optional(),
  name: z.string().optional(),
});

/**
 * Category response schema
 */
export const CategoryResponseSchema = z.object({
  id: z.string(),
  platform: z.nativeEnum(Platform),
  externalId: z.string(),
  storeId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  slug: z.string(),
  parentId: z.string().optional(),
  level: z.number().optional(),
  menuOrder: z.number().optional(),
  productCount: z.number().optional(),
  status: z.nativeEnum(CategoryStatus).optional(),
  displayType: z.nativeEnum(CategoryDisplayType).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  image: CategoryImageSchema.optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Category hierarchy response schema
 */
export const CategoryHierarchySchema = z.object({
  category: CategoryResponseSchema,
  children: z.array(z.lazy(() => CategoryHierarchySchema)),
  parent: CategoryResponseSchema.optional(),
});

/**
 * Category statistics response schema
 */
export const CategoryStatisticsSchema = z.object({
  totalCategories: z.number(),
  activeCategories: z.number(),
  categoriesWithProducts: z.number(),
  averageProductsPerCategory: z.number(),
  topCategories: z.array(z.object({
    category: CategoryResponseSchema,
    productCount: z.number(),
  })),
});

/**
 * Category sync result schema
 */
export const CategorySyncResultSchema = z.object({
  success: z.boolean(),
  categoriesProcessed: z.number(),
  categoriesCreated: z.number(),
  categoriesUpdated: z.number(),
  categoriesSkipped: z.number(),
  errors: z.array(z.object({
    categoryId: z.string().optional(),
    error: z.string(),
    details: z.any().optional(),
  })),
  hierarchy: z.array(CategoryHierarchySchema).optional(),
});

/**
 * Category processing result schema
 */
export const CategoryProcessingResultSchema = z.object({
  success: z.boolean(),
  externalId: z.string(),
  platform: z.nativeEnum(Platform),
  categoryId: z.string().optional(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  processingTime: z.number().optional(),
});

// Platform-specific schemas

/**
 * Hotmart category data schema
 */
export const HotmartCategorySchema = z.object({
  type: z.enum(['producer', 'product_type', 'tag', 'custom']),
  value: z.string(),
  label: z.string(),
  productCount: z.number().optional(),
  metadata: z.object({
    producerId: z.string().optional(),
    producerName: z.string().optional(),
    productType: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

/**
 * Nuvemshop category data schema
 */
export const NuvemshopCategorySchema = z.object({
  id: z.number(),
  name: z.record(z.string()), // Multi-language object
  description: z.record(z.string()).optional(),
  handle: z.string(),
  parent: z.number().optional(),
  subcategories: z.array(z.number()).optional(),
  google_shopping_category: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  seo_title: z.record(z.string()).optional(),
  seo_description: z.record(z.string()).optional(),
  image: z.object({
    id: z.number(),
    src: z.string().url(),
    alt: z.string().optional(),
  }).optional(),
  custom_fields: z.array(z.object({
    name: z.string(),
    value: z.string(),
    type: z.string(),
  })).optional(),
});

/**
 * WooCommerce category data schema
 */
export const WooCommerceCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  parent: z.number(),
  description: z.string(),
  display: z.enum(['default', 'products', 'subcategories', 'both']),
  image: z.object({
    id: z.number(),
    date_created: z.string(),
    date_created_gmt: z.string(),
    date_modified: z.string(),
    date_modified_gmt: z.string(),
    src: z.string().url(),
    name: z.string(),
    alt: z.string(),
  }).optional(),
  menu_order: z.number(),
  count: z.number(),
  date_created: z.string(),
  date_created_gmt: z.string(),
  date_modified: z.string(),
  date_modified_gmt: z.string(),
  meta_data: z.array(z.object({
    id: z.number(),
    key: z.string(),
    value: z.string(),
  })).optional(),
});

/**
 * Category path response schema
 */
export const CategoryPathSchema = z.array(CategoryResponseSchema);

/**
 * Paginated categories response schema
 */
export const PaginatedCategoriesSchema = z.object({
  categories: z.array(CategoryResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  hierarchy: z.array(CategoryHierarchySchema).optional(),
});

// Type exports
export type BaseCategoryRequest = z.infer<typeof BaseCategoryRequestSchema>;
export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequestSchema>;
export type UpdateCategoryRequest = z.infer<typeof UpdateCategoryRequestSchema>;
export type SyncCategoryRequest = z.infer<typeof SyncCategoryRequestSchema>;
export type CategoryQuery = z.infer<typeof CategoryQuerySchema>;
export type CategoryResponse = z.infer<typeof CategoryResponseSchema>;
export type CategoryHierarchy = z.infer<typeof CategoryHierarchySchema>;
export type CategoryStatistics = z.infer<typeof CategoryStatisticsSchema>;
export type CategorySyncResult = z.infer<typeof CategorySyncResultSchema>;
export type CategoryProcessingResult = z.infer<typeof CategoryProcessingResultSchema>;
export type HotmartCategory = z.infer<typeof HotmartCategorySchema>;
export type NuvemshopCategory = z.infer<typeof NuvemshopCategorySchema>;
export type WooCommerceCategory = z.infer<typeof WooCommerceCategorySchema>;
export type CategoryPath = z.infer<typeof CategoryPathSchema>;
export type PaginatedCategories = z.infer<typeof PaginatedCategoriesSchema>;

/**
 * Validation helpers
 */
export const validateCategoryRequest = (data: unknown) => {
  return CreateCategoryRequestSchema.safeParse(data);
};

export const validateCategoryQuery = (data: unknown) => {
  return CategoryQuerySchema.safeParse(data);
};

export const validateSyncRequest = (data: unknown) => {
  return SyncCategoryRequestSchema.safeParse(data);
};

export const validateUpdateRequest = (data: unknown) => {
  return UpdateCategoryRequestSchema.safeParse(data);
};

/**
 * Platform-specific validation
 */
export const validateHotmartCategory = (data: unknown) => {
  return HotmartCategorySchema.safeParse(data);
};

export const validateNuvemshopCategory = (data: unknown) => {
  return NuvemshopCategorySchema.safeParse(data);
};

export const validateWooCommerceCategory = (data: unknown) => {
  return WooCommerceCategorySchema.safeParse(data);
};

/**
 * Response validation
 */
export const validateCategoryResponse = (data: unknown) => {
  return CategoryResponseSchema.safeParse(data);
};

export const validateCategoryHierarchy = (data: unknown) => {
  return CategoryHierarchySchema.safeParse(data);
};

export const validateCategoryStatistics = (data: unknown) => {
  return CategoryStatisticsSchema.safeParse(data);
};
