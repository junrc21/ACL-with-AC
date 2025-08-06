/**
 * Nuvemshop order strategy implementation
 * Handles order data from Nuvemshop with fulfillment tracking, abandoned checkouts, and draft orders
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
  OrderAddress,
  OrderNoteData
} from '@/shared/types/order.types';
import { Platform } from '@/shared/types/platform.types';
import { createPlatformLogger } from '@/shared/utils/logger';

/**
 * Nuvemshop order data interface
 */
interface NuvemshopOrderData {
  id: number;
  token: string;
  store_id: string;
  contact_email: string;
  contact_name: string;
  contact_phone?: string;
  contact_identification?: string;
  shipping_status: string;
  payment_status: string;
  status: string;
  currency: string;
  language: string;
  gateway: string;
  gateway_id?: string;
  gateway_name?: string;
  shipping_option: string;
  shipping_option_code: string;
  shipping_option_reference?: string;
  shipping_tracking_number?: string;
  shipping_tracking_url?: string;
  shipping_store_branch_name?: string;
  shipping_pickup_details?: string;
  shipping_min_days?: number;
  shipping_max_days?: number;
  billing_name: string;
  billing_phone?: string;
  billing_address: string;
  billing_number: string;
  billing_floor?: string;
  billing_locality: string;
  billing_zipcode: string;
  billing_city: string;
  billing_province: string;
  billing_country: string;
  shipping_name?: string;
  shipping_phone?: string;
  shipping_address?: string;
  shipping_number?: string;
  shipping_floor?: string;
  shipping_locality?: string;
  shipping_zipcode?: string;
  shipping_city?: string;
  shipping_province?: string;
  shipping_country?: string;
  completed_at: {
    date: string;
    timezone_type: number;
    timezone: string;
  };
  created_at: string;
  updated_at: string;
  next_action: string;
  payment_details: {
    method?: string;
    credit_card_company?: string;
    installments?: number;
  };
  customer: {
    id: number;
    name: string;
    email: string;
    identification?: string;
    phone?: string;
    note?: string;
    default_address?: any;
    addresses?: any[];
    billing_name?: string;
    billing_phone?: string;
    billing_identification?: string;
    billing_address?: string;
    billing_number?: string;
    billing_floor?: string;
    billing_locality?: string;
    billing_zipcode?: string;
    billing_city?: string;
    billing_province?: string;
    billing_country?: string;
  };
  products: Array<{
    id: number;
    depth?: string;
    height?: string;
    name: string;
    price: string;
    product_id: number;
    image: {
      id: number;
      product_id: number;
      src: string;
      position: number;
      alt: string;
      created_at: string;
      updated_at: string;
    };
    quantity: string;
    free_shipping: boolean;
    weight: string;
    width?: string;
    variant_id: number;
    variant_values?: string;
    properties?: any[];
    sku?: string;
  }>;
  number: number;
  cancel_reason?: string;
  owner_note?: string;
  cancelled_at?: string;
  closed_at?: string;
  read_at?: string;
  total: string;
  subtotal: string;
  discount: string;
  discount_coupon?: string;
  discount_gateway: string;
  total_usd: string;
  checkout_enabled: boolean;
  weight: string;
  date_first_potential_pickup?: string;
  total_with_shipping: string;
  total_without_shipping: string;
  shipping_cost_owner: string;
  shipping_cost_customer: string;
  coupon?: Array<{
    id: number;
    code: string;
    type: string;
    value: string;
  }>;
  promotional_discount: {
    id?: number;
    store_id: number;
    order_id: number;
    created_at: string;
    total_discount_amount: string;
    contents?: any[];
  };
  app?: {
    id: string;
    name: string;
    description: string;
  };
}

/**
 * Nuvemshop order strategy
 * Processes order data from Nuvemshop API
 */
export class NuvemshopOrderStrategy extends OrderStrategy {
  private logger = createPlatformLogger('NUVEMSHOP', 'OrderStrategy');

  /**
   * Transform Nuvemshop order data to unified order format
   * @param data - Nuvemshop order data
   * @param context - Platform context
   * @returns Unified order data
   */
  transformFromPlatform(data: any, context: StrategyContext): OrderData {
    const orderData = data as NuvemshopOrderData;
    
    this.logger.info({
      orderId: orderData.id,
      orderNumber: orderData.number,
    }, 'Transforming Nuvemshop order data');

    // Create order items
    const orderItems: OrderItemData[] = orderData.products.map(product => ({
      externalId: product.id.toString(),
      productId: product.product_id.toString(),
      variantId: product.variant_id ? product.variant_id.toString() : undefined,
      name: product.name,
      sku: product.sku,
      quantity: parseInt(product.quantity),
      unitPrice: parseFloat(product.price),
      totalPrice: parseFloat(product.price) * parseInt(product.quantity),
      taxAmount: 0, // Nuvemshop handles taxes separately
      weight: product.weight ? parseFloat(product.weight) : undefined,
      dimensions: {
        length: product.depth ? parseFloat(product.depth) : undefined,
        width: product.width ? parseFloat(product.width) : undefined,
        height: product.height ? parseFloat(product.height) : undefined,
      },
      metadata: {
        variantValues: product.variant_values,
        properties: product.properties,
        freeShipping: product.free_shipping,
        imageUrl: product.image?.src,
      },
    }));

    // Create payment data
    const payments: PaymentData[] = [{
      externalId: orderData.gateway_id || orderData.id.toString(),
      transactionId: orderData.gateway_id,
      method: this.mapNuvemshopPaymentMethod(orderData.payment_details.method || orderData.gateway),
      status: this.mapNuvemshopPaymentStatus(orderData.payment_status),
      amount: parseFloat(orderData.total),
      currency: orderData.currency,
      processedAt: orderData.completed_at ? new Date(orderData.completed_at.date) : undefined,
      gateway: orderData.gateway_name || orderData.gateway,
      gatewayTransactionId: orderData.gateway_id,
      installments: orderData.payment_details.installments,
      metadata: {
        creditCardCompany: orderData.payment_details.credit_card_company,
        gatewayName: orderData.gateway_name,
      },
    }];

    // Create billing address
    const billingAddress: OrderAddress = {
      firstName: this.extractFirstName(orderData.billing_name),
      lastName: this.extractLastName(orderData.billing_name),
      address1: `${orderData.billing_address} ${orderData.billing_number}`,
      address2: orderData.billing_floor,
      city: orderData.billing_city,
      state: orderData.billing_province,
      postalCode: orderData.billing_zipcode,
      country: orderData.billing_country,
      phone: orderData.billing_phone,
      email: orderData.contact_email,
    };

    // Create shipping address if different from billing
    const shippingAddress: OrderAddress | undefined = orderData.shipping_address ? {
      firstName: this.extractFirstName(orderData.shipping_name || orderData.billing_name),
      lastName: this.extractLastName(orderData.shipping_name || orderData.billing_name),
      address1: `${orderData.shipping_address} ${orderData.shipping_number || ''}`,
      address2: orderData.shipping_floor,
      city: orderData.shipping_city || orderData.billing_city,
      state: orderData.shipping_province || orderData.billing_province,
      postalCode: orderData.shipping_zipcode || orderData.billing_zipcode,
      country: orderData.shipping_country || orderData.billing_country,
      phone: orderData.shipping_phone || orderData.billing_phone,
      email: orderData.contact_email,
    } : undefined;

    // Create order notes
    const notes: OrderNoteData[] = [];
    if (orderData.owner_note) {
      notes.push({
        content: orderData.owner_note,
        isCustomerNote: false,
        author: 'store_owner',
        createdAt: new Date(orderData.created_at),
      });
    }
    if (orderData.customer?.note) {
      notes.push({
        content: orderData.customer.note,
        isCustomerNote: true,
        author: orderData.customer.name,
        createdAt: new Date(orderData.created_at),
      });
    }

    // Build unified order data
    const unifiedOrderData: OrderData = {
      platform: Platform.NUVEMSHOP,
      externalId: orderData.id.toString(),
      storeId: orderData.store_id,
      customerId: orderData.customer?.id.toString(),
      
      // Order identification
      orderNumber: orderData.number.toString(),
      token: orderData.token,
      
      // Order status
      status: this.mapNuvemshopOrderStatus(orderData.status),
      paymentStatus: this.mapNuvemshopPaymentStatus(orderData.payment_status),
      shippingStatus: this.mapNuvemshopShippingStatus(orderData.shipping_status),
      fulfillmentStatus: this.mapNuvemshopFulfillmentStatus(orderData.status, orderData.shipping_status),
      
      // Timestamps
      orderDate: new Date(orderData.created_at),
      createdAt: new Date(orderData.created_at),
      updatedAt: new Date(orderData.updated_at),
      processedAt: orderData.completed_at ? new Date(orderData.completed_at.date) : undefined,
      shippedAt: orderData.shipping_tracking_number ? new Date(orderData.updated_at) : undefined,
      deliveredAt: orderData.closed_at ? new Date(orderData.closed_at) : undefined,
      
      // Financial information
      subtotal: parseFloat(orderData.subtotal),
      taxAmount: 0, // Nuvemshop handles taxes in the total
      shippingAmount: parseFloat(orderData.shipping_cost_customer || '0'),
      discountAmount: parseFloat(orderData.discount || '0'),
      totalAmount: parseFloat(orderData.total),
      currency: orderData.currency,
      
      // Customer information
      customerEmail: orderData.contact_email,
      customerPhone: orderData.contact_phone,
      
      // Addresses
      billingAddress,
      shippingAddress,
      
      // Order items and related data
      items: orderItems,
      payments,
      notes: notes.length > 0 ? notes : undefined,
      
      // Shipping information
      shippingMethod: orderData.shipping_option,
      trackingNumber: orderData.shipping_tracking_number,
      trackingUrl: orderData.shipping_tracking_url,
      
      // Platform-specific metadata
      metadata: {
        language: orderData.language,
        gateway: orderData.gateway,
        gatewayName: orderData.gateway_name,
        shippingOptionCode: orderData.shipping_option_code,
        shippingOptionReference: orderData.shipping_option_reference,
        shippingMinDays: orderData.shipping_min_days,
        shippingMaxDays: orderData.shipping_max_days,
        nextAction: orderData.next_action,
        cancelReason: orderData.cancel_reason,
        discountCoupon: orderData.discount_coupon,
        coupons: orderData.coupon,
        promotionalDiscount: orderData.promotional_discount,
        app: orderData.app,
        checkoutEnabled: orderData.checkout_enabled,
        weight: orderData.weight,
        rawData: orderData,
      },
    };

    return unifiedOrderData;
  }

  /**
   * Transform unified order data back to Nuvemshop format
   * @param orderData - Unified order data
   * @returns Nuvemshop order data format
   */
  transformToPlatformFormat(orderData: OrderData): any {
    return {
      id: parseInt(orderData.externalId),
      status: this.reverseMapOrderStatus(orderData.status),
      payment_status: this.reverseMapPaymentStatus(orderData.paymentStatus),
      shipping_status: this.reverseMapShippingStatus(orderData.shippingStatus),
      shipping_tracking_number: orderData.trackingNumber,
      shipping_tracking_url: orderData.trackingUrl,
      owner_note: orderData.notes?.find(note => !note.isCustomerNote)?.content,
      // Add other fields as needed for updates
    };
  }

  /**
   * Apply Nuvemshop-specific business rules
   * @param orderData - Order data to modify
   */
  protected applyBusinessRules(orderData: OrderData): void {
    // Nuvemshop business rules
    
    // 1. Set default currency if not provided
    if (!orderData.currency) {
      orderData.currency = 'ARS'; // Nuvemshop is primarily Argentinian
    }
    
    // 2. Handle draft orders (checkout not enabled)
    if (orderData.metadata?.checkoutEnabled === false) {
      orderData.status = OrderStatus.PENDING;
      orderData.paymentStatus = PaymentStatus.PENDING;
    }
    
    // 3. Calculate shipping costs
    if (orderData.items.some(item => item.metadata?.freeShipping)) {
      orderData.shippingAmount = 0;
    }
    
    // 4. Handle abandoned checkouts
    if (orderData.metadata?.nextAction === 'recover_checkout') {
      orderData.status = OrderStatus.PENDING;
      orderData.metadata.isAbandonedCheckout = true;
    }
    
    // 5. Validate order totals
    this.validateOrderTotals(orderData);
  }

  /**
   * Map Nuvemshop payment method to unified format
   */
  private mapNuvemshopPaymentMethod(method?: string): PaymentMethod {
    if (!method) return PaymentMethod.OTHER;

    const methodLower = method.toLowerCase();

    if (methodLower.includes('credit') || methodLower.includes('tarjeta')) {
      return PaymentMethod.CREDIT_CARD;
    }
    if (methodLower.includes('debit')) {
      return PaymentMethod.DEBIT_CARD;
    }
    if (methodLower.includes('transfer') || methodLower.includes('transferencia')) {
      return PaymentMethod.BANK_TRANSFER;
    }
    if (methodLower.includes('cash') || methodLower.includes('efectivo')) {
      return PaymentMethod.CASH;
    }

    return PaymentMethod.OTHER;
  }

  /**
   * Map Nuvemshop order status to unified format
   */
  private mapNuvemshopOrderStatus(status: string): OrderStatus {
    const statusLower = status.toLowerCase();

    if (statusLower === 'open' || statusLower === 'pending') {
      return OrderStatus.PENDING;
    }
    if (statusLower === 'closed' || statusLower === 'completed') {
      return OrderStatus.DELIVERED;
    }
    if (statusLower === 'cancelled' || statusLower === 'canceled') {
      return OrderStatus.CANCELLED;
    }

    return this.normalizeOrderStatus(status);
  }

  /**
   * Map Nuvemshop payment status to unified format
   */
  private mapNuvemshopPaymentStatus(status: string): PaymentStatus {
    const statusLower = status.toLowerCase();

    if (statusLower === 'pending' || statusLower === 'awaiting_payment') {
      return PaymentStatus.PENDING;
    }
    if (statusLower === 'authorized') {
      return PaymentStatus.AUTHORIZED;
    }
    if (statusLower === 'paid' || statusLower === 'completed') {
      return PaymentStatus.PAID;
    }
    if (statusLower === 'voided' || statusLower === 'cancelled') {
      return PaymentStatus.CANCELLED;
    }
    if (statusLower === 'refunded') {
      return PaymentStatus.REFUNDED;
    }

    return this.normalizePaymentStatus(status);
  }

  /**
   * Map Nuvemshop shipping status to unified format
   */
  private mapNuvemshopShippingStatus(status: string): ShippingStatus {
    const statusLower = status.toLowerCase();

    if (statusLower === 'unpacked' || statusLower === 'pending') {
      return ShippingStatus.PENDING;
    }
    if (statusLower === 'packed' || statusLower === 'ready') {
      return ShippingStatus.PROCESSING;
    }
    if (statusLower === 'shipped' || statusLower === 'dispatched') {
      return ShippingStatus.SHIPPED;
    }
    if (statusLower === 'delivered') {
      return ShippingStatus.DELIVERED;
    }

    return ShippingStatus.PENDING;
  }

  /**
   * Map Nuvemshop fulfillment status to unified format
   */
  private mapNuvemshopFulfillmentStatus(orderStatus: string, shippingStatus: string): FulfillmentStatus {
    const orderLower = orderStatus.toLowerCase();
    const shippingLower = shippingStatus.toLowerCase();

    if (orderLower === 'closed' && shippingLower === 'delivered') {
      return FulfillmentStatus.FULFILLED;
    }
    if (shippingLower === 'shipped' || shippingLower === 'dispatched') {
      return FulfillmentStatus.PARTIAL;
    }

    return FulfillmentStatus.UNFULFILLED;
  }

  /**
   * Extract first name from full name
   */
  private extractFirstName(fullName: string): string {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  }

  /**
   * Extract last name from full name
   */
  private extractLastName(fullName: string): string {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  /**
   * Reverse map order status for platform updates
   */
  private reverseMapOrderStatus(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'open';
      case OrderStatus.DELIVERED:
        return 'closed';
      case OrderStatus.CANCELLED:
        return 'cancelled';
      default:
        return 'open';
    }
  }

  /**
   * Reverse map payment status for platform updates
   */
  private reverseMapPaymentStatus(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.PENDING:
        return 'pending';
      case PaymentStatus.AUTHORIZED:
        return 'authorized';
      case PaymentStatus.PAID:
        return 'paid';
      case PaymentStatus.CANCELLED:
        return 'voided';
      case PaymentStatus.REFUNDED:
        return 'refunded';
      default:
        return 'pending';
    }
  }

  /**
   * Reverse map shipping status for platform updates
   */
  private reverseMapShippingStatus(status?: ShippingStatus): string {
    if (!status) return 'unpacked';

    switch (status) {
      case ShippingStatus.PENDING:
        return 'unpacked';
      case ShippingStatus.PROCESSING:
        return 'packed';
      case ShippingStatus.SHIPPED:
        return 'shipped';
      case ShippingStatus.DELIVERED:
        return 'delivered';
      default:
        return 'unpacked';
    }
  }
}
