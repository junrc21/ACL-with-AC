import { 
  CategoryData, 
  CategoryStatus,
  CategoryHierarchy,
  HotmartCategoryData 
} from '@/shared/types/category.types';
import { Platform, StrategyContext, ValidationResult, PlatformError } from '@/shared/types/platform.types';
import { IHotmartCategoryStrategy, CategoryValidationResult } from '../interfaces/ICategoryStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Hotmart category strategy implementation
 * Since Hotmart doesn't have traditional categories, we create virtual categories
 * based on producers, product types, and metadata
 */
export class HotmartCategoryStrategy implements IHotmartCategoryStrategy {
  public readonly platform = Platform.HOTMART;
  private logger = createPlatformLogger('HOTMART', 'CategoryStrategy');

  /**
   * Parse platform-specific category data into unified format
   */
  async parseCategory(data: any, context: StrategyContext): Promise<CategoryData> {
    this.logger?.info({ data, context }, 'Parsing Hotmart virtual category data');

    if (!data || typeof data !== 'object') {
      throw new PlatformError(
        Platform.HOTMART,
        'INVALID_CATEGORY_DATA',
        'Invalid Hotmart category data format'
      );
    }

    const hotmartData = data as HotmartCategoryData;
    
    const categoryData: CategoryData = {
      platform: Platform.HOTMART,
      externalId: this.generateVirtualCategoryId(hotmartData),
      storeId: context.storeId,
      name: hotmartData.label,
      description: this.generateCategoryDescription(hotmartData),
      slug: this.generateSlug(hotmartData.label),
      status: CategoryStatus.ACTIVE,
      productCount: hotmartData.productCount || 0,
      metadata: {
        type: hotmartData.type,
        value: hotmartData.value,
        ...hotmartData.metadata
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.applyBusinessRules(categoryData);
  }

  /**
   * Validate platform-specific category data
   */
  validateCategoryData(data: any): CategoryValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      errors.push('Category data is required');
      return { isValid: false, errors, warnings };
    }

    const hotmartData = data as HotmartCategoryData;

    if (!hotmartData.type) {
      errors.push('Category type is required');
    }

    if (!hotmartData.value) {
      errors.push('Category value is required');
    }

    if (!hotmartData.label) {
      errors.push('Category label is required');
    }

    if (!['producer', 'product_type', 'tag', 'custom'].includes(hotmartData.type)) {
      errors.push('Invalid category type. Must be: producer, product_type, tag, or custom');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Extract store information from category data
   */
  extractStoreInfo(data: any): { storeId?: string; storeName?: string } {
    const hotmartData = data as HotmartCategoryData;
    
    return {
      storeId: hotmartData.metadata?.producerId,
      storeName: hotmartData.metadata?.producerName
    };
  }

  /**
   * Handle platform-specific business rules
   */
  applyBusinessRules(categoryData: CategoryData): CategoryData {
    // Ensure virtual categories are always active
    categoryData.status = CategoryStatus.ACTIVE;
    
    // Set hierarchy level based on category type
    if (categoryData.metadata?.type === 'producer') {
      categoryData.level = 0; // Top level
    } else {
      categoryData.level = 1; // Sub-level
    }

    // Generate SEO-friendly data
    categoryData.seoTitle = `${categoryData.name} - Hotmart Products`;
    categoryData.seoDescription = categoryData.description || `Browse ${categoryData.name} products on Hotmart`;

    return categoryData;
  }

  /**
   * Build category hierarchy from flat category list
   */
  buildHierarchy(categories: CategoryData[]): CategoryHierarchy[] {
    const hierarchy: CategoryHierarchy[] = [];
    const categoryMap = new Map<string, CategoryData>();
    
    // Create map for quick lookup
    categories.forEach(category => {
      categoryMap.set(category.externalId, category);
    });

    // Build hierarchy - producers at top level, others as children
    categories.forEach(category => {
      if (category.metadata?.type === 'producer') {
        const children = categories
          .filter(c => c.metadata?.producerId === category.metadata?.producerId && c.externalId !== category.externalId)
          .map(child => ({ category: child, children: [], parent: category }));
        
        hierarchy.push({
          category,
          children,
          parent: undefined
        });
      }
    });

    return hierarchy;
  }

  /**
   * Get category path (breadcrumb) for a given category
   */
  getCategoryPath(categoryId: string, categories: CategoryData[]): CategoryData[] {
    const category = categories.find(c => c.externalId === categoryId);
    if (!category) return [];

    const path: CategoryData[] = [category];
    
    // If this is not a producer category, find its producer parent
    if (category.metadata?.type !== 'producer' && category.metadata?.producerId) {
      const producer = categories.find(c => 
        c.metadata?.type === 'producer' && 
        c.metadata?.producerId === category.metadata?.producerId
      );
      if (producer) {
        path.unshift(producer);
      }
    }

    return path;
  }

  /**
   * Create virtual categories from product data
   */
  async createVirtualCategoriesFromProducts(products: any[]): Promise<CategoryData[]> {
    const categories: CategoryData[] = [];
    const productTypeMap = new Map<string, number>();

    // Count products by type
    products.forEach(product => {
      const type = product.type || 'digital';
      productTypeMap.set(type, (productTypeMap.get(type) || 0) + 1);
    });

    // Create categories for each product type
    for (const [type, count] of productTypeMap) {
      const categoryData: HotmartCategoryData = {
        type: 'product_type',
        value: type,
        label: this.formatProductTypeLabel(type),
        productCount: count
      };

      const category = await this.parseCategory(categoryData, { storeId: 'hotmart' });
      categories.push(category);
    }

    return categories;
  }

  /**
   * Create virtual categories from producer data
   */
  async createVirtualCategoriesFromProducers(producers: any[]): Promise<CategoryData[]> {
    const categories: CategoryData[] = [];

    for (const producer of producers) {
      const categoryData: HotmartCategoryData = {
        type: 'producer',
        value: producer.id.toString(),
        label: producer.name || `Producer ${producer.id}`,
        productCount: producer.productCount || 0,
        metadata: {
          producerId: producer.id.toString(),
          producerName: producer.name
        }
      };

      const category = await this.parseCategory(categoryData, { storeId: 'hotmart' });
      categories.push(category);
    }

    return categories;
  }

  /**
   * Create virtual categories from sales data
   */
  async createVirtualCategoriesFromSales(salesData: any[]): Promise<CategoryData[]> {
    const categories: CategoryData[] = [];
    const producerMap = new Map<string, { name: string; count: number }>();

    // Extract producers from sales data
    salesData.forEach(sale => {
      if (sale.producer && sale.producer.id) {
        const producerId = sale.producer.id.toString();
        const existing = producerMap.get(producerId);
        producerMap.set(producerId, {
          name: sale.producer.name || `Producer ${producerId}`,
          count: (existing?.count || 0) + 1
        });
      }
    });

    // Create producer categories
    for (const [producerId, data] of producerMap) {
      const categoryData: HotmartCategoryData = {
        type: 'producer',
        value: producerId,
        label: data.name,
        productCount: data.count,
        metadata: {
          producerId,
          producerName: data.name
        }
      };

      const category = await this.parseCategory(categoryData, { storeId: 'hotmart' });
      categories.push(category);
    }

    return categories;
  }

  /**
   * Map Hotmart product type to category
   */
  mapProductTypeToCategory(productType: string): CategoryData {
    return {
      platform: Platform.HOTMART,
      externalId: `product_type_${productType}`,
      name: this.formatProductTypeLabel(productType),
      slug: this.generateSlug(productType),
      status: CategoryStatus.ACTIVE,
      metadata: {
        type: 'product_type',
        value: productType
      }
    };
  }

  /**
   * Map Hotmart producer to category
   */
  mapProducerToCategory(producer: any): CategoryData {
    return {
      platform: Platform.HOTMART,
      externalId: `producer_${producer.id}`,
      name: producer.name || `Producer ${producer.id}`,
      slug: this.generateSlug(producer.name || `producer-${producer.id}`),
      status: CategoryStatus.ACTIVE,
      metadata: {
        type: 'producer',
        value: producer.id.toString(),
        producerId: producer.id.toString(),
        producerName: producer.name
      }
    };
  }

  // Private helper methods

  private generateVirtualCategoryId(data: HotmartCategoryData): string {
    return `${data.type}_${data.value}`;
  }

  private generateCategoryDescription(data: HotmartCategoryData): string {
    switch (data.type) {
      case 'producer':
        return `Products from ${data.label}`;
      case 'product_type':
        return `${data.label} products`;
      case 'tag':
        return `Products tagged with ${data.label}`;
      default:
        return `${data.label} category`;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private formatProductTypeLabel(type: string): string {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
