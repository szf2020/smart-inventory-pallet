module.exports = {
  MQTT_BROKER: 'mqtt://broker.hivemq.com',
  MQTT_PORT: 1883,
  MQTT_WS_PORT: 8000,
  MQTT_TOPICS: [
    'bottle-scale/weight',
    'bottle-scale/bottles', 
    'bottle-scale/status',
    'bottle-scale/data'
  ],
  CLIENT_ID_PREFIX: 'bottle-scale-server',
  RECONNECT_PERIOD: 1000,
  KEEPALIVE: 60
};