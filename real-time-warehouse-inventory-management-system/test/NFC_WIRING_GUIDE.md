# Real-time Warehouse Inventory System with NFC Vehicle Identification
## Complete Wiring Guide

### Components Required:
1. ESP32 WROOM DevKit (Main microcontroller)
2. HX711 Load Cell Amplifier
3. Load Cell (for weight measurement)
4. OLED Display (128x64, I2C, SSD1306)
5. PN532 NFC Module (SPI version)
6. 3x LEDs (Red, Green, Yellow) or 1x RGB LED
7. 3x 220Ω Resistors (for LEDs)
8. Breadboard and jumper wires
9. NFC Cards/Tags for vehicle identification

### ESP32 Pin Assignments:

#### HX711 Load Cell Amplifier:
```
HX711 VCC  → ESP32 3.3V
HX711 GND  → ESP32 GND
HX711 DT   → ESP32 GPIO 5
HX711 SCK  → ESP32 GPIO 18
```

#### OLED Display (I2C):
```
OLED VCC → ESP32 3.3V
OLED GND → ESP32 GND
OLED SCL → ESP32 GPIO 22 (SCL)
OLED SDA → ESP32 GPIO 21 (SDA)
```

#### PN532 NFC Module (SPI):
```
PN532 VCC  → ESP32 3.3V
PN532 GND  → ESP32 GND
PN532 SCK  → ESP32 GPIO 14
PN532 MOSI → ESP32 GPIO 13
PN532 SS   → ESP32 GPIO 15
PN532 MISO → ESP32 GPIO 12
```

#### Status LEDs:
```
Red LED    → ESP32 GPIO 25 (through 220Ω resistor)
Green LED  → ESP32 GPIO 26 (through 220Ω resistor)
Yellow LED → ESP32 GPIO 27 (through 220Ω resistor)
LED GND    → ESP32 GND
```

### Detailed Wiring Instructions:

#### Power Distribution:
1. Connect ESP32 VIN to external 5V power supply (if using external power)
2. Connect ESP32 3.3V to a power rail on breadboard
3. Connect ESP32 GND to ground rail on breadboard
4. All VCC connections go to 3.3V rail
5. All GND connections go to ground rail

#### HX711 Load Cell Connection:
1. Connect load cell wires to HX711:
   - Red (E+) and Black (E-) for excitation
   - White (A+) and Green (A-) for signal
2. Mount load cell securely under weighing platform
3. Ensure load cell is properly calibrated (172g calibration weight included in code)

#### OLED Display Connection:
1. Use ESP32's built-in I2C pins (GPIO 21 and 22)
2. No pull-up resistors needed as ESP32 has internal pull-ups
3. Ensure display address is 0x3C (default for most 128x64 OLED displays)

#### PN532 NFC Module Setup:
1. Set PN532 to SPI mode (check module documentation for DIP switch settings)
2. Connect SPI pins as specified above
3. Ensure stable 3.3V power supply to NFC module
4. Keep antenna away from other components to avoid interference

#### LED Status Indicators:
1. Connect LEDs with current limiting resistors (220Ω)
2. LED Functions:
   - **Yellow LED**: Load transaction ready (driver can start loading bottles)
   - **Red LED**: Unload transaction ready (driver can start unloading bottles)
   - **Green LED**: Transaction completed successfully
3. Alternatively, use a single RGB LED for all three colors

### System Operation:

#### NFC Transaction Flow:

**Loading Bottles from Warehouse to Vehicle:**
1. Driver taps NFC card once → Yellow LED turns ON
2. System is ready for loading transaction
3. Driver loads bottles from warehouse to vehicle
4. Driver taps NFC card again → Green LED turns ON
5. System calculates: `loaded_bottles = previous_count - current_count`
6. Transaction record saved with vehicle ID, bottle count, timestamp

**Unloading Bottles from Vehicle to Warehouse:**
1. Driver double-taps NFC card within 3 seconds → Red LED turns ON
2. System is ready for unloading transaction
3. Driver unloads bottles from vehicle to warehouse
4. Driver taps NFC card once → Green LED turns ON
5. System calculates: `unloaded_bottles = current_count - previous_count`
6. Transaction record saved with vehicle ID, bottle count, timestamp

#### MQTT Topics Published:
- `bottle-scale/weight` - Current weight in grams
- `bottle-scale/bottles` - Current bottle count
- `bottle-scale/status` - Scale status (loading/unloading/idle)
- `bottle-scale/data` - Complete JSON data including NFC info
- `bottle-scale/nfc/vehicle-id` - Current vehicle ID
- `bottle-scale/nfc/transaction` - Transaction details (JSON)
- `bottle-scale/nfc/status` - NFC transaction status

### Troubleshooting:

#### Common Issues:
1. **NFC not detecting cards**: Check SPI connections and power supply
2. **LED not working**: Verify resistor values and GPIO connections
3. **HX711 communication errors**: Ensure stable power and proper timing
4. **WiFi interference**: Keep NFC antenna away from WiFi module

#### Tips for Stable Operation:
1. Use good quality power supply (stable 3.3V)
2. Keep wires short for SPI connections
3. Add decoupling capacitors near sensitive components
4. Ensure proper grounding for all components
5. Test each component individually before full integration

### Power Consumption:
- ESP32: ~240mA (active with WiFi)
- HX711: ~10mA
- OLED: ~20mA
- PN532: ~100mA (when scanning)
- LEDs: ~20mA each
- **Total**: ~400-450mA (recommend 1A power supply)

### Enclosure Recommendations:
1. Use weatherproof enclosure for industrial environment
2. Provide ventilation for heat dissipation
3. Mount NFC antenna accessible for card reading
4. Position OLED display for easy viewing
5. LED indicators should be clearly visible
6. Protect load cell from moisture and debris

### Software Features:
- Automatic calibration storage in flash memory
- WiFi configuration via WifiManager
- MQTT connectivity with automatic reconnection
- Real-time weight monitoring and bottle counting
- NFC vehicle identification with transaction logging
- Visual feedback through LEDs and OLED display
- Error handling and recovery mechanisms