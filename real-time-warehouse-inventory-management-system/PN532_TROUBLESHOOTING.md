# PN532 NFC Module Troubleshooting Guide

## Problem: "Didn't find PN532 board" Error

This error indicates that the ESP32 cannot communicate with the PN532 module. Here are the most common causes and solutions:

## 1. Hardware Connection Issues

### Check Power Connections
```
PN532 VCC → ESP32 3.3V (NOT 5V!)
PN532 GND → ESP32 GND
```
⚠️ **Critical**: PN532 requires 3.3V, not 5V! Using 5V can damage the module.

### Verify SPI Connections
```
PN532 SCK  → ESP32 GPIO 14
PN532 MOSI → ESP32 GPIO 13  
PN532 SS   → ESP32 GPIO 15
PN532 MISO → ESP32 GPIO 12
```

### Connection Quality
- Use short, good quality jumper wires
- Ensure all connections are tight and secure
- Check for loose breadboard connections
- Verify no wires are touching each other

## 2. PN532 Module Configuration

### Check DIP Switches (Most Common Issue!)
The PN532 module has DIP switches that must be set correctly for SPI mode:

**For SPI Mode:**
- Switch 1: OFF (or DOWN)
- Switch 2: ON (or UP)

**Common Switch Positions:**
```
[OFF] [ON ]  ← Correct for SPI
[  1 ] [ 2 ]
```

### Module Types
- Some PN532 modules don't have DIP switches (pre-configured for I2C or SPI)
- Check your module documentation to confirm interface type

## 3. Power Supply Issues

### Voltage Stability
- PN532 requires stable 3.3V supply
- ESP32 3.3V pin might not provide enough current
- Try using external 3.3V regulator if available

### Current Requirements
- PN532 can draw up to 150mA during operation
- ESP32 3.3V pin typically provides ~50mA
- This is often the root cause of detection failures

## 4. Alternative Pin Configurations

### Try Different GPIO Pins
```cpp
// Alternative 1: Different SPI pins
#define PN532_SCK  (18)
#define PN532_MOSI (23)
#define PN532_SS   (5)
#define PN532_MISO (19)

// Alternative 2: Use hardware SPI
Adafruit_PN532 nfc(2); // SS pin only, uses hardware SPI
```

### I2C Mode Alternative
If SPI doesn't work, try I2C mode:
```cpp
#include <Wire.h>
Adafruit_PN532 nfc(SDA, SCL);  // I2C mode
```

## 5. Software Solutions

### Add Initialization Delays
```cpp
void initializeNFC() {
  Serial.println("Initializing NFC PN532...");
  
  delay(1000); // Give module time to power up
  nfc.begin();
  delay(500);  // Wait after begin()
  
  // Try multiple times
  for (int attempts = 0; attempts < 5; attempts++) {
    uint32_t versiondata = nfc.getFirmwareVersion();
    if (versiondata) {
      Serial.println("PN532 found!");
      return;
    }
    Serial.print("Attempt "); Serial.print(attempts + 1); Serial.println(" failed, retrying...");
    delay(1000);
  }
  
  Serial.println("Failed to find PN532 after 5 attempts");
}
```

### Power Cycle Test
```cpp
// Try reinitializing if first attempt fails
if (!versiondata) {
  Serial.println("First attempt failed, power cycling...");
  delay(2000);
  nfc.begin();
  delay(1000);
  versiondata = nfc.getFirmwareVersion();
}
```

## 6. Quick Test Steps

### Step 1: Visual Inspection
1. Check all wires are connected
2. Verify DIP switch positions
3. Look for damaged components
4. Ensure module is properly seated

### Step 2: Multimeter Tests
1. Measure 3.3V at PN532 VCC pin
2. Check continuity of all connections
3. Verify no short circuits

### Step 3: Simplified Test Code
Use the test code in `test/nfc_test.cpp` to isolate the issue.

### Step 4: Alternative Configurations
Try different pin assignments and communication modes.

## 7. Common Module Variants

### Red PCB Modules
- Usually have DIP switches
- Often default to I2C mode
- May require external antenna

### Blue PCB Modules  
- May be pre-configured for SPI
- Check silkscreen for interface type
- Some don't have configuration switches

### Breakout Boards
- Check manufacturer specifications
- Some have pull-up resistors that affect operation
- May require specific initialization sequences

## 8. Working Configurations (Tested)

### Configuration 1: Standard SPI
```
PN532 VCC  → ESP32 3.3V
PN532 GND  → ESP32 GND
PN532 SCK  → ESP32 GPIO 14
PN532 MOSI → ESP32 GPIO 13
PN532 SS   → ESP32 GPIO 15
PN532 MISO → ESP32 GPIO 12
DIP Switches: [OFF][ON]
```

### Configuration 2: Hardware SPI
```
PN532 VCC  → ESP32 3.3V  
PN532 GND  → ESP32 GND
PN532 SCK  → ESP32 GPIO 18 (SCK)
PN532 MOSI → ESP32 GPIO 23 (MOSI)
PN532 SS   → ESP32 GPIO 5  (CS)
PN532 MISO → ESP32 GPIO 19 (MISO)
```

### Configuration 3: I2C Mode
```
PN532 VCC → ESP32 3.3V
PN532 GND → ESP32 GND  
PN532 SDA → ESP32 GPIO 21
PN532 SCL → ESP32 GPIO 22
DIP Switches: [ON][OFF]
```

## 9. If Nothing Works

### Hardware Issues
- Module may be damaged
- Try with different ESP32 board
- Test module with Arduino Uno first

### Return/Replace
- Some PN532 modules are defective out of box
- Consider ordering from different supplier
- Try different PN532 board variant

## 10. Success Indicators

When working correctly, you should see:
```
Initializing NFC PN532...
Found chip PN532
Firmware ver. 1.6
NFC PN532 initialized successfully
```

## Next Steps After Success

1. Test card detection with known NFC card
2. Verify LED indicators work
3. Test transaction state machine
4. Integration with main scale system