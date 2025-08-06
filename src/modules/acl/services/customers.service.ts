/**
 * Customer service for business logic and strategy orchestration
 */

import { Customer, Platform } from '@prisma/client';
import { CustomersRepository } from '../repositories/customers.repository';
import { CustomerStrategyFactory } from '../strategies/CustomerStrategyFactory';
import { StrategyContext } from '@/shared/types/platform.types';
import { 
  CustomerData, 
  CustomerProcessingResult, 
  CustomerSyncResult, 
  CustomerFilterOptions,
  CustomerStatus,
  CustomerRole
} from '@/shared/types/customer.types';
import { createPlatformLogger } from '@/shared/utils/logger';

const logger = createPlatformLogger('CustomersService');

/**
 * Service class for customer business logic
 */
export class CustomersService {
  private customersRepository: CustomersRepository;

  constructor() {
    this.customersRepository = new CustomersRepository();
  }

  /**
   * Process customer data from a platform
   * @param platform - Platform the data comes from
   * @param data - Raw customer data from platform
   * @param context - Platform context
   * @returns Processing result
   */
  async processCustomer(
    platform: Platform,
    data: any,
    context: StrategyContext
  ): Promise<CustomerProcessingResult> {
    logger.info({
      platform,
      storeId: context.storeId,
    }, 'Processing customer data');

    try {
      // Get appropriate strategy for the platform
      const strategy = CustomerStrategyFactory.getStrategy(platform as any);

      // Process the customer data
      const result = await strategy.processCustomer(data, context);

      if (!result.success || !result.customer) {
        logger.warn({
          platform,
          errors: result.errors,
        }, 'Customer processing failed');
        return result;
      }

      const customer = result.customer;

      // Check if customer already exists
      const existingCustomer = await this.customersRepository.findByPlatformAndExternalId(
        platform as any,
        customer.externalId,
        customer.storeId || undefined
      );

      let savedCustomer: Customer;
      let isNew = false;

      if (existingCustomer) {
        // Update existing customer
        savedCustomer = await this.customersRepository.update(existingCustomer.id, customer);
        logger.info({
          customerId: savedCustomer.id,
          platform,
          externalId: customer.externalId,
        }, 'Customer updated');
      } else {
        // Create new customer
        savedCustomer = await this.customersRepository.create(customer);
        isNew = true;
        logger.info({
          customerId: savedCustomer.id,
          platform,
          externalId: customer.externalId,
        }, 'New customer created');
      }

      return {
        success: true,
        customer: this.convertPrismaToCustomerData(savedCustomer),
        isNew,
      };
    } catch (error) {
      logger.error({
        platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to process customer');

      return {
        success: false,
        isNew: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      };
    }
  }

  /**
   * Process multiple customers in batch
   * @param platform - Platform the data comes from
   * @param customers - Array of raw customer data
   * @param context - Platform context
   * @returns Batch processing result
   */
  async processCustomersBatch(
    platform: Platform,
    customers: any[],
    context: StrategyContext
  ): Promise<CustomerSyncResult> {
    logger.info({
      platform,
      count: customers.length,
      storeId: context.storeId,
    }, 'Processing customers batch');

    try {
      const strategy = CustomerStrategyFactory.getStrategy(platform as any);
      const result = await strategy.processCustomersBatch(customers, context);

      // Process each successful customer through the service
      const processedResults: CustomerProcessingResult[] = [];
      let created = 0;
      let updated = 0;
      let failed = 0;

      for (const customerResult of result.results) {
        if (customerResult.success && customerResult.customer) {
          const serviceResult = await this.processCustomer(platform, customerResult.customer, context);
          processedResults.push(serviceResult);

          if (serviceResult.success) {
            if (serviceResult.isNew) {
              created++;
            } else {
              updated++;
            }
          } else {
            failed++;
          }
        } else {
          processedResults.push(customerResult);
          failed++;
        }
      }

      return {
        total: customers.length,
        processed: created + updated,
        created,
        updated,
        failed,
        results: processedResults,
        errors: processedResults
          .filter(r => !r.success)
          .flatMap(r => r.errors || []),
      };
    } catch (error) {
      logger.error({
        platform,
        count: customers.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to process customers batch');

      return {
        total: customers.length,
        processed: 0,
        created: 0,
        updated: 0,
        failed: customers.length,
        results: [],
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      };
    }
  }

  /**
   * Get customer by ID
   * @param id - Customer ID
   * @returns Customer data or null
   */
  async getCustomerById(id: string): Promise<CustomerData | null> {
    try {
      const customer = await this.customersRepository.findById(id);
      return customer ? this.convertPrismaToCustomerData(customer) : null;
    } catch (error) {
      logger.error({
        customerId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get customer by ID');
      throw error;
    }
  }

  /**
   * Get customer by platform and external ID
   * @param platform - Platform
   * @param externalId - External ID
   * @param storeId - Optional store ID
   * @returns Customer data or null
   */
  async getCustomerByExternalId(
    platform: Platform,
    externalId: string,
    storeId?: string
  ): Promise<CustomerData | null> {
    try {
      const customer = await this.customersRepository.findByPlatformAndExternalId(
        platform as any,
        externalId,
        storeId
      );
      return customer ? this.convertPrismaToCustomerData(customer) : null;
    } catch (error) {
      logger.error({
        platform,
        externalId,
        storeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get customer by external ID');
      throw error;
    }
  }

  /**
   * Get customer by email
   * @param email - Customer email
   * @param platform - Optional platform filter
   * @returns Customer data or null
   */
  async getCustomerByEmail(email: string, platform?: Platform): Promise<CustomerData | null> {
    try {
      const customer = await this.customersRepository.findByEmail(email, platform as any);
      return customer ? this.convertPrismaToCustomerData(customer) : null;
    } catch (error) {
      logger.error({
        email,
        platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get customer by email');
      throw error;
    }
  }

  /**
   * Get customers with filters
   * @param filters - Filter options
   * @returns Array of customer data
   */
  async getCustomers(filters: CustomerFilterOptions = {}): Promise<CustomerData[]> {
    try {
      const customers = await this.customersRepository.findMany(filters);
      return customers.map(customer => this.convertPrismaToCustomerData(customer));
    } catch (error) {
      logger.error({
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get customers');
      throw error;
    }
  }

  /**
   * Update customer
   * @param id - Customer ID
   * @param updateData - Data to update
   * @returns Updated customer data
   */
  async updateCustomer(id: string, updateData: Partial<CustomerData>): Promise<CustomerData> {
    try {
      const customer = await this.customersRepository.update(id, updateData);
      return this.convertPrismaToCustomerData(customer);
    } catch (error) {
      logger.error({
        customerId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to update customer');
      throw error;
    }
  }

  /**
   * Delete customer
   * @param id - Customer ID
   * @returns Deleted customer data
   */
  async deleteCustomer(id: string): Promise<CustomerData> {
    try {
      const customer = await this.customersRepository.delete(id);
      return this.convertPrismaToCustomerData(customer);
    } catch (error) {
      logger.error({
        customerId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to delete customer');
      throw error;
    }
  }

  /**
   * Get customer statistics
   * @param platform - Optional platform filter
   * @param storeId - Optional store ID filter
   * @returns Statistics object
   */
  async getStatistics(platform?: Platform, storeId?: string): Promise<Record<string, any>> {
    try {
      return await this.customersRepository.getStatistics(platform, storeId);
    } catch (error) {
      logger.error({
        platform,
        storeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get customer statistics');
      throw error;
    }
  }

  /**
   * Convert Prisma customer to CustomerData
   * @param customer - Prisma customer object
   * @returns CustomerData object
   */
  private convertPrismaToCustomerData(customer: Customer): CustomerData {
    return {
      platform: customer.platform as any,
      externalId: customer.externalId,
      storeId: customer.storeId || undefined,
      email: customer.email,
      firstName: customer.firstName || undefined,
      lastName: customer.lastName || undefined,
      fullName: customer.fullName || undefined,
      username: customer.username || undefined,
      role: customer.role as any,
      status: customer.status as any,
      isPayingCustomer: customer.isPayingCustomer || undefined,
      isVerified: customer.isVerified || undefined,
      avatarUrl: customer.avatarUrl || undefined,
      note: customer.note || undefined,
      spending: customer.totalSpent ? {
        totalSpent: customer.totalSpent ? (typeof customer.totalSpent === 'object' ? customer.totalSpent.toNumber() : customer.totalSpent) : 0,
        currency: customer.currency || 'USD',
        orderCount: customer.orderCount || 0,
        averageOrderValue: customer.totalSpent && customer.orderCount ?
          (typeof customer.totalSpent === 'object' ? customer.totalSpent.toNumber() : customer.totalSpent) / customer.orderCount : 0,
        lastOrderDate: customer.lastOrderDate || undefined,
      } : undefined,
      metadata: customer.metadata as Record<string, any>,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      lastLoginAt: customer.lastLoginAt || undefined,
    };
  }
}
