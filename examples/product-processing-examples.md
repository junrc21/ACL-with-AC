# Product Processing Examples

This document provides examples of how to use the ACL service to process product data from different platforms.

## 🚀 Getting Started

### 1. Start the Service

```bash
# Using Docker (recommended)
docker-compose up -d

# Or locally
npm install
npm run dev
```

### 2. Health Check

```bash
curl http://localhost:3000/api/acl/health
```

## 📦 Platform Examples

### Hotmart Product Processing

#### Sales Data Format
```bash
curl -X POST http://localhost:3000/api/acl/products \
  -H "Content-Type: application/json" \
  -H "x-source-platform: HOTMART" \
  -d '{
    "product": {
      "name": "Complete Digital Marketing Course",
      "id": 12345
    },
    "buyer": {
      "name": "John Doe",
      "ucode": "buyer123",
      "email": "john@example.com"
    },
    "producer": {
      "name": "Marketing Academy",
      "ucode": "producer123"
    },
    "purchase": {
      "transaction": "HP12455690122399",
      "order_date": 1640995200000,
      "approved_date": 1640995200000,
      "status": "APPROVED",
      "price": {
        "value": 199.99,
        "currency_code": "USD"
      },
      "payment": {
        "method": "CREDIT_CARD",
        "installments_number": 3,
        "type": "INSTALLMENT"
      }
    }
  }'
```

#### Catalog Data Format
```bash
curl -X POST http://localhost:3000/api/acl/products \
  -H "Content-Type: application/json" \
  -H "x-source-platform: HOTMART" \
  -d '{
    "id": 12345,
    "name": "Complete Digital Marketing Course",
    "ucode": "course123",
    "status": "ACTIVE",
    "format": "ONLINE_COURSE",
    "is_subscription": true,
    "warranty_period": 30,
    "created_at": 1640995200000
  }'
```

### Nuvemshop Product Processing

```bash
curl -X POST http://localhost:3000/api/acl/products \
  -H "Content-Type: application/json" \
  -H "x-source-platform: NUVEMSHOP" \
  -H "x-store-id: store123" \
  -d '{
    "id": 67890,
    "name": {
      "en": "Premium T-Shirt",
      "es": "Camiseta Premium",
      "pt": "Camiseta Premium"
    },
    "description": {
      "en": "High quality cotton t-shirt",
      "es": "Camiseta de algodón de alta calidad",
      "pt": "Camiseta de algodão de alta qualidade"
    },
    "handle": "premium-t-shirt",
    "published": true,
    "free_shipping": false,
    "requires_shipping": true,
    "seo_title": {
      "en": "Premium T-Shirt - Best Quality"
    },
    "seo_description": {
      "en": "Buy the best premium t-shirt online"
    },
    "brand": "Fashion Brand",
    "tags": "clothing,t-shirt,premium",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "variants": [
      {
        "id": 1,
        "price": "29.99",
        "stock": 100,
        "sku": "TSHIRT-M-BLACK",
        "weight": "0.2",
        "width": "20",
        "height": "30",
        "depth": "1"
      }
    ],
    "images": [
      {
        "id": 1,
        "src": "https://example.com/tshirt.jpg",
        "position": 1,
        "alt": {
          "en": "Premium T-Shirt"
        }
      }
    ],
    "categories": [
      {
        "id": 1,
        "name": {
          "en": "Clothing"
        },
        "handle": "clothing"
      }
    ]
  }'
```

### WooCommerce Product Processing

```bash
curl -X POST http://localhost:3000/api/acl/products \
  -H "Content-Type: application/json" \
  -H "x-source-platform: WOOCOMMERCE" \
  -H "x-store-id: woo-store-123" \
  -d '{
    "id": 54321,
    "name": "Wireless Bluetooth Headphones",
    "slug": "wireless-bluetooth-headphones",
    "type": "simple",
    "status": "publish",
    "description": "High-quality wireless Bluetooth headphones with noise cancellation",
    "short_description": "Premium wireless headphones",
    "sku": "WBH-001",
    "price": "149.99",
    "regular_price": "149.99",
    "sale_price": "129.99",
    "featured": true,
    "catalog_visibility": "visible",
    "manage_stock": true,
    "stock_quantity": 50,
    "stock_status": "instock",
    "weight": "0.5",
    "dimensions": {
      "length": "20",
      "width": "15",
      "height": "8"
    },
    "categories": [
      {
        "id": 15,
        "name": "Electronics",
        "slug": "electronics"
      }
    ],
    "images": [
      {
        "id": 123,
        "src": "https://example.com/headphones.jpg",
        "alt": "Wireless Bluetooth Headphones",
        "position": 1
      }
    ],
    "date_created": "2024-01-01T00:00:00",
    "date_modified": "2024-01-01T00:00:00"
  }'
```

## 📊 Bulk Processing

### Process Multiple Products

```bash
curl -X POST http://localhost:3000/api/acl/products/bulk \
  -H "Content-Type: application/json" \
  -H "x-source-platform: HOTMART" \
  -d '{
    "platform": "HOTMART",
    "products": [
      {
        "id": 1,
        "name": "Course 1"
      },
      {
        "id": 2,
        "name": "Course 2"
      }
    ],
    "options": {
      "skipValidation": false,
      "continueOnError": true,
      "updateExisting": true
    }
  }'
```

## 🔍 Querying Products

### List Products

```bash
# List all products
curl "http://localhost:3000/api/acl/products" \
  -H "x-source-platform: HOTMART"

# List with filters
curl "http://localhost:3000/api/acl/products?platform=HOTMART&status=active&limit=10&offset=0" \
  -H "x-source-platform: HOTMART"

# List featured products
curl "http://localhost:3000/api/acl/products?featured=true" \
  -H "x-source-platform: HOTMART"
```

### Get Product by ID

```bash
curl "http://localhost:3000/api/acl/products/550e8400-e29b-41d4-a716-446655440000" \
  -H "x-source-platform: HOTMART"
```

### Get Product Statistics

```bash
curl "http://localhost:3000/api/acl/products/statistics" \
  -H "x-source-platform: HOTMART"
```

## ✅ Validation

### Validate Product Data

```bash
curl -X POST http://localhost:3000/api/acl/products/validate \
  -H "Content-Type: application/json" \
  -H "x-source-platform: HOTMART" \
  -d '{
    "id": 123,
    "name": "Test Product"
  }'
```

## 🔄 Data Transformation

### Transform Product to Platform Format

```bash
curl "http://localhost:3000/api/acl/products/550e8400-e29b-41d4-a716-446655440000/transform" \
  -H "x-source-platform: HOTMART"
```

## 📝 Response Examples

### Successful Product Creation

```json
{
  "success": true,
  "data": {
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "externalId": "12345",
    "platform": "HOTMART",
    "warnings": [],
    "metadata": {
      "processingTime": 150,
      "isNew": true
    }
  },
  "message": "Product processed successfully"
}
```

### Validation Error Response

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_PROCESSING_FAILED",
    "message": "Failed to process product data",
    "details": {
      "externalId": "12345",
      "platform": "HOTMART",
      "errors": [
        "Product name is required"
      ],
      "warnings": []
    }
  }
}
```

### Product List Response

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "platform": "HOTMART",
        "externalId": "12345",
        "name": "Complete Digital Marketing Course",
        "type": "DIGITAL",
        "status": "active",
        "regularPrice": 199.99,
        "currency": "USD",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 20,
      "offset": 0,
      "hasNext": false,
      "hasPrevious": false
    },
    "filters": {
      "platform": "HOTMART"
    }
  }
}
```

## 🚨 Error Handling

The ACL service provides comprehensive error handling:

- **400 Bad Request**: Invalid data format or validation errors
- **404 Not Found**: Product not found
- **415 Unsupported Media Type**: Invalid Content-Type
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server errors

All errors include detailed information to help with debugging and integration.
