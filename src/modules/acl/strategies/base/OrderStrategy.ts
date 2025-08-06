/**
 * Base order strategy interface for platform-specific order handling
 */

import { StrategyContext } from '@/shared/types/platform.types';
import { 
  OrderData, 
  OrderProcessingResult, 
  OrderSyncResult,
  OrderStatus,
  PaymentStatus 
} from '@/shared/types/order.types';

/**
 * Abstract base class for order strategies
 * Each platform (Hotmart, Nuvemshop, WooCommerce) implements this interface
 */
export abstract class OrderStrategy {
  /**
   * Transform platform-specific order data to unified OrderData format
   * @param data - Raw order data from the platform
   * @param context - Platform context information
   * @returns Unified order data
   */
  abstract transformFromPlatform(data: any, context: StrategyContext): OrderData;

  /**
   * Transform unified OrderData back to platform-specific format
   * @param orderData - Unified order data
   * @returns Platform-specific order data
   */
  abstract transformToPlatformFormat(orderData: OrderData): any;

  /**
   * Process a single order from platform data
   * @param data - Raw order data from platform
   * @param context - Platform context information
   * @returns Processing result with success/error information
   */
  async processOrder(data: any, context: StrategyContext): Promise<OrderProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Transform the data
      const orderData = this.transformFromPlatform(data, context);
      
      // Apply business rules
      this.applyBusinessRules(orderData);
      
      // Validate the data
      const validation = this.validateOrderData(orderData);
      if (!validation.isValid) {
        return {
          success: false,
          externalId: orderData.externalId,
          platform: orderData.platform,
          isNew: false,
          errors: validation.errors,
          processingTime: Date.now() - startTime,
        };
      }

      return {
        success: true,
        order: orderData,
        externalId: orderData.externalId,
        platform: orderData.platform,
        isNew: true, // This will be determined by the service layer
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        externalId: data?.id?.toString() || 'unknown',
        platform: context.platform,
        isNew: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Process multiple orders in batch
   * @param orders - Array of raw order data from platform
   * @param context - Platform context information
   * @returns Batch processing results
   */
  async processOrdersBatch(orders: any[], context: StrategyContext): Promise<OrderSyncResult> {
    const startTime = Date.now();
    const results: OrderProcessingResult[] = [];
    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const orderData of orders) {
      const result = await this.processOrder(orderData, context);
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
      success: failed === 0,
      processed: orders.length,
      created,
      updated,
      errors: failed,
      warnings: results
        .filter(r => r.warnings && r.warnings.length > 0)
        .flatMap(r => r.warnings || []),
      details: results,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Apply platform-specific business rules to order data
   * @param orderData - Order data to modify
   */
  protected abstract applyBusinessRules(orderData: OrderData): void;

  /**
   * Validate order data for completeness and correctness
   * @param orderData - Order data to validate
   * @returns Validation result
   */
  protected validateOrderData(orderData: OrderData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!orderData.platform) {
      errors.push('Platform is required');
    }

    if (!orderData.externalId) {
      errors.push('External ID is required');
    }

    if (!orderData.status) {
      errors.push('Order status is required');
    }

    if (!orderData.paymentStatus) {
      errors.push('Payment status is required');
    }

    if (!orderData.orderDate) {
      errors.push('Order date is required');
    }

    if (orderData.totalAmount === undefined || orderData.totalAmount < 0) {
      errors.push('Total amount must be non-negative');
    }

    if (orderData.subtotal === undefined || orderData.subtotal < 0) {
      errors.push('Subtotal must be non-negative');
    }

    if (!orderData.currency) {
      errors.push('Currency is required');
    } else if (orderData.currency.length !== 3) {
      errors.push('Currency must be 3 characters (ISO 4217 format)');
    }

    // Order items validation
    if (!orderData.items || orderData.items.length === 0) {
      errors.push('Order must have at least one item');
    } else {
      orderData.items.forEach((item, index) => {
        if (!item.name) {
          errors.push(`Item ${index + 1}: Name is required`);
        }
        if (item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Quantity must be positive`);
        }
        if (item.unitPrice < 0) {
          errors.push(`Item ${index + 1}: Unit price must be non-negative`);
        }
        if (item.totalPrice < 0) {
          errors.push(`Item ${index + 1}: Total price must be non-negative`);
        }
      });
    }

    // Address validation
    if (orderData.billingAddress) {
      const billingErrors = this.validateAddress(orderData.billingAddress, 'Billing');
      errors.push(...billingErrors);
    }

    if (orderData.shippingAddress) {
      const shippingErrors = this.validateAddress(orderData.shippingAddress, 'Shipping');
      errors.push(...shippingErrors);
    }

    // Payment validation
    if (orderData.payments) {
      orderData.payments.forEach((payment, index) => {
        if (payment.amount <= 0) {
          errors.push(`Payment ${index + 1}: Amount must be positive`);
        }
        if (!payment.currency) {
          errors.push(`Payment ${index + 1}: Currency is required`);
        }
        if (!payment.method) {
          errors.push(`Payment ${index + 1}: Payment method is required`);
        }
        if (!payment.status) {
          errors.push(`Payment ${index + 1}: Payment status is required`);
        }
      });
    }

    // Email validation
    if (orderData.customerEmail && !this.isValidEmail(orderData.customerEmail)) {
      errors.push('Invalid customer email format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate address data
   * @param address - Address to validate
   * @param type - Address type for error messages
   * @returns Array of validation errors
   */
  protected validateAddress(address: any, type: string): string[] {
    const errors: string[] = [];

    if (!address.address1) {
      errors.push(`${type} address: Address line 1 is required`);
    }
    if (!address.city) {
      errors.push(`${type} address: City is required`);
    }
    if (!address.country) {
      errors.push(`${type} address: Country is required`);
    }

    return errors;
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
   * Calculate order totals and validate consistency
   * @param orderData - Order data to validate
   */
  protected validateOrderTotals(orderData: OrderData): void {
    // Calculate expected subtotal from items
    const calculatedSubtotal = orderData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Allow small floating point differences
    const tolerance = 0.01;
    if (Math.abs(orderData.subtotal - calculatedSubtotal) > tolerance) {
      // Log warning but don't fail validation
      console.warn(`Order ${orderData.externalId}: Subtotal mismatch. Expected: ${calculatedSubtotal}, Got: ${orderData.subtotal}`);
    }

    // Validate total amount calculation
    const expectedTotal = orderData.subtotal + 
                         (orderData.taxAmount || 0) + 
                         (orderData.shippingAmount || 0) - 
                         (orderData.discountAmount || 0);
    
    if (Math.abs(orderData.totalAmount - expectedTotal) > tolerance) {
      console.warn(`Order ${orderData.externalId}: Total amount mismatch. Expected: ${expectedTotal}, Got: ${orderData.totalAmount}`);
    }
  }

  /**
   * Normalize order status to standard values
   * @param status - Raw status from platform
   * @returns Normalized OrderStatus
   */
  protected normalizeOrderStatus(status: string): OrderStatus {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('pending') || statusLower.includes('awaiting')) {
      return OrderStatus.PENDING;
    }
    if (statusLower.includes('confirmed') || statusLower.includes('approved')) {
      return OrderStatus.CONFIRMED;
    }
    if (statusLower.includes('processing') || statusLower.includes('preparing')) {
      return OrderStatus.PROCESSING;
    }
    if (statusLower.includes('shipped') || statusLower.includes('dispatched')) {
      return OrderStatus.SHIPPED;
    }
    if (statusLower.includes('delivered') || statusLower.includes('completed')) {
      return OrderStatus.DELIVERED;
    }
    if (statusLower.includes('cancelled') || statusLower.includes('canceled')) {
      return OrderStatus.CANCELLED;
    }
    if (statusLower.includes('refunded')) {
      return OrderStatus.REFUNDED;
    }
    
    // Default to pending if status is unknown
    return OrderStatus.PENDING;
  }

  /**
   * Normalize payment status to standard values
   * @param status - Raw payment status from platform
   * @returns Normalized PaymentStatus
   */
  protected normalizePaymentStatus(status: string): PaymentStatus {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('pending') || statusLower.includes('awaiting')) {
      return PaymentStatus.PENDING;
    }
    if (statusLower.includes('authorized')) {
      return PaymentStatus.AUTHORIZED;
    }
    if (statusLower.includes('paid') || statusLower.includes('completed') || statusLower.includes('success')) {
      return PaymentStatus.PAID;
    }
    if (statusLower.includes('failed') || statusLower.includes('declined')) {
      return PaymentStatus.FAILED;
    }
    if (statusLower.includes('cancelled') || statusLower.includes('canceled')) {
      return PaymentStatus.CANCELLED;
    }
    if (statusLower.includes('refunded')) {
      return PaymentStatus.REFUNDED;
    }
    if (statusLower.includes('partially_refunded')) {
      return PaymentStatus.PARTIALLY_REFUNDED;
    }
    
    // Default to pending if status is unknown
    return PaymentStatus.PENDING;
  }
}
