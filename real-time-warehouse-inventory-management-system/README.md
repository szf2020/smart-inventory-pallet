# Real-time Warehouse Inventory System with NFC Vehicle Identification

## Overview
An advanced IoT-based warehouse inventory management system that uses load cells for real-time bottle counting and NFC technology for vehicle identification and transaction tracking. The system provides automated inventory updates with complete audit trails for loading and unloading operations.

## Features

### Core Functionality
- **Real-time Weight Monitoring**: HX711 load cell for precise weight measurements
- **Automatic Bottle Counting**: Calculates bottle count based on individual bottle weight (275g)
- **OLED Display**: Real-time display of weight, bottle count, and system status
- **WiFi Connectivity**: Wireless data transmission via WiFiManager
- **MQTT Integration**: Real-time data publishing to MQTT broker

### NFC Vehicle Identification System
- **Vehicle Authentication**: Each vehicle has a unique NFC card/tag
- **Load Transaction Tracking**: Single tap to start, single tap to complete loading
- **Unload Transaction Tracking**: Double tap to start, single tap to complete unloading
- **Visual Feedback**: LED indicators for transaction status
  - 🟡 **Yellow LED**: Load transaction ready
  - 🔴 **Red LED**: Unload transaction ready  
  - 🟢 **Green LED**: Transaction completed successfully
- **Automatic Calculation**: System calculates loaded/unloaded bottle quantities
- **Transaction Logging**: Complete audit trail with timestamps and vehicle IDs

### Web Dashboard
- Real-time inventory monitoring
- Transaction history and analytics
- Vehicle activity tracking
- Responsive design for mobile and desktop

## Hardware Components

### Required Components
1. **ESP32 WROOM DevKit** - Main microcontroller
2. **HX711 Load Cell Amplifier** - Weight sensing
3. **Load Cell** - Physical weight measurement
4. **OLED Display (128x64, I2C)** - Real-time status display
5. **PN532 NFC Module** - Vehicle identification
6. **Status LEDs** (Red, Green, Yellow) - Visual feedback
7. **NFC Cards/Tags** - Vehicle identification cards
8. **220Ω Resistors** - LED current limiting
9. **Breadboard and Jumper Wires** - Connections

### Pin Configuration
```
HX711:     DT→GPIO5, SCK→GPIO18
OLED:      SDA→GPIO21, SCL→GPIO22  
PN532:     SCK→GPIO14, MOSI→GPIO13, SS→GPIO15, MISO→GPIO12
LEDs:      Red→GPIO25, Green→GPIO26, Yellow→GPIO27
Power:     All components → 3.3V, GND
```

## Software Architecture

### ESP32 Firmware
- **Platform**: PlatformIO with ESP32 Arduino Framework
- **Real-time Processing**: Non-blocking architecture for simultaneous operations
- **Error Handling**: Comprehensive error recovery and failsafe mechanisms
- **Calibration**: Automatic calibration storage in flash memory
- **State Management**: Robust state machine for NFC transactions

### Communication Protocols
- **WiFi**: 802.11 b/g/n for wireless connectivity
- **MQTT**: Lightweight messaging for real-time data
- **SPI**: High-speed communication with NFC module
- **I2C**: Display and sensor communication

### MQTT Topics
```
bottle-scale/weight              # Current weight (grams)
bottle-scale/bottles             # Current bottle count
bottle-scale/status              # System status
bottle-scale/data               # Complete JSON data
bottle-scale/nfc/vehicle-id     # Current vehicle ID
bottle-scale/nfc/transaction    # Transaction details
bottle-scale/nfc/status         # NFC transaction status
```

## Installation & Setup

### 1. Hardware Assembly
Follow the detailed wiring guide in `NFC_WIRING_GUIDE.md` and circuit diagram in `CIRCUIT_DIAGRAM.md`.

### 2. Firmware Installation
```bash
# Clone the repository
git clone <repository-url>
cd real-time-warehouse-inventory

# Install PlatformIO CLI (if not already installed)
pip install platformio

# Build and upload firmware
pio run --target upload

# Monitor serial output
pio device monitor
```

### 3. System Calibration
1. Power on the system
2. Remove all objects from the scale
3. Send 'P' via serial monitor to prepare calibration
4. Place 172g calibration weight
5. Send 'C' to complete calibration
6. System will automatically save calibration to flash memory

### 4. NFC Card Registration
1. Power on the calibrated system
2. Tap each vehicle's NFC card to register unique IDs
3. Note the vehicle IDs displayed for record keeping

### 5. Web Dashboard Setup
```bash
# Navigate to web dashboard
cd web-dashboard

# Install dependencies
npm install

# Start development server
npm start
```

### 6. Backend Setup
```bash
# Navigate to backend
cd web-dashboard-backend

# Install dependencies
npm install

# Start backend server
node server.js
```

## Operation Guide

### Loading Operation (Warehouse → Vehicle)
1. **Initiate**: Driver taps NFC card once
2. **Ready**: Yellow LED turns ON, system ready for loading
3. **Load**: Driver loads bottles from warehouse to vehicle
4. **Complete**: Driver taps NFC card again
5. **Success**: Green LED confirms transaction
6. **Record**: System logs: `loaded_bottles = previous_count - current_count`

### Unloading Operation (Vehicle → Warehouse)  
1. **Initiate**: Driver double-taps NFC card within 3 seconds
2. **Ready**: Red LED turns ON, system ready for unloading
3. **Unload**: Driver unloads bottles from vehicle to warehouse
4. **Complete**: Driver taps NFC card once
5. **Success**: Green LED confirms transaction
6. **Record**: System logs: `unloaded_bottles = current_count - previous_count`

## System Specifications

### Performance
- **Weight Accuracy**: ±1g (with proper calibration)
- **Bottle Detection**: Automatic count based on 275g per bottle
- **NFC Range**: 3-5cm detection range
- **Response Time**: <1 second for all operations
- **Data Update Rate**: 3-second intervals for MQTT publishing

### Power Requirements
- **Voltage**: 3.3V DC (regulated)
- **Current**: ~450mA peak (during NFC scanning)
- **Recommended PSU**: 5V 1A with 3.3V regulation

### Environmental
- **Operating Temperature**: -10°C to +60°C
- **Humidity**: 10-90% RH (non-condensing)
- **Protection**: IP20 (enclosure dependent)

## Troubleshooting

### Common Issues
1. **NFC Not Detecting**: Check SPI connections and power supply
2. **Weight Fluctuations**: Recalibrate system, check load cell mounting
3. **WiFi Connection**: Reset WiFiManager settings, check network
4. **MQTT Disconnections**: Verify broker settings and network stability

### Error Codes
- **HX711 Error**: Load cell communication failure
- **NFC Timeout**: Card detection timeout
- **Calibration Failed**: Invalid calibration weight or process

### Diagnostic Commands
```
Serial Monitor Commands:
'P' - Prepare for calibration
'C' - Start calibration process
```

## Future Enhancements

### Planned Features
- [ ] Multiple scale support for different bottle types
- [ ] Advanced analytics and reporting
- [ ] Mobile app for drivers
- [ ] Barcode scanning integration
- [ ] GPS tracking for delivery routes
- [ ] Temperature monitoring for cold chain
- [ ] Integration with ERP systems

### API Extensions
- [ ] RESTful API for third-party integration
- [ ] Webhook support for external notifications
- [ ] Real-time websocket connections
- [ ] Historical data export capabilities

## Technical Support

### Documentation
- Hardware setup: `NFC_WIRING_GUIDE.md`
- Circuit diagrams: `CIRCUIT_DIAGRAM.md`
- API documentation: `API_REFERENCE.md` (coming soon)

### Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## License
This project is licensed under the MIT License - see the `LICENSE` file for details.

## Authors
- **Project Team** - *Initial work and NFC integration*

## Acknowledgments
- Adafruit for excellent NFC and sensor libraries
- PlatformIO community for embedded development tools
- MQTT community for lightweight messaging protocol