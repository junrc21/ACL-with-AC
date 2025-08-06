import { 
  ProductData, 
  ProductType, 
  ProductStatus,
  StockStatus,
  NuvemshopProductData,
  ProductCategoryData,
  ProductImageData,
  ProductVariantData
} from '@/shared/types/product.types';
import { Platform, StrategyContext, ValidationResult, PlatformError } from '@/shared/types/platform.types';
import { INuvemshopProductStrategy } from '../interfaces/IProductStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Nuvemshop product strategy implementation
 */
export class NuvemshopProductStrategy implements INuvemshopProductStrategy {
  public readonly platform = Platform.NUVEMSHOP;
  private logger = createPlatformLogger('NUVEMSHOP', 'ProductStrategy');

  /**
   * Parse platform-specific product data into unified format
   */
  async parseProduct(data: NuvemshopProductData, context: StrategyContext): Promise<ProductData> {
    this.logger.info({ productId: data.id, context }, 'Parsing Nuvemshop product data');

    const productData: ProductData = {
      platform: Platform.NUVEMSHOP,
      externalId: data.id.toString(),
      storeId: context.storeId,

      // Basic information
      name: this.extractLocalizedText(data.name),
      description: this.extractLocalizedText(data.description),
      shortDescription: undefined,
      slug: data.handle,
      sku: undefined,
      type: data.requires_shipping ? ProductType.PHYSICAL : ProductType.DIGITAL,
      status: data.published ? ProductStatus.ACTIVE : ProductStatus.DRAFT,

      // Pricing information (will be set from variants below)
      regularPrice: undefined,
      salePrice: undefined,
      currency: undefined,

      // Inventory management
      manageStock: this.hasStockManagement(data.variants),
      stockQuantity: undefined,
      stockStatus: undefined,

      // Physical properties (will be set from variants below)
      weight: undefined,
      length: undefined,
      width: undefined,
      height: undefined,

      // SEO and visibility
      featured: undefined,
      catalogVisibility: data.published ? 'visible' : 'hidden',
      seoTitle: this.extractLocalizedText(data.seo_title),
      seoDescription: this.extractLocalizedText(data.seo_description),

      // Sales metrics
      totalSales: undefined,

      // Categories, images, and variants
      categories: this.parseCategories(data.categories),
      images: this.parseImages(data.images),
      variants: this.parseVariants(data.variants),

      // Nuvemshop-specific metadata
      metadata: {
        handle: data.handle,
        attributes: data.attributes,
        freeShipping: data.free_shipping,
        requiresShipping: data.requires_shipping,
        canonicalUrl: data.canonical_url,
        videoUrl: data.video_url,
        brand: data.brand,
        tags: data.tags,
        originalData: {
          name: data.name,
          description: data.description,
          seoTitle: data.seo_title,
          seoDescription: data.seo_description,
        },
      },

      // Timestamps
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };

    // Set pricing from first variant if available
    if (data.variants && data.variants.length > 0) {
      const firstVariant = data.variants[0];
      if (firstVariant) {
        productData.regularPrice = parseFloat(firstVariant.price);
        productData.salePrice = firstVariant.promotional_price ?
          parseFloat(firstVariant.promotional_price) : undefined;
        productData.stockQuantity = firstVariant.stock;
        productData.sku = firstVariant.sku;

        // Physical properties from first variant
        if (firstVariant.weight) productData.weight = parseFloat(firstVariant.weight);
        if (firstVariant.width) productData.width = parseFloat(firstVariant.width);
        if (firstVariant.height) productData.height = parseFloat(firstVariant.height);
        if (firstVariant.depth) productData.length = parseFloat(firstVariant.depth);
      }
    }

    return this.applyBusinessRules(productData);
  }

  /**
   * Extract localized text from multi-language object
   */
  extractLocalizedText(textObject: Record<string, string>, preferredLanguage = 'en'): string {
    if (!textObject || typeof textObject !== 'object') {
      return '';
    }

    // Try preferred language first
    if (textObject[preferredLanguage]) {
      return textObject[preferredLanguage];
    }

    // Try common languages
    const fallbackLanguages = ['es', 'pt', 'en'];
    for (const lang of fallbackLanguages) {
      if (textObject[lang]) {
        return textObject[lang];
      }
    }

    // Return first available value
    const values = Object.values(textObject);
    return values.length > 0 ? values[0] : '';
  }

  /**
   * Parse product variants
   */
  parseVariants(variants: any[]): ProductVariantData[] {
    if (!variants || !Array.isArray(variants)) {
      return [];
    }

    return variants.map(variant => ({
      externalId: variant.id ? variant.id.toString() : undefined,
      sku: variant.sku || undefined,
      name: variant.values?.map((v: any) => v.value).join(' - ') || undefined,
      regularPrice: variant.price ? parseFloat(variant.price) : undefined,
      salePrice: variant.promotional_price ? parseFloat(variant.promotional_price) : undefined,
      stockQuantity: variant.stock || undefined,
      stockStatus: variant.stock > 0 ? StockStatus.IN_STOCK : StockStatus.OUT_OF_STOCK,
      weight: variant.weight ? parseFloat(variant.weight) : undefined,
      width: variant.width ? parseFloat(variant.width) : undefined,
      height: variant.height ? parseFloat(variant.height) : undefined,
      length: variant.depth ? parseFloat(variant.depth) : undefined,
      metadata: {
        imageId: variant.image_id,
        position: variant.position,
        compareAtPrice: variant.compare_at_price,
        stockManagement: variant.stock_management,
        values: variant.values,
        barcode: variant.barcode,
        mpn: variant.mpn,
        ageGroup: variant.age_group,
        gender: variant.gender,
        sizeType: variant.size_type,
        sizeSystem: variant.size_system,
        mobileSizeType: variant.mobile_size_type,
      },
    }));
  }

  /**
   * Parse product images
   */
  parseImages(images: any[]): ProductImageData[] {
    if (!images || !Array.isArray(images)) {
      return [];
    }

    return images.map(image => ({
      src: image.src,
      alt: this.extractLocalizedText(image.alt) || undefined,
      position: image.position || undefined,
    }));
  }

  /**
   * Parse product categories
   */
  parseCategories(categories: any[]): ProductCategoryData[] {
    if (!categories || !Array.isArray(categories)) {
      return [];
    }

    return categories.map(category => ({
      externalId: category.id ? category.id.toString() : '',
      name: this.extractLocalizedText(category.name) || '',
      slug: category.handle,
      description: this.extractLocalizedText(category.description),
      parentId: category.parent ? category.parent.toString() : undefined,
    }));
  }

  /**
   * Check if any variant has stock management enabled
   */
  private hasStockManagement(variants: any[]): boolean {
    if (!variants || !Array.isArray(variants)) {
      return false;
    }

    return variants.some(variant => variant.stock_management === true);
  }

  /**
   * Validate platform-specific product data
   */
  validateProductData(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.id) errors.push('Product ID is required');
    if (!data.name || typeof data.name !== 'object') {
      errors.push('Product name object is required');
    } else if (Object.keys(data.name).length === 0) {
      errors.push('Product name must have at least one language');
    }

    if (!data.handle) errors.push('Product handle is required');

    // Validate variants
    if (data.variants && Array.isArray(data.variants)) {
      data.variants.forEach((variant: any, index: number) => {
        if (!variant.id) errors.push(`Variant ${index + 1}: ID is required`);
        if (!variant.price) errors.push(`Variant ${index + 1}: Price is required`);
      });
    }

    // Warnings
    if (!data.description || Object.keys(data.description).length === 0) {
      warnings.push('Product description is empty');
    }

    if (!data.images || data.images.length === 0) {
      warnings.push('Product has no images');
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
    // Nuvemshop products don't contain store info directly
    // Store ID should come from context or headers
    return {};
  }

  /**
   * Apply platform-specific business rules
   */
  applyBusinessRules(productData: ProductData): ProductData {
    // Nuvemshop business rules

    // 1. Set default currency for Latin American markets
    if (!productData.currency) {
      productData.currency = 'USD'; // Default, should be configured per store
    }

    // 2. Handle free shipping
    if (productData.metadata?.freeShipping) {
      productData.metadata.shippingClass = 'free';
    }

    // 3. Set product type based on shipping requirements
    if (productData.metadata?.requiresShipping && productData.type === ProductType.DIGITAL) {
      productData.type = ProductType.PHYSICAL;
    }

    // 4. Handle stock status
    if (productData.manageStock && productData.stockQuantity !== undefined) {
      productData.stockStatus = productData.stockQuantity > 0 ? 
        StockStatus.IN_STOCK : StockStatus.OUT_OF_STOCK;
    }

    // 5. Set featured status based on variants count
    if (productData.variants && productData.variants.length > 1) {
      productData.featured = true;
    }

    this.logger.debug({ productData }, 'Applied Nuvemshop business rules');

    return productData;
  }

  /**
   * Transform unified product data back to platform format
   */
  transformToplatformFormat(productData: ProductData): Partial<NuvemshopProductData> {
    return {
      id: parseInt(productData.externalId),
      name: productData.metadata?.originalData?.name || { en: productData.name },
      description: productData.metadata?.originalData?.description || { en: productData.description || '' },
      handle: productData.slug || productData.metadata?.handle,
      published: productData.status === ProductStatus.ACTIVE,
      free_shipping: productData.metadata?.freeShipping || false,
      requires_shipping: productData.type === ProductType.PHYSICAL,
      seo_title: productData.metadata?.originalData?.seoTitle || { en: productData.seoTitle || '' },
      seo_description: productData.metadata?.originalData?.seoDescription || { en: productData.seoDescription || '' },
      brand: productData.metadata?.brand,
      tags: productData.metadata?.tags || '',
    };
  }
}
