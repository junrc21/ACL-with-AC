# Hotmart Webhook Setup Guide

## Overview

Hotmart uses a HOTTOK-based authentication system for webhooks. This guide will walk you through setting up webhooks for your Hotmart products.

## Prerequisites

- Active Hotmart producer account
- Access to Hotmart dashboard
- Your application webhook endpoint URL

## Step-by-Step Setup

### 1. Access Hotmart Dashboard

1. Log in to your [Hotmart Dashboard](https://app.hotmart.com/)
2. Navigate to **"Configurações"** (Settings)
3. Click on **"Postback"** or **"Webhooks"**

### 2. Configure Webhook URL

1. In the Postback configuration page, add your webhook URL:
   ```
   https://your-domain.com/api/acl/webhooks/hotmart
   ```

2. Set the HTTP method to **POST**

3. Select **JSON** as the data format

### 3. Generate and Configure HOTTOK

1. Generate a secure HOTTOK (authentication token):
   ```bash
   # Example: Generate a random token
   openssl rand -hex 32
   ```

2. Add the HOTTOK to your Hotmart webhook configuration

3. Add the same HOTTOK to your environment variables:
   ```env
   HOTMART_WEBHOOK_SECRET=your_generated_hottok_here
   ```

### 4. Select Events

Enable the following events in your Hotmart webhook configuration:

#### Sales Events
- **PURCHASE_COMPLETED**: Triggered when a purchase is completed
- **PURCHASE_REFUNDED**: Triggered when a purchase is refunded

#### Subscription Events
- **SUBSCRIPTION_CREATED**: Triggered when a new subscription is created
- **SUBSCRIPTION_RENEWED**: Triggered when a subscription is renewed
- **SUBSCRIPTION_CANCELLATION**: Triggered when a subscription is cancelled

#### Commission Events
- **COMMISSION_GENERATED**: Triggered when a commission is generated

### 5. Test Configuration

1. Save your webhook configuration in Hotmart
2. Test the webhook using the test endpoint:
   ```bash
   curl -X POST https://your-domain.com/api/acl/webhooks/test \
     -H "Content-Type: application/json" \
     -d '{
       "platform": "HOTMART",
       "sampleData": {
         "id": "test-123",
         "event": "PURCHASE_COMPLETED",
         "data": {
           "purchase": {
             "transaction": "TEST123456"
           }
         }
       }
     }'
   ```

## Webhook Payload Examples

### Purchase Completed Event

```json
{
  "id": "12345",
  "event": "PURCHASE_COMPLETED",
  "version": "2.0.0",
  "creation_date": "2023-01-01T10:00:00Z",
  "data": {
    "product": {
      "id": "PROD123",
      "name": "My Digital Product",
      "price": 99.99
    },
    "buyer": {
      "email": "buyer@example.com",
      "name": "John Doe",
      "document": "12345678901"
    },
    "purchase": {
      "transaction": "TXN123456789",
      "status": "COMPLETED",
      "price": 99.99,
      "currency_code": "BRL",
      "payment_method": "CREDIT_CARD"
    },
    "producer": {
      "name": "Producer Name"
    },
    "affiliates": [
      {
        "name": "Affiliate Name",
        "email": "affiliate@example.com"
      }
    ]
  }
}
```

### Subscription Created Event

```json
{
  "id": "12346",
  "event": "SUBSCRIPTION_CREATED",
  "version": "2.0.0",
  "creation_date": "2023-01-01T10:00:00Z",
  "data": {
    "product": {
      "id": "PROD123",
      "name": "Monthly Subscription",
      "price": 29.99
    },
    "buyer": {
      "email": "subscriber@example.com",
      "name": "Jane Smith"
    },
    "subscription": {
      "subscriber_code": "SUB123456",
      "plan": {
        "id": "PLAN123",
        "name": "Monthly Plan",
        "price": 29.99,
        "recurrence_period": 1,
        "recurrence_type": "MONTH"
      },
      "status": "ACTIVE",
      "date_next_charge": "2023-02-01T10:00:00Z"
    }
  }
}
```

### Commission Generated Event

```json
{
  "id": "12347",
  "event": "COMMISSION_GENERATED",
  "version": "2.0.0",
  "creation_date": "2023-01-01T10:00:00Z",
  "data": {
    "commission": {
      "id": "COMM123456",
      "value": 19.99,
      "currency_code": "BRL"
    },
    "purchase": {
      "transaction": "TXN123456789",
      "price": 99.99
    },
    "product": {
      "id": "PROD123",
      "name": "My Digital Product"
    },
    "affiliate": {
      "name": "Affiliate Name",
      "email": "affiliate@example.com"
    }
  }
}
```

## Authentication

Hotmart webhooks use HOTTOK authentication. The HOTTOK is sent in the `X-Hotmart-Hottok` header:

```http
POST /api/acl/webhooks/hotmart HTTP/1.1
Host: your-domain.com
Content-Type: application/json
X-Hotmart-Hottok: your_hottok_here

{
  "id": "12345",
  "event": "PURCHASE_COMPLETED",
  ...
}
```

## Error Handling

### Common Error Responses

#### Invalid HOTTOK
```json
{
  "success": false,
  "error": {
    "code": "WEBHOOK_AUTHENTICATION_FAILED",
    "message": "Webhook signature validation failed"
  }
}
```

#### Missing Event Data
```json
{
  "success": false,
  "error": {
    "code": "WEBHOOK_VALIDATION_FAILED",
    "message": "Webhook validation failed",
    "errors": ["Event type is required", "Event data is required"]
  }
}
```

### Retry Logic

The system automatically retries failed webhooks with exponential backoff:

- **Attempt 1**: Immediate
- **Attempt 2**: 1 second delay
- **Attempt 3**: 2 seconds delay
- **Attempt 4**: 4 seconds delay
- **Attempt 5**: 8 seconds delay (final attempt)

## Monitoring

### Check Webhook Status

```bash
# Get webhook statistics
curl https://your-domain.com/api/acl/webhooks/statistics?platform=HOTMART

# Get recent webhooks
curl https://your-domain.com/api/acl/webhooks?platform=HOTMART&limit=10
```

### Health Check

```bash
curl https://your-domain.com/api/acl/webhooks/health
```

## Troubleshooting

### Webhook Not Receiving Events

1. **Check HOTTOK Configuration**
   - Ensure HOTTOK matches between Hotmart and your environment variables
   - Verify the HOTTOK is correctly set in Hotmart dashboard

2. **Verify URL Configuration**
   - Ensure the webhook URL is correctly configured in Hotmart
   - Check that your application is accessible from the internet

3. **Check Firewall Settings**
   - Ensure your server accepts incoming connections on the webhook port
   - Whitelist Hotmart's IP ranges if necessary

### Authentication Failures

1. **HOTTOK Mismatch**
   ```bash
   # Check your environment variable
   echo $HOTMART_WEBHOOK_SECRET
   ```

2. **Header Issues**
   - Verify the `X-Hotmart-Hottok` header is being sent
   - Check for any proxy or load balancer modifications

### Event Processing Failures

1. **Check Application Logs**
   ```bash
   # View recent webhook logs
   tail -f logs/application.log | grep "HOTMART"
   ```

2. **Validate Event Structure**
   - Ensure the webhook payload matches expected format
   - Check for missing required fields

## Best Practices

1. **Security**
   - Use HTTPS for all webhook URLs
   - Keep your HOTTOK secret and rotate it regularly
   - Validate all incoming webhook data

2. **Reliability**
   - Implement idempotency to handle duplicate events
   - Use database transactions for data consistency
   - Monitor webhook processing performance

3. **Monitoring**
   - Set up alerts for webhook failures
   - Monitor processing times and queue lengths
   - Log all webhook events for debugging

## Support

For Hotmart-specific issues:
- [Hotmart Developer Documentation](https://developers.hotmart.com/)
- [Hotmart Support](https://atendimento.hotmart.com/)

For ACL webhook system issues:
- Check the [Troubleshooting Guide](../troubleshooting.md)
- Review application logs
- Contact your development team
