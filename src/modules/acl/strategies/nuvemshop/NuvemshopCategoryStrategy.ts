import { 
  CategoryData, 
  CategoryStatus,
  CategoryHierarchy,
  CategoryImageData,
  NuvemshopCategoryData 
} from '@/shared/types/category.types';
import { Platform, StrategyContext, ValidationResult, PlatformError } from '@/shared/types/platform.types';
import { INuvemshopCategoryStrategy, CategoryValidationResult } from '../interfaces/ICategoryStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Nuvemshop category strategy implementation
 */
export class NuvemshopCategoryStrategy implements INuvemshopCategoryStrategy {
  public readonly platform = Platform.NUVEMSHOP;
  private logger = createPlatformLogger('NUVEMSHOP', 'CategoryStrategy');

  /**
   * Parse platform-specific category data into unified format
   */
  async parseCategory(data: NuvemshopCategoryData, context: StrategyContext): Promise<CategoryData> {
    this.logger?.info({ data, context }, 'Parsing Nuvemshop category data');

    if (!data || !data.id) {
      throw new PlatformError(
        Platform.NUVEMSHOP,
        'INVALID_CATEGORY_DATA',
        'Invalid Nuvemshop category data format'
      );
    }

    const categoryData: CategoryData = {
      platform: Platform.NUVEMSHOP,
      externalId: data.id.toString(),
      storeId: context.storeId,
      name: this.parseMultiLanguageName(data.name, context.language),
      description: this.parseMultiLanguageDescription(data.description, context.language),
      slug: data.handle,
      parentId: data.parent ? data.parent.toString() : undefined,
      status: CategoryStatus.ACTIVE,
      seoTitle: this.parseMultiLanguageName(data.seo_title, context.language),
      seoDescription: this.parseMultiLanguageDescription(data.seo_description, context.language),
      image: this.parseCategoryImage(data.image),
      metadata: {
        googleShoppingCategory: data.google_shopping_category,
        subcategories: data.subcategories || [],
        customFields: this.parseCustomFields(data.custom_fields),
        originalData: data
      },
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
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

    const nuvemshopData = data as NuvemshopCategoryData;

    if (!nuvemshopData.id) {
      errors.push('Category ID is required');
    }

    if (!nuvemshopData.name || Object.keys(nuvemshopData.name).length === 0) {
      errors.push('Category name is required');
    }

    if (!nuvemshopData.handle) {
      errors.push('Category handle (slug) is required');
    }

    // Validate handle format
    if (nuvemshopData.handle && !/^[a-z0-9-]+$/.test(nuvemshopData.handle)) {
      errors.push('Category handle must contain only lowercase letters, numbers, and hyphens');
    }

    // Check for circular reference
    if (nuvemshopData.parent && nuvemshopData.parent === nuvemshopData.id) {
      errors.push('Category cannot be its own parent');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      categorySpecificErrors: {
        nameRequired: !nuvemshopData.name || Object.keys(nuvemshopData.name).length === 0,
        slugInvalid: nuvemshopData.handle && !/^[a-z0-9-]+$/.test(nuvemshopData.handle),
        circularReference: nuvemshopData.parent === nuvemshopData.id
      }
    };
  }

  /**
   * Extract store information from category data
   */
  extractStoreInfo(data: any): { storeId?: string; storeName?: string } {
    // Nuvemshop categories don't contain store info directly
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

    // Set default SEO data if not provided
    if (!categoryData.seoTitle) {
      categoryData.seoTitle = categoryData.name;
    }

    if (!categoryData.seoDescription && categoryData.description) {
      categoryData.seoDescription = categoryData.description.substring(0, 160);
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
   * Handle multi-language category names
   */
  parseMultiLanguageName(nameObject: Record<string, string>, defaultLanguage = 'es'): string {
    if (!nameObject || typeof nameObject !== 'object') {
      return '';
    }

    // Try to get name in preferred language, fallback to first available
    return nameObject[defaultLanguage] || 
           nameObject['es'] || 
           nameObject['pt'] || 
           nameObject['en'] || 
           Object.values(nameObject)[0] || 
           '';
  }

  /**
   * Handle multi-language category descriptions
   */
  parseMultiLanguageDescription(descriptionObject: Record<string, string>, defaultLanguage = 'es'): string {
    if (!descriptionObject || typeof descriptionObject !== 'object') {
      return '';
    }

    return descriptionObject[defaultLanguage] || 
           descriptionObject['es'] || 
           descriptionObject['pt'] || 
           descriptionObject['en'] || 
           Object.values(descriptionObject)[0] || 
           '';
  }

  /**
   * Parse Nuvemshop category image
   */
  parseCategoryImage(imageData?: { id: number; src: string; alt?: string }): CategoryImageData | undefined {
    if (!imageData) return undefined;

    return {
      id: imageData.id,
      src: imageData.src,
      alt: imageData.alt || '',
      thumbnail: imageData.src, // Nuvemshop might provide different sizes
      name: `category-image-${imageData.id}`
    };
  }

  /**
   * Handle custom fields for categories
   */
  parseCustomFields(customFields?: Array<{ name: string; value: string; type: string }>): Record<string, any> {
    if (!customFields || !Array.isArray(customFields)) {
      return {};
    }

    const fields: Record<string, any> = {};
    
    customFields.forEach(field => {
      if (field.name && field.value !== undefined) {
        // Convert value based on type
        switch (field.type) {
          case 'number':
            fields[field.name] = parseFloat(field.value) || 0;
            break;
          case 'boolean':
            fields[field.name] = field.value === 'true' || field.value === '1';
            break;
          case 'json':
            try {
              fields[field.name] = JSON.parse(field.value);
            } catch {
              fields[field.name] = field.value;
            }
            break;
          default:
            fields[field.name] = field.value;
        }
      }
    });

    return fields;
  }

  /**
   * Map Nuvemshop category to unified format
   */
  mapNuvemshopCategory(category: NuvemshopCategoryData): CategoryData {
    return {
      platform: Platform.NUVEMSHOP,
      externalId: category.id.toString(),
      name: this.parseMultiLanguageName(category.name),
      description: this.parseMultiLanguageDescription(category.description),
      slug: category.handle,
      parentId: category.parent ? category.parent.toString() : undefined,
      status: CategoryStatus.ACTIVE,
      seoTitle: this.parseMultiLanguageName(category.seo_title),
      seoDescription: this.parseMultiLanguageDescription(category.seo_description),
      image: this.parseCategoryImage(category.image),
      metadata: {
        googleShoppingCategory: category.google_shopping_category,
        subcategories: category.subcategories || [],
        customFields: this.parseCustomFields(category.custom_fields)
      },
      createdAt: new Date(category.created_at),
      updatedAt: new Date(category.updated_at)
    };
  }

  /**
   * Transform unified category data back to platform format
   */
  transformToPlatformFormat(categoryData: CategoryData): Partial<NuvemshopCategoryData> {
    const customFields = categoryData.metadata?.customFields || {};
    const customFieldsArray = Object.entries(customFields).map(([name, value]) => ({
      name,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      type: typeof value
    }));

    return {
      name: { es: categoryData.name }, // Default to Spanish, should be expanded based on requirements
      description: categoryData.description ? { es: categoryData.description } : undefined,
      handle: categoryData.slug,
      parent: categoryData.parentId ? parseInt(categoryData.parentId) : undefined,
      seo_title: categoryData.seoTitle ? { es: categoryData.seoTitle } : undefined,
      seo_description: categoryData.seoDescription ? { es: categoryData.seoDescription } : undefined,
      google_shopping_category: categoryData.metadata?.googleShoppingCategory,
      custom_fields: customFieldsArray.length > 0 ? customFieldsArray : undefined,
      image: categoryData.image ? {
        id: Number(categoryData.image.id),
        src: categoryData.image.src,
        alt: categoryData.image.alt
      } : undefined
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
}
