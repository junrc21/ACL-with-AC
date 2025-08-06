/**
 * WooCommerce order strategy implementation
 * Handles order data from WooCommerce with notes, refunds, and complex order management
 */

import { OrderStrategy } from '../base/OrderStrategy';
import { StrategyContext } from '@/shared/types/platform.types';
import { 
  OrderData, 
  OrderStatus, 
  PaymentStatus,
  PaymentMethod,
  ShippingStatus,
  FulfillmentStatus,
  OrderItemData,
  PaymentData,
  RefundData,
  OrderAddress,
  OrderNoteData
} from '@/shared/types/order.types';
import { Platform } from '@/shared/types/platform.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * WooCommerce order data interface
 */
interface WooCommerceOrderData {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  version: string;
  status: string;
  currency: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  prices_include_tax: boolean;
  customer_id: number;
  customer_ip_address: string;
  customer_user_agent: string;
  customer_note: string;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  date_paid: string;
  date_paid_gmt: string;
  date_completed: string;
  date_completed_gmt: string;
  cart_hash: string;
  meta_data: Array<{
    id: number;
    key: string;
    value: any;
  }>;
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    tax_class: string;
    subtotal: string;
    subtotal_tax: string;
    total: string;
    total_tax: string;
    taxes: Array<{
      id: number;
      total: string;
      subtotal: string;
    }>;
    meta_data: Array<{
      id: number;
      key: string;
      value: any;
      display_key: string;
      display_value: string;
    }>;
    sku: string;
    price: number;
  }>;
  tax_lines: Array<{
    id: number;
    rate_code: string;
    rate_id: number;
    label: string;
    compound: boolean;
    tax_total: string;
    shipping_tax_total: string;
    rate_percent: number;
    meta_data: any[];
  }>;
  shipping_lines: Array<{
    id: number;
    method_title: string;
    method_id: string;
    instance_id: string;
    total: string;
    total_tax: string;
    taxes: any[];
    meta_data: any[];
  }>;
  fee_lines: Array<{
    id: number;
    name: string;
    tax_class: string;
    tax_status: string;
    total: string;
    total_tax: string;
    taxes: any[];
    meta_data: any[];
  }>;
  coupon_lines: Array<{
    id: number;
    code: string;
    discount: string;
    discount_tax: string;
    meta_data: any[];
  }>;
  refunds: Array<{
    id: number;
    reason: string;
    total: string;
  }>;
  set_paid: boolean;
}

/**
 * WooCommerce order strategy
 * Processes order data from WooCommerce REST API
 */
export class WoocommerceOrderStrategy extends OrderStrategy {
  private logger = createPlatformLogger('WOOCOMMERCE', 'OrderStrategy');

  /**
   * Transform WooCommerce order data to unified order format
   * @param data - WooCommerce order data
   * @param context - Platform context
   * @returns Unified order data
   */
  transformFromPlatform(data: any, context: StrategyContext): OrderData {
    const orderData = data as WooCommerceOrderData;
    
    this.logger.info({
      orderId: orderData.id,
      orderNumber: orderData.number,
    }, 'Transforming WooCommerce order data');

    // Create order items
    const orderItems: OrderItemData[] = orderData.line_items.map(item => ({
      externalId: item.id.toString(),
      productId: item.product_id.toString(),
      variantId: item.variation_id ? item.variation_id.toString() : undefined,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: parseFloat(item.total),
      taxAmount: parseFloat(item.total_tax),
      metadata: {
        taxClass: item.tax_class,
        subtotal: parseFloat(item.subtotal),
        subtotalTax: parseFloat(item.subtotal_tax),
        taxes: item.taxes,
        metaData: item.meta_data,
      },
    }));

    // Create payment data
    const payments: PaymentData[] = [{
      externalId: orderData.transaction_id || orderData.id.toString(),
      transactionId: orderData.transaction_id,
      method: this.mapWooCommercePaymentMethod(orderData.payment_method),
      status: this.mapWooCommercePaymentStatus(orderData.status),
      amount: parseFloat(orderData.total),
      currency: orderData.currency,
      processedAt: orderData.date_paid ? new Date(orderData.date_paid) : undefined,
      gateway: orderData.payment_method_title,
      gatewayTransactionId: orderData.transaction_id,
      metadata: {
        paymentMethodTitle: orderData.payment_method_title,
        setPaid: orderData.set_paid,
      },
    }];

    // Create refund data
    const refunds: RefundData[] = orderData.refunds.map(refund => ({
      externalId: refund.id.toString(),
      amount: Math.abs(parseFloat(refund.total)), // WooCommerce refunds are negative
      currency: orderData.currency,
      reason: refund.reason,
      status: 'completed',
      metadata: {
        refundId: refund.id,
      },
    }));

    // Create billing address
    const billingAddress: OrderAddress = {
      firstName: orderData.billing.first_name,
      lastName: orderData.billing.last_name,
      company: orderData.billing.company,
      address1: orderData.billing.address_1,
      address2: orderData.billing.address_2,
      city: orderData.billing.city,
      state: orderData.billing.state,
      postalCode: orderData.billing.postcode,
      country: orderData.billing.country,
      phone: orderData.billing.phone,
      email: orderData.billing.email,
    };

    // Create shipping address
    const shippingAddress: OrderAddress = {
      firstName: orderData.shipping.first_name || orderData.billing.first_name,
      lastName: orderData.shipping.last_name || orderData.billing.last_name,
      company: orderData.shipping.company || orderData.billing.company,
      address1: orderData.shipping.address_1 || orderData.billing.address_1,
      address2: orderData.shipping.address_2 || orderData.billing.address_2,
      city: orderData.shipping.city || orderData.billing.city,
      state: orderData.shipping.state || orderData.billing.state,
      postalCode: orderData.shipping.postcode || orderData.billing.postcode,
      country: orderData.shipping.country || orderData.billing.country,
      phone: orderData.billing.phone, // Shipping doesn't have phone in WooCommerce
      email: orderData.billing.email,
    };

    // Create order notes
    const notes: OrderNoteData[] = [];
    if (orderData.customer_note) {
      notes.push({
        content: orderData.customer_note,
        isCustomerNote: true,
        author: `${orderData.billing.first_name} ${orderData.billing.last_name}`,
        createdAt: new Date(orderData.date_created),
      });
    }

    // Calculate totals
    const shippingAmount = parseFloat(orderData.shipping_total) + parseFloat(orderData.shipping_tax);
    const taxAmount = parseFloat(orderData.total_tax);
    const discountAmount = parseFloat(orderData.discount_total) + parseFloat(orderData.discount_tax);

    // Build unified order data
    const unifiedOrderData: OrderData = {
      platform: Platform.WOOCOMMERCE,
      externalId: orderData.id.toString(),
      storeId: context.storeId,
      customerId: orderData.customer_id ? orderData.customer_id.toString() : undefined,
      
      // Order identification
      orderNumber: orderData.number,
      token: orderData.order_key,
      
      // Order status
      status: this.mapWooCommerceOrderStatus(orderData.status),
      paymentStatus: this.mapWooCommercePaymentStatus(orderData.status),
      shippingStatus: this.mapWooCommerceShippingStatus(orderData.status),
      fulfillmentStatus: this.mapWooCommerceFulfillmentStatus(orderData.status),
      
      // Timestamps
      orderDate: new Date(orderData.date_created),
      createdAt: new Date(orderData.date_created),
      updatedAt: new Date(orderData.date_modified),
      processedAt: orderData.date_paid ? new Date(orderData.date_paid) : undefined,
      deliveredAt: orderData.date_completed ? new Date(orderData.date_completed) : undefined,
      
      // Financial information
      subtotal: parseFloat(orderData.total) - taxAmount - shippingAmount + discountAmount,
      taxAmount,
      shippingAmount,
      discountAmount,
      totalAmount: parseFloat(orderData.total),
      currency: orderData.currency,
      
      // Customer information
      customerEmail: orderData.billing.email,
      customerPhone: orderData.billing.phone,
      
      // Addresses
      billingAddress,
      shippingAddress,
      
      // Order items and related data
      items: orderItems,
      payments,
      refunds: refunds.length > 0 ? refunds : undefined,
      notes: notes.length > 0 ? notes : undefined,
      
      // Shipping information
      shippingMethod: orderData.shipping_lines[0]?.method_title,
      
      // Platform-specific metadata
      metadata: {
        parentId: orderData.parent_id,
        createdVia: orderData.created_via,
        version: orderData.version,
        customerIpAddress: orderData.customer_ip_address,
        customerUserAgent: orderData.customer_user_agent,
        cartHash: orderData.cart_hash,
        pricesIncludeTax: orderData.prices_include_tax,
        taxLines: orderData.tax_lines,
        shippingLines: orderData.shipping_lines,
        feeLines: orderData.fee_lines,
        couponLines: orderData.coupon_lines,
        metaData: orderData.meta_data,
        rawData: orderData,
      },
    };

    return unifiedOrderData;
  }

  /**
   * Transform unified order data back to WooCommerce format
   * @param orderData - Unified order data
   * @returns WooCommerce order data format
   */
  transformToPlatformFormat(orderData: OrderData): any {
    return {
      id: parseInt(orderData.externalId),
      status: this.reverseMapOrderStatus(orderData.status),
      customer_note: orderData.notes?.find(note => note.isCustomerNote)?.content || '',
      transaction_id: orderData.payments?.[0]?.transactionId,
      // Add other fields as needed for updates
    };
  }

  /**
   * Apply WooCommerce-specific business rules
   * @param orderData - Order data to modify
   */
  protected applyBusinessRules(orderData: OrderData): void {
    // WooCommerce business rules
    
    // 1. Set default currency if not provided
    if (!orderData.currency) {
      orderData.currency = 'USD'; // WooCommerce default
    }
    
    // 2. Handle tax calculations
    if (orderData.metadata?.pricesIncludeTax) {
      // Prices include tax, so tax is already included in item prices
      orderData.metadata.taxIncluded = true;
    }
    
    // 3. Handle coupon discounts
    if (orderData.metadata?.couponLines && orderData.metadata.couponLines.length > 0) {
      orderData.metadata.couponsApplied = orderData.metadata.couponLines.map((coupon: any) => coupon.code);
    }
    
    // 4. Handle fees
    if (orderData.metadata?.feeLines && orderData.metadata.feeLines.length > 0) {
      const totalFees = orderData.metadata.feeLines.reduce((sum: number, fee: any) => 
        sum + parseFloat(fee.total), 0);
      orderData.metadata.totalFees = totalFees;
    }
    
    // 5. Validate order totals
    this.validateOrderTotals(orderData);
  }

  /**
   * Map WooCommerce payment method to unified format
   */
  private mapWooCommercePaymentMethod(method: string): PaymentMethod {
    const methodLower = method.toLowerCase();

    if (methodLower.includes('stripe') || methodLower.includes('card')) {
      return PaymentMethod.CREDIT_CARD;
    }
    if (methodLower.includes('paypal')) {
      return PaymentMethod.PAYPAL;
    }
    if (methodLower.includes('bacs') || methodLower.includes('bank')) {
      return PaymentMethod.BANK_TRANSFER;
    }
    if (methodLower.includes('cod') || methodLower.includes('cash')) {
      return PaymentMethod.CASH;
    }

    return PaymentMethod.OTHER;
  }

  /**
   * Map WooCommerce order status to unified format
   */
  private mapWooCommerceOrderStatus(status: string): OrderStatus {
    // Remove 'wc-' prefix if present
    const cleanStatus = status.replace(/^wc-/, '').toLowerCase();

    if (cleanStatus === 'pending' || cleanStatus === 'on-hold') {
      return OrderStatus.PENDING;
    }
    if (cleanStatus === 'processing') {
      return OrderStatus.PROCESSING;
    }
    if (cleanStatus === 'completed') {
      return OrderStatus.DELIVERED;
    }
    if (cleanStatus === 'cancelled') {
      return OrderStatus.CANCELLED;
    }
    if (cleanStatus === 'refunded') {
      return OrderStatus.REFUNDED;
    }
    if (cleanStatus === 'failed') {
      return OrderStatus.CANCELLED;
    }

    return this.normalizeOrderStatus(status);
  }

  /**
   * Map WooCommerce payment status to unified format
   */
  private mapWooCommercePaymentStatus(status: string): PaymentStatus {
    const cleanStatus = status.replace(/^wc-/, '').toLowerCase();

    if (cleanStatus === 'pending' || cleanStatus === 'on-hold') {
      return PaymentStatus.PENDING;
    }
    if (cleanStatus === 'processing' || cleanStatus === 'completed') {
      return PaymentStatus.PAID;
    }
    if (cleanStatus === 'cancelled' || cleanStatus === 'failed') {
      return PaymentStatus.FAILED;
    }
    if (cleanStatus === 'refunded') {
      return PaymentStatus.REFUNDED;
    }

    return this.normalizePaymentStatus(status);
  }

  /**
   * Map WooCommerce shipping status to unified format
   */
  private mapWooCommerceShippingStatus(status: string): ShippingStatus {
    const cleanStatus = status.replace(/^wc-/, '').toLowerCase();

    if (cleanStatus === 'pending' || cleanStatus === 'on-hold') {
      return ShippingStatus.PENDING;
    }
    if (cleanStatus === 'processing') {
      return ShippingStatus.PROCESSING;
    }
    if (cleanStatus === 'completed') {
      return ShippingStatus.DELIVERED;
    }

    return ShippingStatus.PENDING;
  }

  /**
   * Map WooCommerce fulfillment status to unified format
   */
  private mapWooCommerceFulfillmentStatus(status: string): FulfillmentStatus {
    const cleanStatus = status.replace(/^wc-/, '').toLowerCase();

    if (cleanStatus === 'completed') {
      return FulfillmentStatus.FULFILLED;
    }
    if (cleanStatus === 'processing') {
      return FulfillmentStatus.PARTIAL;
    }

    return FulfillmentStatus.UNFULFILLED;
  }

  /**
   * Reverse map order status for platform updates
   */
  private reverseMapOrderStatus(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'pending';
      case OrderStatus.PROCESSING:
        return 'processing';
      case OrderStatus.DELIVERED:
        return 'completed';
      case OrderStatus.CANCELLED:
        return 'cancelled';
      case OrderStatus.REFUNDED:
        return 'refunded';
      default:
        return 'pending';
    }
  }
}
