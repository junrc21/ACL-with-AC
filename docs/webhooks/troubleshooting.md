# Webhook Troubleshooting Guide

## Common Issues and Solutions

### 1. Webhooks Not Being Received

#### Symptoms
- No webhook events appearing in logs
- Webhook statistics show zero received events
- Platform reports webhook delivery failures

#### Possible Causes and Solutions

**A. URL Configuration Issues**
```bash
# Check if your webhook URL is accessible
curl -X POST https://your-domain.com/api/acl/webhooks/hotmart \
  -H "Content-Type: application/json" \
  -H "X-Hotmart-Hottok: test" \
  -d '{"test": true}'
```

**B. Firewall/Network Issues**
- Ensure your server accepts incoming connections on port 80/443
- Check if your hosting provider blocks incoming webhooks
- Verify DNS resolution for your domain

**C. SSL Certificate Issues**
```bash
# Test SSL certificate
curl -I https://your-domain.com/api/acl/webhooks/hotmart
```

### 2. Authentication Failures

#### Symptoms
- HTTP 401 responses
- "Webhook authentication failed" errors
- Invalid signature errors

#### Solutions by Platform

**Hotmart (HOTTOK)**
```bash
# Check environment variable
echo $HOTMART_WEBHOOK_SECRET

# Verify HOTTOK in request headers
curl -X POST https://your-domain.com/api/acl/webhooks/hotmart \
  -H "X-Hotmart-Hottok: $HOTMART_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"id": "test", "event": "PURCHASE_COMPLETED"}'
```

**Nuvemshop (HMAC-SHA256)**
```bash
# Test HMAC signature generation
echo -n '{"test": true}' | openssl dgst -sha256 -hmac "$NUVEMSHOP_WEBHOOK_SECRET" -binary | base64
```

**WooCommerce (Base64 HMAC-SHA256)**
```bash
# Test WooCommerce signature
echo -n '{"test": true}' | openssl dgst -sha256 -hmac "$WOOCOMMERCE_WEBHOOK_SECRET" -binary | base64
```

### 3. Rate Limiting Issues

#### Symptoms
- HTTP 429 responses
- "Rate limit exceeded" errors
- Delayed webhook processing

#### Solutions

**Check Rate Limit Status**
```bash
curl https://your-domain.com/api/acl/webhooks/queue/status
```

**Adjust Rate Limits**
```env
# Increase rate limits in .env
HOTMART_RATE_LIMIT_PER_MINUTE=200
NUVEMSHOP_RATE_LIMIT_PER_MINUTE=120
WOOCOMMERCE_RATE_LIMIT_PER_MINUTE=240
```

**Monitor Rate Limit Headers**
```bash
curl -I https://your-domain.com/api/acl/webhooks/hotmart
# Look for X-RateLimit-* headers
```

### 4. Event Processing Failures

#### Symptoms
- Webhooks received but not processed
- Events stuck in "processing" state
- Database inconsistencies

#### Diagnostic Steps

**Check Event Queue Status**
```bash
curl https://your-domain.com/api/acl/webhooks/queue/status
```

**View Failed Events**
```bash
curl https://your-domain.com/api/acl/webhooks?processed=false&limit=10
```

**Check Application Logs**
```bash
# View recent webhook processing logs
tail -f logs/application.log | grep -E "(WEBHOOK|EVENT_PROCESSOR)"
```

#### Common Solutions

**A. Redis Connection Issues**
```bash
# Test Redis connection
redis-cli ping
# Should return "PONG"

# Check Redis memory usage
redis-cli info memory
```

**B. Database Connection Issues**
```bash
# Test database connection
npm run db:test-connection
```

**C. Event Processor Errors**
```bash
# Restart event processing
curl -X POST https://your-domain.com/api/acl/webhooks/retry-failed
```

### 5. Duplicate Event Processing

#### Symptoms
- Same event processed multiple times
- Duplicate database records
- Inconsistent data states

#### Solutions

**Check Idempotency Implementation**
```sql
-- Check for duplicate webhook records
SELECT webhook_id, COUNT(*) 
FROM webhooks 
GROUP BY webhook_id 
HAVING COUNT(*) > 1;
```

**Implement Idempotency Keys**
```javascript
// Example idempotency check
const existingWebhook = await webhookRepository.findByPlatformAndEventId(
  platform, 
  eventId
);

if (existingWebhook) {
  return { success: true, message: 'Event already processed' };
}
```

### 6. Memory and Performance Issues

#### Symptoms
- High memory usage
- Slow webhook processing
- Application crashes

#### Diagnostic Commands

**Check Memory Usage**
```bash
# Node.js memory usage
curl https://your-domain.com/api/acl/health/memory

# System memory
free -h
```

**Check Event Queue Size**
```bash
# Redis queue statistics
redis-cli info keyspace
redis-cli zcard webhook:events
```

#### Solutions

**A. Optimize Event Processing**
```env
# Reduce batch size
WEBHOOK_BATCH_SIZE=5

# Increase processing timeout
WEBHOOK_PROCESSING_TIMEOUT=30000
```

**B. Clear Old Events**
```bash
# Clean up old processed events
curl -X POST https://your-domain.com/api/acl/webhooks/cleanup
```

### 7. Conflict Resolution Issues

#### Symptoms
- Data inconsistencies between platforms
- Conflicting entity states
- Manual review required frequently

#### Solutions

**Check Conflict Resolution Strategy**
```bash
curl https://your-domain.com/api/acl/webhooks/config/conflict-resolution
```

**Adjust Platform Priorities**
```env
# Set platform priorities (higher = more priority)
PLATFORM_PRIORITY_WOOCOMMERCE=3
PLATFORM_PRIORITY_NUVEMSHOP=2
PLATFORM_PRIORITY_HOTMART=1
```

**Review Conflict Logs**
```bash
curl https://your-domain.com/api/acl/webhooks/conflicts?limit=10
```

## Debugging Tools

### 1. Webhook Test Endpoint

Test webhook processing without external platforms:

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
          "transaction": "TEST123"
        }
      }
    }
  }'
```

### 2. Health Check Endpoints

**Overall System Health**
```bash
curl https://your-domain.com/api/acl/webhooks/health
```

**Component-Specific Health**
```bash
# Redis health
curl https://your-domain.com/api/acl/health/redis

# Database health
curl https://your-domain.com/api/acl/health/database

# Event queue health
curl https://your-domain.com/api/acl/webhooks/queue/health
```

### 3. Logging Configuration

**Enable Debug Logging**
```env
LOG_LEVEL=debug
WEBHOOK_DEBUG=true
```

**Log Filtering**
```bash
# Filter webhook logs by platform
tail -f logs/application.log | grep "HOTMART"

# Filter by event type
tail -f logs/application.log | grep "PURCHASE_COMPLETED"

# Filter by error level
tail -f logs/application.log | grep "ERROR"
```

## Performance Monitoring

### Key Metrics to Monitor

1. **Webhook Reception Rate**
   - Webhooks received per minute/hour
   - Success vs failure rate

2. **Processing Time**
   - Average processing time per event
   - Queue wait time

3. **Error Rates**
   - Authentication failures
   - Processing failures
   - Retry attempts

4. **Queue Health**
   - Queue size
   - Processing backlog
   - Failed events count

### Monitoring Commands

```bash
# Get comprehensive statistics
curl https://your-domain.com/api/acl/webhooks/statistics

# Monitor queue in real-time
watch -n 5 'curl -s https://your-domain.com/api/acl/webhooks/queue/status'

# Check recent errors
curl https://your-domain.com/api/acl/webhooks?processed=false&limit=5
```

## Emergency Procedures

### 1. Stop Webhook Processing

```bash
# Disable webhook endpoints temporarily
curl -X POST https://your-domain.com/api/acl/webhooks/disable

# Or stop the application
pm2 stop webhook-app
```

### 2. Clear Event Queue

```bash
# Clear all queues (use with caution)
curl -X POST https://your-domain.com/api/acl/webhooks/queue/clear

# Or manually in Redis
redis-cli flushdb
```

### 3. Restore from Backup

```bash
# Restore database from backup
pg_restore -d acl_database backup.sql

# Restart services
pm2 restart all
```

## Getting Help

### Log Collection

When reporting issues, collect the following information:

```bash
# System information
uname -a
node --version
npm --version

# Application logs (last 100 lines)
tail -n 100 logs/application.log > webhook-logs.txt

# Configuration (remove sensitive data)
env | grep -E "(WEBHOOK|REDIS|DATABASE)" > config.txt

# Queue status
curl https://your-domain.com/api/acl/webhooks/queue/status > queue-status.json

# Recent webhook events
curl https://your-domain.com/api/acl/webhooks?limit=20 > recent-webhooks.json
```

### Support Channels

1. **Internal Documentation**
   - Check [API Reference](./api-reference.md)
   - Review [Configuration Guide](./advanced-configuration.md)

2. **Platform Documentation**
   - [Hotmart Developer Docs](https://developers.hotmart.com/)
   - [Nuvemshop API Docs](https://dev.nuvemshop.com.br/)
   - [WooCommerce Webhook Docs](https://woocommerce.github.io/woocommerce-rest-api-docs/)

3. **Development Team**
   - Create issue with collected logs and configuration
   - Include steps to reproduce the problem
   - Specify urgency level and business impact
