FROM node:18-alpine

# Install build dependencies for native modules
RUN apk add --no-cache make gcc g++ python3

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clear any existing node_modules to avoid architecture conflicts
RUN rm -rf node_modules

# Install dependencies and rebuild native modules
RUN npm ci --only=production && npm rebuild bcrypt --build-from-source

# Copy source code
COPY . .

# Create necessary directories for nginx configs
RUN mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/letsencrypt /var/www/html

# Install curl for health checks
RUN apk add --no-cache curl

# Remove build dependencies to reduce image size
RUN apk del make gcc g++ python3

# Expose port
EXPOSE 7000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:7000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
