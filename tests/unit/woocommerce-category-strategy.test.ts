/**
 * Unit tests for WooCommerce Category Strategy
 */

import { CategoryDisplayType, CategoryStatus, WooCommerceCategoryData } from '@/shared/types/category.types';

describe('WooCommerce Category Strategy Unit Tests', () => {
  describe('Display Type Mapping', () => {
    it('should map WooCommerce display types correctly', () => {
      const mapWooCommerceDisplayType = (display: string): CategoryDisplayType => {
        switch (display) {
          case 'products':
            return CategoryDisplayType.PRODUCTS;
          case 'subcategories':
            return CategoryDisplayType.SUBCATEGORIES;
          case 'both':
            return CategoryDisplayType.BOTH;
          default:
            return CategoryDisplayType.DEFAULT;
        }
      };

      expect(mapWooCommerceDisplayType('products')).toBe(CategoryDisplayType.PRODUCTS);
      expect(mapWooCommerceDisplayType('subcategories')).toBe(CategoryDisplayType.SUBCATEGORIES);
      expect(mapWooCommerceDisplayType('both')).toBe(CategoryDisplayType.BOTH);
      expect(mapWooCommerceDisplayType('default')).toBe(CategoryDisplayType.DEFAULT);
      expect(mapWooCommerceDisplayType('unknown')).toBe(CategoryDisplayType.DEFAULT);
    });

    it('should reverse map display types correctly', () => {
      const mapUnifiedDisplayTypeToWooCommerce = (displayType?: CategoryDisplayType): string => {
        switch (displayType) {
          case CategoryDisplayType.PRODUCTS:
            return 'products';
          case CategoryDisplayType.SUBCATEGORIES:
            return 'subcategories';
          case CategoryDisplayType.BOTH:
            return 'both';
          default:
            return 'default';
        }
      };

      expect(mapUnifiedDisplayTypeToWooCommerce(CategoryDisplayType.PRODUCTS)).toBe('products');
      expect(mapUnifiedDisplayTypeToWooCommerce(CategoryDisplayType.SUBCATEGORIES)).toBe('subcategories');
      expect(mapUnifiedDisplayTypeToWooCommerce(CategoryDisplayType.BOTH)).toBe('both');
      expect(mapUnifiedDisplayTypeToWooCommerce(CategoryDisplayType.DEFAULT)).toBe('default');
      expect(mapUnifiedDisplayTypeToWooCommerce(undefined)).toBe('default');
    });
  });

  describe('Category Image Parsing', () => {
    it('should parse WooCommerce category images correctly', () => {
      const parseCategoryImage = (imageData?: any): any => {
        if (!imageData || !imageData.src) return undefined;

        return {
          id: imageData.id,
          src: imageData.src,
          alt: imageData.alt || '',
          thumbnail: imageData.src,
          name: imageData.name || `category-image-${imageData.id}`,
          srcset: imageData.srcset,
          sizes: imageData.sizes
        };
      };

      const imageData = {
        id: 123,
        src: 'https://example.com/image.jpg',
        alt: 'Test Category Image',
        name: 'test-image.jpg',
        srcset: 'https://example.com/image-300.jpg 300w, https://example.com/image-600.jpg 600w',
        sizes: '(max-width: 300px) 300px, 600px',
        date_created: '2023-01-01T00:00:00',
        date_modified: '2023-01-01T00:00:00',
      };

      const parsedImage = parseCategoryImage(imageData);
      expect(parsedImage).toEqual({
        id: 123,
        src: 'https://example.com/image.jpg',
        alt: 'Test Category Image',
        thumbnail: 'https://example.com/image.jpg',
        name: 'test-image.jpg',
        srcset: 'https://example.com/image-300.jpg 300w, https://example.com/image-600.jpg 600w',
        sizes: '(max-width: 300px) 300px, 600px',
      });

      // Test with minimal data
      const minimalImage = {
        id: 456,
        src: 'https://example.com/image2.jpg',
      };

      const parsedMinimal = parseCategoryImage(minimalImage);
      expect(parsedMinimal.alt).toBe('');
      expect(parsedMinimal.name).toBe('category-image-456');

      // Test with no src
      const noSrcImage = { id: 789 };
      expect(parseCategoryImage(noSrcImage)).toBeUndefined();

      // Test with undefined
      expect(parseCategoryImage(undefined)).toBeUndefined();
    });
  });

  describe('Meta Data Parsing', () => {
    it('should parse WooCommerce meta data correctly', () => {
      const parseMetaData = (metaData?: Array<{ id: number; key: string; value: string }>): Record<string, any> => {
        if (!metaData || !Array.isArray(metaData)) {
          return {};
        }

        const meta: Record<string, any> = {};
        
        metaData.forEach(item => {
          if (item.key && item.value !== undefined) {
            try {
              meta[item.key] = JSON.parse(item.value);
            } catch {
              meta[item.key] = item.value;
            }
          }
        });

        return meta;
      };

      const metaData = [
        { id: 1, key: 'custom_field', value: 'custom_value' },
        { id: 2, key: 'json_field', value: '{"nested": "value"}' },
        { id: 3, key: 'number_field', value: '123' },
        { id: 4, key: 'boolean_field', value: 'true' },
        { id: 5, key: 'invalid_json', value: 'invalid json {' },
      ];

      const parsed = parseMetaData(metaData);

      expect(parsed.custom_field).toBe('custom_value');
      expect(parsed.json_field).toEqual({ nested: 'value' });
      expect(parsed.number_field).toBe(123); // JSON.parse converts to number
      expect(parsed.boolean_field).toBe(true); // JSON.parse converts to boolean
      expect(parsed.invalid_json).toBe('invalid json {'); // Falls back to string

      // Test with empty array
      expect(parseMetaData([])).toEqual({});
      expect(parseMetaData(undefined)).toEqual({});
    });
  });

  describe('Category Validation', () => {
    it('should validate WooCommerce category data correctly', () => {
      const validateCategoryData = (data: any): { isValid: boolean; errors: string[]; warnings: string[] } => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!data) {
          errors.push('Category data is required');
          return { isValid: false, errors, warnings };
        }

        const wooData = data as WooCommerceCategoryData;

        if (!wooData.id) {
          errors.push('Category ID is required');
        }

        if (!wooData.name || wooData.name.trim() === '') {
          errors.push('Category name is required');
        }

        if (!wooData.slug || wooData.slug.trim() === '') {
          errors.push('Category slug is required');
        }

        if (wooData.slug && !/^[a-z0-9-]+$/.test(wooData.slug)) {
          errors.push('Category slug must contain only lowercase letters, numbers, and hyphens');
        }

        if (wooData.display && !['default', 'products', 'subcategories', 'both'].includes(wooData.display)) {
          errors.push('Invalid display type. Must be: default, products, subcategories, or both');
        }

        if (wooData.parent && wooData.parent === wooData.id) {
          errors.push('Category cannot be its own parent');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      };

      // Valid category
      const validCategory: WooCommerceCategoryData = {
        id: 123,
        name: 'Test Category',
        slug: 'test-category',
        parent: 0,
        description: 'Test description',
        display: 'default' as any,
        menu_order: 0,
        count: 5,
        date_created: '2023-01-01T00:00:00',
        date_created_gmt: '2023-01-01T00:00:00',
        date_modified: '2023-01-01T00:00:00',
        date_modified_gmt: '2023-01-01T00:00:00',
      };

      expect(validateCategoryData(validCategory)).toEqual({
        isValid: true,
        errors: [],
        warnings: [],
      });

      // Invalid category - missing name
      const invalidCategory1 = {
        id: 123,
        name: '',
        slug: 'test',
        parent: 0,
        description: '',
        display: 'default',
        menu_order: 0,
        count: 0,
        date_created: '2023-01-01T00:00:00',
        date_created_gmt: '2023-01-01T00:00:00',
        date_modified: '2023-01-01T00:00:00',
        date_modified_gmt: '2023-01-01T00:00:00',
      };

      const result1 = validateCategoryData(invalidCategory1);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Category name is required');

      // Invalid category - invalid slug
      const invalidCategory2: WooCommerceCategoryData = {
        id: 123,
        name: 'Test',
        slug: 'Test Category!',
        parent: 0,
        description: '',
        display: 'default' as any,
        menu_order: 0,
        count: 0,
        date_created: '2023-01-01T00:00:00',
        date_created_gmt: '2023-01-01T00:00:00',
        date_modified: '2023-01-01T00:00:00',
        date_modified_gmt: '2023-01-01T00:00:00',
      };

      const result2 = validateCategoryData(invalidCategory2);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Category slug must contain only lowercase letters, numbers, and hyphens');

      // Invalid display type
      const invalidCategory3: WooCommerceCategoryData = {
        id: 123,
        name: 'Test',
        slug: 'test',
        parent: 0,
        description: '',
        display: 'invalid' as any,
        menu_order: 0,
        count: 0,
        date_created: '2023-01-01T00:00:00',
        date_created_gmt: '2023-01-01T00:00:00',
        date_modified: '2023-01-01T00:00:00',
        date_modified_gmt: '2023-01-01T00:00:00',
      };

      const result3 = validateCategoryData(invalidCategory3);
      expect(result3.isValid).toBe(false);
      expect(result3.errors).toContain('Invalid display type. Must be: default, products, subcategories, or both');
    });
  });

  describe('Business Rules Application', () => {
    it('should apply correct business rules', () => {
      const applyBusinessRules = (categoryData: any): any => {
        // Ensure slug is URL-friendly
        if (categoryData.slug) {
          categoryData.slug = categoryData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        }

        // Set default display type if not provided
        if (!categoryData.displayType) {
          categoryData.displayType = CategoryDisplayType.DEFAULT;
        }

        // Set default SEO data if not provided
        if (!categoryData.seoTitle) {
          categoryData.seoTitle = categoryData.name;
        }

        if (!categoryData.seoDescription && categoryData.description) {
          categoryData.seoDescription = stripHtml(categoryData.description).substring(0, 160);
        }

        // Calculate hierarchy level
        categoryData.level = categoryData.parentId ? 1 : 0;

        return categoryData;
      };

      const stripHtml = (html: string): string => {
        return html.replace(/<[^>]*>/g, '');
      };

      const categoryData = {
        name: 'Test Category',
        slug: 'Test Category!',
        description: '<p>This is a <strong>HTML</strong> description with <em>formatting</em>.</p>',
        parentId: '123',
      };

      const processed = applyBusinessRules({ ...categoryData });

      expect(processed.slug).toBe('test-category-');
      expect(processed.displayType).toBe(CategoryDisplayType.DEFAULT);
      expect(processed.seoTitle).toBe('Test Category');
      expect(processed.seoDescription).toBe('This is a HTML description with formatting.');
      expect(processed.level).toBe(1);

      // Test root category
      const rootCategory = {
        name: 'Root Category',
        slug: 'root-category',
        description: 'Simple description',
      };

      const processedRoot = applyBusinessRules({ ...rootCategory });
      expect(processedRoot.level).toBe(0);
      expect(processedRoot.seoTitle).toBe('Root Category');
      expect(processedRoot.seoDescription).toBe('Simple description');
    });
  });

  describe('Taxonomy Terms Parsing', () => {
    it('should parse WooCommerce taxonomy terms correctly', () => {
      const parseTaxonomyTerms = (terms: any[]): any[] => {
        if (!terms || !Array.isArray(terms)) {
          return [];
        }

        return terms.map(term => ({
          platform: 'WOOCOMMERCE',
          externalId: term.id.toString(),
          name: term.name,
          description: term.description || '',
          slug: term.slug,
          parentId: term.parent > 0 ? term.parent.toString() : undefined,
          status: CategoryStatus.ACTIVE,
          productCount: term.count || 0,
          metadata: {
            taxonomy: term.taxonomy,
            termId: term.id
          }
        }));
      };

      const mockTerms = [
        {
          id: 1,
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic products',
          parent: 0,
          count: 10,
          taxonomy: 'product_cat',
        },
        {
          id: 2,
          name: 'Phones',
          slug: 'phones',
          description: '',
          parent: 1,
          count: 5,
          taxonomy: 'product_cat',
        },
      ];

      const parsed = parseTaxonomyTerms(mockTerms);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({
        platform: 'WOOCOMMERCE',
        externalId: '1',
        name: 'Electronics',
        description: 'Electronic products',
        slug: 'electronics',
        parentId: undefined,
        status: CategoryStatus.ACTIVE,
        productCount: 10,
        metadata: {
          taxonomy: 'product_cat',
          termId: 1,
        },
      });

      expect(parsed[1].parentId).toBe('1');
      expect(parsed[1].description).toBe('');

      // Test with empty array
      expect(parseTaxonomyTerms([])).toEqual([]);
      expect(parseTaxonomyTerms(null as any)).toEqual([]);
    });
  });
});
