import React, { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff, Scale, Package, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// MQTT Web Client (using MQTT.js via CDN)
// Note: In a real application, you'd install mqtt via npm: npm install mqtt
// For this demo, include this script in your HTML: <script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>

const BottleDashboardPage = () => {
  const [data, setData] = useState({
    weight_g: 0,
    weight_oz: 0,
    bottles: 0,
    status: 'idle',
    timestamp: 0
  });
  
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [history, setHistory] = useState([]);
  const [client, setClient] = useState(null);
  const [nfcVehicle, setNfcVehicle] = useState('');
  const [transactions, setTransactions] = useState([]);

  // Check for connection timeout
  useEffect(() => {
    const checkConnection = setInterval(() => {
      if (lastUpdate) {
        const timeSinceLastUpdate = Date.now() - lastUpdate.getTime();
        // If no update for more than 30 seconds, mark as offline
        if (timeSinceLastUpdate > 30000 && connectionStatus === 'connected') {
          setConnectionStatus('offline');
          console.log('Connection marked as offline - no data received for 30 seconds');
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(checkConnection);
  }, [lastUpdate, connectionStatus]);

  // MQTT Connection Configuration
  const mqttConfig = {
    host: 'broker.hivemq.com',
    port: 8884, // WebSocket port for HiveMQ
    protocol: 'wss' // Use 'ws' for non-secure, 'wss' for secure
  };

  useEffect(() => {
    // Initialize MQTT client
    const connectMQTT = () => {
      try {
        // Check if mqtt is available (from CDN)
        if (typeof window.mqtt === 'undefined') {
          console.error('MQTT.js not loaded. Please include the script tag.');
          return;
        }

        const clientId = `bottle-dashboard-${Math.random().toString(16).substr(2, 8)}`;
        const mqttUrl = `${mqttConfig.protocol}://${mqttConfig.host}:${mqttConfig.port}/mqtt`;
        
        const mqttClient = window.mqtt.connect(mqttUrl, {
          clientId: clientId,
          keepalive: 60,
          clean: true,
          reconnectPeriod: 1000,
          connectTimeout: 30 * 1000,
        });

        mqttClient.on('connect', () => {
          console.log('Connected to MQTT broker');
          setConnectionStatus('connected');
          
          // Subscribe to topics (including NFC topics)
          const topics = [
            'bottle-scale/data',
            'bottle-scale/weight',
            'bottle-scale/bottles',
            'bottle-scale/status',
            'bottle-scale/nfc/vehicle-id',
            'bottle-scale/nfc/transaction'

          ];
          
          topics.forEach(topic => {
            mqttClient.subscribe(topic, (err) => {
              if (err) {
                console.error(`Failed to subscribe to ${topic}:`, err);
              } else {
                console.log(`Subscribed to ${topic}`);
              }
            });
          });
        });

        mqttClient.on('message', (topic, message) => {
          try {
            const now = new Date();
            setLastUpdate(now);
            
            if (topic === 'bottle-scale/data') {
              // Parse JSON data
              const jsonData = JSON.parse(message.toString());
              setData(prevData => ({
                ...jsonData,
                timestamp: now.getTime()
              }));
              
              // Add to history (keep last 20 entries)
              setHistory(prev => {
                const newEntry = {
                  ...jsonData,
                  time: now.toLocaleTimeString(),
                  timestamp: now.getTime()
                };
                return [newEntry, ...prev].slice(0, 20);
              });
              
            } else {
              // Handle individual topic updates
              const value = message.toString();
              const updateField = topic.split('/')[1]; // Gets 'weight', 'bottles', or 'status'
                // Handle NFC specific topics (vehicle id and transactions)
                if (topic === 'bottle-scale/nfc/vehicle-id') {
                  const vehicleId = message.toString();
                  setNfcVehicle(vehicleId);
                  // keep indicator for a short time
                  setTimeout(() => setNfcVehicle(''), 5000);
                }

                // NOTE: do NOT use raw MQTT NFC transaction payloads here.
                // The MCU may publish a non-epoch timestamp which causes wrong
                // date display until the backend normalizes it. The web-backend
                // broadcasts a normalized 'nfc' message over WebSocket (with
                // receivedAt and server timestamp). See WS handler added below.
              
              let processedValue = value;
              
              // Convert numeric fields
              if (updateField === 'bottles' || updateField === 'weight') {
                processedValue = parseInt(value) || 0;
              }
              
              // Map the field names correctly
              let fieldName = updateField;
              if (updateField === 'weight') {
                fieldName = 'weight_g'; // Map to weight_g to match data structure
              }
              
              setData(prev => ({
                ...prev,
                [fieldName]: processedValue,
                timestamp: now.getTime()
              }));
              
              console.log(`Updated ${fieldName}: ${processedValue}`);
            }
            
          } catch (error) {
            console.error('Error processing MQTT message:', error);
          }
        });

        mqttClient.on('error', (error) => {
          console.error('MQTT connection error:', error);
          setConnectionStatus('error');
        });

        mqttClient.on('offline', () => {
          console.log('MQTT client offline');
          setConnectionStatus('offline');
        });

        mqttClient.on('reconnect', () => {
          console.log('MQTT client reconnecting');
          setConnectionStatus('reconnecting');
        });

        setClient(mqttClient);
        
      } catch (error) {
        console.error('Failed to initialize MQTT:', error);
        setConnectionStatus('error');
      }
    };

    connectMQTT();

    // Cleanup on component unmount
    return () => {
      if (client) {
        client.end();
      }
    };
  }, []);

    // Fetch recent NFC transactions from backend on mount
    useEffect(() => {
      const fetchNfc = async () => {
        try {
          const webDashboardBackendUrl=process.env.REACT_APP_WEB_DASHBOARD_BACKEND_URL || 'https://smartinventory.zendensolutions.store/';
          const res = await fetch(`${webDashboardBackendUrl}/api/nfc/transactions?limit=50`);
          const json = await res.json();
          if (json && json.success) {
            setTransactions(json.data || []);
          }
        } catch (e) {
          console.warn('Failed to fetch NFC transactions from backend', e);
        }
      };

      fetchNfc();
    }, []);

    // WebSocket listener to receive normalized NFC transactions from backend
    useEffect(() => {
      let ws;
      try {
        const wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + (window.location.hostname || 'localhost') + ':3001/';
        ws = new WebSocket(wsUrl);

        ws.addEventListener('open', () => {
          console.log('WebSocket connected to backend for NFC updates');
        });

        ws.addEventListener('message', (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            if (payload && payload.type === 'nfc' && payload.data) {
              setTransactions(prev => [payload.data, ...prev].slice(0, 50));
            }
            // Optionally handle other types
          } catch (e) {
            // ignore parse errors
          }
        });

        ws.addEventListener('close', () => {
          console.log('WebSocket closed');
        });
      } catch (e) {
        console.warn('Failed to connect WebSocket for NFC updates', e);
      }

      return () => {
        try { if (ws) ws.close(); } catch (e) {}
      };
    }, []);

  const getStatusIcon = () => {
    switch (data.status) {
      case 'loading':
      case 'load':
        return <TrendingUp className="w-6 h-6 text-green-500" />;
      case 'unloading':
      case 'unload':
        return <TrendingDown className="w-6 h-6 text-red-500" />;
      default:
        return <Minus className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (data.status) {
      case 'loading':
      case 'load':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'unloading':
      case 'unload':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'reconnecting':
        return <Activity className="w-5 h-5 text-yellow-500 animate-pulse" />;
      default:
        return <WifiOff className="w-5 h-5 text-red-500" />;
    }
  };

  const formatTime = (date) => {
    if (!date) return 'Never';
    // Show full date + time in the same locale format as transaction times
    return date.toLocaleString();
  };

  // Robust transaction time formatter. Accepts ISO string (receivedAt), numeric timestamp, or tx.timestamp
  const formatTxTime = (tx) => {
    if (!tx) return '—';
    // Prefer ISO receivedAt
    if (tx.receivedAt) {
      const d = new Date(tx.receivedAt);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    }

    // Then prefer originalTimestamp (MCU-provided) if present
    if (tx.originalTimestamp) {
      const t0 = Number(tx.originalTimestamp);
      const d0 = new Date(t0);
      if (!isNaN(d0.getTime())) return d0.toLocaleString();
    }

    // Then prefer timestamp which may be ms since epoch (server normalized)
    if (tx.timestamp) {
      const t = Number(tx.timestamp);
      const d2 = new Date(t);
      if (!isNaN(d2.getTime())) return d2.toLocaleString();
    }

    // As a last resort use now
    return new Date().toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        {/* (Top NFC panels removed) */}

        {/* Connection Info Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Scale className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Real-time Inventory</h1>
                <p className="text-gray-600">Live scale readings, vehicle identification and load/unload transactions</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {getConnectionIcon()}
                <span className="text-sm font-medium capitalize text-gray-700">
                  {connectionStatus}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Last update: {formatTime(lastUpdate)}
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Weight Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Scale className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Weight</h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gray-900">
                {data.weight_g} <span className="text-lg text-gray-500">g</span>
              </div>
              <div className="text-lg text-gray-600">
                {data.weight_oz} <span className="text-sm">oz</span>
              </div>
            </div>
          </div>

          {/* Bottles Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Package className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Bottles</h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gray-900">{data.bottles}</div>
              <div className="text-sm text-gray-500">Estimated (275g / bottle)</div>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <h3 className="text-lg font-semibold text-gray-900">Status</h3>
              </div>
            </div>
            <div className="space-y-2">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor()}`}>
                {data.status.toUpperCase()}
              </div>
              <div className="text-sm text-gray-500">
                {(data.status === 'loading' || data.status === 'load') && 'Bottles being removed from scale'}
                {(data.status === 'unloading' || data.status === 'unload') && 'Bottles being added to scale'}
                {data.status === 'idle' && 'No change detected'}
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle details & Transactions (under main stats) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-1 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Vehicle Details</h3>
            <div className="text-sm text-gray-600 mb-4">Last identified vehicle and quick actions</div>
            <div className="flex items-center space-x-4">
              <div className={`h-16 w-16 rounded-md flex items-center justify-center text-white font-mono bg-blue-600 text-lg`}>{nfcVehicle ? nfcVehicle.substring(0,6) : '--'}</div>
              <div>
                <div className="text-sm font-medium text-gray-900">{nfcVehicle || 'No vehicle detected'}</div>
                <div className="text-xs text-gray-500 mt-1">Tap a vehicle NFC card on the scale to begin a transaction.</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Load / Unload Transactions</h3>
            <div className="text-sm text-gray-600 mb-4">Recent completed transactions from vehicles</div>
            <div className="overflow-auto max-h-48">
              {transactions.length === 0 ? (
                <div className="text-sm text-gray-500">No transactions recorded yet</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase">
                      <th className="py-2">Time</th>
                      <th className="py-2">Vehicle</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Bottles</th>
                      <th className="py-2">Total on scale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-2 text-gray-700">{formatTxTime(tx)}</td>
                        <td className="py-2 font-mono text-gray-800">{tx.vehicle_id}</td>
                        <td className={`py-2 font-medium ${tx.transaction_type === 'LOAD' ? 'text-green-700' : 'text-red-700'}`}>{tx.transaction_type}</td>
                        <td className="py-2 text-gray-800">{tx.bottle_count}</td>
                        <td className="py-2 text-gray-600">{tx.total_bottles ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <p className="text-sm text-gray-600">Last 20 measurements</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight (g)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight (oz)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bottles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No data received yet
                    </td>
                  </tr>
                ) : (
                  history.map((entry, index) => (
                    <tr key={index} className={index === 0 ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.weight_g}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entry.weight_oz}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.bottles}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (entry.status === 'loading' || entry.status === 'load') ? 'bg-green-100 text-green-800' :
                          (entry.status === 'unloading' || entry.status === 'unload') ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Connection Info Footer */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <strong>MQTT Broker:</strong> {mqttConfig.host}:{mqttConfig.port}
            </div>
            <div>
              <strong>Topics:</strong> bottle-scale/*
            </div>
            <div>
              <strong>Protocol:</strong> WebSocket
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottleDashboardPage;