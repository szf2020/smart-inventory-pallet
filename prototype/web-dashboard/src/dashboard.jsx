import React, { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff, Scale, Package, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// MQTT Web Client (using MQTT.js via CDN)
// Note: In a real application, you'd install mqtt via npm: npm install mqtt
// For this demo, include this script in your HTML: <script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>

const BottleDashboard = () => {
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

  // MQTT Connection Configuration
  const mqttConfig = {
    host: 'broker.hivemq.com',
    port: 8000, // WebSocket port for HiveMQ
    protocol: 'ws'
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
          
          // Subscribe to topics
          const topics = [
            'bottle-scale/data',
            'bottle-scale/weight',
            'bottle-scale/bottles', 
            'bottle-scale/status'
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
              const updateField = topic.split('/')[1];
              
              setData(prev => ({
                ...prev,
                [updateField]: updateField === 'bottles' || updateField === 'weight' 
                  ? parseInt(value) || 0 
                  : value,
                timestamp: now.getTime()
              }));
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
  }, [client, mqttConfig.host, mqttConfig.port, mqttConfig.protocol]);

  const getStatusIcon = () => {
    switch (data.status) {
      case 'load':
        return <TrendingUp className="w-6 h-6 text-green-500" />;
      case 'unload':
        return <TrendingDown className="w-6 h-6 text-red-500" />;
      default:
        return <Minus className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (data.status) {
      case 'load':
        return 'bg-green-100 text-green-800 border-green-200';
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
    return date.toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Scale className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bottle Scale Dashboard</h1>
                <p className="text-gray-600">Real-time monitoring via MQTT</p>
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
              <div className="text-sm text-gray-500">275g per bottle</div>
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
                {data.status === 'load' && 'Bottles being added'}
                {data.status === 'unload' && 'Bottles being removed'}
                {data.status === 'idle' && 'No change detected'}
              </div>
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
                          entry.status === 'load' ? 'bg-green-100 text-green-800' :
                          entry.status === 'unload' ? 'bg-red-100 text-red-800' :
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

export default BottleDashboard;