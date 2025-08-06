import { Request, Response } from 'express';
import { CategoriesService } from '../services/categories.service';
import { PlatformRequest } from '@/middlewares/platform.middleware';
import { asyncHandler, ApiError } from '@/middlewares/error.middleware';
import { 
  CreateCategoryRequestSchema,
  UpdateCategoryRequestSchema,
  CategoryQuerySchema,
  SyncCategoryRequestSchema,
  HotmartCategorySchema,
  NuvemshopCategorySchema,
  WooCommerceCategorySchema
} from '../dto/category.dto';
import { Platform } from '@/shared/types/platform.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Categories controller for handling HTTP requests
 */
export class CategoriesController {
  private logger = createPlatformLogger('CONTROLLER', 'CategoriesController');

  constructor(
    private categoriesService: CategoriesService = new CategoriesService()
  ) {}

  /**
   * Create/process a single category
   * POST /api/acl/categories
   */
  public createCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;
    const { platform, storeId, platformHeaders } = platformRequest;

    this.logger.info({
      platform,
      storeId,
      method: req.method,
      path: req.path,
    }, 'Processing category creation request');

    // Validate request body based on platform
    const validatedData = this.validatePlatformData(platform, req.body);

    // Create strategy context
    const context = {
      platform,
      storeId,
      headers: platformHeaders,
      timestamp: new Date(),
    };

    // Process category
    const result = await this.categoriesService.processCategory(platform, validatedData, context);

    if (!result.success) {
      throw new ApiError(400, 'Category processing failed', {
        errors: result.errors,
        warnings: result.warnings,
      });
    }

    this.logger.info({
      categoryId: result.categoryId,
      platform,
      storeId,
      processingTime: result.processingTime,
    }, 'Category created successfully');

    res.status(201).json({
      success: true,
      data: {
        categoryId: result.categoryId,
        externalId: result.externalId,
        platform: result.platform,
        processingTime: result.processingTime,
      },
      warnings: result.warnings,
    });
  });

  /**
   * Sync multiple categories
   * POST /api/acl/categories/sync
   */
  public syncCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;
    const { platform, storeId, platformHeaders } = platformRequest;

    this.logger.info({
      platform,
      storeId,
      categoryCount: req.body.categories?.length || 0,
    }, 'Processing category sync request');

    // Validate sync request
    const validation = SyncCategoryRequestSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, 'Invalid sync request', {
        errors: validation.error.errors,
      });
    }

    const { categories } = validation.data;

    // Create strategy context
    const context = {
      platform,
      storeId,
      headers: platformHeaders,
      timestamp: new Date(),
    };

    // Sync categories
    const result = await this.categoriesService.syncCategories(platform, categories, context);

    this.logger.info({
      platform,
      storeId,
      result: {
        success: result.success,
        processed: result.categoriesProcessed,
        created: result.categoriesCreated,
        updated: result.categoriesUpdated,
        skipped: result.categoriesSkipped,
        errors: result.errors.length,
      },
    }, 'Category sync completed');

    res.status(200).json({
      success: result.success,
      data: result,
    });
  });

  /**
   * Get categories with query parameters
   * GET /api/acl/categories
   */
  public getCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;
    const { platform, storeId } = platformRequest;

    this.logger.debug({
      platform,
      storeId,
      query: req.query,
    }, 'Getting categories');

    // Validate query parameters
    const validation = CategoryQuerySchema.safeParse({
      ...req.query,
      platform,
      storeId,
    });

    if (!validation.success) {
      throw new ApiError(400, 'Invalid query parameters', {
        errors: validation.error.errors,
      });
    }

    const queryParams = validation.data;

    // Search categories
    const result = await this.categoriesService.searchCategories(queryParams);

    this.logger.debug({
      platform,
      storeId,
      count: result.categories.length,
      total: result.total,
    }, 'Categories retrieved');

    res.status(200).json({
      success: true,
      data: result.categories,
      pagination: {
        page: result.page,
        limit: queryParams.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * Get category by ID
   * GET /api/acl/categories/:id
   */
  public getCategoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const platformRequest = req as PlatformRequest;
    const { platform, storeId } = platformRequest;

    this.logger.debug({
      id,
      platform,
      storeId,
    }, 'Getting category by ID');

    const category = await this.categoriesService.getCategoryById(id);

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    this.logger.debug({
      id,
      platform,
      storeId,
      categoryName: category.name,
    }, 'Category retrieved');

    res.status(200).json({
      success: true,
      data: category,
    });
  });

  /**
   * Update category
   * PUT /api/acl/categories/:id
   */
  public updateCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const platformRequest = req as PlatformRequest;
    const { platform, storeId } = platformRequest;

    this.logger.info({
      id,
      platform,
      storeId,
      updates: Object.keys(req.body),
    }, 'Updating category');

    // Validate update request
    const validation = UpdateCategoryRequestSchema.safeParse({
      ...req.body,
      categoryId: id,
      platform,
      storeId,
    });

    if (!validation.success) {
      throw new ApiError(400, 'Invalid update request', {
        errors: validation.error.errors,
      });
    }

    const { data: updates } = validation.data;

    // Update category
    const category = await this.categoriesService.updateCategory(id, updates);

    this.logger.info({
      id,
      platform,
      storeId,
      categoryName: category.name,
    }, 'Category updated successfully');

    res.status(200).json({
      success: true,
      data: category,
    });
  });

  /**
   * Delete category
   * DELETE /api/acl/categories/:id
   */
  public deleteCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const platformRequest = req as PlatformRequest;
    const { platform, storeId } = platformRequest;

    this.logger.info({
      id,
      platform,
      storeId,
    }, 'Deleting category');

    await this.categoriesService.deleteCategory(id);

    this.logger.info({
      id,
      platform,
      storeId,
    }, 'Category deleted successfully');

    res.status(204).send();
  });

  /**
   * Get category hierarchy tree
   * GET /api/acl/categories/tree
   */
  public getCategoryTree = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;
    const { platform, storeId } = platformRequest;

    this.logger.debug({
      platform,
      storeId,
    }, 'Getting category hierarchy tree');

    const hierarchy = await this.categoriesService.getCategoryHierarchy(platform, storeId);

    this.logger.debug({
      platform,
      storeId,
      rootCategories: hierarchy.length,
    }, 'Category hierarchy retrieved');

    res.status(200).json({
      success: true,
      data: hierarchy,
    });
  });

  /**
   * Get category path (breadcrumb)
   * GET /api/acl/categories/:id/path
   */
  public getCategoryPath = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const platformRequest = req as PlatformRequest;
    const { platform, storeId } = platformRequest;

    this.logger.debug({
      id,
      platform,
      storeId,
    }, 'Getting category path');

    const path = await this.categoriesService.getCategoryPath(id, platform, storeId);

    this.logger.debug({
      id,
      platform,
      storeId,
      pathLength: path.length,
    }, 'Category path retrieved');

    res.status(200).json({
      success: true,
      data: path,
    });
  });

  /**
   * Get category statistics
   * GET /api/acl/categories/statistics
   */
  public getCategoryStatistics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const platformRequest = req as PlatformRequest;
    const { platform, storeId } = platformRequest;

    this.logger.debug({
      platform,
      storeId,
    }, 'Getting category statistics');

    const statistics = await this.categoriesService.getCategoryStatistics(platform, storeId);

    this.logger.debug({
      platform,
      storeId,
      totalCategories: statistics.totalCategories,
    }, 'Category statistics retrieved');

    res.status(200).json({
      success: true,
      data: statistics,
    });
  });

  /**
   * Validate platform-specific data
   */
  private validatePlatformData(platform: Platform, data: any): any {
    switch (platform) {
      case Platform.HOTMART:
        const hotmartValidation = HotmartCategorySchema.safeParse(data);
        if (!hotmartValidation.success) {
          throw new ApiError(400, 'Invalid Hotmart category data', {
            errors: hotmartValidation.error.errors,
          });
        }
        return hotmartValidation.data;

      case Platform.NUVEMSHOP:
        const nuvemshopValidation = NuvemshopCategorySchema.safeParse(data);
        if (!nuvemshopValidation.success) {
          throw new ApiError(400, 'Invalid Nuvemshop category data', {
            errors: nuvemshopValidation.error.errors,
          });
        }
        return nuvemshopValidation.data;

      case Platform.WOOCOMMERCE:
        const woocommerceValidation = WooCommerceCategorySchema.safeParse(data);
        if (!woocommerceValidation.success) {
          throw new ApiError(400, 'Invalid WooCommerce category data', {
            errors: woocommerceValidation.error.errors,
          });
        }
        return woocommerceValidation.data;

      default:
        throw new ApiError(400, `Unsupported platform: ${platform}`);
    }
  }
}
