/*
 * PN532 I2C Mode Test
 * Use this if SPI mode doesn't work
 * 
 * Wiring for I2C mode:
 * PN532 VCC → ESP32 3.3V
 * PN532 GND → ESP32 GND  
 * PN532 SDA → ESP32 GPIO 21
 * PN532 SCL → ESP32 GPIO 22
 * 
 * DIP Switch Settings for I2C:
 * Switch 1: ON
 * Switch 2: OFF
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_PN532.h>

// I2C mode - uses default I2C pins
Adafruit_PN532 nfc(21, 22);  // SDA, SCL

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("=== PN532 I2C Mode Test ===");
  
  delay(2000);
  
  // Initialize I2C
  Wire.begin();
  
  Serial.println("Initializing PN532 in I2C mode...");
  nfc.begin();
  
  delay(1000);
  
  uint32_t versiondata = nfc.getFirmwareVersion();
  if (!versiondata) {
    Serial.println("❌ FAILED: Didn't find PN532 board in I2C mode");
    Serial.println("\nCheck:");
    Serial.println("1. DIP switches: [ON][OFF] for I2C mode");
    Serial.println("2. I2C wiring:");
    Serial.println("   PN532 SDA → ESP32 GPIO 21");
    Serial.println("   PN532 SCL → ESP32 GPIO 22");
    Serial.println("3. Power connections (3.3V, GND)");
  } else {
    Serial.println("✅ SUCCESS: Found PN532 in I2C mode!");
    Serial.print("Chip: PN5"); Serial.println((versiondata>>24) & 0xFF, HEX); 
    Serial.print("Firmware version: "); Serial.print((versiondata>>16) & 0xFF, DEC); 
    Serial.print('.'); Serial.println((versiondata>>8) & 0xFF, DEC);
    
    nfc.SAMConfig();
    Serial.println("✅ PN532 configured for RFID reading");
    Serial.println("\nPlace an NFC card near the reader...");
  }
}

void loop() {
  uint32_t versiondata = nfc.getFirmwareVersion();
  
  if (versiondata) {
    uint8_t success;
    uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };
    uint8_t uidLength;
    
    success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 1000);
    
    if (success) {
      Serial.println("\n🎉 Card detected in I2C mode!");
      Serial.print("UID: ");
      for (uint8_t i = 0; i < uidLength; i++) {
        if (uid[i] < 0x10) Serial.print("0");
        Serial.print(uid[i], HEX);
        if (i < uidLength - 1) Serial.print(" ");
      }
      Serial.println();
      Serial.println("I2C mode is working! You can use this configuration.");
      delay(2000);
    } else {
      Serial.print(".");
      delay(1000);
    }
  } else {
    Serial.println("PN532 not responding in I2C mode...");
    delay(5000);
  }
}