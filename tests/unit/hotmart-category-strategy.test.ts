/**
 * Unit tests for Hotmart Category Strategy
 */

import { Platform } from '@/shared/types/platform.types';
import { CategoryStatus, HotmartCategoryData } from '@/shared/types/category.types';

describe('Hotmart Category Strategy Unit Tests', () => {
  describe('Virtual Category ID Generation', () => {
    it('should generate correct virtual category IDs', () => {
      const generateVirtualCategoryId = (data: HotmartCategoryData): string => {
        return `${data.type}_${data.value}`;
      };

      const producerCategory: HotmartCategoryData = {
        type: 'producer',
        value: '12345',
        label: 'Test Producer',
      };

      const productTypeCategory: HotmartCategoryData = {
        type: 'product_type',
        value: 'EBOOK',
        label: 'E-books',
      };

      expect(generateVirtualCategoryId(producerCategory)).toBe('producer_12345');
      expect(generateVirtualCategoryId(productTypeCategory)).toBe('product_type_EBOOK');
    });
  });

  describe('Category Description Generation', () => {
    it('should generate appropriate descriptions for different category types', () => {
      const generateCategoryDescription = (data: HotmartCategoryData): string => {
        switch (data.type) {
          case 'producer':
            return `Products from ${data.label}`;
          case 'product_type':
            return `${data.label} products`;
          case 'tag':
            return `Products tagged with ${data.label}`;
          default:
            return `${data.label} category`;
        }
      };

      const producerCategory: HotmartCategoryData = {
        type: 'producer',
        value: '12345',
        label: 'John Doe',
      };

      const productTypeCategory: HotmartCategoryData = {
        type: 'product_type',
        value: 'EBOOK',
        label: 'E-books',
      };

      const tagCategory: HotmartCategoryData = {
        type: 'tag',
        value: 'marketing',
        label: 'Marketing',
      };

      expect(generateCategoryDescription(producerCategory)).toBe('Products from John Doe');
      expect(generateCategoryDescription(productTypeCategory)).toBe('E-books products');
      expect(generateCategoryDescription(tagCategory)).toBe('Products tagged with Marketing');
    });
  });

  describe('Slug Generation', () => {
    it('should generate URL-friendly slugs', () => {
      const generateSlug = (name: string): string => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      };

      expect(generateSlug('Test Producer')).toBe('test-producer');
      expect(generateSlug('E-books & Digital Products')).toBe('e-books-digital-products');
      expect(generateSlug('Marketing & Sales')).toBe('marketing-sales');
      expect(generateSlug('123 Test Category!')).toBe('123-test-category');
    });
  });

  describe('Product Type Label Formatting', () => {
    it('should format product type labels correctly', () => {
      const formatProductTypeLabel = (type: string): string => {
        return type
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      };

      expect(formatProductTypeLabel('online_course')).toBe('Online Course');
      expect(formatProductTypeLabel('ebook')).toBe('Ebook');
      expect(formatProductTypeLabel('mobile_apps')).toBe('Mobile Apps');
      expect(formatProductTypeLabel('physical_product')).toBe('Physical Product');
    });
  });

  describe('Category Validation', () => {
    it('should validate category data correctly', () => {
      const validateCategoryData = (data: any): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (!data) {
          errors.push('Category data is required');
          return { isValid: false, errors };
        }

        const hotmartData = data as HotmartCategoryData;

        if (!hotmartData.type) {
          errors.push('Category type is required');
        }

        if (!hotmartData.value) {
          errors.push('Category value is required');
        }

        if (!hotmartData.label) {
          errors.push('Category label is required');
        }

        if (!['producer', 'product_type', 'tag', 'custom'].includes(hotmartData.type)) {
          errors.push('Invalid category type. Must be: producer, product_type, tag, or custom');
        }

        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      // Valid category
      const validCategory: HotmartCategoryData = {
        type: 'producer',
        value: '12345',
        label: 'Test Producer',
      };

      expect(validateCategoryData(validCategory)).toEqual({
        isValid: true,
        errors: [],
      });

      // Invalid category - missing type
      const invalidCategory1 = {
        value: '12345',
        label: 'Test Producer',
      };

      const result1 = validateCategoryData(invalidCategory1);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Category type is required');

      // Invalid category - invalid type
      const invalidCategory2: HotmartCategoryData = {
        type: 'invalid_type' as any,
        value: '12345',
        label: 'Test Producer',
      };

      const result2 = validateCategoryData(invalidCategory2);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Invalid category type. Must be: producer, product_type, tag, or custom');

      // Null data
      expect(validateCategoryData(null)).toEqual({
        isValid: false,
        errors: ['Category data is required'],
      });
    });
  });

  describe('Business Rules Application', () => {
    it('should apply correct business rules to category data', () => {
      const applyBusinessRules = (categoryData: any): any => {
        // Ensure virtual categories are always active
        categoryData.status = CategoryStatus.ACTIVE;
        
        // Set hierarchy level based on category type
        if (categoryData.metadata?.type === 'producer') {
          categoryData.level = 0; // Top level
        } else {
          categoryData.level = 1; // Sub-level
        }

        // Generate SEO-friendly data
        categoryData.seoTitle = `${categoryData.name} - Hotmart Products`;
        categoryData.seoDescription = categoryData.description || `Browse ${categoryData.name} products on Hotmart`;

        return categoryData;
      };

      const producerCategory = {
        platform: Platform.HOTMART,
        externalId: 'producer_12345',
        name: 'Test Producer',
        description: 'Products from Test Producer',
        metadata: { type: 'producer' },
      };

      const productTypeCategory = {
        platform: Platform.HOTMART,
        externalId: 'product_type_EBOOK',
        name: 'E-books',
        description: 'E-books products',
        metadata: { type: 'product_type' },
      };

      const processedProducer = applyBusinessRules({ ...producerCategory });
      const processedProductType = applyBusinessRules({ ...productTypeCategory });

      expect(processedProducer.status).toBe(CategoryStatus.ACTIVE);
      expect(processedProducer.level).toBe(0);
      expect(processedProducer.seoTitle).toBe('Test Producer - Hotmart Products');

      expect(processedProductType.status).toBe(CategoryStatus.ACTIVE);
      expect(processedProductType.level).toBe(1);
      expect(processedProductType.seoTitle).toBe('E-books - Hotmart Products');
    });
  });

  describe('Virtual Category Creation from Products', () => {
    it('should create virtual categories from product data', () => {
      const createVirtualCategoriesFromProducts = (products: any[]): Map<string, number> => {
        const productTypeMap = new Map<string, number>();

        // Count products by type
        products.forEach(product => {
          const type = product.type || 'digital';
          productTypeMap.set(type, (productTypeMap.get(type) || 0) + 1);
        });

        return productTypeMap;
      };

      const mockProducts = [
        { id: 1, type: 'EBOOK', name: 'Test Ebook 1' },
        { id: 2, type: 'EBOOK', name: 'Test Ebook 2' },
        { id: 3, type: 'ONLINE_COURSE', name: 'Test Course' },
        { id: 4, type: 'SOFTWARE', name: 'Test Software' },
        { id: 5, name: 'No Type Product' }, // Should default to 'digital'
      ];

      const categoryMap = createVirtualCategoriesFromProducts(mockProducts);

      expect(categoryMap.get('EBOOK')).toBe(2);
      expect(categoryMap.get('ONLINE_COURSE')).toBe(1);
      expect(categoryMap.get('SOFTWARE')).toBe(1);
      expect(categoryMap.get('digital')).toBe(1);
    });
  });

  describe('Category Hierarchy Building', () => {
    it('should build correct hierarchy with producers at top level', () => {
      const buildHierarchy = (categories: any[]): any[] => {
        const hierarchy: any[] = [];
        
        // Build hierarchy - producers at top level, others as children
        categories.forEach(category => {
          if (category.metadata?.type === 'producer') {
            const children = categories
              .filter(c => c.metadata?.producerId === category.metadata?.producerId && c.externalId !== category.externalId)
              .map(child => ({ category: child, children: [], parent: category }));
            
            hierarchy.push({
              category,
              children,
              parent: undefined
            });
          }
        });

        return hierarchy;
      };

      const mockCategories = [
        {
          externalId: 'producer_123',
          name: 'Producer 123',
          metadata: { type: 'producer', producerId: '123' },
        },
        {
          externalId: 'product_type_EBOOK_123',
          name: 'E-books from Producer 123',
          metadata: { type: 'product_type', producerId: '123' },
        },
        {
          externalId: 'producer_456',
          name: 'Producer 456',
          metadata: { type: 'producer', producerId: '456' },
        },
      ];

      const hierarchy = buildHierarchy(mockCategories);

      expect(hierarchy).toHaveLength(2); // Two producers
      expect(hierarchy[0].category.externalId).toBe('producer_123');
      expect(hierarchy[0].children).toHaveLength(1); // One child category
      expect(hierarchy[0].children[0].category.externalId).toBe('product_type_EBOOK_123');
      expect(hierarchy[1].category.externalId).toBe('producer_456');
      expect(hierarchy[1].children).toHaveLength(0); // No child categories
    });
  });
});
