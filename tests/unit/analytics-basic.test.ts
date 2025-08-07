import { Platform } from '@prisma/client';

describe('Analytics Module Basic Tests', () => {
  describe('Platform Enum', () => {
    it('should have the required platform values', () => {
      expect(Platform.HOTMART).toBeDefined();
      expect(Platform.NUVEMSHOP).toBeDefined();
      expect(Platform.WOOCOMMERCE).toBeDefined();
    });
  });

  describe('Analytics Context Structure', () => {
    it('should define a valid analytics context structure', () => {
      const context = {
        platform: Platform.HOTMART,
        storeId: 'test-store',
        timezone: 'UTC',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        },
      };

      expect(context.platform).toBe(Platform.HOTMART);
      expect(context.storeId).toBe('test-store');
      expect(context.timezone).toBe('UTC');
      expect(context.dateRange).toBeDefined();
      expect(context.dateRange.startDate).toBeInstanceOf(Date);
      expect(context.dateRange.endDate).toBeInstanceOf(Date);
    });
  });

  describe('Date Range Validation', () => {
    it('should create valid date ranges', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      expect(startDate.getTime()).toBeLessThan(endDate.getTime());
      expect(startDate.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(endDate.toISOString()).toBe('2024-01-31T00:00:00.000Z');
    });
  });
});
