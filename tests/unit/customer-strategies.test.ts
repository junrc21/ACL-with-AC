/**
 * Unit tests for customer strategies
 */

import { Platform } from '@/shared/types/platform.types';
import { 
  CustomerRole, 
  CustomerStatus, 
  AddressType, 
  DocumentType 
} from '@/shared/types/customer.types';
import { HotmartCustomerStrategy } from '@/modules/acl/strategies/hotmart/HotmartCustomerStrategy';
import { NuvemshopCustomerStrategy } from '@/modules/acl/strategies/nuvemshop/NuvemshopCustomerStrategy';
import { WoocommerceCustomerStrategy } from '@/modules/acl/strategies/woocommerce/WoocommerceCustomerStrategy';
import { CustomerStrategyFactory } from '@/modules/acl/strategies/CustomerStrategyFactory';

describe('Customer Strategy Tests', () => {
  const mockContext = {
    platform: Platform.HOTMART,
    storeId: 'test-store',
    headers: {
      'x-source-platform': 'hotmart',
      'x-store-id': 'test-store',
      'user-agent': 'test-agent',
    },
    timestamp: new Date(),
  };

  describe('CustomerStrategyFactory', () => {
    it('should create correct strategy for each platform', () => {
      const hotmartStrategy = CustomerStrategyFactory.getStrategy(Platform.HOTMART);
      const nuvemshopStrategy = CustomerStrategyFactory.getStrategy(Platform.NUVEMSHOP);
      const woocommerceStrategy = CustomerStrategyFactory.getStrategy(Platform.WOOCOMMERCE);

      expect(hotmartStrategy).toBeInstanceOf(HotmartCustomerStrategy);
      expect(nuvemshopStrategy).toBeInstanceOf(NuvemshopCustomerStrategy);
      expect(woocommerceStrategy).toBeInstanceOf(WoocommerceCustomerStrategy);
    });

    it('should return same instance for multiple calls (singleton)', () => {
      const strategy1 = CustomerStrategyFactory.getStrategy(Platform.HOTMART);
      const strategy2 = CustomerStrategyFactory.getStrategy(Platform.HOTMART);

      expect(strategy1).toBe(strategy2);
    });

    it('should list supported platforms', () => {
      const platforms = CustomerStrategyFactory.getSupportedPlatforms();
      
      expect(platforms).toContain(Platform.HOTMART);
      expect(platforms).toContain(Platform.NUVEMSHOP);
      expect(platforms).toContain(Platform.WOOCOMMERCE);
    });
  });

  describe('HotmartCustomerStrategy', () => {
    const strategy = new HotmartCustomerStrategy();

    it('should transform Hotmart buyer data correctly', () => {
      const hotmartData = {
        user: {
          name: 'João Silva',
          ucode: 'HM123456',
          email: 'joao@example.com',
          documents: {
            cpf: '123.456.789-00',
          },
          address: {
            zipcode: '01234-567',
            address: 'Rua das Flores, 123',
            city: 'São Paulo',
            state: 'SP',
            country: 'BR',
            neighborhood: 'Centro',
          },
          phone: {
            country_code: '55',
            area_code: '11',
            number: '987654321',
          },
        },
        role: 'buyer',
      };

      const result = strategy.transformFromPlatform(hotmartData, mockContext);

      expect(result.platform).toBe(Platform.HOTMART);
      expect(result.externalId).toBe('HM123456');
      expect(result.email).toBe('joao@example.com');
      expect(result.fullName).toBe('João Silva');
      expect(result.role).toBe(CustomerRole.BUYER);
      expect(result.status).toBe(CustomerStatus.ACTIVE);
      expect(result.isPayingCustomer).toBe(true);
      
      // Check documents
      expect(result.documents).toHaveLength(1);
      expect(result.documents![0].type).toBe(DocumentType.CPF);
      expect(result.documents![0].number).toBe('123.456.789-00');
      
      // Check address
      expect(result.addresses).toHaveLength(1);
      expect(result.addresses![0].type).toBe(AddressType.BOTH);
      expect(result.addresses![0].city).toBe('São Paulo');
      
      // Check phone
      expect(result.phones).toHaveLength(1);
      expect(result.phones![0].countryCode).toBe('55');
      expect(result.phones![0].areaCode).toBe('11');
    });

    it('should handle producer role correctly', () => {
      const hotmartData = {
        user: {
          name: 'Maria Producer',
          ucode: 'HM789012',
          email: 'maria@producer.com',
        },
        role: 'producer',
      };

      const result = strategy.transformFromPlatform(hotmartData, mockContext);

      expect(result.role).toBe(CustomerRole.PRODUCER);
      expect(result.isPayingCustomer).toBe(false);
    });

    it('should apply business rules correctly', () => {
      const customerData = {
        platform: Platform.HOTMART,
        externalId: 'HM123',
        email: 'test@example.com',
        role: CustomerRole.BUYER,
        status: CustomerStatus.INACTIVE, // Will be changed to ACTIVE
        spending: {
          totalSpent: 100,
          currency: '', // Will be set to USD
          orderCount: 1,
          averageOrderValue: 100,
        },
      };

      // Apply business rules (protected method, so we test through processCustomer)
      const processResult = strategy.processCustomer(
        { user: { name: 'Test', ucode: 'HM123', email: 'test@example.com' }, role: 'buyer' },
        mockContext
      );

      expect(processResult).resolves.toMatchObject({
        success: true,
        customer: expect.objectContaining({
          status: CustomerStatus.ACTIVE,
          isPayingCustomer: true,
        }),
      });
    });
  });

  describe('NuvemshopCustomerStrategy', () => {
    const strategy = new NuvemshopCustomerStrategy();

    it('should transform Nuvemshop customer data correctly', () => {
      const nuvemshopData = {
        id: 12345,
        email: 'customer@example.com',
        first_name: 'Ana',
        last_name: 'Santos',
        phone: '+5511987654321',
        total_spent: '250.50',
        total_spent_currency: 'BRL',
        active: true,
        created_at: '2023-01-15T10:30:00Z',
        custom_fields: {
          preference: 'email',
        },
      };

      const result = strategy.transformFromPlatform(nuvemshopData, {
        ...mockContext,
        platform: Platform.NUVEMSHOP,
      });

      expect(result.platform).toBe(Platform.NUVEMSHOP);
      expect(result.externalId).toBe('12345');
      expect(result.email).toBe('customer@example.com');
      expect(result.firstName).toBe('Ana');
      expect(result.lastName).toBe('Santos');
      expect(result.fullName).toBe('Ana Santos');
      expect(result.role).toBe(CustomerRole.CUSTOMER);
      expect(result.status).toBe(CustomerStatus.ACTIVE);
      expect(result.isPayingCustomer).toBe(true);
      
      // Check spending data
      expect(result.spending?.totalSpent).toBe(250.50);
      expect(result.spending?.currency).toBe('BRL');
      
      // Check metadata
      expect(result.metadata?.customFields).toEqual({ preference: 'email' });
    });

    it('should handle inactive customers', () => {
      const nuvemshopData = {
        id: 67890,
        email: 'inactive@example.com',
        active: false,
        total_spent: '0',
      };

      const result = strategy.transformFromPlatform(nuvemshopData, {
        ...mockContext,
        platform: Platform.NUVEMSHOP,
      });

      expect(result.status).toBe(CustomerStatus.INACTIVE);
      expect(result.isPayingCustomer).toBe(false);
    });

    it('should parse addresses correctly', () => {
      const nuvemshopData = {
        id: 11111,
        email: 'address@example.com',
        default_address: {
          first_name: 'Carlos',
          last_name: 'Lima',
          address: 'Av. Paulista, 1000',
          city: 'São Paulo',
          province: 'SP',
          zipcode: '01310-100',
          country: 'BR',
          phone: '11999888777',
        },
        addresses: [
          {
            id: 1,
            address: 'Rua B, 200',
            city: 'Rio de Janeiro',
            province: 'RJ',
            zipcode: '20000-000',
            country: 'BR',
          },
        ],
      };

      const result = strategy.transformFromPlatform(nuvemshopData, {
        ...mockContext,
        platform: Platform.NUVEMSHOP,
      });

      expect(result.addresses).toHaveLength(2);
      expect(result.addresses![0].type).toBe(AddressType.BOTH);
      expect(result.addresses![0].address1).toBe('Av. Paulista, 1000');
      expect(result.addresses![1].type).toBe(AddressType.SHIPPING);
      expect(result.addresses![1].address1).toBe('Rua B, 200');
    });
  });

  describe('WoocommerceCustomerStrategy', () => {
    const strategy = new WoocommerceCustomerStrategy();

    it('should transform WooCommerce customer data correctly', () => {
      const woocommerceData = {
        id: 789,
        email: 'woo@example.com',
        first_name: 'Pedro',
        last_name: 'Costa',
        username: 'pedrocosta',
        role: 'customer',
        is_paying_customer: true,
        avatar_url: 'https://example.com/avatar.jpg',
        billing: {
          first_name: 'Pedro',
          last_name: 'Costa',
          company: 'Tech Corp',
          address_1: 'Rua Tech, 500',
          city: 'Belo Horizonte',
          state: 'MG',
          postcode: '30000-000',
          country: 'BR',
          email: 'billing@example.com',
          phone: '31987654321',
        },
        shipping: {
          first_name: 'Pedro',
          last_name: 'Costa',
          address_1: 'Rua Shipping, 600',
          city: 'Contagem',
          state: 'MG',
          postcode: '32000-000',
          country: 'BR',
        },
        date_created: '2023-02-20T14:30:00Z',
      };

      const result = strategy.transformFromPlatform(woocommerceData, {
        ...mockContext,
        platform: Platform.WOOCOMMERCE,
      });

      expect(result.platform).toBe(Platform.WOOCOMMERCE);
      expect(result.externalId).toBe('789');
      expect(result.email).toBe('woo@example.com');
      expect(result.firstName).toBe('Pedro');
      expect(result.lastName).toBe('Costa');
      expect(result.username).toBe('pedrocosta');
      expect(result.role).toBe(CustomerRole.CUSTOMER);
      expect(result.status).toBe(CustomerStatus.ACTIVE);
      expect(result.isPayingCustomer).toBe(true);
      expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
      
      // Check addresses
      expect(result.addresses).toHaveLength(2);
      expect(result.addresses![0].type).toBe(AddressType.BILLING);
      expect(result.addresses![0].company).toBe('Tech Corp');
      expect(result.addresses![1].type).toBe(AddressType.SHIPPING);
      expect(result.addresses![1].city).toBe('Contagem');
      
      // Check phone
      expect(result.phones).toHaveLength(1);
      expect(result.phones![0].number).toBe('31987654321');
    });

    it('should handle same billing and shipping addresses', () => {
      const woocommerceData = {
        id: 999,
        email: 'same@example.com',
        billing: {
          address_1: 'Same Street, 100',
          city: 'Same City',
          postcode: '12345-678',
          country: 'BR',
        },
        shipping: {
          address_1: 'Same Street, 100',
          city: 'Same City',
          postcode: '12345-678',
          country: 'BR',
        },
      };

      const result = strategy.transformFromPlatform(woocommerceData, {
        ...mockContext,
        platform: Platform.WOOCOMMERCE,
      });

      expect(result.addresses).toHaveLength(1);
      expect(result.addresses![0].type).toBe(AddressType.BOTH);
    });

    it('should map administrator roles correctly', () => {
      const woocommerceData = {
        id: 888,
        email: 'admin@example.com',
        role: 'administrator',
      };

      const result = strategy.transformFromPlatform(woocommerceData, {
        ...mockContext,
        platform: Platform.WOOCOMMERCE,
      });

      expect(result.role).toBe(CustomerRole.ADMINISTRATOR);
    });
  });

  describe('Customer Data Validation', () => {
    const strategy = new HotmartCustomerStrategy();

    it('should validate required fields', async () => {
      const invalidData = {
        user: {
          name: '',
          ucode: '',
          email: 'invalid-email',
        },
        role: 'buyer',
      };

      const result = await strategy.processCustomer(invalidData, mockContext);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('External ID is required');
      expect(result.errors).toContain('Invalid email format');
    });

    it('should validate email format', async () => {
      const invalidEmailData = {
        user: {
          name: 'Test User',
          ucode: 'HM123',
          email: 'not-an-email',
        },
        role: 'buyer',
      };

      const result = await strategy.processCustomer(invalidEmailData, mockContext);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should pass validation for valid data', async () => {
      const validData = {
        user: {
          name: 'Valid User',
          ucode: 'HM123456',
          email: 'valid@example.com',
        },
        role: 'buyer',
      };

      const result = await strategy.processCustomer(validData, mockContext);

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });
});
