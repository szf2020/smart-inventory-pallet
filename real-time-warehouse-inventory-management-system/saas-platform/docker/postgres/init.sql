-- Initialize PostgreSQL for CNH Distributors Multi-tenant System
-- This script sets up the main admin database and prepares for tenant databases

-- Create a user for the application if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cnh_app') THEN
        CREATE ROLE cnh_app WITH LOGIN PASSWORD 'Mt202161534#';
    END IF;
END
$$;

-- Grant necessary permissions on the default database
GRANT ALL PRIVILEGES ON DATABASE cnh_admin_dev TO cnh_app;

-- Connect to the admin database to set up extensions
\c cnh_admin_dev;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO cnh_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cnh_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cnh_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cnh_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO cnh_app;
