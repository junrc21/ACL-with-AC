# Category API Documentation

This document describes the Category API endpoints implemented in Phase 5 of the ACL service.

## Overview

The Category API provides endpoints for managing product categories across multiple e-commerce platforms (Hotmart, Nuvemshop, WooCommerce). It supports hierarchical category structures, platform-specific features, and unified category management.

## Base URL

```
/api/acl/categories
```

## Authentication

All endpoints require platform-specific authentication headers. See the main API documentation for authentication details.

## Endpoints

### 1. Create Category

**POST** `/api/acl/categories`

Creates a new category for the specified platform.

**Headers:**
- `X-Platform`: Platform identifier (HOTMART, NUVEMSHOP, WOOCOMMERCE)
- `X-Store-ID`: Store identifier (optional for some platforms)

**Request Body:**
Platform-specific category data. See platform-specific schemas below.

**Response:**
```json
{
  "success": true,
  "data": {
    "categoryId": "uuid",
    "externalId": "platform-specific-id",
    "platform": "PLATFORM_NAME",
    "processingTime": 150
  },
  "warnings": []
}
```

### 2. Sync Categories

**POST** `/api/acl/categories/sync`

Synchronizes multiple categories from a platform.

**Headers:**
- `X-Platform`: Platform identifier
- `X-Store-ID`: Store identifier (optional)

**Request Body:**
```json
{
  "platform": "PLATFORM_NAME",
  "storeId": "store-id",
  "categories": [
    // Array of platform-specific category objects
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "categoriesProcessed": 10,
    "categoriesCreated": 5,
    "categoriesUpdated": 3,
    "categoriesSkipped": 2,
    "errors": [],
    "hierarchy": [
      // Category hierarchy tree
    ]
  }
}
```

### 3. Get Categories

**GET** `/api/acl/categories`

Retrieves categories with optional filtering and pagination.

**Query Parameters:**
- `platform`: Platform filter (optional)
- `storeId`: Store filter (optional)
- `parentId`: Parent category filter (optional)
- `status`: Category status filter (optional)
- `search`: Search term (optional)
- `includeEmpty`: Include categories without products (default: true)
- `includeHierarchy`: Include hierarchy information (default: false)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Sort field (name, createdAt, updatedAt, productCount, menuOrder)
- `sortOrder`: Sort direction (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "platform": "PLATFORM_NAME",
      "externalId": "platform-id",
      "storeId": "store-id",
      "name": "Category Name",
      "description": "Category description",
      "slug": "category-slug",
      "parentId": "parent-uuid",
      "level": 1,
      "menuOrder": 0,
      "productCount": 5,
      "status": "active",
      "displayType": "default",
      "seoTitle": "SEO Title",
      "seoDescription": "SEO Description",
      "image": {
        "id": "image-id",
        "src": "https://example.com/image.jpg",
        "alt": "Image alt text"
      },
      "metadata": {},
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 4. Get Category Tree

**GET** `/api/acl/categories/tree`

Retrieves the hierarchical category tree structure.

**Headers:**
- `X-Platform`: Platform identifier
- `X-Store-ID`: Store identifier (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "category": {
        // Category object
      },
      "children": [
        {
          "category": {
            // Child category object
          },
          "children": [],
          "parent": {
            // Parent category reference
          }
        }
      ],
      "parent": null
    }
  ]
}
```

### 5. Get Category Statistics

**GET** `/api/acl/categories/statistics`

Retrieves category statistics for the platform/store.

**Headers:**
- `X-Platform`: Platform identifier (optional)
- `X-Store-ID`: Store identifier (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCategories": 50,
    "activeCategories": 45,
    "categoriesWithProducts": 30,
    "averageProductsPerCategory": 5.5,
    "topCategories": [
      {
        "category": {
          // Category object
        },
        "productCount": 25
      }
    ]
  }
}
```

### 6. Get Category by ID

**GET** `/api/acl/categories/:id`

Retrieves a specific category by its UUID.

**Parameters:**
- `id`: Category UUID

**Response:**
```json
{
  "success": true,
  "data": {
    // Category object
  }
}
```

### 7. Get Category Path

**GET** `/api/acl/categories/:id/path`

Retrieves the breadcrumb path for a category.

**Parameters:**
- `id`: Category UUID

**Headers:**
- `X-Platform`: Platform identifier
- `X-Store-ID`: Store identifier (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      // Root category
    },
    {
      // Parent category
    },
    {
      // Current category
    }
  ]
}
```

### 8. Update Category

**PUT** `/api/acl/categories/:id`

Updates an existing category.

**Parameters:**
- `id`: Category UUID

**Headers:**
- `X-Platform`: Platform identifier
- `X-Store-ID`: Store identifier (optional)

**Request Body:**
```json
{
  "platform": "PLATFORM_NAME",
  "storeId": "store-id",
  "data": {
    // Partial platform-specific category data
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated category object
  }
}
```

### 9. Delete Category

**DELETE** `/api/acl/categories/:id`

Deletes a category.

**Parameters:**
- `id`: Category UUID

**Headers:**
- `X-Platform`: Platform identifier
- `X-Store-ID`: Store identifier (optional)

**Response:**
```
HTTP 204 No Content
```

## Platform-Specific Schemas

### Hotmart Categories

Hotmart uses virtual categories derived from product metadata:

```json
{
  "type": "producer|product_type|tag|custom",
  "value": "category-value",
  "label": "Display Label",
  "productCount": 10,
  "metadata": {
    "producerId": "producer-id",
    "producerName": "Producer Name",
    "productType": "EBOOK",
    "tags": ["tag1", "tag2"]
  }
}
```

### Nuvemshop Categories

```json
{
  "id": 123,
  "name": {
    "es": "Categoría",
    "en": "Category",
    "pt": "Categoria"
  },
  "description": {
    "es": "Descripción",
    "en": "Description"
  },
  "handle": "category-slug",
  "parent": 456,
  "subcategories": [789, 101112],
  "google_shopping_category": "Electronics",
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z",
  "seo_title": {
    "es": "Título SEO"
  },
  "seo_description": {
    "es": "Descripción SEO"
  },
  "image": {
    "id": 789,
    "src": "https://example.com/image.jpg",
    "alt": "Image alt"
  },
  "custom_fields": [
    {
      "name": "priority",
      "value": "5",
      "type": "number"
    }
  ]
}
```

### WooCommerce Categories

```json
{
  "id": 123,
  "name": "Category Name",
  "slug": "category-name",
  "parent": 456,
  "description": "Category description",
  "display": "default|products|subcategories|both",
  "image": {
    "id": 789,
    "src": "https://example.com/image.jpg",
    "name": "image.jpg",
    "alt": "Image alt",
    "date_created": "2023-01-01T00:00:00",
    "date_modified": "2023-01-01T00:00:00"
  },
  "menu_order": 0,
  "count": 10,
  "date_created": "2023-01-01T00:00:00",
  "date_modified": "2023-01-01T00:00:00",
  "meta_data": [
    {
      "id": 1,
      "key": "custom_field",
      "value": "custom_value"
    }
  ]
}
```

## Error Responses

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {
      // Additional error details
    }
  }
}
```

## Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `204 No Content`: Resource deleted successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation errors
- `500 Internal Server Error`: Server error

## Rate Limiting

All endpoints are subject to rate limiting:
- 100 requests per 15-minute window per IP
- Rate limit headers included in responses

## Examples

See the test files in `/tests/unit/` for comprehensive examples of API usage.
