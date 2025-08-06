/**
 * Base customer strategy interface for platform-specific customer handling
 */

import { StrategyContext } from '@/shared/types/platform.types';
import { 
  CustomerData, 
  CustomerProcessingResult, 
  CustomerSyncResult 
} from '@/shared/types/customer.types';

/**
 * Abstract base class for customer strategies
 * Each platform (Hotmart, Nuvemshop, WooCommerce) implements this interface
 */
export abstract class CustomerStrategy {
  /**
   * Transform platform-specific customer data to unified CustomerData format
   * @param data - Raw customer data from the platform
   * @param context - Platform context information
   * @returns Unified customer data
   */
  abstract transformFromPlatform(data: any, context: StrategyContext): CustomerData;

  /**
   * Transform unified CustomerData back to platform-specific format
   * @param customerData - Unified customer data
   * @returns Platform-specific customer data
   */
  abstract transformToPlatformFormat(customerData: CustomerData): any;

  /**
   * Process a single customer from platform data
   * @param data - Raw customer data from platform
   * @param context - Platform context information
   * @returns Processing result with success/error information
   */
  async processCustomer(data: any, context: StrategyContext): Promise<CustomerProcessingResult> {
    try {
      // Transform the data
      const customerData = this.transformFromPlatform(data, context);
      
      // Apply business rules
      this.applyBusinessRules(customerData);
      
      // Validate the data
      const validation = this.validateCustomerData(customerData);
      if (!validation.isValid) {
        return {
          success: false,
          isNew: false,
          errors: validation.errors,
        };
      }

      return {
        success: true,
        customer: customerData,
        isNew: true, // This will be determined by the service layer
      };
    } catch (error) {
      return {
        success: false,
        isNew: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      };
    }
  }

  /**
   * Process multiple customers in batch
   * @param customers - Array of raw customer data from platform
   * @param context - Platform context information
   * @returns Batch processing results
   */
  async processCustomersBatch(customers: any[], context: StrategyContext): Promise<CustomerSyncResult> {
    const results: CustomerProcessingResult[] = [];
    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const customerData of customers) {
      const result = await this.processCustomer(customerData, context);
      results.push(result);

      if (result.success) {
        if (result.isNew) {
          created++;
        } else {
          updated++;
        }
      } else {
        failed++;
      }
    }

    return {
      total: customers.length,
      processed: created + updated,
      created,
      updated,
      failed,
      results,
      errors: results
        .filter(r => !r.success)
        .flatMap(r => r.errors || []),
    };
  }

  /**
   * Apply platform-specific business rules to customer data
   * @param customerData - Customer data to modify
   */
  protected abstract applyBusinessRules(customerData: CustomerData): void;

  /**
   * Validate customer data for completeness and correctness
   * @param customerData - Customer data to validate
   * @returns Validation result
   */
  protected validateCustomerData(customerData: CustomerData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!customerData.platform) {
      errors.push('Platform is required');
    }

    if (!customerData.externalId) {
      errors.push('External ID is required');
    }

    if (!customerData.email) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(customerData.email)) {
      errors.push('Invalid email format');
    }

    if (!customerData.role) {
      errors.push('Customer role is required');
    }

    if (!customerData.status) {
      errors.push('Customer status is required');
    }

    // Address validation
    if (customerData.addresses) {
      customerData.addresses.forEach((address, index) => {
        if (!address.address1) {
          errors.push(`Address ${index + 1}: Address line 1 is required`);
        }
        if (!address.city) {
          errors.push(`Address ${index + 1}: City is required`);
        }
        if (!address.country) {
          errors.push(`Address ${index + 1}: Country is required`);
        }
      });
    }

    // Phone validation
    if (customerData.phones) {
      customerData.phones.forEach((phone, index) => {
        if (!phone.number) {
          errors.push(`Phone ${index + 1}: Phone number is required`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract customer name from various name fields
   * @param firstName - First name
   * @param lastName - Last name
   * @param fullName - Full name
   * @returns Extracted names
   */
  protected extractCustomerName(
    firstName?: string, 
    lastName?: string, 
    fullName?: string
  ): { firstName?: string; lastName?: string; fullName?: string } {
    if (firstName && lastName) {
      return {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
      };
    }

    if (fullName) {
      const nameParts = fullName.trim().split(' ');
      return {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ') || undefined,
        fullName,
      };
    }

    return {
      firstName,
      lastName,
      fullName: firstName || lastName,
    };
  }

  /**
   * Validate email format
   * @param email - Email to validate
   * @returns True if valid email format
   */
  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Normalize phone number
   * @param phone - Phone number to normalize
   * @returns Normalized phone number
   */
  protected normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    return phone.replace(/\D/g, '');
  }

  /**
   * Parse date from various formats
   * @param dateValue - Date value to parse
   * @returns Parsed date or undefined
   */
  protected parseDate(dateValue: any): Date | undefined {
    if (!dateValue) return undefined;
    
    if (dateValue instanceof Date) return dateValue;
    
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    
    if (typeof dateValue === 'number') {
      // Handle Unix timestamps (both seconds and milliseconds)
      const timestamp = dateValue < 10000000000 ? dateValue * 1000 : dateValue;
      return new Date(timestamp);
    }
    
    return undefined;
  }
}
