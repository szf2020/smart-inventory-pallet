const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m', 
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const logger = {
  info: (message) => console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`),
  success: (message) => console.log(`${colors.green}✅ ${message}${colors.reset}`),
  error: (message) => console.log(`${colors.red}❌ ${message}${colors.reset}`),
  warning: (message) => console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`),
  mqtt: (message) => console.log(`${colors.magenta}📡 MQTT: ${message}${colors.reset}`),
  websocket: (message) => console.log(`${colors.cyan}🔗 WebSocket: ${message}${colors.reset}`)
};

module.exports = logger;