import { 
  CategoryData, 
  CategoryStatus,
  CategoryDisplayType,
  CategoryHierarchy,
  CategoryImageData,
  WooCommerceCategoryData 
} from '@/shared/types/category.types';
import { Platform, StrategyContext, ValidationResult, PlatformError } from '@/shared/types/platform.types';
import { IWooCommerceCategoryStrategy, CategoryValidationResult } from '../interfaces/ICategoryStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * WooCommerce category strategy implementation
 */
export class WoocommerceCategoryStrategy implements IWooCommerceCategoryStrategy {
  public readonly platform = Platform.WOOCOMMERCE;
  private logger = createPlatformLogger('WOOCOMMERCE', 'CategoryStrategy');

  /**
   * Parse platform-specific category data into unified format
   */
  async parseCategory(data: WooCommerceCategoryData, context: StrategyContext): Promise<CategoryData> {
    this.logger?.info({ data, context }, 'Parsing WooCommerce category data');

    if (!data || !data.id) {
      throw new PlatformError(
        Platform.WOOCOMMERCE,
        'INVALID_CATEGORY_DATA',
        'Invalid WooCommerce category data format'
      );
    }

    const categoryData: CategoryData = {
      platform: Platform.WOOCOMMERCE,
      externalId: data.id.toString(),
      storeId: context.storeId,
      name: data.name,
      description: data.description,
      slug: data.slug,
      parentId: data.parent > 0 ? data.parent.toString() : undefined,
      status: CategoryStatus.ACTIVE,
      displayType: this.mapWooCommerceDisplayType(data.display),
      menuOrder: data.menu_order,
      productCount: data.count,
      image: this.parseCategoryImage(data.image),
      metadata: {
        metaData: this.parseMetaData(data.meta_data),
        originalData: data
      },
      createdAt: new Date(data.date_created),
      updatedAt: new Date(data.date_modified)
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

    const wooData = data as WooCommerceCategoryData;

    if (!wooData.id) {
      errors.push('Category ID is required');
    }

    if (!wooData.name || wooData.name.trim() === '') {
      errors.push('Category name is required');
    }

    if (!wooData.slug || wooData.slug.trim() === '') {
      errors.push('Category slug is required');
    }

    // Validate slug format
    if (wooData.slug && !/^[a-z0-9-]+$/.test(wooData.slug)) {
      errors.push('Category slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Validate display type
    if (wooData.display && !['default', 'products', 'subcategories', 'both'].includes(wooData.display)) {
      errors.push('Invalid display type. Must be: default, products, subcategories, or both');
    }

    // Check for circular reference
    if (wooData.parent && wooData.parent === wooData.id) {
      errors.push('Category cannot be its own parent');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      categorySpecificErrors: {
        nameRequired: !wooData.name || wooData.name.trim() === '',
        slugInvalid: wooData.slug && !/^[a-z0-9-]+$/.test(wooData.slug),
        circularReference: wooData.parent === wooData.id
      }
    };
  }

  /**
   * Extract store information from category data
   */
  extractStoreInfo(data: any): { storeId?: string; storeName?: string } {
    // WooCommerce categories don't contain store info directly
    // Store ID should be provided in context
    return {};
  }

  /**
   * Handle platform-specific business rules
   */
  applyBusinessRules(categoryData: CategoryData): CategoryData {
    // Ensure slug is URL-friendly
    if (categoryData.slug) {
      categoryData.slug = categoryData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }

    // Set default display type if not provided
    if (!categoryData.displayType) {
      categoryData.displayType = CategoryDisplayType.DEFAULT;
    }

    // Set default SEO data if not provided
    if (!categoryData.seoTitle) {
      categoryData.seoTitle = categoryData.name;
    }

    if (!categoryData.seoDescription && categoryData.description) {
      categoryData.seoDescription = this.stripHtml(categoryData.description).substring(0, 160);
    }

    // Calculate hierarchy level
    categoryData.level = categoryData.parentId ? 1 : 0;

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

    // Build hierarchy
    categories.forEach(category => {
      if (!category.parentId) {
        // Root category
        const children = this.buildChildrenHierarchy(category, categories, categoryMap);
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
    const path: CategoryData[] = [];
    let currentCategory = categories.find(c => c.externalId === categoryId);

    while (currentCategory) {
      path.unshift(currentCategory);
      
      if (currentCategory.parentId) {
        currentCategory = categories.find(c => c.externalId === currentCategory!.parentId);
      } else {
        break;
      }
    }

    return path;
  }

  /**
   * Map WooCommerce display type to unified format
   */
  mapWooCommerceDisplayType(display: string): CategoryDisplayType {
    switch (display) {
      case 'products':
        return CategoryDisplayType.PRODUCTS;
      case 'subcategories':
        return CategoryDisplayType.SUBCATEGORIES;
      case 'both':
        return CategoryDisplayType.BOTH;
      default:
        return CategoryDisplayType.DEFAULT;
    }
  }

  /**
   * Parse WooCommerce category image
   */
  parseCategoryImage(imageData?: any): CategoryImageData | undefined {
    if (!imageData || !imageData.src) return undefined;

    return {
      id: imageData.id,
      src: imageData.src,
      alt: imageData.alt || '',
      thumbnail: imageData.src, // WooCommerce provides full URL
      name: imageData.name || `category-image-${imageData.id}`,
      srcset: imageData.srcset,
      sizes: imageData.sizes
    };
  }

  /**
   * Handle WooCommerce meta data
   */
  parseMetaData(metaData?: Array<{ id: number; key: string; value: string }>): Record<string, any> {
    if (!metaData || !Array.isArray(metaData)) {
      return {};
    }

    const meta: Record<string, any> = {};
    
    metaData.forEach(item => {
      if (item.key && item.value !== undefined) {
        // Try to parse JSON values
        try {
          meta[item.key] = JSON.parse(item.value);
        } catch {
          meta[item.key] = item.value;
        }
      }
    });

    return meta;
  }

  /**
   * Map WooCommerce category to unified format
   */
  mapWooCommerceCategory(category: WooCommerceCategoryData): CategoryData {
    return {
      platform: Platform.WOOCOMMERCE,
      externalId: category.id.toString(),
      name: category.name,
      description: category.description,
      slug: category.slug,
      parentId: category.parent > 0 ? category.parent.toString() : undefined,
      status: CategoryStatus.ACTIVE,
      displayType: this.mapWooCommerceDisplayType(category.display),
      menuOrder: category.menu_order,
      productCount: category.count,
      image: this.parseCategoryImage(category.image),
      metadata: {
        metaData: this.parseMetaData(category.meta_data)
      },
      createdAt: new Date(category.date_created),
      updatedAt: new Date(category.date_modified)
    };
  }

  /**
   * Handle WooCommerce taxonomy terms
   */
  parseTaxonomyTerms(terms: any[]): CategoryData[] {
    if (!terms || !Array.isArray(terms)) {
      return [];
    }

    return terms.map(term => ({
      platform: Platform.WOOCOMMERCE,
      externalId: term.id.toString(),
      name: term.name,
      description: term.description || '',
      slug: term.slug,
      parentId: term.parent > 0 ? term.parent.toString() : undefined,
      status: CategoryStatus.ACTIVE,
      productCount: term.count || 0,
      metadata: {
        taxonomy: term.taxonomy,
        termId: term.id
      }
    }));
  }

  /**
   * Transform unified category data back to platform format
   */
  transformToPlatformFormat(categoryData: CategoryData): Partial<WooCommerceCategoryData> {
    const metaData = categoryData.metadata?.metaData || {};
    const metaDataArray = Object.entries(metaData).map(([key, value], index) => ({
      id: index + 1,
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));

    return {
      name: categoryData.name,
      description: categoryData.description || '',
      slug: categoryData.slug,
      parent: categoryData.parentId ? parseInt(categoryData.parentId) : 0,
      display: this.mapUnifiedDisplayTypeToWooCommerce(categoryData.displayType),
      menu_order: categoryData.menuOrder || 0,
      image: categoryData.image ? {
        id: Number(categoryData.image.id),
        src: categoryData.image.src,
        name: categoryData.image.name || '',
        alt: categoryData.image.alt || '',
        date_created: new Date().toISOString(),
        date_created_gmt: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        date_modified_gmt: new Date().toISOString()
      } : undefined,
      meta_data: metaDataArray.length > 0 ? metaDataArray : undefined
    };
  }

  // Private helper methods

  private buildChildrenHierarchy(
    parent: CategoryData, 
    allCategories: CategoryData[], 
    categoryMap: Map<string, CategoryData>
  ): CategoryHierarchy[] {
    const children: CategoryHierarchy[] = [];
    
    allCategories
      .filter(cat => cat.parentId === parent.externalId)
      .forEach(child => {
        const grandChildren = this.buildChildrenHierarchy(child, allCategories, categoryMap);
        children.push({
          category: child,
          children: grandChildren,
          parent
        });
      });

    return children;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  private mapUnifiedDisplayTypeToWooCommerce(displayType?: CategoryDisplayType): string {
    switch (displayType) {
      case CategoryDisplayType.PRODUCTS:
        return 'products';
      case CategoryDisplayType.SUBCATEGORIES:
        return 'subcategories';
      case CategoryDisplayType.BOTH:
        return 'both';
      default:
        return 'default';
    }
  }
}
