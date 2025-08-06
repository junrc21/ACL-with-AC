# 🏗️ Cyrius Services - Project Structure Guide

This document defines the standardized structure for all microservices in the Cyrius Services ecosystem. This structure promotes consistency, maintainability, and scalability across all services.

## Code Implementation Guidelines

### 1. Clean Code Principles
- Follow SOLID principles
- Use clean architecture patterns
- Implement DRY (Don't Repeat Yourself) and KISS (Keep It Simple, Stupid)

### 2. Code Documentation
- Write clear and concise comments
- Document all public APIs
- Use JSDoc for function and method documentation


## 📁 Standard Service Structure

```
service-name/
├── prisma/                    # Database schema and migrations
│   ├── schema.prisma         # Prisma schema definition
│   ├── migrations/           # Database migration files
│   └── seed.ts              # Database seeding scripts
├── src/
│   ├── config/
│   │   └── index.ts         # Configuration management (env vars, constants)
│   ├── database/
│   │   ├── index.ts         # Database connection setup
│   │   └── client.ts        # Database client configuration
│   ├── modules/             # Domain-driven modules
│   │   └── [domain]/        # Domain module (e.g., customer, order, product)
│   │       ├── dto/         # Data Transfer Objects
│   │       │   ├── create-[domain].dto.ts
│   │       │   ├── update-[domain].dto.ts
│   │       │   └── [domain]-response.dto.ts
│   │       ├── repositories/
│   │       │   └── [domain].repository.ts
│   │       ├── [domain].controller.ts    # HTTP request handlers
│   │       ├── [domain].service.ts       # Business logic
│   │       ├── [domain].schema.ts        # Validation schemas (Joi/Zod)
│   │       ├── [domain].routes.ts        # Route definitions
│   │       └── [domain].use-cases.ts     # Use case implementations
│   ├── shared/              # Shared utilities and types
│   │   ├── interfaces/      # TypeScript interfaces
│   │   ├── types/          # Type definitions
│   │   ├── utils/          # Utility functions
│   │   ├── constants/      # Application constants
│   │   └── enums/          # Enumeration definitions
│   ├── middlewares/         # Express middlewares
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── logging.middleware.ts
│   ├── messaging/           # Message queue integration
│   │   ├── producers/      # Message producers
│   │   ├── consumers/      # Message consumers
│   │   ├── handlers/       # Message handlers
│   │   └── config.ts       # Messaging configuration
│   ├── routes/             # Route aggregation
│   │   ├── index.ts        # Main route aggregator
│   │   └── api.routes.ts   # API route definitions
│   ├── services/           # External service integrations
│   │   ├── external-api.service.ts
│   │   └── notification.service.ts
│   ├── app.ts              # Express app configuration
│   └── index.ts            # Application entry point
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/              # End-to-end tests
├── .env.example           # Environment variables template
├── .gitignore            # Git ignore rules
├── Dockerfile            # Docker container definition
├── docker-compose.yml    # Docker compose for local development
├── package.json          # Node.js dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── jest.config.js        # Jest testing configuration
├── nodemon.json          # Nodemon configuration
└── README.md             # Service documentation
```

## 🎯 Architecture Principles

### 1. Domain-Driven Design (DDD)
- Each business domain gets its own module under `src/modules/`
- Modules are self-contained with their own controllers, services, repositories, and DTOs
- Clear separation of concerns within each module

### 2. Layered Architecture
```
Controller Layer    → HTTP request/response handling
Service Layer       → Business logic implementation
Repository Layer    → Data access abstraction
Database Layer      → Data persistence
```

### 3. Dependency Injection
- Services should be injectable and testable
- Use interfaces for external dependencies
- Mock external services in tests

## 📋 Module Structure Details

### Domain Module Template
Each domain module should follow this structure:

```typescript
// [domain].controller.ts - HTTP handlers
export class CustomerController {
  constructor(private customerService: CustomerService) {}
  
  async create(req: Request, res: Response) {
    // Handle HTTP request
  }
}

// [domain].service.ts - Business logic
export class CustomerService {
  constructor(private customerRepository: CustomerRepository) {}
  
  async createCustomer(data: CreateCustomerDto) {
    // Business logic implementation
  }
}

// [domain].repository.ts - Data access
export class CustomerRepository {
  async create(data: CustomerData) {
    // Database operations
  }
}
```

## 🔧 Configuration Management

### Environment Variables
All configuration should be managed through environment variables:

```typescript
// src/config/index.ts
export const config = {
  port: process.env.PORT || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  messaging: {
    rabbitmq: process.env.RABBITMQ_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
};
```

## 🧪 Testing Strategy

### Test Organization
- **Unit Tests**: Test individual functions and classes in isolation
- **Integration Tests**: Test module interactions and database operations
- **E2E Tests**: Test complete user workflows

### Test File Naming
```
src/modules/customer/customer.service.ts
tests/unit/customer/customer.service.test.ts
tests/integration/customer/customer.integration.test.ts
```

## 📦 Package.json Scripts

Standard scripts for all services:

```json
{
  "scripts": {
    "start": "node dist/index.js",
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

## 🐳 Docker Configuration

### Dockerfile Template
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose for Development
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: service_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## 🔄 Messaging Integration

### Message Producer Example
```typescript
// src/messaging/producers/customer.producer.ts
export class CustomerProducer {
  async publishCustomerCreated(customer: Customer) {
    await this.messageQueue.publish('customer.created', customer);
  }
}
```

### Message Consumer Example
```typescript
// src/messaging/consumers/customer.consumer.ts
export class CustomerConsumer {
  @MessageHandler('customer.created')
  async handleCustomerCreated(data: Customer) {
    // Handle customer created event
  }
}
```

## 📝 Naming Conventions

### Service Name
- Use kebab-case for service names: `service-name`
- The Service word should be included and be the first word followed by the domain name: `service-customer`

### Files and Directories
- Use kebab-case for directories: `customer-service/`
- Use kebab-case for files: `customer.service.ts`
- Use PascalCase for classes: `CustomerService`
- Use camelCase for functions and variables: `createCustomer`

### Database
- Use snake_case for table names: `customer_addresses`
- Use snake_case for column names: `created_at`
- Use PascalCase for Prisma models: `CustomerAddress`

## Logging
- Use Pino for structured logging
- Log at appropriate levels (error, warn, info, debug)
- Include relevant metadata in logs

## 🚀 Getting Started Checklist

When creating a new service:

- [ ] Create directory structure following this guide
- [ ] Set up package.json with standard scripts
- [ ] Configure TypeScript (tsconfig.json)
- [ ] Set up Prisma schema
- [ ] Create .env.example with all required variables
- [ ] Set up Docker configuration
- [ ] Create initial domain module
- [ ] Set up testing framework
- [ ] Configure CI/CD pipeline
- [ ] Document API endpoints in README.md


