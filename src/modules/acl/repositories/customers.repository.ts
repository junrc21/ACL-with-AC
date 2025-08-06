/**
 * Customer repository for database operations
 */

import { PrismaClient, Customer, Platform } from '@prisma/client';
import { prisma } from '@/database';
import { 
  CustomerData, 
  CustomerFilterOptions, 
  CustomerProcessingResult,
  CustomerStatus,
  CustomerRole
} from '@/shared/types/customer.types';
import { createPlatformLogger } from '@/shared/utils/logger';

const logger = createPlatformLogger('CustomerRepository');

/**
 * Repository class for customer database operations
 */
export class CustomersRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Create a new customer
   * @param customerData - Customer data to create
   * @returns Created customer
   */
  async create(customerData: CustomerData): Promise<Customer> {
    logger.info({
      platform: customerData.platform,
      externalId: customerData.externalId,
      email: customerData.email,
    }, 'Creating new customer');

    try {
      const customer = await this.prisma.customer.create({
        data: {
          platform: customerData.platform as Platform,
          externalId: customerData.externalId,
          storeId: customerData.storeId || null,
          email: customerData.email,
          firstName: customerData.firstName || null,
          lastName: customerData.lastName || null,
          fullName: customerData.fullName || null,
          username: customerData.username || null,
          role: customerData.role as any,
          status: customerData.status as any,
          isPayingCustomer: customerData.isPayingCustomer || null,
          isVerified: customerData.isVerified || null,
          avatarUrl: customerData.avatarUrl || null,
          note: customerData.note || null,
          totalSpent: customerData.spending?.totalSpent || null,
          currency: customerData.spending?.currency || null,
          orderCount: customerData.spending?.orderCount || null,
          lastOrderDate: customerData.spending?.lastOrderDate || null,
          metadata: customerData.metadata as any,
          createdAt: customerData.createdAt || new Date(),
          updatedAt: customerData.updatedAt || new Date(),
          lastLoginAt: customerData.lastLoginAt || null,
        },
      });

      logger.info({
        customerId: customer.id,
        platform: customer.platform,
        externalId: customer.externalId,
      }, 'Customer created successfully');

      return customer;
    } catch (error) {
      logger.error({
        platform: customerData.platform,
        externalId: customerData.externalId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to create customer');
      throw error;
    }
  }

  /**
   * Update an existing customer
   * @param id - Customer ID
   * @param customerData - Customer data to update
   * @returns Updated customer
   */
  async update(id: string, customerData: Partial<CustomerData>): Promise<Customer> {
    logger.info({
      customerId: id,
      platform: customerData.platform,
    }, 'Updating customer');

    try {
      const customer = await this.prisma.customer.update({
        where: { id },
        data: {
          ...(customerData.email && { email: customerData.email }),
          ...(customerData.firstName !== undefined && { firstName: customerData.firstName || null }),
          ...(customerData.lastName !== undefined && { lastName: customerData.lastName || null }),
          ...(customerData.fullName !== undefined && { fullName: customerData.fullName || null }),
          ...(customerData.username !== undefined && { username: customerData.username || null }),
          ...(customerData.role && { role: customerData.role as any }),
          ...(customerData.status && { status: customerData.status as any }),
          ...(customerData.isPayingCustomer !== undefined && { isPayingCustomer: customerData.isPayingCustomer || null }),
          ...(customerData.isVerified !== undefined && { isVerified: customerData.isVerified || null }),
          ...(customerData.avatarUrl !== undefined && { avatarUrl: customerData.avatarUrl || null }),
          ...(customerData.note !== undefined && { note: customerData.note || null }),
          ...(customerData.spending?.totalSpent !== undefined && { totalSpent: customerData.spending.totalSpent || null }),
          ...(customerData.spending?.currency !== undefined && { currency: customerData.spending.currency || null }),
          ...(customerData.spending?.orderCount !== undefined && { orderCount: customerData.spending.orderCount || null }),
          ...(customerData.spending?.lastOrderDate !== undefined && { lastOrderDate: customerData.spending.lastOrderDate || null }),
          ...(customerData.metadata && { metadata: customerData.metadata as any }),
          ...(customerData.lastLoginAt !== undefined && { lastLoginAt: customerData.lastLoginAt || null }),
          updatedAt: new Date(),
        },
      });

      logger.info({
        customerId: customer.id,
        platform: customer.platform,
      }, 'Customer updated successfully');

      return customer;
    } catch (error) {
      logger.error({
        customerId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to update customer');
      throw error;
    }
  }

  /**
   * Find customer by ID
   * @param id - Customer ID
   * @returns Customer or null if not found
   */
  async findById(id: string): Promise<Customer | null> {
    try {
      return await this.prisma.customer.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error({
        customerId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to find customer by ID');
      throw error;
    }
  }

  /**
   * Find customer by platform and external ID
   * @param platform - Platform
   * @param externalId - External ID
   * @param storeId - Optional store ID
   * @returns Customer or null if not found
   */
  async findByPlatformAndExternalId(
    platform: Platform, 
    externalId: string, 
    storeId?: string
  ): Promise<Customer | null> {
    try {
      const whereClause: any = {
        platform,
        externalId,
      };

      if (storeId) {
        whereClause.storeId = storeId;
      }

      return await this.prisma.customer.findFirst({
        where: whereClause,
      });
    } catch (error) {
      logger.error({
        platform,
        externalId,
        storeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to find customer by platform and external ID');
      throw error;
    }
  }

  /**
   * Find customer by email
   * @param email - Customer email
   * @param platform - Optional platform filter
   * @returns Customer or null if not found
   */
  async findByEmail(email: string, platform?: Platform): Promise<Customer | null> {
    try {
      const whereClause: any = { email };
      if (platform) {
        whereClause.platform = platform;
      }

      return await this.prisma.customer.findFirst({
        where: whereClause,
      });
    } catch (error) {
      logger.error({
        email,
        platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to find customer by email');
      throw error;
    }
  }

  /**
   * Find customers with filters
   * @param filters - Filter options
   * @returns Array of customers
   */
  async findMany(filters: CustomerFilterOptions = {}): Promise<Customer[]> {
    try {
      const whereClause: any = {};

      if (filters.platform) {
        whereClause.platform = filters.platform;
      }

      if (filters.storeId) {
        whereClause.storeId = filters.storeId;
      }

      if (filters.status) {
        whereClause.status = filters.status;
      }

      if (filters.role) {
        whereClause.role = filters.role;
      }

      if (filters.email) {
        whereClause.email = { contains: filters.email, mode: 'insensitive' };
      }

      if (filters.isPayingCustomer !== undefined) {
        whereClause.isPayingCustomer = filters.isPayingCustomer;
      }

      if (filters.createdAfter || filters.createdBefore) {
        whereClause.createdAt = {};
        if (filters.createdAfter) {
          whereClause.createdAt.gte = filters.createdAfter;
        }
        if (filters.createdBefore) {
          whereClause.createdAt.lte = filters.createdBefore;
        }
      }

      if (filters.search) {
        whereClause.OR = [
          { email: { contains: filters.search, mode: 'insensitive' } },
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { fullName: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      return await this.prisma.customer.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      });
    } catch (error) {
      logger.error({
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to find customers');
      throw error;
    }
  }

  /**
   * Delete customer by ID
   * @param id - Customer ID
   * @returns Deleted customer
   */
  async delete(id: string): Promise<Customer> {
    logger.info({ customerId: id }, 'Deleting customer');

    try {
      const customer = await this.prisma.customer.delete({
        where: { id },
      });

      logger.info({
        customerId: customer.id,
        platform: customer.platform,
      }, 'Customer deleted successfully');

      return customer;
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
      const whereClause: any = {};
      if (platform) whereClause.platform = platform;
      if (storeId) whereClause.storeId = storeId;

      const [
        totalCustomers,
        activeCustomers,
        payingCustomers,
        customersByPlatform,
        recentCustomers,
      ] = await Promise.all([
        this.prisma.customer.count({ where: whereClause }),
        this.prisma.customer.count({ 
          where: { ...whereClause, status: CustomerStatus.ACTIVE } 
        }),
        this.prisma.customer.count({ 
          where: { ...whereClause, isPayingCustomer: true } 
        }),
        this.prisma.customer.groupBy({
          by: ['platform'],
          where: whereClause,
          _count: { id: true },
        }),
        this.prisma.customer.count({
          where: {
            ...whereClause,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      return {
        totalCustomers,
        activeCustomers,
        payingCustomers,
        customersByPlatform: customersByPlatform.reduce((acc, item) => {
          acc[item.platform] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        recentCustomers,
        payingCustomerRate: totalCustomers > 0 ? (payingCustomers / totalCustomers) * 100 : 0,
      };
    } catch (error) {
      logger.error({
        platform,
        storeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to get customer statistics');
      throw error;
    }
  }
}
