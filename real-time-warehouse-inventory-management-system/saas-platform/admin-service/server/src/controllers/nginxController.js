const NginxService = require('../services/nginxService');

class NginxController {
  constructor() {
    this.nginxService = new NginxService();
  }

  /**
   * Setup domain for a tenant (Nginx + SSL)
   */
  async setupTenantDomain(req, res) {
    try {
      const { subdomain, generateSSL = true, email } = req.body;

      if (!subdomain) {
        return res.status(400).json({
          success: false,
          message: 'Subdomain is required'
        });
      }

      // Validate subdomain format
      if (!/^[a-z0-9-]+$/.test(subdomain)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subdomain format. Only lowercase letters, numbers, and hyphens allowed.'
        });
      }

      const result = await this.nginxService.setupTenantDomain(subdomain, generateSSL, email);

      res.json({
        success: true,
        data: result,
        message: `Domain setup completed for ${subdomain}.zendensolutions.store`
      });

    } catch (error) {
      console.error('Setup domain error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to setup domain',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Remove domain configuration for a tenant
   */
  async removeTenantDomain(req, res) {
    try {
      const { subdomain } = req.params;

      if (!subdomain) {
        return res.status(400).json({
          success: false,
          message: 'Subdomain is required'
        });
      }

      const result = await this.nginxService.removeTenantDomain(subdomain);

      res.json({
        success: true,
        data: result,
        message: `Domain configuration removed for ${subdomain}.zendensolutions.store`
      });

    } catch (error) {
      console.error('Remove domain error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to remove domain',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Check domain health
   */
  async checkDomainHealth(req, res) {
    try {
      const { subdomain } = req.params;

      const result = await this.nginxService.checkDomainHealth(subdomain);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Check domain health error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check domain health',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Test Nginx configuration
   */
  async testNginxConfig(req, res) {
    try {
      const result = await this.nginxService.testNginxConfig();

      res.json({
        success: true,
        data: result,
        message: 'Nginx configuration is valid'
      });

    } catch (error) {
      console.error('Test Nginx config error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Nginx configuration test failed',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Reload Nginx
   */
  async reloadNginx(req, res) {
    try {
      const result = await this.nginxService.reloadNginx();

      res.json({
        success: true,
        data: result,
        message: 'Nginx reloaded successfully'
      });

    } catch (error) {
      console.error('Reload Nginx error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to reload Nginx',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Generate SSL certificate for existing domain
   */
  async generateSSLCertificate(req, res) {
    try {
      const { subdomain, email } = req.body;

      if (!subdomain) {
        return res.status(400).json({
          success: false,
          message: 'Subdomain is required'
        });
      }

      const result = await this.nginxService.generateSSLCertificate(subdomain, email);

      res.json({
        success: true,
        data: result,
        message: `SSL certificate generated for ${subdomain}.zendensolutions.store`
      });

    } catch (error) {
      console.error('Generate SSL certificate error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate SSL certificate',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

module.exports = new NginxController();
