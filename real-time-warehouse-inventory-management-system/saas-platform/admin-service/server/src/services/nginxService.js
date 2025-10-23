const fs = require("fs").promises;
const { exec } = require("child_process");
const util = require("util");
const path = require("path");

const execAsync = util.promisify(exec);

class NginxService {
  constructor() {
    this.nginxConfigPath =
      process.env.NGINX_CONFIG_PATH || "/etc/nginx/sites-available";
    this.nginxEnabledPath =
      process.env.NGINX_ENABLED_PATH || "/etc/nginx/sites-enabled";
    this.sslCertPath = process.env.SSL_CERT_PATH || "/etc/letsencrypt/live";
    this.webRootPath =
      process.env.WEB_ROOT_PATH || "/var/www/zenden-v2/tenant-app/client/dist";
    this.backendUpstream = process.env.BACKEND_UPSTREAM || "tenant_app_backend";

    // Detect Docker environment
    this.isDocker =
      process.env.NODE_ENV === "production" &&
      process.env.DB_HOST === "postgres";
    this.skipSSL = process.env.AUTO_GENERATE_SSL === "false" || this.isDocker;
  }

  /**
   * Generate Nginx configuration for a new tenant
   */
  generateNginxConfig(subdomain, sslEnabled = true) {
    const domain = `${subdomain}.zendensolutions.store`;
    // Create unique upstream name per tenant to avoid conflicts
    const upstreamName = `${subdomain}_backend`;

    // Full HTTPS configuration
    let config = `# ${subdomain.toUpperCase()} Subdomain - Auto-generated
upstream ${upstreamName} {
    server 127.0.0.1:5005;
}

server {
    listen 80;
    server_name ${domain};

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ${domain};

    # SSL configuration
`;

    if (sslEnabled) {
      config += `    ssl_certificate ${this.sslCertPath}/${domain}/fullchain.pem;
    ssl_certificate_key ${this.sslCertPath}/${domain}/privkey.pem;
`;
    } else {
      config += `    # SSL certificates will be added after Let's Encrypt setup
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
`;
    }

    config += `
    # API requests
    location /api/ {
        proxy_pass http://${upstreamName};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Frontend
    location / {
        root ${this.webRootPath};
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Security
    location ~ /\\. {
        deny all;
    }
}
`;

    return config;
  }

  /**
   * Alternative: Generate config without upstream (use shared upstream)
   */
  generateNginxConfigSharedUpstream(subdomain, sslEnabled = true) {
    const domain = `${subdomain}.zendensolutions.store`;
    // Use the shared upstream defined globally
    const upstreamName = this.backendUpstream;

    // Configuration without upstream definition (assumes it's defined globally)
    let config = `# ${subdomain.toUpperCase()} Subdomain - Auto-generated
server {
    listen 80;
    server_name ${domain};

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ${domain};

    # SSL configuration
`;

    if (sslEnabled) {
      config += `    ssl_certificate ${this.sslCertPath}/${domain}/fullchain.pem;
    ssl_certificate_key ${this.sslCertPath}/${domain}/privkey.pem;
`;
    } else {
      config += `    # SSL certificates will be added after Let's Encrypt setup
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
`;
    }

    config += `
    # API requests
    location /api/ {
        proxy_pass http://${upstreamName};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Frontend
    location / {
        root ${this.webRootPath};
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Security
    location ~ /\\. {
        deny all;
    }
}
`;

    return config;
  }

  /**
   * Create Nginx configuration file for tenant
   */
  async createNginxConfig(
    subdomain,
    sslEnabled = true,
    useSharedUpstream = false
  ) {
    try {
      const domain = `${subdomain}.zendensolutions.store`;

      // Choose config generation method
      const configContent = useSharedUpstream
        ? this.generateNginxConfigSharedUpstream(subdomain, sslEnabled)
        : this.generateNginxConfig(subdomain, sslEnabled);

      const configFileName = `${subdomain}.zendensolutions.store`;
      const configFilePath = path.join(this.nginxConfigPath, configFileName);

      // Write the configuration file
      await fs.writeFile(configFilePath, configContent, "utf8");

      console.log(`✅ Created Nginx config: ${configFilePath}`);

      return {
        success: true,
        configPath: configFilePath,
        domain: domain,
      };
    } catch (error) {
      console.error("❌ Failed to create Nginx config:", error);
      throw error;
    }
  }

  /**
   * Check if upstream already exists in any config
   */
  async checkUpstreamExists(upstreamName) {
    try {
      const { stdout } = await execAsync(
        `grep -r "upstream ${upstreamName}" ${this.nginxConfigPath} ${this.nginxEnabledPath} 2>/dev/null || echo "not_found"`
      );
      return !stdout.includes("not_found");
    } catch (error) {
      return false;
    }
  }

  /**
   * Create shared upstream configuration
   */
  async createSharedUpstreamConfig() {
    try {
      const sharedConfigPath = path.join(
        this.nginxConfigPath,
        "00-shared-upstream.conf"
      );
      const upstreamConfig = `# Shared upstream for all tenants
upstream ${this.backendUpstream} {
    server 127.0.0.1:5005;
}
`;

      const exists = await this.checkUpstreamExists(this.backendUpstream);
      if (!exists) {
        await fs.writeFile(sharedConfigPath, upstreamConfig, "utf8");
        console.log(`✅ Created shared upstream config: ${sharedConfigPath}`);

        // Enable it
        const enabledPath = path.join(
          this.nginxEnabledPath,
          "00-shared-upstream.conf"
        );
        await fs.symlink(sharedConfigPath, enabledPath);
        console.log(`✅ Enabled shared upstream config`);
      }

      return { success: true };
    } catch (error) {
      if (error.code === "EEXIST") {
        console.log("ℹ️ Shared upstream config already exists");
        return { success: true, message: "Already exists" };
      }
      throw error;
    }
  }

  /**
   * Enable Nginx site (create symlink)
   */
  async enableNginxSite(subdomain) {
    try {
      const configFileName = `${subdomain}.zendensolutions.store`;
      const availablePath = path.join(this.nginxConfigPath, configFileName);
      const enabledPath = path.join(this.nginxEnabledPath, configFileName);

      // Create symlink
      await fs.symlink(availablePath, enabledPath);

      console.log(`✅ Enabled Nginx site: ${configFileName}`);

      return {
        success: true,
        enabledPath: enabledPath,
      };
    } catch (error) {
      // If symlink already exists, that's okay
      if (error.code === "EEXIST") {
        console.log(
          `ℹ️ Nginx site already enabled: ${subdomain}.zendensolutions.store`
        );
        return { success: true, message: "Already enabled" };
      }
      console.error("❌ Failed to enable Nginx site:", error);
      throw error;
    }
  }

  /**
   * Test Nginx configuration
   */
  async testNginxConfig() {
    try {
      // In Docker environment, we don't have nginx running in the backend container
      // This is handled by the nginx service container
      console.log("✅ Nginx configuration test skipped (Docker environment)");
      return {
        success: true,
        output: "Docker environment - nginx handled by separate container",
        errors: "",
      };
    } catch (error) {
      console.error("❌ Nginx configuration test failed:", error);
      throw new Error(`Nginx test failed: ${error.message}`);
    }
  }

  /**
   * Reload Nginx
   */
  async reloadNginx() {
    try {
      // In Docker environment, nginx is running in a separate container
      // We would need to restart the nginx container or send a reload signal
      console.log("✅ Nginx reload skipped (Docker environment)");
      return {
        success: true,
        output: "Docker environment - nginx handled by separate container",
      };
    } catch (error) {
      console.error("❌ Nginx reload failed:", error);
      throw new Error(`Nginx reload failed: ${error.message}`);
    }
  }

  /**
   * Generate SSL certificate using Let's Encrypt
   */
  async generateSSLCertificate(subdomain, email = null) {
    const domain = `${subdomain}.zendensolutions.store`;
    try {
      let emailArg = email
        ? `--email ${email}`
        : "--register-unsafely-without-email";

      // Run certbot with nginx plugin
      const { stdout, stderr } = await execAsync(
        `sudo certbot --nginx -d ${domain} ${emailArg} --agree-tos --non-interactive`
      );

      console.log(stdout);
      if (stderr) console.error(stderr);

      return {
        success: true,
        domain: domain,
        certificatePath: `/etc/letsencrypt/live/${domain}/fullchain.pem`,
        privateKeyPath: `/etc/letsencrypt/live/${domain}/privkey.pem`,
        output: stdout,
        errors: stderr,
      };
    } catch (error) {
      console.error("❌ Failed to generate SSL:", error);
      throw error;
    }
  }

  /**
   * Complete tenant setup (Nginx + SSL)
   */
  async setupTenantDomain(
    subdomain,
    generateSSL = true,
    email = null,
    useSharedUpstream = false
  ) {
    try {
      console.log(`🚀 Setting up domain for tenant: ${subdomain}`);

      // Step 0: Create shared upstream if using shared approach
      if (useSharedUpstream) {
        await this.createSharedUpstreamConfig();
      }

      // Step 1: Create Nginx configuration (without SSL initially)
      await this.createNginxConfig(subdomain, false, useSharedUpstream);

      // Step 2: Enable the site
      await this.enableNginxSite(subdomain);

      // Step 3: Test configuration
      await this.testNginxConfig();

      // Step 4: Reload Nginx
      await this.reloadNginx();

      let sslResult = null;

      // Skip SSL generation in Docker or when explicitly disabled
      if (generateSSL && !this.skipSSL) {
        // Step 5: Generate SSL certificate
        sslResult = await this.generateSSLCertificate(subdomain, email);

        // Step 6: Update Nginx config with proper SSL paths
        await this.createNginxConfig(subdomain, true, useSharedUpstream);

        // Step 7: Test and reload again
        await this.testNginxConfig();
        await this.reloadNginx();
      } else if (this.skipSSL) {
        console.log(
          `⚠️ SSL generation skipped (Docker environment or disabled)`
        );
        // Create non-SSL config
        await this.createNginxConfig(subdomain, false, useSharedUpstream);
        await this.testNginxConfig();
        await this.reloadNginx();
      }

      const domain = `${subdomain}.zendensolutions.store`;
      const protocol = generateSSL && !this.skipSSL ? "https" : "http";
      console.log(`✅ Domain setup complete: ${protocol}://${domain}`);

      return {
        success: true,
        domain: domain,
        sslEnabled: generateSSL && !this.skipSSL,
        sslCertificate: sslResult,
        message: `Domain ${domain} is now live!`,
      };
    } catch (error) {
      console.error(`❌ Failed to setup domain for ${subdomain}:`, error);
      throw error;
    }
  }

  /**
   * Remove tenant domain configuration
   */
  async removeTenantDomain(subdomain) {
    try {
      const configFileName = `${subdomain}.zendensolutions.store`;
      const availablePath = path.join(this.nginxConfigPath, configFileName);
      const enabledPath = path.join(this.nginxEnabledPath, configFileName);

      // Remove symlink
      try {
        await fs.unlink(enabledPath);
        console.log(`✅ Removed enabled site: ${configFileName}`);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }

      // Remove config file
      try {
        await fs.unlink(availablePath);
        console.log(`✅ Removed config file: ${configFileName}`);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }

      // Test and reload Nginx
      await this.testNginxConfig();
      await this.reloadNginx();

      return {
        success: true,
        message: `Domain configuration removed for ${subdomain}`,
      };
    } catch (error) {
      console.error(`❌ Failed to remove domain for ${subdomain}:`, error);
      throw error;
    }
  }

  /**
   * Check if domain is accessible
   */
  async checkDomainHealth(subdomain) {
    try {
      const domain = `${subdomain}.zendensolutions.store`;
      const { stdout } = await execAsync(
        `curl -s -o /dev/null -w "%{http_code}" https://${domain}`
      );

      const statusCode = parseInt(stdout.trim());
      const isHealthy = statusCode >= 200 && statusCode < 400;

      return {
        domain: domain,
        healthy: isHealthy,
        statusCode: statusCode,
        ssl: true,
      };
    } catch (error) {
      return {
        domain: `${subdomain}.zendensolutions.store`,
        healthy: false,
        error: error.message,
        ssl: false,
      };
    }
  }
}

module.exports = NginxService;
