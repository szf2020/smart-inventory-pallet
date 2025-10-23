# CNH Distributors Admin Service

Admin service for managing the CNH Distributors SaaS platform. This service handles tenant management, billing, SSL certificates, CORS origins, and environment variables for the multi-tenant system.

## Features

- **Tenant Management**: Create and manage tenant instances
- **SSL Certificate Management**: Handle SSL certificates for custom domains
- **CORS Configuration**: Manage allowed origins per tenant
- **Environment Variables**: Secure storage of tenant-specific configuration
- **Billing Management**: Handle subscription plans and billing cycles
- **Admin Authentication**: Role-based access control for system administrators

## Models

### Tenants

- Unique subdomain and database management
- Status tracking (active, inactive, suspended, pending)
- Company information and contact details

### SSL Certificates

- Domain-specific SSL certificate management
- Auto-renewal configuration
- Certificate expiration tracking

### CORS Origins

- Per-tenant CORS origin management
- Active/inactive status control

### Environment Variables

- Encrypted storage of sensitive configuration
- Categorized variables (database, API, email, etc.)
- Tenant-specific environment management

### Billing

- Subscription plan management (free, basic, premium, enterprise)
- Billing cycle tracking (monthly, yearly)
- Payment integration with Stripe
- Trial period management

### System Admins

- Role-based authentication (super_admin, admin, support)
- Account lockout protection
- Two-factor authentication support

## Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Environment Configuration**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**

   ```bash
   # Create database
   createdb cnh_admin_dev

   # Run migrations (when created)
   npm run migrate

   # Seed initial data
   npm run seed
   ```

4. **Development**

   ```bash
   npm run dev
   ```

5. **Production**
   ```bash
   npm start
   ```

## Environment Variables

Key environment variables to configure:

- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 7000)
- `DB_*`: Database connection details
- `JWT_SECRET`: JWT signing secret
- `ENCRYPTION_KEY`: Key for encrypting environment variables
- `STRIPE_SECRET_KEY`: Stripe API key for billing

## Security Features

- JWT-based authentication
- Role-based authorization
- Rate limiting
- Request validation
- Encrypted storage for sensitive data
- Account lockout protection
- CORS configuration
- Helmet security headers

## API Structure

When controllers and routes are implemented, the API will include:

- `POST /api/auth/login` - Admin authentication
- `GET /api/tenants` - List tenants
- `POST /api/tenants` - Create new tenant
- `GET /api/tenants/:id/ssl` - Manage SSL certificates
- `PUT /api/tenants/:id/cors` - Update CORS settings
- `GET /api/tenants/:id/env` - Manage environment variables
- `PUT /api/tenants/:id/billing` - Update billing information

## Development Notes

- All sensitive data is encrypted before storage
- Database connections are pooled for performance
- Comprehensive error handling and logging
- Input validation on all endpoints
- Automated SSL certificate monitoring
- Billing cycle automation support

## Default Admin Accounts

After running seeders:

- **Super Admin**: username: `superadmin`, password: `admin123!`
- **Admin**: username: `admin`, password: `admin123!`

> **Important**: Change these default passwords in production!

## License

This project is proprietary software for CNH Distributors.
