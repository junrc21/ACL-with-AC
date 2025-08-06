import { 
  ProductData, 
  ProductProcessingResult,
  HotmartProductData,
  HotmartSalesData,
  NuvemshopProductData,
  WooCommerceProductData
} from '@/shared/types/product.types';
import { Platform, StrategyContext, ValidationResult } from '@/shared/types/platform.types';

/**
 * Base interface for all product strategies
 */
export interface IProductStrategy {
  /**
   * Platform this strategy handles
   */
  readonly platform: Platform;

  /**
   * Parse platform-specific product data into unified format
   */
  parseProduct(data: any, context: StrategyContext): Promise<ProductData>;

  /**
   * Validate platform-specific product data
   */
  validateProductData(data: any): ValidationResult;

  /**
   * Transform unified product data back to platform format (for updates)
   */
  transformToplatformFormat?(productData: ProductData): any;

  /**
   * Extract store information from product data
   */
  extractStoreInfo(data: any): { storeId?: string; storeName?: string };

  /**
   * Handle platform-specific business rules
   */
  applyBusinessRules(productData: ProductData): ProductData;
}

/**
 * Hotmart-specific product strategy interface
 */
export interface IHotmartProductStrategy extends IProductStrategy {
  platform: Platform.HOTMART;
  
  /**
   * Parse Hotmart product from sales data
   */
  parseProductFromSales(salesData: HotmartSalesData, context: StrategyContext): Promise<ProductData>;
  
  /**
   * Parse Hotmart product from products API
   */
  parseProductFromCatalog(productData: HotmartProductData, context: StrategyContext): Promise<ProductData>;
  
  /**
   * Map Hotmart product status to unified status
   */
  mapHotmartStatus(status: string): string;
  
  /**
   * Map Hotmart product format to product type
   */
  mapHotmartFormat(format: string): string;
}

/**
 * Nuvemshop-specific product strategy interface
 */
export interface INuvemshopProductStrategy extends IProductStrategy {
  platform: Platform.NUVEMSHOP;
  
  /**
   * Parse Nuvemshop product data
   */
  parseProduct(data: NuvemshopProductData, context: StrategyContext): Promise<ProductData>;
  
  /**
   * Extract localized text from multi-language object
   */
  extractLocalizedText(textObject: Record<string, string>, preferredLanguage?: string): string;
  
  /**
   * Parse product variants
   */
  parseVariants(variants: any[]): any[];
  
  /**
   * Parse product images
   */
  parseImages(images: any[]): any[];
  
  /**
   * Parse product categories
   */
  parseCategories(categories: any[]): any[];
}

/**
 * WooCommerce-specific product strategy interface
 */
export interface IWooCommerceProductStrategy extends IProductStrategy {
  platform: Platform.WOOCOMMERCE;
  
  /**
   * Parse WooCommerce product data
   */
  parseProduct(data: WooCommerceProductData, context: StrategyContext): Promise<ProductData>;
  
  /**
   * Map WooCommerce product type to unified type
   */
  mapWooCommerceType(type: string): string;
  
  /**
   * Map WooCommerce status to unified status
   */
  mapWooCommerceStatus(status: string): string;
  
  /**
   * Parse WooCommerce dimensions
   */
  parseDimensions(dimensions?: { length: string; width: string; height: string }): {
    length?: number;
    width?: number;
    height?: number;
  };
  
  /**
   * Parse WooCommerce categories
   */
  parseCategories(categories: any[]): any[];
  
  /**
   * Parse WooCommerce images
   */
  parseImages(images: any[]): any[];
}

/**
 * Product strategy factory interface
 */
export interface IProductStrategyFactory {
  /**
   * Create product strategy for given platform
   */
  createStrategy(platform: Platform): IProductStrategy;
  
  /**
   * Get all available strategies
   */
  getAllStrategies(): Map<Platform, IProductStrategy>;
  
  /**
   * Check if platform is supported
   */
  isSupported(platform: Platform): boolean;
}
