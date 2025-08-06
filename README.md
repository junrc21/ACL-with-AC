# ACL Service - Anti-Corruption Layer

A comprehensive Anti-Corruption Layer service for multi-platform e-commerce integration, supporting Hotmart, Nuvemshop, and WooCommerce platforms.

## Features

### Core Functionality
- **Multi-Platform Support**: Seamless integration with Hotmart, Nuvemshop, and WooCommerce
- **Product Management**: Unified product data handling across platforms
- **Customer Management**: Customer data synchronization and management
- **Order Processing**: Order data integration and processing
- **Category Management**: Hierarchical category management with platform-specific features

### Platform-Specific Features
- **Hotmart**: Virtual categories from producer/product metadata, sales data integration
- **Nuvemshop**: Multi-language support, custom fields, hierarchical categories
- **WooCommerce**: Full taxonomy support, product attributes, reviews integration

### Advanced Features
- **Product Extensions**: Enhanced product attributes, reviews, custom fields
- **Category Hierarchy**: Tree structures with parent-child relationships
- **SEO Support**: SEO titles, descriptions, and meta data
- **Image Management**: Enhanced image handling with multiple formats
- **Custom Fields**: Platform-specific custom field support

## API Endpoints

### Products
- `GET /api/acl/products` - List products with filtering
- `POST /api/acl/products` - Create product
- `POST /api/acl/products/bulk` - Bulk product creation
- `GET /api/acl/products/statistics` - Product statistics
- `GET /api/acl/products/:id` - Get product by ID
- `PUT /api/acl/products/:id` - Update product
- `DELETE /api/acl/products/:id` - Delete product

### Categories
- `GET /api/acl/categories` - List categories with filtering
- `POST /api/acl/categories` - Create category
- `POST /api/acl/categories/sync` - Sync multiple categories
- `GET /api/acl/categories/tree` - Get category hierarchy
- `GET /api/acl/categories/statistics` - Category statistics
- `GET /api/acl/categories/:id` - Get category by ID
- `GET /api/acl/categories/:id/path` - Get category breadcrumb path
- `PUT /api/acl/categories/:id` - Update category
- `DELETE /api/acl/categories/:id` - Delete category

### Customers
- `GET /api/acl/customers` - List customers
- `POST /api/acl/customers/sync` - Sync customers
- `GET /api/acl/customers/statistics` - Customer statistics
- `GET /api/acl/customers/search` - Search customers
- `GET /api/acl/customers/:id` - Get customer by ID
- `PUT /api/acl/customers/:id` - Update customer
- `DELETE /api/acl/customers/:id` - Delete customer

### Orders
- `GET /api/acl/orders` - List orders
- `POST /api/acl/orders` - Create order
- `POST /api/acl/orders/sync` - Sync orders
- `GET /api/acl/orders/statistics` - Order statistics
- `GET /api/acl/orders/search` - Search orders
- `GET /api/acl/orders/:id` - Get order by ID
- `PUT /api/acl/orders/:id` - Update order
- `DELETE /api/acl/orders/:id` - Delete order

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis (optional, for caching)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/junrc21/ACL-with-AC.git
cd ACL-with-AC
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npm run prisma:migrate
npm run prisma:generate
```

5. Start the development server:
```bash
npm run dev
```

The service will be available at `http://localhost:3000`

## Documentation

- [Category API Documentation](./CATEGORY_API_DOCUMENTATION.md) - Detailed category API documentation
- [Service Implementation Guide](./SERVICE_IMPLEMENTATION_GUIDE.md) - Development guidelines
- [Project Roadmap](./PROJECT_ROADMAP.md) - Development phases and progress

## Architecture

The service follows a clean architecture pattern with:

- **Controllers**: HTTP request handling
- **Services**: Business logic implementation
- **Repositories**: Data access layer
- **Strategies**: Platform-specific implementations
- **DTOs**: Data transfer objects with validation

### Platform Strategy Pattern

Each platform (Hotmart, Nuvemshop, WooCommerce) has dedicated strategy implementations for:
- Product processing
- Customer management
- Order handling
- Category management

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Development

### Code Style
- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety

### Database
- Prisma ORM for database operations
- PostgreSQL as the primary database
- Migrations for schema management

### Logging
- Structured logging with Pino
- Platform-specific log contexts
- Error tracking and monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.