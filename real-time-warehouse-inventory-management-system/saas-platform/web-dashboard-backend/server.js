// server.js - Node.js Backend for Bottle Scale MQTT System
const mqtt = require('mqtt');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MQTT Configuration
const MQTT_BROKER = 'mqtt://broker.hivemq.com';
const MQTT_TOPICS = [
  'bottle-scale/weight',
  'bottle-scale/bottles',
  'bottle-scale/status',
  'bottle-scale/data',
  'bottle-scale/nfc/vehicle-id',
  'bottle-scale/nfc/transaction'
];

// Data storage
let latestData = {
  weight_g: 0,
  weight_oz: 0,
  bottles: 0,
  status: 'idle',
  timestamp: Date.now(),
  lastUpdate: new Date().toISOString()
};

let dataHistory = [];
let nfcTransactions = []; // recent NFC transactions (in-memory)
let connectedClients = new Set();
let mqttConnected = false;

// Connect to MQTT broker
console.log('🔌 Connecting to MQTT broker...');
const mqttClient = mqtt.connect(MQTT_BROKER, {
  clientId: `bottle-scale-server-${Math.random().toString(16).substr(2, 8)}`,
  keepalive: 60,
  clean: true,
  reconnectPeriod: 1000,
});

mqttClient.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  mqttConnected = true;
  
  // Subscribe to all bottle scale topics
  MQTT_TOPICS.forEach(topic => {
    mqttClient.subscribe(topic, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${topic}:`, err);
      } else {
        console.log(`📡 Subscribed to ${topic}`);
      }
    });
  });
});

mqttClient.on('message', (topic, message) => {
  const messageStr = message.toString();
  const timestamp = Date.now();
  const updateTime = new Date().toISOString();
  
  console.log(`📨 MQTT: ${topic} = ${messageStr}`);
  
  try {
    if (topic === 'bottle-scale/data') {
      // Parse complete JSON data
      const jsonData = JSON.parse(messageStr);
      latestData = {
        ...jsonData,
        timestamp: timestamp,
        lastUpdate: updateTime
      };
    } else {
      // Handle individual topic updates
      const field = topic.split('/')[1];
      let value = messageStr;
      
      // Convert numeric fields
      if (field === 'weight' || field === 'bottles') {
        value = parseInt(messageStr) || 0;
      } else if (field === 'weight_oz') {
        value = parseFloat(messageStr) || 0;
      }
      
      // Update specific field
      latestData[field] = value;
      latestData.timestamp = timestamp;
      latestData.lastUpdate = updateTime;
    }
    
    // Add to history (keep last 100 entries)
    dataHistory.unshift({
      ...latestData,
      id: timestamp
    });
    
    if (dataHistory.length > 100) {
      dataHistory = dataHistory.slice(0, 100);
    }
    
    // Broadcast to WebSocket clients
    broadcastToClients(latestData);

    // If this is an NFC topic, handle specially
    if (topic === 'bottle-scale/nfc/transaction') {
      try {
        const tx = JSON.parse(messageStr);
        // Preserve MCU original timestamp if present
        if (tx.timestamp) {
          tx.originalTimestamp = tx.timestamp;
        }

        // Normalize: set server-side timestamp (epoch ms) and ISO received time
        tx.timestamp = Date.now();
        tx.receivedAt = new Date(tx.timestamp).toISOString();

        nfcTransactions.unshift(tx);
        if (nfcTransactions.length > 500) nfcTransactions = nfcTransactions.slice(0, 500);

        // Broadcast NFC transaction to WS clients
        const nfcMsg = JSON.stringify({ type: 'nfc', data: tx });
        connectedClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            try { client.send(nfcMsg); } catch (e) { connectedClients.delete(client); }
          } else {
            connectedClients.delete(client);
          }
        });
      } catch (e) {
        console.error('❌ Invalid NFC transaction payload', e);
      }
    }
    
  } catch (error) {
    console.error('❌ Error processing MQTT message:', error);
  }
});

mqttClient.on('error', (error) => {
  console.error('❌ MQTT connection error:', error);
  mqttConnected = false;
});

mqttClient.on('offline', () => {
  console.log('📴 MQTT client offline');
  mqttConnected = false;
});

mqttClient.on('reconnect', () => {
  console.log('🔄 MQTT client reconnecting...');
});

// WebSocket handling for real-time updates
wss.on('connection', (ws) => {
  console.log('🔗 WebSocket client connected');
  connectedClients.add(ws);
  
  // Send latest data to new client
  ws.send(JSON.stringify({
    type: 'data',
    data: latestData
  }));
  
  // Send connection status
  ws.send(JSON.stringify({
    type: 'status',
    connected: mqttConnected,
    clients: connectedClients.size
  }));
  
  ws.on('close', () => {
    console.log('📴 WebSocket client disconnected');
    connectedClients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    connectedClients.delete(ws);
  });
});

// Broadcast data to all connected WebSocket clients
function broadcastToClients(data) {
  const message = JSON.stringify({
    type: 'data',
    data: data
  });
  
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('❌ Error sending to WebSocket client:', error);
        connectedClients.delete(client);
      }
    } else {
      connectedClients.delete(client);
    }
  });
}

// REST API Routes

// Get latest data
app.get('/api/latest', (req, res) => {
  res.json({
    success: true,
    data: latestData,
    mqttConnected: mqttConnected,
    timestamp: Date.now()
  });
});

// Get historical data
app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const limitedHistory = dataHistory.slice(0, limit);
  
  res.json({
    success: true,
    data: limitedHistory,
    total: dataHistory.length,
    limit: limit
  });
});

// Get system status
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: {
      mqttConnected: mqttConnected,
      connectedClients: connectedClients.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      dataPoints: dataHistory.length,
      lastUpdate: latestData.lastUpdate
    }
  });
});

// Get statistics
app.get('/api/stats', (req, res) => {
  if (dataHistory.length === 0) {
    return res.json({
      success: true,
      stats: {
        totalReadings: 0,
        averageWeight: 0,
        maxWeight: 0,
        minWeight: 0,
        averageBottles: 0,
        maxBottles: 0
      }
    });
  }
  
  const weights = dataHistory.map(d => d.weight_g || 0);
  const bottles = dataHistory.map(d => d.bottles || 0);
  
  const stats = {
    totalReadings: dataHistory.length,
    averageWeight: Math.round(weights.reduce((a, b) => a + b, 0) / weights.length),
    maxWeight: Math.max(...weights),
    minWeight: Math.min(...weights),
    averageBottles: Math.round(bottles.reduce((a, b) => a + b, 0) / bottles.length * 10) / 10,
    maxBottles: Math.max(...bottles),
    statusCounts: {
      load: dataHistory.filter(d => d.status === 'load').length,
      unload: dataHistory.filter(d => d.status === 'unload').length,
      idle: dataHistory.filter(d => d.status === 'idle').length
    }
  };
  
  res.json({
    success: true,
    stats: stats
  });
});

// NFC transactions API - recent
app.get('/api/nfc/transactions', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  res.json({ success: true, data: nfcTransactions.slice(0, limit), total: nfcTransactions.length });
});

// Clear history (useful for testing)
app.delete('/api/history', (req, res) => {
  dataHistory = [];
  res.json({
    success: true,
    message: 'History cleared'
  });
});

// Publish test data (useful for testing)
app.post('/api/test', (req, res) => {
  const testData = {
    weight_g: Math.floor(Math.random() * 1000),
    bottles: Math.floor(Math.random() * 4),
    status: ['idle', 'load', 'unload'][Math.floor(Math.random() * 3)]
  };
  
  if (mqttConnected) {
    mqttClient.publish('bottle-scale/data', JSON.stringify(testData));
    res.json({
      success: true,
      message: 'Test data published',
      data: testData
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'MQTT not connected'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mqtt: mqttConnected
  });
});

// Serve static files (for dashboard)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Bottle Scale API Server</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
            .connected { background-color: #d4edda; color: #155724; }
            .disconnected { background-color: #f8d7da; color: #721c24; }
            .endpoint { background-color: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 3px; }
        </style>
    </head>
    <body>
        <h1>🍼 Bottle Scale API Server</h1>
        <div class="status ${mqttConnected ? 'connected' : 'disconnected'}">
            MQTT Status: ${mqttConnected ? 'Connected' : 'Disconnected'}
        </div>
        <div class="status connected">
            Connected Clients: ${connectedClients.size}
        </div>
        
        <h2>API Endpoints</h2>
        <div class="endpoint">GET /api/latest - Get latest scale data</div>
        <div class="endpoint">GET /api/history?limit=50 - Get historical data</div>
        <div class="endpoint">GET /api/status - Get system status</div>
        <div class="endpoint">GET /api/stats - Get statistics</div>
        <div class="endpoint">POST /api/test - Publish test data</div>
        <div class="endpoint">DELETE /api/history - Clear history</div>
        <div class="endpoint">GET /health - Health check</div>
        
        <h2>WebSocket</h2>
        <p>Connect to WebSocket at: ws://localhost:${process.env.PORT || 3001}/</p>
        
        <h2>Latest Data</h2>
        <pre id="latestData">${JSON.stringify(latestData, null, 2)}</pre>
        
        <script>
            // Auto-refresh latest data every 5 seconds
            setInterval(() => {
                fetch('/api/latest')
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('latestData').textContent = JSON.stringify(data, null, 2);
                    })
                    .catch(error => console.error('Error:', error));
            }, 5000);
        </script>
    </body>
    </html>
  `);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Express error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api/latest`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down gracefully...');
  
  // Close MQTT connection
  if (mqttClient) {
    mqttClient.end();
  }
  
  // Close WebSocket connections
  wss.clients.forEach(client => {
    client.close();
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };