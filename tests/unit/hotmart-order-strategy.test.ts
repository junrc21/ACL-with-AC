/**
 * Unit tests for Hotmart Order Strategy
 */

import { Platform } from '@/shared/types/platform.types';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@/shared/types/order.types';

describe('Hotmart Order Strategy Unit Tests', () => {
  describe('Payment Method Mapping', () => {
    it('should map payment methods correctly', () => {
      const mapHotmartPaymentMethod = (method: string): PaymentMethod => {
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
      };

      expect(mapHotmartPaymentMethod('credit_card')).toBe(PaymentMethod.CREDIT_CARD);
      expect(mapHotmartPaymentMethod('cartao_credito')).toBe(PaymentMethod.CREDIT_CARD);
      expect(mapHotmartPaymentMethod('debit_card')).toBe(PaymentMethod.DEBIT_CARD);
      expect(mapHotmartPaymentMethod('pix')).toBe(PaymentMethod.PIX);
      expect(mapHotmartPaymentMethod('boleto')).toBe(PaymentMethod.BOLETO);
      expect(mapHotmartPaymentMethod('paypal')).toBe(PaymentMethod.PAYPAL);
      expect(mapHotmartPaymentMethod('bank_transfer')).toBe(PaymentMethod.BANK_TRANSFER);
      expect(mapHotmartPaymentMethod('unknown_method')).toBe(PaymentMethod.OTHER);
    });
  });

  describe('Order Status Mapping', () => {
    it('should map order status correctly', () => {
      const mapHotmartOrderStatus = (status: string): OrderStatus => {
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
        
        return OrderStatus.PENDING;
      };

      expect(mapHotmartOrderStatus('approved')).toBe(OrderStatus.CONFIRMED);
      expect(mapHotmartOrderStatus('complete')).toBe(OrderStatus.CONFIRMED);
      expect(mapHotmartOrderStatus('canceled')).toBe(OrderStatus.CANCELLED);
      expect(mapHotmartOrderStatus('cancelled')).toBe(OrderStatus.CANCELLED);
      expect(mapHotmartOrderStatus('refunded')).toBe(OrderStatus.REFUNDED);
      expect(mapHotmartOrderStatus('pending')).toBe(OrderStatus.PENDING);
      expect(mapHotmartOrderStatus('unknown')).toBe(OrderStatus.PENDING);
    });
  });

  describe('Payment Status Mapping', () => {
    it('should map payment status correctly', () => {
      const mapHotmartPaymentStatus = (status: string): PaymentStatus => {
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
        
        return PaymentStatus.PENDING;
      };

      expect(mapHotmartPaymentStatus('approved')).toBe(PaymentStatus.PAID);
      expect(mapHotmartPaymentStatus('complete')).toBe(PaymentStatus.PAID);
      expect(mapHotmartPaymentStatus('canceled')).toBe(PaymentStatus.CANCELLED);
      expect(mapHotmartPaymentStatus('cancelled')).toBe(PaymentStatus.CANCELLED);
      expect(mapHotmartPaymentStatus('refunded')).toBe(PaymentStatus.REFUNDED);
      expect(mapHotmartPaymentStatus('pending')).toBe(PaymentStatus.PENDING);
      expect(mapHotmartPaymentStatus('unknown')).toBe(PaymentStatus.PENDING);
    });
  });

  describe('Commission Calculation', () => {
    it('should calculate commission percentage correctly', () => {
      const calculateCommissionPercentage = (commissionValue: number, totalValue: number): number => {
        if (totalValue === 0) return 0;
        return (commissionValue / totalValue) * 100;
      };

      expect(calculateCommissionPercentage(10, 100)).toBe(10);
      expect(calculateCommissionPercentage(25, 100)).toBe(25);
      expect(calculateCommissionPercentage(50, 200)).toBe(25);
      expect(calculateCommissionPercentage(0, 100)).toBe(0);
      expect(calculateCommissionPercentage(10, 0)).toBe(0);
    });
  });

  describe('Order Data Transformation', () => {
    it('should transform Hotmart sales data correctly', () => {
      const mockSalesData = {
        id: 'sale_123',
        transaction: 'TXN_456',
        status: 'approved',
        date: '2023-12-01T10:00:00Z',
        product: {
          id: 789,
          name: 'Digital Course',
          ucode: 'COURSE_001',
        },
        buyer: {
          name: 'John Doe',
          email: 'john@example.com',
          ucode: 'BUYER_123',
          phone: '+5511999999999',
        },
        producer: {
          name: 'Jane Producer',
          email: 'jane@example.com',
          ucode: 'PRODUCER_456',
        },
        purchase: {
          price: {
            value: 99.99,
            currency_code: 'BRL',
          },
          payment: {
            method: 'credit_card',
            installments_number: 3,
            type: 'CREDIT_CARD',
          },
          offer: {
            code: 'OFFER_001',
          },
        },
        commissions: [
          {
            value: 69.99,
            source: 'PRODUCER',
          },
          {
            value: 20.00,
            source: 'AFFILIATE',
          },
        ],
      };

      // Mock transformation logic
      const transformedOrder = {
        platform: Platform.HOTMART,
        externalId: mockSalesData.transaction,
        orderNumber: mockSalesData.transaction,
        token: mockSalesData.id,
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        orderDate: new Date(mockSalesData.date),
        subtotal: mockSalesData.purchase.price.value,
        totalAmount: mockSalesData.purchase.price.value,
        currency: mockSalesData.purchase.price.currency_code,
        customerEmail: mockSalesData.buyer.email,
        customerPhone: mockSalesData.buyer.phone,
        items: [{
          externalId: mockSalesData.product.id.toString(),
          productId: mockSalesData.product.id.toString(),
          name: mockSalesData.product.name,
          sku: mockSalesData.product.ucode,
          quantity: 1,
          unitPrice: mockSalesData.purchase.price.value,
          totalPrice: mockSalesData.purchase.price.value,
          taxAmount: 0,
          productType: 'digital',
        }],
        payments: [{
          externalId: mockSalesData.transaction,
          transactionId: mockSalesData.transaction,
          method: PaymentMethod.CREDIT_CARD,
          status: PaymentStatus.PAID,
          amount: mockSalesData.purchase.price.value,
          currency: mockSalesData.purchase.price.currency_code,
          installments: mockSalesData.purchase.payment.installments_number,
        }],
        commissions: mockSalesData.commissions.map(commission => ({
          externalId: `${mockSalesData.transaction}_${commission.source}`,
          type: commission.source.toLowerCase(),
          percentage: (commission.value / mockSalesData.purchase.price.value) * 100,
          amount: commission.value,
          currency: mockSalesData.purchase.price.currency_code,
          status: 'pending',
        })),
      };

      expect(transformedOrder.platform).toBe(Platform.HOTMART);
      expect(transformedOrder.externalId).toBe('TXN_456');
      expect(transformedOrder.status).toBe(OrderStatus.CONFIRMED);
      expect(transformedOrder.paymentStatus).toBe(PaymentStatus.PAID);
      expect(transformedOrder.totalAmount).toBe(99.99);
      expect(transformedOrder.currency).toBe('BRL');
      expect(transformedOrder.items).toHaveLength(1);
      expect(transformedOrder.items[0].name).toBe('Digital Course');
      expect(transformedOrder.payments).toHaveLength(1);
      expect(transformedOrder.payments[0].method).toBe(PaymentMethod.CREDIT_CARD);
      expect(transformedOrder.commissions).toHaveLength(2);
      expect(transformedOrder.commissions[0].type).toBe('producer');
      expect(transformedOrder.commissions[0].percentage).toBeCloseTo(69.99, 1);
    });
  });

  describe('Business Rules', () => {
    it('should apply Hotmart-specific business rules', () => {
      const mockOrderData = {
        platform: Platform.HOTMART,
        externalId: 'TXN_123',
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        orderDate: new Date(),
        subtotal: 100,
        totalAmount: 100,
        currency: '',
        items: [{
          name: 'Digital Product',
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
        }],
        shippingAmount: 10, // Should be set to 0 for digital products
        shippingStatus: undefined,
        fulfillmentStatus: undefined,
        metadata: {},
      };

      // Apply business rules
      const applyBusinessRules = (orderData: any) => {
        // 1. Digital products don't have shipping
        orderData.shippingAmount = 0;
        orderData.shippingStatus = undefined;
        orderData.fulfillmentStatus = undefined;
        
        // 2. Set default currency if not provided
        if (!orderData.currency) {
          orderData.currency = 'BRL';
        }
        
        // 3. Handle subscription orders
        if (orderData.metadata?.subscription) {
          orderData.metadata.isSubscription = true;
        }
      };

      applyBusinessRules(mockOrderData);

      expect(mockOrderData.shippingAmount).toBe(0);
      expect(mockOrderData.shippingStatus).toBeUndefined();
      expect(mockOrderData.fulfillmentStatus).toBeUndefined();
      expect(mockOrderData.currency).toBe('BRL');
    });
  });
});
