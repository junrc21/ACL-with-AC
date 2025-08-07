# Webhook System Documentation

## Overview

The ACL (Aggregated Commerce Layer) webhook system provides real-time synchronization between multiple e-commerce platforms (Hotmart, Nuvemshop, WooCommerce) and your application. This system ensures that data changes on any platform are immediately reflected across all connected systems.

## Features

- **Multi-platform Support**: Handles webhooks from Hotmart, Nuvemshop, and WooCommerce
- **Real-time Synchronization**: Immediate data updates across all platforms
- **Event Queue Management**: Redis-based event queuing with priority handling
- **Rate Limiting**: Platform-specific rate limiting to prevent abuse
- **Retry Logic**: Exponential backoff retry mechanism for failed events
- **Conflict Resolution**: Intelligent conflict resolution for simultaneous updates
- **Signature Validation**: Secure webhook verification for all platforms
- **Comprehensive Logging**: Detailed logging and monitoring capabilities

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Hotmart      │    │   Nuvemshop     │    │  WooCommerce    │
│   Webhooks      │    │   Webhooks      │    │   Webhooks      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Webhook Controller                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Validation │  │ Rate Limit  │  │   Signature Validation  │  │
│  │ Middleware  │  │ Middleware  │  │      Middleware         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Webhook Strategies                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Hotmart   │  │ Nuvemshop   │  │     WooCommerce         │  │
│  │  Strategy   │  │  Strategy   │  │      Strategy           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Event Queue (Redis)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pending   │  │ Processing  │  │        Failed           │  │
│  │   Events    │  │   Events    │  │        Events           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Event Processors                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Product   │  │  Customer   │  │        Order            │  │
│  │ Processor   │  │ Processor   │  │      Processor          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Entity Services                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Products   │  │ Customers   │  │       Orders            │  │
│  │  Service    │  │  Service    │  │      Service            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Environment Configuration

Add the following environment variables to your `.env` file:

```env
# Redis Configuration (for event queue)
REDIS_URL=redis://localhost:6379

# Webhook Secrets (obtain from each platform)
HOTMART_WEBHOOK_SECRET=your_hotmart_secret
NUVEMSHOP_WEBHOOK_SECRET=your_nuvemshop_secret
WOOCOMMERCE_WEBHOOK_SECRET=your_woocommerce_secret

# Webhook Configuration
WEBHOOK_RATE_LIMIT_ENABLED=true
WEBHOOK_RETRY_ENABLED=true
WEBHOOK_MAX_RETRIES=3
```

### 2. Start the Application

```bash
# Install dependencies
npm install

# Start Redis (if not already running)
redis-server

# Start the application
npm run dev
```

### 3. Webhook Endpoints

Your webhook endpoints will be available at:

- **Hotmart**: `https://your-domain.com/api/acl/webhooks/hotmart`
- **Nuvemshop**: `https://your-domain.com/api/acl/webhooks/nuvemshop`
- **WooCommerce**: `https://your-domain.com/api/acl/webhooks/woocommerce`

## Platform Setup

### Hotmart Setup

1. **Access Hotmart Dashboard**
   - Go to your Hotmart producer dashboard
   - Navigate to "Configurações" > "Postback"

2. **Configure Webhook URL**
   ```
   URL: https://your-domain.com/api/acl/webhooks/hotmart
   ```

3. **Set HOTTOK**
   - Generate a secure HOTTOK (authentication token)
   - Add it to your environment variables as `HOTMART_WEBHOOK_SECRET`

4. **Select Events**
   - PURCHASE_COMPLETED
   - PURCHASE_REFUNDED
   - SUBSCRIPTION_CANCELLATION
   - SUBSCRIPTION_CREATED
   - SUBSCRIPTION_RENEWED
   - COMMISSION_GENERATED

### Nuvemshop Setup

1. **Access Nuvemshop Partner Dashboard**
   - Go to your Nuvemshop app configuration
   - Navigate to "Webhooks" section

2. **Configure Webhook URL**
   ```
   URL: https://your-domain.com/api/acl/webhooks/nuvemshop
   ```

3. **Set Webhook Secret**
   - Generate a secure secret for HMAC-SHA256 validation
   - Add it to your environment variables as `NUVEMSHOP_WEBHOOK_SECRET`

4. **Select Events**
   - order/created
   - order/updated
   - order/paid
   - order/cancelled
   - product/created
   - product/updated
   - product/deleted
   - customer/created
   - customer/updated

### WooCommerce Setup

1. **Access WooCommerce Admin**
   - Go to WooCommerce > Settings > Advanced > Webhooks

2. **Create New Webhook**
   ```
   Name: ACL Webhook
   Status: Active
   Topic: Select specific events or "All"
   Delivery URL: https://your-domain.com/api/acl/webhooks/woocommerce
   Secret: Generate a secure secret
   ```

3. **Set Webhook Secret**
   - Add the secret to your environment variables as `WOOCOMMERCE_WEBHOOK_SECRET`

4. **Supported Events**
   - order.created
   - order.updated
   - order.deleted
   - product.created
   - product.updated
   - product.deleted
   - customer.created
   - customer.updated
   - coupon.created
   - coupon.updated

## API Reference

### Webhook Management Endpoints

#### Get Webhooks
```http
GET /api/acl/webhooks
```

Query Parameters:
- `platform` (optional): Filter by platform (HOTMART, NUVEMSHOP, WOOCOMMERCE)
- `eventType` (optional): Filter by event type
- `processed` (optional): Filter by processing status
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

#### Get Webhook Statistics
```http
GET /api/acl/webhooks/statistics
```

#### Retry Failed Webhooks
```http
POST /api/acl/webhooks/retry-failed
```

#### Get Webhook Health
```http
GET /api/acl/webhooks/health
```

#### Test Webhook Processing
```http
POST /api/acl/webhooks/test
Content-Type: application/json

{
  "platform": "HOTMART",
  "sampleData": {
    "event": "PURCHASE_COMPLETED",
    "data": {
      "purchase": {
        "transaction": "TEST123"
      }
    }
  }
}
```

## Event Types

### Hotmart Events
- `PURCHASE_COMPLETED`: New purchase completed
- `PURCHASE_REFUNDED`: Purchase refunded
- `SUBSCRIPTION_CANCELLATION`: Subscription cancelled
- `SUBSCRIPTION_CREATED`: New subscription created
- `SUBSCRIPTION_RENEWED`: Subscription renewed
- `COMMISSION_GENERATED`: Commission generated

### Nuvemshop Events
- `order/created`: New order created
- `order/updated`: Order updated
- `order/paid`: Order payment confirmed
- `order/cancelled`: Order cancelled
- `product/created`: New product created
- `product/updated`: Product updated
- `product/deleted`: Product deleted
- `customer/created`: New customer registered
- `customer/updated`: Customer information updated

### WooCommerce Events
- `order.created`: New order created
- `order.updated`: Order updated
- `order.deleted`: Order deleted
- `product.created`: New product created
- `product.updated`: Product updated
- `product.deleted`: Product deleted
- `customer.created`: New customer registered
- `customer.updated`: Customer updated
- `coupon.created`: New coupon created
- `coupon.updated`: Coupon updated

## Configuration

### Rate Limiting

Configure rate limits per platform in your environment:

```env
# Hotmart rate limits
HOTMART_RATE_LIMIT_PER_MINUTE=100
HOTMART_RATE_LIMIT_PER_HOUR=1000

# Nuvemshop rate limits
NUVEMSHOP_RATE_LIMIT_PER_MINUTE=60
NUVEMSHOP_RATE_LIMIT_PER_HOUR=1000

# WooCommerce rate limits
WOOCOMMERCE_RATE_LIMIT_PER_MINUTE=120
WOOCOMMERCE_RATE_LIMIT_PER_HOUR=2000
```

### Retry Configuration

```env
# Retry settings
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_BASE_DELAY=1000
WEBHOOK_RETRY_MAX_DELAY=300000
WEBHOOK_RETRY_MULTIPLIER=2
```

### Conflict Resolution

```env
# Conflict resolution strategy
WEBHOOK_CONFLICT_RESOLUTION=TIMESTAMP_WINS
# Options: TIMESTAMP_WINS, PLATFORM_PRIORITY, MERGE_FIELDS, MANUAL_REVIEW
```

## Monitoring and Logging

### Health Check

Monitor webhook system health:

```bash
curl https://your-domain.com/api/acl/webhooks/health
```

### Queue Status

Check event queue status:

```bash
curl https://your-domain.com/api/acl/webhooks/queue/status
```

### Logs

Webhook processing logs are available in the application logs with the following structure:

```json
{
  "level": "info",
  "timestamp": "2023-01-01T10:00:00Z",
  "platform": "HOTMART",
  "eventType": "PURCHASE_COMPLETED",
  "webhookId": "webhook-123",
  "entityType": "order",
  "entityId": "TXN123456",
  "success": true,
  "processingTime": 150,
  "message": "Webhook processed successfully"
}
```

## Next Steps

- [Platform-specific Setup Guides](./platforms/)
- [Troubleshooting Guide](./troubleshooting.md)
- [Advanced Configuration](./advanced-configuration.md)
- [API Reference](./api-reference.md)
