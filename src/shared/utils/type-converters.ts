/**
 * Utility functions to convert between Prisma null types and our undefined types
 */

/**
 * Convert undefined to null for Prisma
 */
export function undefinedToNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

/**
 * Convert null to undefined for our types
 */
export function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Convert Prisma Decimal to number
 */
export function decimalToNumber(value: any): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return parseFloat(value.toString());
}

/**
 * Convert number to Prisma Decimal (or null)
 */
export function numberToDecimal(value: number | undefined): number | null {
  return value === undefined ? null : value;
}

/**
 * Convert optional string to null for Prisma
 */
export function stringToNull(value: string | undefined): string | null {
  return value === undefined ? null : value;
}

/**
 * Convert optional boolean to null for Prisma
 */
export function booleanToNull(value: boolean | undefined): boolean | null {
  return value === undefined ? null : value;
}

/**
 * Convert Prisma product data to our ProductData type
 */
export function convertPrismaToProductData(prismaProduct: any): any {
  return {
    ...prismaProduct,
    storeId: nullToUndefined(prismaProduct.storeId),
    description: nullToUndefined(prismaProduct.description),
    shortDescription: nullToUndefined(prismaProduct.shortDescription),
    slug: nullToUndefined(prismaProduct.slug),
    sku: nullToUndefined(prismaProduct.sku),
    regularPrice: decimalToNumber(prismaProduct.regularPrice),
    salePrice: decimalToNumber(prismaProduct.salePrice),
    currency: nullToUndefined(prismaProduct.currency),
    manageStock: nullToUndefined(prismaProduct.manageStock),
    stockQuantity: nullToUndefined(prismaProduct.stockQuantity),
    weight: decimalToNumber(prismaProduct.weight),
    length: decimalToNumber(prismaProduct.length),
    width: decimalToNumber(prismaProduct.width),
    height: decimalToNumber(prismaProduct.height),
    featured: nullToUndefined(prismaProduct.featured),
    catalogVisibility: nullToUndefined(prismaProduct.catalogVisibility),
    seoTitle: nullToUndefined(prismaProduct.seoTitle),
    seoDescription: nullToUndefined(prismaProduct.seoDescription),
    totalSales: nullToUndefined(prismaProduct.totalSales),
    createdAt: prismaProduct.createdAt,
    updatedAt: prismaProduct.updatedAt,
  };
}
