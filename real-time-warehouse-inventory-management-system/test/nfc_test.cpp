/*
 * NFC System Test - Simple NFC Card Detection Test
 * Use this to verify PN532 module is working correctly
 * before integrating with the main system
 */

#include <Arduino.h>
#include <Adafruit_PN532.h>
#include <SPI.h>

// NFC PN532 Pin Configuration (SPI)
#define PN532_SCK  (14)
#define PN532_MOSI (13)
#define PN532_SS   (15)
#define PN532_MISO (12)

// LED Pin Configuration
#define LED_RED_PIN    25
#define LED_GREEN_PIN  26
#define LED_YELLOW_PIN 27

Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);

void setup() {
  Serial.begin(115200);
  Serial.println("NFC PN532 Test Starting...");

  // Initialize LED pins
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  
  // Turn off all LEDs
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_YELLOW_PIN, LOW);

  // Initialize NFC
  nfc.begin();

  uint32_t versiondata = nfc.getFirmwareVersion();
  if (!versiondata) {
    Serial.println("Didn't find PN532 board");
    // Flash red LED to indicate error
    while (1) {
      digitalWrite(LED_RED_PIN, HIGH);
      delay(500);
      digitalWrite(LED_RED_PIN, LOW);
      delay(500);
    }
  }
  
  Serial.print("Found chip PN5"); Serial.println((versiondata>>24) & 0xFF, HEX); 
  Serial.print("Firmware ver. "); Serial.print((versiondata>>16) & 0xFF, DEC); 
  Serial.print('.'); Serial.println((versiondata>>8) & 0xFF, DEC);
  
  // Configure board to read RFID tags
  nfc.SAMConfig();
  
  // Flash green LED to indicate successful initialization
  for(int i = 0; i < 3; i++) {
    digitalWrite(LED_GREEN_PIN, HIGH);
    delay(200);
    digitalWrite(LED_GREEN_PIN, LOW);
    delay(200);
  }
  
  Serial.println("Waiting for an ISO14443A Card...");
  Serial.println("Place NFC card near the reader to test");
}

void loop() {
  uint8_t success;
  uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };
  uint8_t uidLength;
  
  // Wait for an ISO14443A type cards (Mifare, etc.)
  success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 1000);
  
  if (success) {
    // Display some basic information about the card
    Serial.println("Found an ISO14443A card");
    Serial.print("  UID Length: "); Serial.print(uidLength, DEC); Serial.println(" bytes");
    Serial.print("  UID Value: ");
    
    String cardID = "";
    for (uint8_t i = 0; i < uidLength; i++) {
      Serial.print(" 0x"); Serial.print(uid[i], HEX);
      if (uid[i] < 0x10) cardID += "0";
      cardID += String(uid[i], HEX);
    }
    cardID.toUpperCase();
    Serial.println();
    Serial.print("  Card ID String: "); Serial.println(cardID);
    
    // Flash yellow LED to indicate card detected
    digitalWrite(LED_YELLOW_PIN, HIGH);
    delay(1000);
    digitalWrite(LED_YELLOW_PIN, LOW);
    
    Serial.println("Remove card and place again to test...");
    Serial.println();
    
    // Wait for card to be removed
    delay(1000);
  } else {
    // No card detected - this is normal, just continue scanning
    delay(100);
  }
}