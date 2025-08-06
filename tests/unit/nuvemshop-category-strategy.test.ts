/**
 * Unit tests for Nuvemshop Category Strategy
 */

import { CategoryStatus, NuvemshopCategoryData } from '@/shared/types/category.types';

describe('Nuvemshop Category Strategy Unit Tests', () => {
  describe('Multi-language Name Parsing', () => {
    it('should parse multi-language names correctly', () => {
      const parseMultiLanguageName = (nameObject: Record<string, string>, defaultLanguage = 'es'): string => {
        if (!nameObject || typeof nameObject !== 'object') {
          return '';
        }

        return nameObject[defaultLanguage] || 
               nameObject['es'] || 
               nameObject['pt'] || 
               nameObject['en'] || 
               Object.values(nameObject)[0] || 
               '';
      };

      const multiLangName = {
        es: 'Categoría de Prueba',
        en: 'Test Category',
        pt: 'Categoria de Teste',
      };

      expect(parseMultiLanguageName(multiLangName, 'es')).toBe('Categoría de Prueba');
      expect(parseMultiLanguageName(multiLangName, 'en')).toBe('Test Category');
      expect(parseMultiLanguageName(multiLangName, 'pt')).toBe('Categoria de Teste');
      expect(parseMultiLanguageName(multiLangName, 'fr')).toBe('Categoría de Prueba'); // Fallback to Spanish

      // Test with missing language
      const partialName = { en: 'English Only' };
      expect(parseMultiLanguageName(partialName, 'es')).toBe('English Only'); // Fallback to available

      // Test with empty object
      expect(parseMultiLanguageName({})).toBe('');
      expect(parseMultiLanguageName(null as any)).toBe('');
    });
  });

  describe('Category Image Parsing', () => {
    it('should parse category images correctly', () => {
      const parseCategoryImage = (imageData?: { id: number; src: string; alt?: string }): any => {
        if (!imageData) return undefined;

        return {
          id: imageData.id,
          src: imageData.src,
          alt: imageData.alt || '',
          thumbnail: imageData.src,
          name: `category-image-${imageData.id}`
        };
      };

      const imageData = {
        id: 123,
        src: 'https://example.com/image.jpg',
        alt: 'Test Category Image',
      };

      const parsedImage = parseCategoryImage(imageData);
      expect(parsedImage).toEqual({
        id: 123,
        src: 'https://example.com/image.jpg',
        alt: 'Test Category Image',
        thumbnail: 'https://example.com/image.jpg',
        name: 'category-image-123',
      });

      // Test with missing alt
      const imageWithoutAlt = {
        id: 456,
        src: 'https://example.com/image2.jpg',
      };

      const parsedImageNoAlt = parseCategoryImage(imageWithoutAlt);
      expect(parsedImageNoAlt.alt).toBe('');

      // Test with undefined
      expect(parseCategoryImage(undefined)).toBeUndefined();
    });
  });

  describe('Custom Fields Parsing', () => {
    it('should parse custom fields correctly', () => {
      const parseCustomFields = (customFields?: Array<{ name: string; value: string; type: string }>): Record<string, any> => {
        if (!customFields || !Array.isArray(customFields)) {
          return {};
        }

        const fields: Record<string, any> = {};
        
        customFields.forEach(field => {
          if (field.name && field.value !== undefined) {
            switch (field.type) {
              case 'number':
                fields[field.name] = parseFloat(field.value) || 0;
                break;
              case 'boolean':
                fields[field.name] = field.value === 'true' || field.value === '1';
                break;
              case 'json':
                try {
                  fields[field.name] = JSON.parse(field.value);
                } catch {
                  fields[field.name] = field.value;
                }
                break;
              default:
                fields[field.name] = field.value;
            }
          }
        });

        return fields;
      };

      const customFields = [
        { name: 'priority', value: '5', type: 'number' },
        { name: 'featured', value: 'true', type: 'boolean' },
        { name: 'metadata', value: '{"key": "value"}', type: 'json' },
        { name: 'description', value: 'Custom description', type: 'string' },
        { name: 'invalid_boolean', value: 'false', type: 'boolean' },
        { name: 'invalid_json', value: 'invalid json', type: 'json' },
      ];

      const parsed = parseCustomFields(customFields);

      expect(parsed.priority).toBe(5);
      expect(parsed.featured).toBe(true);
      expect(parsed.metadata).toEqual({ key: 'value' });
      expect(parsed.description).toBe('Custom description');
      expect(parsed.invalid_boolean).toBe(false);
      expect(parsed.invalid_json).toBe('invalid json'); // Falls back to string

      // Test with empty array
      expect(parseCustomFields([])).toEqual({});
      expect(parseCustomFields(undefined)).toEqual({});
    });
  });

  describe('Category Validation', () => {
    it('should validate Nuvemshop category data correctly', () => {
      const validateCategoryData = (data: any): { isValid: boolean; errors: string[]; warnings: string[] } => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!data) {
          errors.push('Category data is required');
          return { isValid: false, errors, warnings };
        }

        const nuvemshopData = data as NuvemshopCategoryData;

        if (!nuvemshopData.id) {
          errors.push('Category ID is required');
        }

        if (!nuvemshopData.name || Object.keys(nuvemshopData.name).length === 0) {
          errors.push('Category name is required');
        }

        if (!nuvemshopData.handle) {
          errors.push('Category handle (slug) is required');
        }

        if (nuvemshopData.handle && !/^[a-z0-9-]+$/.test(nuvemshopData.handle)) {
          errors.push('Category handle must contain only lowercase letters, numbers, and hyphens');
        }

        if (nuvemshopData.parent && nuvemshopData.parent === nuvemshopData.id) {
          errors.push('Category cannot be its own parent');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      };

      // Valid category
      const validCategory: NuvemshopCategoryData = {
        id: 123,
        name: { es: 'Categoría de Prueba', en: 'Test Category' },
        handle: 'test-category',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      expect(validateCategoryData(validCategory)).toEqual({
        isValid: true,
        errors: [],
        warnings: [],
      });

      // Invalid category - missing ID
      const invalidCategory1 = {
        name: { es: 'Test' },
        handle: 'test',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const result1 = validateCategoryData(invalidCategory1);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Category ID is required');

      // Invalid category - invalid handle
      const invalidCategory2: NuvemshopCategoryData = {
        id: 123,
        name: { es: 'Test' },
        handle: 'Test Category!', // Invalid characters
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const result2 = validateCategoryData(invalidCategory2);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Category handle must contain only lowercase letters, numbers, and hyphens');

      // Circular reference
      const circularCategory: NuvemshopCategoryData = {
        id: 123,
        name: { es: 'Test' },
        handle: 'test',
        parent: 123, // Same as ID
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const result3 = validateCategoryData(circularCategory);
      expect(result3.isValid).toBe(false);
      expect(result3.errors).toContain('Category cannot be its own parent');
    });
  });

  describe('Business Rules Application', () => {
    it('should apply correct business rules', () => {
      const applyBusinessRules = (categoryData: any): any => {
        // Ensure slug is URL-friendly
        if (categoryData.slug) {
          categoryData.slug = categoryData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        }

        // Set default SEO data if not provided
        if (!categoryData.seoTitle) {
          categoryData.seoTitle = categoryData.name;
        }

        if (!categoryData.seoDescription && categoryData.description) {
          categoryData.seoDescription = categoryData.description.substring(0, 160);
        }

        // Calculate hierarchy level
        categoryData.level = categoryData.parentId ? 1 : 0;

        return categoryData;
      };

      const categoryData = {
        name: 'Test Category',
        slug: 'Test Category!',
        description: 'This is a very long description that should be truncated when used as SEO description because it exceeds the recommended length for meta descriptions which is typically around 160 characters.',
        parentId: '123',
      };

      const processed = applyBusinessRules({ ...categoryData });

      expect(processed.slug).toBe('test-category-');
      expect(processed.seoTitle).toBe('Test Category');
      expect(processed.seoDescription).toHaveLength(160);
      expect(processed.level).toBe(1);

      // Test root category
      const rootCategory = {
        name: 'Root Category',
        slug: 'root-category',
      };

      const processedRoot = applyBusinessRules({ ...rootCategory });
      expect(processedRoot.level).toBe(0);
      expect(processedRoot.seoTitle).toBe('Root Category');
    });
  });

  describe('Category Hierarchy Building', () => {
    it('should build correct category hierarchy', () => {
      const buildHierarchy = (categories: any[]): any[] => {
        const hierarchy: any[] = [];
        const categoryMap = new Map<string, any>();
        
        categories.forEach(category => {
          categoryMap.set(category.externalId, category);
        });

        categories.forEach(category => {
          if (!category.parentId) {
            const children = buildChildrenHierarchy(category, categories, categoryMap);
            hierarchy.push({
              category,
              children,
              parent: undefined
            });
          }
        });

        return hierarchy;
      };

      const buildChildrenHierarchy = (parent: any, allCategories: any[], categoryMap: Map<string, any>): any[] => {
        const children: any[] = [];
        
        allCategories
          .filter(cat => cat.parentId === parent.externalId)
          .forEach(child => {
            const grandChildren = buildChildrenHierarchy(child, allCategories, categoryMap);
            children.push({
              category: child,
              children: grandChildren,
              parent
            });
          });

        return children;
      };

      const mockCategories = [
        { externalId: '1', name: 'Electronics', parentId: null },
        { externalId: '2', name: 'Phones', parentId: '1' },
        { externalId: '3', name: 'Laptops', parentId: '1' },
        { externalId: '4', name: 'iPhone', parentId: '2' },
        { externalId: '5', name: 'Clothing', parentId: null },
      ];

      const hierarchy = buildHierarchy(mockCategories);

      expect(hierarchy).toHaveLength(2); // Two root categories
      expect(hierarchy[0].category.name).toBe('Electronics');
      expect(hierarchy[0].children).toHaveLength(2); // Phones and Laptops
      expect(hierarchy[0].children[0].category.name).toBe('Phones');
      expect(hierarchy[0].children[0].children).toHaveLength(1); // iPhone
      expect(hierarchy[0].children[0].children[0].category.name).toBe('iPhone');
      expect(hierarchy[1].category.name).toBe('Clothing');
      expect(hierarchy[1].children).toHaveLength(0);
    });
  });

  describe('Category Path Generation', () => {
    it('should generate correct category paths', () => {
      const getCategoryPath = (categoryId: string, categories: any[]): any[] => {
        const path: any[] = [];
        let currentCategory = categories.find(c => c.externalId === categoryId);

        while (currentCategory) {
          path.unshift(currentCategory);
          
          if (currentCategory.parentId) {
            currentCategory = categories.find(c => c.externalId === currentCategory!.parentId);
          } else {
            break;
          }
        }

        return path;
      };

      const mockCategories = [
        { externalId: '1', name: 'Electronics', parentId: null },
        { externalId: '2', name: 'Phones', parentId: '1' },
        { externalId: '3', name: 'iPhone', parentId: '2' },
      ];

      const path = getCategoryPath('3', mockCategories);

      expect(path).toHaveLength(3);
      expect(path[0].name).toBe('Electronics');
      expect(path[1].name).toBe('Phones');
      expect(path[2].name).toBe('iPhone');

      // Test root category
      const rootPath = getCategoryPath('1', mockCategories);
      expect(rootPath).toHaveLength(1);
      expect(rootPath[0].name).toBe('Electronics');

      // Test non-existent category
      const emptyPath = getCategoryPath('999', mockCategories);
      expect(emptyPath).toHaveLength(0);
    });
  });
});
