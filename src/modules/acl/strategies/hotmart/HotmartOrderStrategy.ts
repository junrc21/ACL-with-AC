/**
 * Hotmart order strategy implementation
 * Handles order data from Hotmart sales/transaction data with commissions
 */

import { OrderStrategy } from '../base/OrderStrategy';
import { StrategyContext } from '@/shared/types/platform.types';
import { 
  OrderData, 
  OrderStatus, 
  PaymentStatus,
  PaymentMethod,
  OrderItemData,
  PaymentData,
  CommissionData,
  TransactionType
} from '@/shared/types/order.types';
import { Platform } from '@/shared/types/platform.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Hotmart sales data interface
 */
interface HotmartSalesData {
  id: string;
  transaction: string;
  status: string;
  date: string;
  product: {
    id: number;
    name: string;
    ucode: string;
  };
  buyer: {
    name: string;
    email: string;
    ucode: string;
    phone?: string;
    address?: any;
    documents?: any[];
  };
  producer: {
    name: string;
    email: string;
    ucode: string;
  };
  affiliate?: {
    name: string;
    email: string;
    ucode: string;
  };
  co_producer?: {
    name: string;
    email: string;
    ucode: string;
  };
  purchase: {
    price: {
      value: number;
      currency_code: string;
    };
    payment: {
      method: string;
      installments_number?: number;
      type: string;
    };
    offer: {
      code: string;
    };
  };
  commissions: Array<{
    value: number;
    source: string; // 'PRODUCER', 'AFFILIATE', 'CO_PRODUCER'
  }>;
  subscription?: {
    subscriber: {
      code: string;
    };
    plan: {
      name: string;
      recurrence_period: number;
    };
  };
  refund?: {
    date: string;
    value: number;
    reason: string;
  };
}

/**
 * Hotmart order strategy
 * Processes order data from Hotmart sales/transaction data
 */
export class HotmartOrderStrategy extends OrderStrategy {
  private logger = createPlatformLogger('HOTMART', 'OrderStrategy');

  /**
   * Transform Hotmart sales data to unified order format
   * @param data - Hotmart sales data
   * @param context - Platform context
   * @returns Unified order data
   */
  transformFromPlatform(data: any, context: StrategyContext): OrderData {
    const salesData = data as HotmartSalesData;
    
    this.logger.info({
      transactionId: salesData.transaction,
      productId: salesData.product.id,
    }, 'Transforming Hotmart sales data to order');

    // Create order items from product data
    const orderItems: OrderItemData[] = [{
      externalId: salesData.product.id.toString(),
      productId: salesData.product.id.toString(),
      name: salesData.product.name,
      sku: salesData.product.ucode,
      quantity: 1, // Hotmart typically sells single digital products
      unitPrice: salesData.purchase.price.value,
      totalPrice: salesData.purchase.price.value,
      taxAmount: 0, // Hotmart handles taxes separately
      productType: 'digital',
      metadata: {
        productUcode: salesData.product.ucode,
        offerCode: salesData.purchase.offer.code,
      },
    }];

    // Create payment data
    const payments: PaymentData[] = [{
      externalId: salesData.transaction,
      transactionId: salesData.transaction,
      method: this.mapHotmartPaymentMethod(salesData.purchase.payment.method),
      status: this.mapHotmartPaymentStatus(salesData.status),
      amount: salesData.purchase.price.value,
      currency: salesData.purchase.price.currency_code,
      processedAt: new Date(salesData.date),
      installments: salesData.purchase.payment.installments_number,
      metadata: {
        paymentType: salesData.purchase.payment.type,
        offerCode: salesData.purchase.offer.code,
      },
    }];

    // Create commission data
    const commissions: CommissionData[] = salesData.commissions.map(commission => ({
      externalId: `${salesData.transaction}_${commission.source}`,
      type: commission.source.toLowerCase(),
      percentage: this.calculateCommissionPercentage(commission.value, salesData.purchase.price.value),
      amount: commission.value,
      currency: salesData.purchase.price.currency_code,
      status: 'pending',
      processedAt: new Date(salesData.date),
      metadata: {
        source: commission.source,
        transactionId: salesData.transaction,
      },
    }));

    // Handle refund data if present
    const refunds = salesData.refund ? [{
      externalId: `${salesData.transaction}_refund`,
      amount: salesData.refund.value,
      currency: salesData.purchase.price.currency_code,
      reason: salesData.refund.reason,
      processedAt: new Date(salesData.refund.date),
      status: 'completed',
      metadata: {
        transactionId: salesData.transaction,
      },
    }] : undefined;

    // Build unified order data
    const orderData: OrderData = {
      platform: Platform.HOTMART,
      externalId: salesData.transaction,
      storeId: context.storeId,
      customerId: salesData.buyer.ucode, // Use buyer's ucode as customer reference
      
      // Order identification
      orderNumber: salesData.transaction,
      token: salesData.id,
      
      // Order status
      status: this.mapHotmartOrderStatus(salesData.status),
      paymentStatus: this.mapHotmartPaymentStatus(salesData.status),
      
      // Timestamps
      orderDate: new Date(salesData.date),
      createdAt: new Date(salesData.date),
      updatedAt: new Date(),
      processedAt: new Date(salesData.date),
      
      // Financial information
      subtotal: salesData.purchase.price.value,
      taxAmount: 0, // Hotmart handles taxes separately
      shippingAmount: 0, // Digital products don't have shipping
      discountAmount: 0, // Discounts are typically handled at offer level
      totalAmount: salesData.purchase.price.value,
      currency: salesData.purchase.price.currency_code,
      
      // Customer information
      customerEmail: salesData.buyer.email,
      customerPhone: salesData.buyer.phone,
      
      // Order items and related data
      items: orderItems,
      payments,
      refunds,
      commissions,
      
      // Platform-specific metadata
      metadata: {
        transactionId: salesData.transaction,
        productUcode: salesData.product.ucode,
        buyerUcode: salesData.buyer.ucode,
        producerUcode: salesData.producer.ucode,
        affiliateUcode: salesData.affiliate?.ucode,
        coProducerUcode: salesData.co_producer?.ucode,
        offerCode: salesData.purchase.offer.code,
        paymentType: salesData.purchase.payment.type,
        subscription: salesData.subscription,
        rawData: salesData,
      },
    };

    return orderData;
  }

  /**
   * Transform unified order data back to Hotmart format
   * @param orderData - Unified order data
   * @returns Hotmart sales data format
   */
  transformToPlatformFormat(orderData: OrderData): any {
    // Hotmart is primarily read-only for sales data
    // This method would be used for updates if supported
    return {
      transaction: orderData.externalId,
      status: this.reverseMapOrderStatus(orderData.status),
      // Add other fields as needed for updates
    };
  }

  /**
   * Apply Hotmart-specific business rules
   * @param orderData - Order data to modify
   */
  protected applyBusinessRules(orderData: OrderData): void {
    // Hotmart business rules
    
    // 1. Digital products don't have shipping
    orderData.shippingAmount = 0;
    orderData.shippingStatus = undefined;
    orderData.fulfillmentStatus = undefined;
    
    // 2. Set default currency if not provided
    if (!orderData.currency) {
      orderData.currency = 'BRL'; // Hotmart is primarily Brazilian
    }
    
    // 3. Ensure commission data is present for sales
    if (orderData.status === OrderStatus.CONFIRMED && (!orderData.commissions || orderData.commissions.length === 0)) {
      // Log warning about missing commission data
      this.logger.warn({
        orderId: orderData.externalId,
      }, 'Hotmart order missing commission data');
    }
    
    // 4. Handle subscription orders
    if (orderData.metadata?.subscription) {
      orderData.metadata.isSubscription = true;
      orderData.metadata.subscriptionPlan = orderData.metadata.subscription.plan?.name;
    }
    
    // 5. Validate total amount matches item prices
    this.validateOrderTotals(orderData);
  }

  /**
   * Map Hotmart payment method to unified format
   */
  private mapHotmartPaymentMethod(method: string): PaymentMethod {
    const methodLower = method.toLowerCase();
    
    if (methodLower.includes('credit') || methodLower.includes('cartao')) {
      return PaymentMethod.CREDIT_CARD;
    }
    if (methodLower.includes('debit')) {
      return PaymentMethod.DEBIT_CARD;
    }
    if (methodLower.includes('pix')) {
      return PaymentMethod.PIX;
    }
    if (methodLower.includes('boleto')) {
      return PaymentMethod.BOLETO;
    }
    if (methodLower.includes('paypal')) {
      return PaymentMethod.PAYPAL;
    }
    if (methodLower.includes('transfer')) {
      return PaymentMethod.BANK_TRANSFER;
    }
    
    return PaymentMethod.OTHER;
  }

  /**
   * Map Hotmart order status to unified format
   */
  private mapHotmartOrderStatus(status: string): OrderStatus {
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'approved' || statusLower === 'complete') {
      return OrderStatus.CONFIRMED;
    }
    if (statusLower === 'canceled' || statusLower === 'cancelled') {
      return OrderStatus.CANCELLED;
    }
    if (statusLower === 'refunded') {
      return OrderStatus.REFUNDED;
    }
    if (statusLower === 'pending') {
      return OrderStatus.PENDING;
    }
    
    return this.normalizeOrderStatus(status);
  }

  /**
   * Map Hotmart payment status to unified format
   */
  private mapHotmartPaymentStatus(status: string): PaymentStatus {
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'approved' || statusLower === 'complete') {
      return PaymentStatus.PAID;
    }
    if (statusLower === 'canceled' || statusLower === 'cancelled') {
      return PaymentStatus.CANCELLED;
    }
    if (statusLower === 'refunded') {
      return PaymentStatus.REFUNDED;
    }
    if (statusLower === 'pending') {
      return PaymentStatus.PENDING;
    }
    
    return this.normalizePaymentStatus(status);
  }

  /**
   * Calculate commission percentage
   */
  private calculateCommissionPercentage(commissionValue: number, totalValue: number): number {
    if (totalValue === 0) return 0;
    return (commissionValue / totalValue) * 100;
  }

  /**
   * Reverse map order status for platform updates
   */
  private reverseMapOrderStatus(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.CONFIRMED:
        return 'approved';
      case OrderStatus.CANCELLED:
        return 'canceled';
      case OrderStatus.REFUNDED:
        return 'refunded';
      case OrderStatus.PENDING:
        return 'pending';
      default:
        return 'pending';
    }
  }
}
