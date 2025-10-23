const MQTT_BROKER = 'mqtts://broker.hivemq.com';
const MQTT_PORT = 8883;

const MQTT_TOPICS = [
  'bottle-scale/weight',
  'bottle-scale/bottles',
  'bottle-scale/status',
  'bottle-scale/data',
  'bottle-scale/nfc/vehicle-id',
  'bottle-scale/nfc/transaction'
];

module.exports = {
  MQTT_BROKER,
  MQTT_PORT,
  MQTT_TOPICS,
  CLIENT_ID_PREFIX: 'bottle-scale-server',
  RECONNECT_PERIOD: 1000,
  KEEPALIVE: 60
};