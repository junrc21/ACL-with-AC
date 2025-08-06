import { Category } from '@prisma/client';
import { CategoriesRepository } from '../repositories/categories.repository';
import { categoryStrategyFactory } from '../strategies/factories/CategoryStrategyFactory';
import { 
  CategoryData, 
  CategoryHierarchy,
  CategoryStatistics,
  CategoryQueryParams,
  CategoryStatus
} from '@/shared/types/category.types';
import { Platform, StrategyContext, PlatformError } from '@/shared/types/platform.types';
import { CategorySyncResult } from '../strategies/interfaces/ICategoryStrategy';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Category processing result
 */
export interface CategoryProcessingResult {
  success: boolean;
  externalId: string;
  platform: Platform;
  categoryId?: string;
  errors: string[];
  warnings: string[];
  processingTime?: number;
}

/**
 * Category service for business logic
 */
export class CategoriesService {
  private logger = createPlatformLogger('SERVICE', 'CategoriesService');

  constructor(
    private categoriesRepository: CategoriesRepository = new CategoriesRepository()
  ) {}

  /**
   * Process category data from any platform
   */
  async processCategory(
    platform: Platform,
    data: any,
    context: StrategyContext
  ): Promise<CategoryProcessingResult> {
    const startTime = Date.now();
    
    this.logger.info({
      platform,
      storeId: context.storeId,
    }, 'Processing category data');

    try {
      // Get platform strategy
      const strategy = categoryStrategyFactory.getStrategy(platform);

      // Validate data
      const validation = strategy.validateCategoryData(data);
      if (!validation.isValid) {
        return {
          success: false,
          externalId: data.id?.toString() || 'unknown',
          platform,
          errors: validation.errors,
          warnings: validation.warnings,
          processingTime: Date.now() - startTime,
        };
      }

      // Parse category data
      const categoryData = await strategy.parseCategory(data, context);

      // Save to database
      const category = await this.categoriesRepository.upsert(categoryData);

      this.logger.info({
        categoryId: category.id,
        platform,
        externalId: category.externalId,
        processingTime: Date.now() - startTime,
      }, 'Category processed successfully');

      return {
        success: true,
        externalId: category.externalId,
        platform,
        categoryId: category.id,
        errors: [],
        warnings: validation.warnings,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      this.logger.error({
        error,
        platform,
        storeId: context.storeId,
        processingTime: Date.now() - startTime,
      }, 'Failed to process category');

      return {
        success: false,
        externalId: data.id?.toString() || 'unknown',
        platform,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Synchronize categories from platform
   */
  async syncCategories(
    platform: Platform,
    categories: any[],
    context: StrategyContext
  ): Promise<CategorySyncResult> {
    const startTime = Date.now();
    
    this.logger.info({
      platform,
      categoryCount: categories.length,
      storeId: context.storeId,
    }, 'Starting category synchronization');

    const result: CategorySyncResult = {
      success: true,
      categoriesProcessed: 0,
      categoriesCreated: 0,
      categoriesUpdated: 0,
      categoriesSkipped: 0,
      errors: [],
    };

    try {
      const strategy = categoryStrategyFactory.getStrategy(platform);

      for (const categoryData of categories) {
        try {
          result.categoriesProcessed++;

          // Check if category already exists
          const exists = await this.categoriesRepository.exists(
            platform,
            categoryData.id?.toString() || categoryData.externalId,
            context.storeId
          );

          const processResult = await this.processCategory(platform, categoryData, context);

          if (processResult.success) {
            if (exists) {
              result.categoriesUpdated++;
            } else {
              result.categoriesCreated++;
            }
          } else {
            result.categoriesSkipped++;
            result.errors.push({
              categoryId: processResult.externalId,
              error: processResult.errors.join(', '),
              details: processResult,
            });
          }

        } catch (error) {
          result.categoriesSkipped++;
          result.errors.push({
            categoryId: categoryData.id?.toString() || 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error,
          });
        }
      }

      // Build hierarchy after sync
      if (result.categoriesCreated > 0 || result.categoriesUpdated > 0) {
        const allCategories = await this.getCategoriesByPlatform(platform, context.storeId);
        result.hierarchy = strategy.buildHierarchy(allCategories);
      }

      // Determine overall success
      result.success = result.errors.length === 0 || 
                      (result.categoriesCreated + result.categoriesUpdated) > 0;

      this.logger.info({
        platform,
        storeId: context.storeId,
        result,
        processingTime: Date.now() - startTime,
      }, 'Category synchronization completed');

      return result;

    } catch (error) {
      this.logger.error({
        error,
        platform,
        storeId: context.storeId,
        processingTime: Date.now() - startTime,
      }, 'Category synchronization failed');

      result.success = false;
      result.errors.push({
        error: error instanceof Error ? error.message : 'Synchronization failed',
        details: error,
      });

      return result;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<CategoryData | null> {
    this.logger.debug({ id }, 'Getting category by ID');

    try {
      const category = await this.categoriesRepository.findById(id);
      
      if (!category) {
        return null;
      }

      return this.mapCategoryToData(category);
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to get category by ID');
      throw error;
    }
  }

  /**
   * Get categories by platform
   */
  async getCategoriesByPlatform(platform: Platform, storeId?: string): Promise<CategoryData[]> {
    this.logger.debug({ platform, storeId }, 'Getting categories by platform');

    try {
      const { categories } = await this.categoriesRepository.findMany({
        platform,
        storeId,
        limit: 1000, // Large limit to get all categories
      });

      return categories.map(category => this.mapCategoryToData(category));
    } catch (error) {
      this.logger.error({ error, platform, storeId }, 'Failed to get categories by platform');
      throw error;
    }
  }

  /**
   * Get category hierarchy
   */
  async getCategoryHierarchy(platform: Platform, storeId?: string): Promise<CategoryHierarchy[]> {
    this.logger.debug({ platform, storeId }, 'Getting category hierarchy');

    try {
      const strategy = categoryStrategyFactory.getStrategy(platform);
      const categories = await this.getCategoriesByPlatform(platform, storeId);
      
      return strategy.buildHierarchy(categories);
    } catch (error) {
      this.logger.error({ error, platform, storeId }, 'Failed to get category hierarchy');
      throw error;
    }
  }

  /**
   * Get category path (breadcrumb)
   */
  async getCategoryPath(categoryId: string, platform: Platform, storeId?: string): Promise<CategoryData[]> {
    this.logger.debug({ categoryId, platform, storeId }, 'Getting category path');

    try {
      const strategy = categoryStrategyFactory.getStrategy(platform);
      const categories = await this.getCategoriesByPlatform(platform, storeId);
      
      return strategy.getCategoryPath(categoryId, categories);
    } catch (error) {
      this.logger.error({ error, categoryId, platform, storeId }, 'Failed to get category path');
      throw error;
    }
  }

  /**
   * Search categories
   */
  async searchCategories(params: CategoryQueryParams): Promise<{
    categories: CategoryData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    this.logger.debug({ params }, 'Searching categories');

    try {
      const { categories, total } = await this.categoriesRepository.findMany(params);
      const page = params.page || 1;
      const limit = params.limit || 50;
      const totalPages = Math.ceil(total / limit);

      return {
        categories: categories.map(category => this.mapCategoryToData(category)),
        total,
        page,
        totalPages,
      };
    } catch (error) {
      this.logger.error({ error, params }, 'Failed to search categories');
      throw error;
    }
  }

  /**
   * Update category
   */
  async updateCategory(id: string, updates: Partial<CategoryData>): Promise<CategoryData> {
    this.logger.info({ id, updates: Object.keys(updates) }, 'Updating category');

    try {
      const category = await this.categoriesRepository.update(id, updates);
      return this.mapCategoryToData(category);
    } catch (error) {
      this.logger.error({ error, id, updates }, 'Failed to update category');
      throw error;
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string): Promise<void> {
    this.logger.info({ id }, 'Deleting category');

    try {
      await this.categoriesRepository.delete(id);
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to delete category');
      throw error;
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStatistics(platform?: Platform, storeId?: string): Promise<CategoryStatistics> {
    this.logger.debug({ platform, storeId }, 'Getting category statistics');

    try {
      const { categories, total } = await this.categoriesRepository.findMany({
        platform,
        storeId,
        limit: 1000,
      });

      const activeCategories = categories.filter(c => 
        c.metadata?.status !== CategoryStatus.INACTIVE && 
        c.metadata?.status !== CategoryStatus.ARCHIVED
      ).length;

      const categoriesWithProducts = categories.filter(c => 
        c.products && c.products.length > 0
      ).length;

      const totalProducts = categories.reduce((sum, c) => 
        sum + (c.products?.length || 0), 0
      );

      const averageProductsPerCategory = categoriesWithProducts > 0 
        ? totalProducts / categoriesWithProducts 
        : 0;

      const topCategories = categories
        .map(c => ({
          category: this.mapCategoryToData(c),
          productCount: c.products?.length || 0,
        }))
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, 10);

      return {
        totalCategories: total,
        activeCategories,
        categoriesWithProducts,
        averageProductsPerCategory: Math.round(averageProductsPerCategory * 100) / 100,
        topCategories,
      };
    } catch (error) {
      this.logger.error({ error, platform, storeId }, 'Failed to get category statistics');
      throw error;
    }
  }

  /**
   * Map database category to CategoryData
   */
  private mapCategoryToData(category: Category): CategoryData {
    return {
      platform: category.platform as Platform,
      externalId: category.externalId,
      storeId: category.storeId,
      name: category.name,
      description: category.description || undefined,
      slug: category.slug,
      parentId: category.parentId || undefined,
      seoTitle: category.seoTitle || undefined,
      seoDescription: category.seoDescription || undefined,
      metadata: category.metadata as any,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
