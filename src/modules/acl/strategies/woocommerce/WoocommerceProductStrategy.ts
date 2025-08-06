import { 
  ProductData, 
  ProductType, 
  ProductStatus,
  StockStatus,
  WooCommerceProductData,
  ProductCategoryData,
  ProductImageData
} from '@/shared/types/product.types';
import { Platform, StrategyContext, ValidationResult, PlatformError } from '@/shared/types/platform.types';
import { IWooCommerceProductStrategy } from '../interfaces/IProductStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * WooCommerce product strategy implementation
 */
export class WoocommerceProductStrategy implements IWooCommerceProductStrategy {
  public readonly platform = Platform.WOOCOMMERCE;
  private logger = createPlatformLogger('WOOCOMMERCE', 'ProductStrategy');

  /**
   * Parse platform-specific product data into unified format
   */
  async parseProduct(data: WooCommerceProductData, context: StrategyContext): Promise<ProductData> {
    this.logger.info({ productId: data.id, context }, 'Parsing WooCommerce product data');

    const productData: ProductData = {
      platform: Platform.WOOCOMMERCE,
      externalId: data.id.toString(),
      storeId: context.storeId,

      // Basic information
      name: data.name,
      description: data.description || undefined,
      shortDescription: data.short_description || undefined,
      slug: data.slug || undefined,
      sku: data.sku || undefined,
      type: this.mapWooCommerceType(data.type),
      status: this.mapWooCommerceStatus(data.status),

      // Pricing information
      regularPrice: data.regular_price ? parseFloat(data.regular_price) : undefined,
      salePrice: data.sale_price ? parseFloat(data.sale_price) : undefined,
      currency: 'USD', // WooCommerce doesn't include currency in product data

      // Inventory management
      manageStock: data.manage_stock || undefined,
      stockQuantity: data.stock_quantity || undefined,
      stockStatus: this.mapStockStatus(data.stock_status),

      // Physical properties
      weight: data.weight ? parseFloat(data.weight) : undefined,
      length: data.dimensions?.length ? parseFloat(data.dimensions.length) : undefined,
      width: data.dimensions?.width ? parseFloat(data.dimensions.width) : undefined,
      height: data.dimensions?.height ? parseFloat(data.dimensions.height) : undefined,

      // SEO and visibility
      featured: data.featured || undefined,
      catalogVisibility: data.catalog_visibility || undefined,
      seoTitle: undefined,
      seoDescription: undefined,
      totalSales: data.total_sales || undefined,

      // Categories and images
      categories: this.parseCategories(data.categories),
      images: this.parseImages(data.images),
      variants: undefined,

      // WooCommerce-specific metadata
      metadata: {
        permalink: data.permalink,
        taxStatus: data.tax_status,
        taxClass: data.tax_class,
        dateOnSaleFrom: data.date_on_sale_from,
        dateOnSaleTo: data.date_on_sale_to,
        attributes: data.attributes,
        defaultAttributes: data.default_attributes,
        variations: data.variations,
        metaData: data.meta_data,
        originalType: data.type,
        originalStatus: data.status,
      },

      // Timestamps
      createdAt: new Date(data.date_created),
      updatedAt: new Date(data.date_modified),
    };

    return this.applyBusinessRules(productData);
  }

  /**
   * Map WooCommerce product type to unified type
   */
  mapWooCommerceType(type: string): ProductType {
    const typeMap: Record<string, ProductType> = {
      'simple': ProductType.SIMPLE,
      'grouped': ProductType.GROUPED,
      'external': ProductType.EXTERNAL,
      'variable': ProductType.VARIABLE,
    };

    return typeMap[type.toLowerCase()] || ProductType.SIMPLE;
  }

  /**
   * Map WooCommerce status to unified status
   */
  mapWooCommerceStatus(status: string): ProductStatus {
    const statusMap: Record<string, ProductStatus> = {
      'publish': ProductStatus.ACTIVE,
      'draft': ProductStatus.DRAFT,
      'private': ProductStatus.INACTIVE,
      'pending': ProductStatus.DRAFT,
      'trash': ProductStatus.ARCHIVED,
    };

    return statusMap[status.toLowerCase()] || ProductStatus.DRAFT;
  }

  /**
   * Map WooCommerce stock status to unified stock status
   */
  private mapStockStatus(stockStatus: string): StockStatus {
    const statusMap: Record<string, StockStatus> = {
      'instock': StockStatus.IN_STOCK,
      'outofstock': StockStatus.OUT_OF_STOCK,
      'onbackorder': StockStatus.ON_BACKORDER,
    };

    return statusMap[stockStatus.toLowerCase()] || StockStatus.IN_STOCK;
  }

  /**
   * Parse WooCommerce dimensions
   */
  parseDimensions(dimensions?: { length: string; width: string; height: string }): {
    length?: number;
    width?: number;
    height?: number;
  } {
    if (!dimensions) {
      return {};
    }

    return {
      length: dimensions.length ? parseFloat(dimensions.length) : undefined,
      width: dimensions.width ? parseFloat(dimensions.width) : undefined,
      height: dimensions.height ? parseFloat(dimensions.height) : undefined,
    };
  }

  /**
   * Parse WooCommerce categories
   */
  parseCategories(categories: any[]): ProductCategoryData[] {
    if (!categories || !Array.isArray(categories)) {
      return [];
    }

    return categories.map(category => ({
      externalId: category.id ? category.id.toString() : '',
      name: category.name,
      slug: category.slug || undefined,
      description: undefined,
      parentId: undefined,
    }));
  }

  /**
   * Parse WooCommerce images
   */
  parseImages(images: any[]): ProductImageData[] {
    if (!images || !Array.isArray(images)) {
      return [];
    }

    return images.map(image => ({
      src: image.src,
      alt: image.alt || undefined,
      position: image.position || undefined,
    }));
  }

  /**
   * Validate platform-specific product data
   */
  validateProductData(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.id) errors.push('Product ID is required');
    if (!data.name) errors.push('Product name is required');
    if (!data.type) errors.push('Product type is required');
    if (!data.status) errors.push('Product status is required');

    // Validate pricing
    if (data.regular_price && isNaN(parseFloat(data.regular_price))) {
      errors.push('Regular price must be a valid number');
    }

    if (data.sale_price && isNaN(parseFloat(data.sale_price))) {
      errors.push('Sale price must be a valid number');
    }

    // Validate stock
    if (data.manage_stock && data.stock_quantity === undefined) {
      warnings.push('Stock management is enabled but stock quantity is not set');
    }

    // Validate dimensions
    if (data.weight && isNaN(parseFloat(data.weight))) {
      errors.push('Weight must be a valid number');
    }

    if (data.dimensions) {
      const { length, width, height } = data.dimensions;
      if (length && isNaN(parseFloat(length))) errors.push('Length must be a valid number');
      if (width && isNaN(parseFloat(width))) errors.push('Width must be a valid number');
      if (height && isNaN(parseFloat(height))) errors.push('Height must be a valid number');
    }

    // Warnings
    if (!data.description) {
      warnings.push('Product description is empty');
    }

    if (!data.images || data.images.length === 0) {
      warnings.push('Product has no images');
    }

    if (!data.categories || data.categories.length === 0) {
      warnings.push('Product has no categories');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Extract store information from product data
   */
  extractStoreInfo(data: any): { storeId?: string; storeName?: string } {
    // WooCommerce products don't contain store info directly
    // Store ID should come from context or headers
    return {};
  }

  /**
   * Apply platform-specific business rules
   */
  applyBusinessRules(productData: ProductData): ProductData {
    // WooCommerce business rules

    // 1. Set default currency (should be configured per store)
    if (!productData.currency) {
      productData.currency = 'USD';
    }

    // 2. Handle variable products
    if (productData.type === ProductType.VARIABLE && productData.metadata?.variations) {
      productData.featured = true; // Variable products are typically featured
    }

    // 3. Handle external products
    if (productData.type === ProductType.EXTERNAL) {
      productData.manageStock = false;
      productData.stockQuantity = undefined;
    }

    // 4. Set product type based on physical properties
    if (productData.weight || productData.length || productData.width || productData.height) {
      // If it has physical dimensions, it's likely a physical product
      if (productData.type === ProductType.SIMPLE) {
        productData.metadata = {
          ...productData.metadata,
          isPhysical: true,
        };
      }
    }

    // 5. Handle sale pricing
    if (productData.salePrice && productData.regularPrice) {
      if (productData.salePrice >= productData.regularPrice) {
        // Sale price should be less than regular price
        productData.salePrice = undefined;
      }
    }

    // 6. Set stock status based on quantity
    if (productData.manageStock && productData.stockQuantity !== undefined) {
      if (productData.stockQuantity <= 0) {
        productData.stockStatus = StockStatus.OUT_OF_STOCK;
      }
    }

    this.logger.debug({ productData }, 'Applied WooCommerce business rules');

    return productData;
  }

  /**
   * Transform unified product data back to platform format
   */
  transformToplatformFormat(productData: ProductData): Partial<WooCommerceProductData> {
    return {
      id: parseInt(productData.externalId),
      name: productData.name,
      description: productData.description || '',
      short_description: productData.shortDescription || '',
      sku: productData.sku || '',
      type: this.reverseMapType(productData.type),
      status: this.reverseMapStatus(productData.status),
      regular_price: productData.regularPrice ? productData.regularPrice.toString() : '',
      sale_price: productData.salePrice ? productData.salePrice.toString() : '',
      featured: productData.featured || false,
      catalog_visibility: productData.catalogVisibility || 'visible',
      manage_stock: productData.manageStock || false,
      stock_quantity: productData.stockQuantity || undefined,
      stock_status: this.reverseMapStockStatus(productData.stockStatus),
      weight: productData.weight ? productData.weight.toString() : '',
      dimensions: {
        length: productData.length ? productData.length.toString() : '',
        width: productData.width ? productData.width.toString() : '',
        height: productData.height ? productData.height.toString() : '',
      },
    };
  }

  /**
   * Reverse map unified type to WooCommerce type
   */
  private reverseMapType(type: ProductType): string {
    const reverseMap: Record<ProductType, string> = {
      [ProductType.SIMPLE]: 'simple',
      [ProductType.GROUPED]: 'grouped',
      [ProductType.EXTERNAL]: 'external',
      [ProductType.VARIABLE]: 'variable',
      [ProductType.DIGITAL]: 'simple',
      [ProductType.PHYSICAL]: 'simple',
      [ProductType.SERVICE]: 'simple',
    };

    return reverseMap[type] || 'simple';
  }

  /**
   * Reverse map unified status to WooCommerce status
   */
  private reverseMapStatus(status: ProductStatus): string {
    const reverseMap: Record<ProductStatus, string> = {
      [ProductStatus.ACTIVE]: 'publish',
      [ProductStatus.DRAFT]: 'draft',
      [ProductStatus.INACTIVE]: 'private',
      [ProductStatus.ARCHIVED]: 'trash',
    };

    return reverseMap[status] || 'draft';
  }

  /**
   * Reverse map unified stock status to WooCommerce stock status
   */
  private reverseMapStockStatus(stockStatus?: StockStatus): string {
    if (!stockStatus) return 'instock';

    const reverseMap: Record<StockStatus, string> = {
      [StockStatus.IN_STOCK]: 'instock',
      [StockStatus.OUT_OF_STOCK]: 'outofstock',
      [StockStatus.ON_BACKORDER]: 'onbackorder',
    };

    return reverseMap[stockStatus] || 'instock';
  }
}
