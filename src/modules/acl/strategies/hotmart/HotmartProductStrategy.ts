import {
  ProductData,
  ProductType,
  ProductStatus,
  HotmartProductData,
  HotmartSalesData,
  ProductCategoryData,
  ProductImageData,
  ProductCustomFieldData
} from '@/shared/types/product.types';
import { Platform, StrategyContext, ValidationResult, PlatformError } from '@/shared/types/platform.types';
import { IHotmartProductStrategy } from '../interfaces/IProductStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Hotmart product strategy implementation
 */
export class HotmartProductStrategy implements IHotmartProductStrategy {
  public readonly platform = Platform.HOTMART;
  private logger = createPlatformLogger('HOTMART', 'ProductStrategy');

  /**
   * Parse platform-specific product data into unified format
   */
  async parseProduct(data: any, context: StrategyContext): Promise<ProductData> {
    this.logger?.info({ data, context }, 'Parsing Hotmart product data');

    // Determine if this is sales data or product catalog data
    if (data.product && data.buyer && data.purchase) {
      return this.parseProductFromSales(data as HotmartSalesData, context);
    } else if (data.id && data.name) {
      return this.parseProductFromCatalog(data as HotmartProductData, context);
    } else {
      throw new PlatformError(
        Platform.HOTMART,
        'INVALID_PRODUCT_DATA',
        'Invalid Hotmart product data format'
      );
    }
  }

  /**
   * Parse Hotmart product from sales data
   */
  async parseProductFromSales(salesData: HotmartSalesData, context: StrategyContext): Promise<ProductData> {
    const { product, purchase } = salesData;

    const productData: ProductData = {
      platform: Platform.HOTMART,
      externalId: product.id.toString(),
      storeId: context.storeId,

      // Basic information
      name: product.name,
      description: undefined,
      shortDescription: undefined,
      slug: undefined,
      sku: undefined,
      type: ProductType.DIGITAL, // Hotmart is primarily digital products
      status: ProductStatus.ACTIVE, // If it's in sales data, it's active

      // Pricing from purchase data
      regularPrice: purchase.price.value,
      salePrice: undefined,
      currency: purchase.price.currency_code,

      // Inventory management
      manageStock: false,
      stockQuantity: undefined,
      stockStatus: undefined,

      // Physical properties
      weight: undefined,
      length: undefined,
      width: undefined,
      height: undefined,

      // SEO and visibility
      featured: undefined,
      catalogVisibility: 'visible',
      seoTitle: undefined,
      seoDescription: undefined,

      // Sales metrics
      totalSales: undefined,

      // Categories and images
      categories: undefined,
      images: undefined,
      variants: undefined,

      // Advanced features
      customFields: this.parseCustomFieldsFromSales(salesData),
      tags: this.parseTagsFromSales(salesData),

      // Hotmart-specific metadata
      metadata: {
        transaction: purchase.transaction,
        orderDate: purchase.order_date,
        approvedDate: purchase.approved_date,
        purchaseStatus: purchase.status,
        paymentMethod: purchase.payment.method,
        installments: purchase.payment.installments_number,
        isSubscription: false, // Default, can be overridden
        producer: salesData.producer,
        buyer: salesData.buyer,
      },

      // Timestamps
      createdAt: new Date(purchase.order_date),
      updatedAt: new Date(),
    };

    return this.applyBusinessRules(productData);
  }

  /**
   * Parse Hotmart product from products API
   */
  async parseProductFromCatalog(productData: HotmartProductData, context: StrategyContext): Promise<ProductData> {
    const product: ProductData = {
      platform: Platform.HOTMART,
      externalId: productData.id.toString(),
      storeId: context.storeId,

      // Basic information
      name: productData.name,
      description: undefined,
      shortDescription: undefined,
      slug: undefined,
      sku: undefined,
      type: this.mapHotmartFormat(productData.format || 'DIGITAL'),
      status: this.mapHotmartStatus(productData.status || 'ACTIVE') as ProductStatus,

      // Pricing information
      regularPrice: undefined,
      salePrice: undefined,
      currency: undefined,

      // Inventory management
      manageStock: false,
      stockQuantity: undefined,
      stockStatus: undefined,

      // Physical properties
      weight: undefined,
      length: undefined,
      width: undefined,
      height: undefined,

      // SEO and visibility
      featured: undefined,
      catalogVisibility: undefined,
      seoTitle: undefined,
      seoDescription: undefined,

      // Sales metrics
      totalSales: undefined,

      // Categories and images
      categories: undefined,
      images: undefined,
      variants: undefined,

      // Advanced features
      customFields: this.parseCustomFieldsFromCatalog(productData),
      tags: this.parseTagsFromCatalog(productData),

      // Hotmart-specific metadata
      metadata: {
        ucode: productData.ucode,
        format: productData.format,
        isSubscription: productData.is_subscription || false,
        warrantyPeriod: productData.warranty_period,
        originalStatus: productData.status,
      },

      // Timestamps
      createdAt: productData.created_at ? new Date(productData.created_at) : new Date(),
      updatedAt: new Date(),
    };

    return this.applyBusinessRules(product);
  }

  /**
   * Validate platform-specific product data
   */
  validateProductData(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for sales data format
    if (data.product && data.buyer && data.purchase) {
      if (!data.product.id) errors.push('Product ID is required');
      if (!data.product.name) errors.push('Product name is required');
      if (!data.purchase.price?.value) errors.push('Product price is required');
      if (!data.purchase.price?.currency_code) errors.push('Currency code is required');
    }
    // Check for catalog data format
    else if (data.id && data.name) {
      if (!data.id) errors.push('Product ID is required');
      if (!data.name) errors.push('Product name is required');
    }
    // Invalid format
    else {
      errors.push('Invalid Hotmart product data format');
    }

    // Warnings
    if (data.product && !data.product.name.trim()) {
      warnings.push('Product name is empty or contains only whitespace');
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
    // Hotmart doesn't have traditional stores, but we can use producer info
    if (data.producer) {
      return {
        storeId: data.producer.ucode,
        storeName: data.producer.name,
      };
    }

    return {};
  }

  /**
   * Apply platform-specific business rules
   */
  applyBusinessRules(productData: ProductData): ProductData {
    // Hotmart business rules
    
    // 1. All Hotmart products are digital by default
    if (!productData.type) {
      productData.type = ProductType.DIGITAL;
    }

    // 2. Set default currency if not provided
    if (!productData.currency) {
      productData.currency = 'USD';
    }

    // 3. Hotmart products don't have physical inventory
    productData.manageStock = false;
    // Note: These are already set to undefined in the initial object creation

    // 4. Set catalog visibility
    if (!productData.catalogVisibility) {
      productData.catalogVisibility = 'visible';
    }

    // 5. Featured products logic
    if (productData.metadata?.isSubscription) {
      productData.featured = true;
    }

    this.logger?.debug({ productData }, 'Applied Hotmart business rules');

    return productData;
  }

  /**
   * Map Hotmart product status to unified status
   */
  mapHotmartStatus(status: string): string {
    const statusMap: Record<string, ProductStatus> = {
      'DRAFT': ProductStatus.DRAFT,
      'ACTIVE': ProductStatus.ACTIVE,
      'PAUSED': ProductStatus.INACTIVE,
      'NOT_APPROVED': ProductStatus.DRAFT,
      'IN_REVIEW': ProductStatus.DRAFT,
      'DELETED': ProductStatus.ARCHIVED,
      'CHANGES_PENDING_ON_PRODUCT': ProductStatus.DRAFT,
    };

    return statusMap[status.toUpperCase()] || ProductStatus.ACTIVE;
  }

  /**
   * Map Hotmart product format to product type
   */
  mapHotmartFormat(format: string): ProductType {
    const formatMap: Record<string, ProductType> = {
      'EBOOK': ProductType.DIGITAL,
      'SOFTWARE': ProductType.DIGITAL,
      'MOBILE_APPS': ProductType.DIGITAL,
      'VIDEOS': ProductType.DIGITAL,
      'AUDIOS': ProductType.DIGITAL,
      'ONLINE_COURSE': ProductType.DIGITAL,
      'ETICKET': ProductType.SERVICE,
      'BUNDLE': ProductType.GROUPED,
      'PHYSICAL': ProductType.PHYSICAL,
      'COMMUNITY': ProductType.SERVICE,
    };

    return formatMap[format.toUpperCase()] || ProductType.DIGITAL;
  }

  /**
   * Transform unified product data back to platform format
   */
  transformToplatformFormat(productData: ProductData): HotmartProductData {
    return {
      id: parseInt(productData.externalId),
      name: productData.name,
      ucode: productData.metadata?.ucode,
      status: this.reverseMapStatus(productData.status),
      format: this.reverseMapFormat(productData.type),
      is_subscription: productData.metadata?.isSubscription || false,
      warranty_period: productData.metadata?.warrantyPeriod,
      created_at: productData.createdAt ? productData.createdAt.getTime() : undefined,
    };
  }

  /**
   * Reverse map unified status to Hotmart status
   */
  private reverseMapStatus(status: ProductStatus): string {
    const reverseMap: Record<ProductStatus, string> = {
      [ProductStatus.ACTIVE]: 'ACTIVE',
      [ProductStatus.DRAFT]: 'DRAFT',
      [ProductStatus.INACTIVE]: 'PAUSED',
      [ProductStatus.ARCHIVED]: 'DELETED',
    };

    return reverseMap[status] || 'ACTIVE';
  }

  /**
   * Reverse map unified type to Hotmart format
   */
  private reverseMapFormat(type: ProductType): string {
    const reverseMap: Record<ProductType, string> = {
      [ProductType.DIGITAL]: 'EBOOK',
      [ProductType.SERVICE]: 'ETICKET',
      [ProductType.GROUPED]: 'BUNDLE',
      [ProductType.PHYSICAL]: 'PHYSICAL',
      [ProductType.SIMPLE]: 'EBOOK',
      [ProductType.VARIABLE]: 'BUNDLE',
      [ProductType.EXTERNAL]: 'SOFTWARE',
    };

    return reverseMap[type] || 'EBOOK';
  }

  /**
   * Parse custom fields from Hotmart sales data
   */
  parseCustomFieldsFromSales(salesData: HotmartSalesData): ProductCustomFieldData[] {
    const fields: ProductCustomFieldData[] = [];

    // Add producer information as custom fields
    if (salesData.producer) {
      // This was moved to the section above

      if (salesData.producer.name) {
        fields.push({
          name: 'producer_name',
          value: salesData.producer.name,
          type: 'string',
        });
      }

      if ((salesData.producer as any).id) {
        fields.push({
          name: 'producer_id',
          value: (salesData.producer as any).id,
          type: 'string',
        });
      }
    }

    // Add purchase information as custom fields
    if (salesData.purchase) {
      fields.push({
        name: 'purchase_status',
        value: salesData.purchase.status,
        type: 'string',
      });

      if (salesData.purchase.payment?.method) {
        fields.push({
          name: 'payment_method',
          value: salesData.purchase.payment.method,
          type: 'string',
        });
      }
    }

    return fields;
  }

  /**
   * Parse custom fields from Hotmart catalog data
   */
  parseCustomFieldsFromCatalog(productData: HotmartProductData): ProductCustomFieldData[] {
    const fields: ProductCustomFieldData[] = [];

    if (productData.ucode) {
      fields.push({
        name: 'ucode',
        value: productData.ucode,
        type: 'string',
      });
    }

    if (productData.format) {
      fields.push({
        name: 'format',
        value: productData.format,
        type: 'string',
      });
    }

    if (productData.warranty_period) {
      fields.push({
        name: 'warranty_period',
        value: productData.warranty_period,
        type: 'number',
      });
    }

    return fields;
  }

  /**
   * Parse tags from Hotmart sales data
   */
  parseTagsFromSales(salesData: HotmartSalesData): string[] {
    const tags: string[] = [];

    // Add producer as tag
    if (salesData.producer?.name) {
      tags.push(`producer:${salesData.producer.name}`);
    }

    // Add product type as tag
    if ((salesData.product as any)?.type) {
      tags.push(`type:${(salesData.product as any).type}`);
    }

    // Add payment method as tag
    if (salesData.purchase?.payment?.method) {
      tags.push(`payment:${salesData.purchase.payment.method}`);
    }

    return tags;
  }

  /**
   * Parse tags from Hotmart catalog data
   */
  parseTagsFromCatalog(productData: HotmartProductData): string[] {
    const tags: string[] = [];

    if (productData.format) {
      tags.push(`format:${productData.format}`);
    }

    if (productData.is_subscription) {
      tags.push('subscription');
    }

    if (productData.status) {
      tags.push(`status:${productData.status}`);
    }

    return tags;
  }
}
