import { Platform } from '@/shared/types/platform.types';
import { 
  CategoryData, 
  CategoryHierarchy,
  HotmartCategoryData, 
  NuvemshopCategoryData, 
  WooCommerceCategoryData 
} from '@/shared/types/category.types';
import { StrategyContext, ValidationResult } from './IProductStrategy';

/**
 * Base interface for all category strategies
 */
export interface ICategoryStrategy {
  /**
   * Platform this strategy handles
   */
  readonly platform: Platform;

  /**
   * Parse platform-specific category data into unified format
   */
  parseCategory(data: any, context: StrategyContext): Promise<CategoryData>;

  /**
   * Validate platform-specific category data
   */
  validateCategoryData(data: any): ValidationResult;

  /**
   * Transform unified category data back to platform format (for updates)
   */
  transformToPlatformFormat?(categoryData: CategoryData): any;

  /**
   * Extract store information from category data
   */
  extractStoreInfo(data: any): { storeId?: string; storeName?: string };

  /**
   * Handle platform-specific business rules
   */
  applyBusinessRules(categoryData: CategoryData): CategoryData;

  /**
   * Build category hierarchy from flat category list
   */
  buildHierarchy(categories: CategoryData[]): CategoryHierarchy[];

  /**
   * Get category path (breadcrumb) for a given category
   */
  getCategoryPath(categoryId: string, categories: CategoryData[]): CategoryData[];
}

/**
 * Hotmart-specific category strategy interface
 */
export interface IHotmartCategoryStrategy extends ICategoryStrategy {
  platform: Platform.HOTMART;
  
  /**
   * Create virtual categories from product data
   */
  createVirtualCategoriesFromProducts(products: any[]): Promise<CategoryData[]>;
  
  /**
   * Create virtual categories from producer data
   */
  createVirtualCategoriesFromProducers(producers: any[]): Promise<CategoryData[]>;
  
  /**
   * Create virtual categories from sales data
   */
  createVirtualCategoriesFromSales(salesData: any[]): Promise<CategoryData[]>;
  
  /**
   * Map Hotmart product type to category
   */
  mapProductTypeToCategory(productType: string): CategoryData;
  
  /**
   * Map Hotmart producer to category
   */
  mapProducerToCategory(producer: any): CategoryData;
}

/**
 * Nuvemshop-specific category strategy interface
 */
export interface INuvemshopCategoryStrategy extends ICategoryStrategy {
  platform: Platform.NUVEMSHOP;
  
  /**
   * Parse Nuvemshop category data
   */
  parseCategory(data: NuvemshopCategoryData, context: StrategyContext): Promise<CategoryData>;
  
  /**
   * Handle multi-language category names
   */
  parseMultiLanguageName(nameObject: Record<string, string>, defaultLanguage?: string): string;
  
  /**
   * Handle multi-language category descriptions
   */
  parseMultiLanguageDescription(descriptionObject: Record<string, string>, defaultLanguage?: string): string;
  
  /**
   * Parse Nuvemshop category image
   */
  parseCategoryImage(imageData?: { id: number; src: string; alt?: string }): any;
  
  /**
   * Handle custom fields for categories
   */
  parseCustomFields(customFields?: Array<{ name: string; value: string; type: string }>): Record<string, any>;
  
  /**
   * Map Nuvemshop category to unified format
   */
  mapNuvemshopCategory(category: NuvemshopCategoryData): CategoryData;
}

/**
 * WooCommerce-specific category strategy interface
 */
export interface IWooCommerceCategoryStrategy extends ICategoryStrategy {
  platform: Platform.WOOCOMMERCE;
  
  /**
   * Parse WooCommerce category data
   */
  parseCategory(data: WooCommerceCategoryData, context: StrategyContext): Promise<CategoryData>;
  
  /**
   * Map WooCommerce display type to unified format
   */
  mapWooCommerceDisplayType(display: string): string;
  
  /**
   * Parse WooCommerce category image
   */
  parseCategoryImage(imageData?: any): any;
  
  /**
   * Handle WooCommerce meta data
   */
  parseMetaData(metaData?: Array<{ id: number; key: string; value: string }>): Record<string, any>;
  
  /**
   * Map WooCommerce category to unified format
   */
  mapWooCommerceCategory(category: WooCommerceCategoryData): CategoryData;
  
  /**
   * Handle WooCommerce taxonomy terms
   */
  parseTaxonomyTerms(terms: any[]): CategoryData[];
}

/**
 * Category strategy factory interface
 */
export interface ICategoryStrategyFactory {
  /**
   * Get appropriate strategy for platform
   */
  getStrategy(platform: Platform): ICategoryStrategy;
  
  /**
   * Register a new strategy
   */
  registerStrategy(platform: Platform, strategy: ICategoryStrategy): void;
  
  /**
   * Check if strategy exists for platform
   */
  hasStrategy(platform: Platform): boolean;
}

/**
 * Category synchronization result
 */
export interface CategorySyncResult {
  success: boolean;
  categoriesProcessed: number;
  categoriesCreated: number;
  categoriesUpdated: number;
  categoriesSkipped: number;
  errors: Array<{
    categoryId?: string;
    error: string;
    details?: any;
  }>;
  hierarchy?: CategoryHierarchy[];
}

/**
 * Category validation result
 */
export interface CategoryValidationResult extends ValidationResult {
  categorySpecificErrors?: {
    nameRequired?: boolean;
    slugInvalid?: boolean;
    parentNotFound?: boolean;
    circularReference?: boolean;
    duplicateSlug?: boolean;
  };
}

/**
 * Category transformation options
 */
export interface CategoryTransformOptions {
  includeHierarchy?: boolean;
  includeProductCount?: boolean;
  includeImages?: boolean;
  includeMetadata?: boolean;
  language?: string;
  maxDepth?: number;
}
