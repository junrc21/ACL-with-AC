/**
 * Customer controller for handling customer-related API endpoints
 */

import { Request, Response } from 'express';
import { CustomersService } from '../services/customers.service';
import { PlatformRequest } from '@/middlewares/platform.middleware';
import { 
  validateCustomerSyncRequest,
  validateUpdateCustomerRequest,
  validateCustomerFilterQuery,
  transformCustomerToResponse,
  transformCustomersToListResponse,
  transformSyncResultToResponse,
  transformStatisticsToResponse,
} from '../dto/customer.dto';
import { createPlatformLogger } from '@/shared/utils/logger';
import { Platform } from '@/shared/types/platform.types';

const logger = createPlatformLogger('CustomersController');

/**
 * Controller class for customer endpoints
 */
export class CustomersController {
  private customersService: CustomersService;

  constructor() {
    this.customersService = new CustomersService();
  }

  /**
   * Sync customer data from platform
   * POST /api/acl/customers/sync
   */
  async syncCustomers(req: PlatformRequest, res: Response): Promise<void> {
    const { platform, storeId, platformHeaders } = req;

    logger.info({
      platform,
      storeId,
      userAgent: req.get('User-Agent'),
    }, 'Customer sync request received');

    try {
      // Validate request body
      const validatedRequest = validateCustomerSyncRequest(req.body);

      // Create strategy context
      const context = {
        platform,
        storeId,
        headers: platformHeaders,
        timestamp: new Date(),
      };

      let result;

      if (validatedRequest.customers && Array.isArray(validatedRequest.customers)) {
        // Batch processing
        result = await this.customersService.processCustomersBatch(
          platform,
          validatedRequest.customers,
          context
        );
      } else {
        // Single customer processing
        const singleResult = await this.customersService.processCustomer(
          platform,
          validatedRequest.data,
          context
        );

        result = {
          total: 1,
          processed: singleResult.success ? 1 : 0,
          created: singleResult.success && singleResult.isNew ? 1 : 0,
          updated: singleResult.success && !singleResult.isNew ? 1 : 0,
          failed: singleResult.success ? 0 : 1,
          results: [singleResult],
          errors: singleResult.errors || [],
        };
      }

      const response = transformSyncResultToResponse(result);

      logger.info({
        platform,
        storeId,
        total: result.total,
        processed: result.processed,
        created: result.created,
        updated: result.updated,
        failed: result.failed,
      }, 'Customer sync completed');

      res.status(200).json(response);
    } catch (error) {
      logger.error({
        platform,
        storeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Customer sync failed');

      res.status(400).json({
        success: false,
        message: 'Customer sync failed',
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      });
    }
  }

  /**
   * Get customers with filters
   * GET /api/acl/customers
   */
  async getCustomers(req: PlatformRequest, res: Response): Promise<void> {
    const { platform, storeId } = req;

    logger.info({
      platform,
      storeId,
      query: req.query,
    }, 'Get customers request received');

    try {
      // Validate query parameters
      const filters = validateCustomerFilterQuery(req.query);

      // Add platform filter if not specified
      if (!filters.platform && platform) {
        filters.platform = platform;
      }

      // Add store filter if available
      if (!filters.storeId && storeId) {
        filters.storeId = storeId;
      }

      // Parse date strings to Date objects
      const processedFilters = {
        ...filters,
        createdAfter: filters.createdAfter ? new Date(filters.createdAfter) : undefined,
        createdBefore: filters.createdBefore ? new Date(filters.createdBefore) : undefined,
      };

      const customers = await this.customersService.getCustomers(processedFilters);

      // Get total count for pagination (simplified - using current results length)
      const total = customers.length;
      const limit = filters.limit || 100;
      const offset = filters.offset || 0;

      const response = transformCustomersToListResponse(customers, total, limit, offset);

      logger.info({
        platform,
        storeId,
        count: customers.length,
      }, 'Customers retrieved successfully');

      res.status(200).json(response);
    } catch (error) {
      logger.error({
        platform,
        storeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get customers');

      res.status(400).json({
        success: false,
        message: 'Failed to retrieve customers',
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      });
    }
  }

  /**
   * Get customer by ID
   * GET /api/acl/customers/:id
   */
  async getCustomerById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    logger.info({ customerId: id }, 'Get customer by ID request received');

    try {
      const customer = await this.customersService.getCustomerById(id);

      if (!customer) {
        res.status(404).json({
          success: false,
          message: 'Customer not found',
        });
        return;
      }

      const response = transformCustomerToResponse(customer);

      logger.info({ customerId: id }, 'Customer retrieved successfully');

      res.status(200).json(response);
    } catch (error) {
      logger.error({
        customerId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get customer');

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve customer',
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      });
    }
  }

  /**
   * Update customer
   * PUT /api/acl/customers/:id
   */
  async updateCustomer(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    logger.info({ customerId: id }, 'Update customer request received');

    try {
      // For updates, we just use the body data directly
      const updateData = validateUpdateCustomerRequest(req.body);

      const customer = await this.customersService.updateCustomer(id, updateData);

      const response = transformCustomerToResponse(customer);

      logger.info({ customerId: id }, 'Customer updated successfully');

      res.status(200).json(response);
    } catch (error) {
      logger.error({
        customerId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to update customer');

      res.status(400).json({
        success: false,
        message: 'Failed to update customer',
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      });
    }
  }

  /**
   * Delete customer
   * DELETE /api/acl/customers/:id
   */
  async deleteCustomer(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    logger.info({ customerId: id }, 'Delete customer request received');

    try {
      const customer = await this.customersService.deleteCustomer(id);

      const response = transformCustomerToResponse(customer);

      logger.info({ customerId: id }, 'Customer deleted successfully');

      res.status(200).json(response);
    } catch (error) {
      logger.error({
        customerId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to delete customer');

      res.status(500).json({
        success: false,
        message: 'Failed to delete customer',
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      });
    }
  }

  /**
   * Get customer statistics
   * GET /api/acl/customers/statistics
   */
  async getStatistics(req: PlatformRequest, res: Response): Promise<void> {
    const { platform, storeId } = req;
    const { platform: queryPlatform, storeId: queryStoreId } = req.query;

    logger.info({
      platform,
      storeId,
      queryPlatform,
      queryStoreId,
    }, 'Get customer statistics request received');

    try {
      const statistics = await this.customersService.getStatistics(
        (queryPlatform as Platform) || platform,
        (queryStoreId as string) || storeId
      );

      const response = transformStatisticsToResponse(statistics);

      logger.info({
        platform,
        storeId,
        totalCustomers: statistics.totalCustomers,
      }, 'Customer statistics retrieved successfully');

      res.status(200).json(response);
    } catch (error) {
      logger.error({
        platform,
        storeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get customer statistics');

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve customer statistics',
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      });
    }
  }

  /**
   * Search customers by email
   * GET /api/acl/customers/search
   */
  async searchCustomers(req: PlatformRequest, res: Response): Promise<void> {
    const { platform, storeId } = req;
    const { email, q } = req.query;

    logger.info({
      platform,
      storeId,
      email,
      query: q,
    }, 'Search customers request received');

    try {
      let customers;

      if (email) {
        // Search by email
        const customer = await this.customersService.getCustomerByEmail(
          email as string,
          platform
        );
        customers = customer ? [customer] : [];
      } else if (q) {
        // General search
        const filters = {
          platform,
          storeId,
          search: q as string,
          limit: 50,
        };
        customers = await this.customersService.getCustomers(filters);
      } else {
        res.status(400).json({
          success: false,
          message: 'Email or search query (q) parameter is required',
        });
        return;
      }

      const response = transformCustomersToListResponse(
        customers,
        customers.length,
        50,
        0
      );

      logger.info({
        platform,
        storeId,
        count: customers.length,
      }, 'Customer search completed');

      res.status(200).json(response);
    } catch (error) {
      logger.error({
        platform,
        storeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Customer search failed');

      res.status(500).json({
        success: false,
        message: 'Customer search failed',
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      });
    }
  }
}
