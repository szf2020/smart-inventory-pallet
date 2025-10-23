/*
 * HX711 Load Cell with OLED Display and Bottle Counter
 * Converted for PlatformIO with ESP32 WROOM DevKit
 * Fixed WiFi/MQTT interference issues
 * Added status tracking for loading/unloading bottles
 * 
 * Features:
 * - Load cell calibration with 172g weight
 * - OLED display showing weight and bottle count
 * - Bottle count = round(total_weight / 275g)
 * - Calibration factor stored in flash memory
 * - WiFi and MQTT connectivity with proper timing
 * - Status tracking: "loading" when bottles decrease, "unloading" when bottles increase
 * 
 * Hardware Connections:
 * HX711 VCC -> ESP32 3.3V
 * HX711 GND -> ESP32 GND  
 * HX711 DT  -> ESP32 GPIO 5
 * HX711 SCK -> ESP32 GPIO 18
 * 
 * OLED Display (I2C):
 * OLED VCC -> ESP32 3.3V
 * OLED GND -> ESP32 GND
 * OLED SCL -> ESP32 GPIO 22 (SCL)
 * OLED SDA -> ESP32 GPIO 21 (SDA)
 */

#include <Arduino.h>
#include "HX711.h"
#include <Preferences.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <Adafruit_PN532.h>
#include <SPI.h>

// HX711 Pin Configuration
#define LOADCELL_DOUT_PIN 5
#define LOADCELL_SCK_PIN  18

// OLED Display Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define SCREEN_ADDRESS 0x3C

// NFC PN532 Pin Configuration (SPI)
#define PN532_SCK  (14)
#define PN532_MOSI (13)
#define PN532_SS   (15)
#define PN532_MISO (12)

// LED Pin Configuration
#define LED_RED_PIN    25
#define LED_GREEN_PIN  26
#define LED_YELLOW_PIN 27

// Calibration weight configuration
#define weight_of_object_for_calibration 172
#define BOTTLE_WEIGHT 275

// NFC Configuration
#define NFC_TIMEOUT 1000  // 1 second timeout for NFC operations
#define DOUBLE_TAP_WINDOW 3000  // 3 seconds window for double tap detection

// MQTT Topics
const char* mqtt_client_id = "BottleScale_"; // Will append unique ID
const char* mqtt_topic_weight = "bottle-scale/weight";
const char* mqtt_topic_bottles = "bottle-scale/bottles";
const char* mqtt_topic_status = "bottle-scale/status";
const char* mqtt_topic_data = "bottle-scale/data";
const char* mqtt_topic_nfc_vehicle = "bottle-scale/nfc/vehicle-id";
const char* mqtt_topic_nfc_transaction = "bottle-scale/nfc/transaction";
const char* mqtt_topic_nfc_status = "bottle-scale/nfc/status";

// Variables for sensor readings and calibration
long sensor_Reading_Results; 
float CALIBRATION_FACTOR;
bool show_Weighing_Results = false;
bool calibration_completed = false;
int weight_In_g;
float weight_In_oz;
int bottle_count;

// Status tracking variables
int previous_bottle_count = 0;
String current_status = "idle";
bool status_changed = false;

// NFC Transaction States
enum NFCTransactionState {
  NFC_IDLE,
  NFC_LOAD_READY,
  NFC_LOAD_COMPLETE,
  NFC_UNLOAD_READY,
  NFC_UNLOAD_COMPLETE
};

// NFC Variables
NFCTransactionState nfc_state = NFC_IDLE;
String current_vehicle_id = "";
unsigned long last_nfc_tap_time = 0;
unsigned long transaction_start_time = 0;
int transaction_start_bottles = 0;
bool waiting_for_double_tap = false;
unsigned long double_tap_start_time = 0;

// Initialize libraries
HX711 LOADCELL_HX711;
Preferences preferences;
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);

// MQTT Configuration - Fixed initialization
WiFiClient espClient;
PubSubClient mqttClient(espClient);  // Pass WiFi client to MQTT

// Timing variables
unsigned long lastDisplayUpdate = 0;
unsigned long lastMQTTCheck = 0;
unsigned long lastMQTTPublish = 0;
unsigned long lastHX711Reading = 0;
const unsigned long displayUpdateInterval = 1000;   // Slower display updates
const unsigned long mqttCheckInterval = 10000;      // Check MQTT less frequently (10 seconds)
const unsigned long mqttPublishInterval = 3000;     // Publish every 3 seconds
const unsigned long hx711ReadingInterval = 800;     // HX711 reading interval

// HX711 error handling
static int consecutive_failures = 0;
const int MAX_CONSECUTIVE_FAILURES = 3;  // Reduced threshold

// HX711 timing protection
bool hx711_busy = false;

// Function declarations
void setupMQTT();
void connectToBroker();
void setupWiFi();
void receviveCallback(char* topic, byte* payload, unsigned int length);
void updateStatus(int current_bottles);
void publishMQTTData();

// NFC Function declarations
void initializeNFC();
void setLED(bool red, bool green, bool yellow);
void clearAllLEDs();
String readNFCCard();
void processNFCTransaction(String vehicle_id);
void handleNFCDoubleTap(String vehicle_id);
void publishNFCTransaction(String vehicle_id, String transaction_type, int bottle_difference);
void displayNFCStatus();

// LED Control Functions
void setLED(bool red, bool green, bool yellow) {
  digitalWrite(LED_RED_PIN, red ? HIGH : LOW);
  digitalWrite(LED_GREEN_PIN, green ? HIGH : LOW);
  digitalWrite(LED_YELLOW_PIN, yellow ? HIGH : LOW);
}

void clearAllLEDs() {
  setLED(false, false, false);
}

// NFC Functions
void initializeNFC() {
  Serial.println("Initializing NFC PN532...");
  Serial.println("Please check PN532_TROUBLESHOOTING.md if this fails");
  
  // Give module time to power up
  delay(1000);
  
  nfc.begin();
  delay(500);
  
  // Try multiple times with different approaches
  bool nfc_found = false;
  
  for (int attempts = 0; attempts < 3; attempts++) {
    Serial.print("NFC initialization attempt ");
    Serial.print(attempts + 1);
    Serial.println("/3...");
    
    uint32_t versiondata = nfc.getFirmwareVersion();
    if (versiondata) {
      Serial.println("✅ SUCCESS: PN532 found!");
      Serial.print("Chip: PN5"); Serial.println((versiondata>>24) & 0xFF, HEX); 
      Serial.print("Firmware version: "); Serial.print((versiondata>>16) & 0xFF, DEC); 
      Serial.print('.'); Serial.println((versiondata>>8) & 0xFF, DEC);
      
      // Configure board to read RFID tags
      nfc.SAMConfig();
      Serial.println("NFC PN532 initialized successfully");
      nfc_found = true;
      break;
    }
    
    Serial.println("❌ PN532 not found, retrying...");
    
    // Power cycle attempt
    if (attempts == 1) {
      Serial.println("Trying power cycle...");
      delay(2000);
      nfc.begin();
      delay(1000);
    }
    
    delay(1000);
  }
  
  if (!nfc_found) {
    Serial.println("❌ CRITICAL: PN532 not found after 3 attempts!");
    Serial.println("");
    Serial.println("TROUBLESHOOTING STEPS:");
    Serial.println("1. Check power: PN532 VCC → ESP32 3.3V (NOT 5V!)");
    Serial.println("2. Check SPI wiring:");
    Serial.println("   PN532 SCK  → ESP32 GPIO 14");
    Serial.println("   PN532 MOSI → ESP32 GPIO 13");
    Serial.println("   PN532 SS   → ESP32 GPIO 15");  
    Serial.println("   PN532 MISO → ESP32 GPIO 12");
    Serial.println("3. Check DIP switches: [OFF][ON] for SPI mode");
    Serial.println("4. Verify all connections are secure");
    Serial.println("5. Try external 3.3V power supply");
    Serial.println("6. See PN532_TROUBLESHOOTING.md for detailed guide");
    Serial.println("");
    Serial.println("⚠️  NFC features will be disabled!");
    Serial.println("⚠️  Scale will continue working without NFC");
    
    // Flash red LED to indicate NFC error (if LEDs are connected)
    for (int i = 0; i < 5; i++) {
      digitalWrite(LED_RED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_RED_PIN, LOW);
      delay(200);
    }
  }
}

String readNFCCard() {
  // Check if PN532 is available first
  static bool nfc_available = true;
  static unsigned long last_check = 0;
  
  // Check PN532 availability every 30 seconds if it was previously unavailable
  if (!nfc_available && (millis() - last_check > 30000)) {
    uint32_t versiondata = nfc.getFirmwareVersion();
    if (versiondata) {
      Serial.println("PN532 reconnected!");
      nfc_available = true;
    }
    last_check = millis();
  }
  
  if (!nfc_available) {
    return "";
  }
  
  uint8_t success;
  uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };
  uint8_t uidLength;
  
  success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, NFC_TIMEOUT);
  
  if (success) {
    String vehicle_id = "";
    for (uint8_t i = 0; i < uidLength; i++) {
      if (uid[i] < 0x10) vehicle_id += "0";
      vehicle_id += String(uid[i], HEX);
    }
    vehicle_id.toUpperCase();
    return vehicle_id;
  } else {
    // Check if PN532 is still responding
    static unsigned long last_health_check = 0;
    if (millis() - last_health_check > 10000) { // Check every 10 seconds
      uint32_t versiondata = nfc.getFirmwareVersion();
      if (!versiondata) {
        Serial.println("PN532 communication lost!");
        nfc_available = false;
      }
      last_health_check = millis();
    }
  }
  
  return "";
}

void processNFCTransaction(String vehicle_id) {
  unsigned long current_time = millis();
  
  switch (nfc_state) {
    case NFC_IDLE:
      // First tap - initiate loading transaction
      nfc_state = NFC_LOAD_READY;
      current_vehicle_id = vehicle_id;
      transaction_start_time = current_time;
      transaction_start_bottles = bottle_count;
      setLED(false, false, true); // Yellow LED on
      
      Serial.println("LOAD TRANSACTION STARTED");
      Serial.println("Vehicle ID: " + vehicle_id);
      Serial.println("Ready to load bottles...");
      
      // Check for double tap window
      if (current_time - last_nfc_tap_time < DOUBLE_TAP_WINDOW) {
        handleNFCDoubleTap(vehicle_id);
        return;
      }
      break;
      
    case NFC_LOAD_READY:
      if (vehicle_id == current_vehicle_id) {
        // Second tap - complete loading transaction
        nfc_state = NFC_LOAD_COMPLETE;
        int bottle_difference = transaction_start_bottles - bottle_count;
        
        setLED(false, true, false); // Green LED on
        Serial.println("LOAD TRANSACTION COMPLETED");
        Serial.println("Bottles loaded: " + String(bottle_difference));
        
        publishNFCTransaction(vehicle_id, "LOAD", bottle_difference);
        
        // Reset after 3 seconds
        delay(3000);
        nfc_state = NFC_IDLE;
        current_vehicle_id = "";
        clearAllLEDs();
      }
      break;
      
    case NFC_UNLOAD_READY:
      if (vehicle_id == current_vehicle_id) {
        // Complete unloading transaction
        nfc_state = NFC_UNLOAD_COMPLETE;
        int bottle_difference = bottle_count - transaction_start_bottles;
        
        setLED(false, true, false); // Green LED on
        Serial.println("UNLOAD TRANSACTION COMPLETED");
        Serial.println("Bottles unloaded: " + String(bottle_difference));
        
        publishNFCTransaction(vehicle_id, "UNLOAD", bottle_difference);
        
        // Reset after 3 seconds
        delay(3000);
        nfc_state = NFC_IDLE;
        current_vehicle_id = "";
        clearAllLEDs();
      }
      break;
      
    default:
      break;
  }
  
  last_nfc_tap_time = current_time;
}

void handleNFCDoubleTap(String vehicle_id) {
  // Double tap detected - initiate unloading transaction
  nfc_state = NFC_UNLOAD_READY;
  current_vehicle_id = vehicle_id;
  transaction_start_time = millis();
  transaction_start_bottles = bottle_count;
  setLED(true, false, false); // Red LED on
  
  Serial.println("UNLOAD TRANSACTION STARTED");
  Serial.println("Vehicle ID: " + vehicle_id);
  Serial.println("Ready to unload bottles...");
}

void publishNFCTransaction(String vehicle_id, String transaction_type, int bottle_difference) {
  if (!mqttClient.connected() || WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  // Publish vehicle ID
  mqttClient.publish(mqtt_topic_nfc_vehicle, vehicle_id.c_str());
  
  // Publish NFC status
  String nfc_status = transaction_type + "_COMPLETE";
  mqttClient.publish(mqtt_topic_nfc_status, nfc_status.c_str());
  
  // Create detailed transaction JSON
  String transaction_json = "{\"vehicle_id\":\"" + vehicle_id + 
                           "\",\"transaction_type\":\"" + transaction_type + 
                           "\",\"bottle_count\":" + String(bottle_difference) + 
                           ",\"total_bottles\":" + String(bottle_count) + 
                           ",\"timestamp\":" + String(millis()) + "}";
  
  mqttClient.publish(mqtt_topic_nfc_transaction, transaction_json.c_str());
  
  Serial.println("NFC Transaction published to MQTT");
}

void updateStatus(int current_bottles) {
  String new_status = "idle";
  
  if (current_bottles > previous_bottle_count) {
    new_status = "unloading";  // Bottles increased = unloading to scale
  } else if (current_bottles < previous_bottle_count) {
    new_status = "loading";    // Bottles decreased = loading from scale
  } else {
    new_status = "idle";       // No change
  }
  
  if (new_status != current_status) {
    current_status = new_status;
    status_changed = true;
    Serial.print("Status changed to: ");
    Serial.println(current_status);
  }
  
  previous_bottle_count = current_bottles;
}

void publishMQTTData() {
  if (!mqttClient.connected() || WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  // Create JSON payload for bottle-scale/data topic
  String nfc_state_str = "";
  switch(nfc_state) {
    case NFC_IDLE: nfc_state_str = "idle"; break;
    case NFC_LOAD_READY: nfc_state_str = "load_ready"; break;
    case NFC_LOAD_COMPLETE: nfc_state_str = "load_complete"; break;
    case NFC_UNLOAD_READY: nfc_state_str = "unload_ready"; break;
    case NFC_UNLOAD_COMPLETE: nfc_state_str = "unload_complete"; break;
  }
  
  String json_payload = "{\"weight_g\":" + String(weight_In_g) + 
                       ",\"weight_oz\":" + String(weight_In_oz, 2) + 
                       ",\"bottles\":" + String(bottle_count) + 
                       ",\"status\":\"" + current_status + "\"" +
                       ",\"nfc_state\":\"" + nfc_state_str + "\"" +
                       ",\"vehicle_id\":\"" + current_vehicle_id + "\"" +
                       ",\"timestamp\":" + String(millis()) + "}";
  
  // Publish individual topics
  mqttClient.publish(mqtt_topic_weight, String(weight_In_g).c_str());
  mqttClient.publish(mqtt_topic_bottles, String(bottle_count).c_str());
  mqttClient.publish(mqtt_topic_status, current_status.c_str());
  
  // Publish JSON data to bottle-scale/data topic
  mqttClient.publish(mqtt_topic_data, json_payload.c_str());
  
  // Keep backward compatibility with weight_count topic (CSV format)
  String csv_payload = String(weight_In_g) + "," + String(weight_In_oz, 2) + "," + String(bottle_count);
  mqttClient.publish("weight_count", csv_payload.c_str());
}

void initializeDisplay() {
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    return;
  }
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(F("HX711 Scale System"));
  display.println(F("Initializing..."));
  display.display();
  delay(2000);
}

void displayWelcomeScreen() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  
  display.setCursor(0, 0);
  display.println(F("=== SMART INVENTORY PALATE ==="));
  display.println();
  display.println(F("Calibration: 172g"));
  display.println(F("Bottle: 275g each"));
  display.println();
  display.println(F("Send 'P' to prepare"));
  display.println(F("Send 'C' to calibrate"));
  
  display.display();
}

void displayCalibrationStatus(String status, int countdown = -1) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  
  display.setCursor(0, 0);
  display.println(F("=== CALIBRATION ==="));
  display.println();
  display.println(status);
  
  if (countdown > 0) {
    display.println();
    display.setTextSize(2);
    display.print(F("     "));
    display.println(countdown);
  }
  
  display.display();
}

void displayWeight() {
  display.clearDisplay();
  
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(F("=== SMART INVENTORY PALATE ==="));
  
  display.setTextSize(1);
  display.setCursor(0, 12);
  display.print(F("Weight: "));
  display.print(weight_In_g);
  display.println(F(" g"));
  
  display.setCursor(0, 22);
  display.print(F("Bottles: "));
  display.println(bottle_count);
  
  display.setCursor(0, 32);
  display.print(F("Status: "));
  display.println(current_status);
  
  // Show NFC information if active
  if (nfc_state != NFC_IDLE) {
    display.setCursor(0, 42);
    display.print(F("NFC: "));
    switch(nfc_state) {
      case NFC_LOAD_READY:
        display.println(F("LOAD READY"));
        break;
      case NFC_UNLOAD_READY:
        display.println(F("UNLOAD READY"));
        break;
      case NFC_LOAD_COMPLETE:
        display.println(F("LOAD DONE"));
        break;
      case NFC_UNLOAD_COMPLETE:
        display.println(F("UNLOAD DONE"));
        break;
      default:
        display.println(F("ACTIVE"));
        break;
    }
    
    if (current_vehicle_id.length() > 0) {
      display.setCursor(0, 52);
      display.print(F("ID: "));
      display.println(current_vehicle_id.substring(0, 8)); // Show first 8 chars
    }
  }
  
  display.display();
}

void displayNFCStatus() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  
  display.setCursor(0, 0);
  display.println(F("=== NFC SYSTEM ==="));
  display.println();
  
  display.print(F("Vehicle: "));
  if (current_vehicle_id.length() > 0) {
    display.println(current_vehicle_id.substring(0, 10));
  } else {
    display.println(F("None"));
  }
  
  display.print(F("State: "));
  switch(nfc_state) {
    case NFC_IDLE:
      display.println(F("IDLE"));
      break;
    case NFC_LOAD_READY:
      display.println(F("LOAD READY"));
      break;
    case NFC_LOAD_COMPLETE:
      display.println(F("LOAD COMPLETE"));
      break;
    case NFC_UNLOAD_READY:
      display.println(F("UNLOAD READY"));
      break;
    case NFC_UNLOAD_COMPLETE:
      display.println(F("UNLOAD COMPLETE"));
      break;
  }
  
  display.println();
  display.print(F("Bottles: "));
  display.println(bottle_count);
  
  display.display();
}

void displayCalibrationComplete(float cal_factor) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  
  display.setCursor(0, 0);
  display.println(F("=== CALIBRATED! ==="));
  display.println();
  display.print(F("Factor: "));
  display.println(cal_factor, 2);
  display.println();
  display.println(F("Scale ready!"));
  display.println(F("Weighing bottles..."));
  
  display.display();
  delay(3000);
}

void setup() {
  Serial.begin(115200);
  Serial.println();
  delay(2000);

  // Initialize I2C for display
  Wire.begin();
  
  // Initialize LED pins
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  clearAllLEDs();
  
  // Initialize display first
  initializeDisplay();

  Serial.println("=== HX711 Bottle Scale System ===");
  Serial.println("Setup...");

  // Initialize Preferences
  preferences.begin("CF", false);
  delay(100);

  Serial.println();
  Serial.println("IMPORTANT: Remove all objects from scale during setup!");
  delay(1000);

  // Initialize HX711 BEFORE WiFi to avoid timing issues
  Serial.println("Initializing HX711...");
  LOADCELL_HX711.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  // Wait for HX711 to stabilize
  delay(2000);  // Increased delay
  
  // Check if HX711 is responding
  bool hx711_ok = false;
  for (int i = 0; i < 20; i++) {  // More attempts
    if (LOADCELL_HX711.is_ready()) {
      hx711_ok = true;
      break;
    }
    delay(100);
  }
  
  if (!hx711_ok) {
    Serial.println("Warning: HX711 not responding initially");
  } else {
    Serial.println("HX711 initialized successfully");
  }

  // Check for stored calibration factor
  float stored_cal_factor = preferences.getFloat("CFVal", 0);
  if (stored_cal_factor != 0) {
    Serial.println("Found stored calibration factor!");
    Serial.printf("Loading calibration factor: %.6f\n", stored_cal_factor);
    LOADCELL_HX711.set_scale(stored_cal_factor);
    LOADCELL_HX711.tare();
    calibration_completed = true;
    show_Weighing_Results = true;
    
    displayCalibrationComplete(stored_cal_factor);
  } else {
    Serial.println("No calibration found - calibration required");
    displayWelcomeScreen();
  }

  // Initialize WiFi AFTER HX711 setup
  Serial.println("Initializing WiFi...");
  setupWiFi();

  // Initialize MQTT AFTER WiFi
  Serial.println("Initializing MQTT...");
  setupMQTT();

  // Initialize NFC AFTER WiFi and MQTT
  Serial.println("Initializing NFC...");
  initializeNFC();

  Serial.println("Setup complete.");

  if (!calibration_completed) {
    Serial.println();
    Serial.println("=== CALIBRATION INSTRUCTIONS ===");
    Serial.println("Commands:");
    Serial.println("   P - Prepare for calibration");
    Serial.println("   C - Start calibration");
    Serial.println();
    Serial.printf("Calibration weight: %d grams\n", weight_of_object_for_calibration);
    Serial.printf("Bottle weight: %d grams each\n", BOTTLE_WEIGHT);
    Serial.println();
    Serial.println("Send 'P' to begin...");
  }
}

void loop() {
  unsigned long currentTime = millis();

  // Handle MQTT with strict timing control - only when HX711 is not busy
  if (!hx711_busy && currentTime - lastMQTTCheck >= mqttCheckInterval) {
    if (!mqttClient.connected()) {
      connectToBroker();
    }
    lastMQTTCheck = currentTime;
  }
  
  // Process MQTT messages quickly - but not during HX711 operations
  if (!hx711_busy) {
    mqttClient.loop();
  }

  // Handle NFC card detection - only when HX711 is not busy and scale is calibrated
  if (!hx711_busy && calibration_completed) {
    String detected_card = readNFCCard();
    if (detected_card.length() > 0) {
      Serial.println("NFC Card detected: " + detected_card);
      processNFCTransaction(detected_card);
      
      // Brief delay to prevent multiple rapid reads of the same card
      delay(500);
    }
  }

  // Handle serial commands
  if(Serial.available()) {
    char inChar = (char)Serial.read();
    Serial.println();
    Serial.print("Received: ");
    Serial.println(inChar);

    // PREPARATION PHASE
    if (inChar == 'P' || inChar == 'p') {
      show_Weighing_Results = false;
      hx711_busy = true;  // Protect HX711 operations
      delay(1000);
      
      // Check HX711 multiple times with longer delays
      bool hx711_ready = false;
      for (int i = 0; i < 20; i++) {
        if (LOADCELL_HX711.is_ready()) {
          hx711_ready = true;
          break;
        }
        delay(200);  // Longer delay between checks
      }
      
      if (hx711_ready) {  
        Serial.println("PREPARATION PHASE");
        Serial.println("Remove all objects from scale!");
        
        displayCalibrationStatus("Remove all objects", 0);
        delay(3000);  // Longer delay for stability
        
        for (byte i = 5; i > 0; i--) {
          Serial.printf("   %d...\n", i);
          displayCalibrationStatus("Preparing...", i);
          delay(1500);  // Longer delays during calibration
        }
        
        LOADCELL_HX711.set_scale(); 
        Serial.println("Setting baseline...");
        displayCalibrationStatus("Setting baseline...");
        delay(2000);  // Extra time for baseline
        
        LOADCELL_HX711.tare();
        Serial.println("Scale zeroed");
        Serial.printf("Place %d gram weight\n", weight_of_object_for_calibration);
        
        displayCalibrationStatus("Place 172g weight");
        delay(3000);
        
        for (byte i = 5; i > 0; i--) {
          Serial.printf("   %d...\n", i);
          displayCalibrationStatus("Wait...", i);
          delay(1500);
        }
        
        Serial.println("Send 'C' to calibrate...");
        displayCalibrationStatus("Send 'C' to start");
      } else {
        Serial.println("HX711 not ready!");
        displayCalibrationStatus("HX711 ERROR!");
      }
      hx711_busy = false;  // Release protection
    }

    // CALIBRATION PHASE
    if (inChar == 'C' || inChar == 'c') {
      hx711_busy = true;  // Protect HX711 operations
      
      // Check HX711 multiple times with longer delays
      bool hx711_ready = false;
      for (int i = 0; i < 20; i++) {
        if (LOADCELL_HX711.is_ready()) {
          hx711_ready = true;
          break;
        }
        delay(200);
      }
      
      if (hx711_ready) {
        Serial.println("CALIBRATION PHASE");
        Serial.println("Taking readings...");
        
        displayCalibrationStatus("Calibrating...");
        
        for (byte i = 0; i < 5; i++) {
          delay(1000);  // Wait before each reading
          sensor_Reading_Results = LOADCELL_HX711.get_units(15);  // More averaging for calibration
          Serial.printf("Reading %d: %ld\n", i+1, sensor_Reading_Results);
          delay(1000);  // Wait after each reading
        }

        CALIBRATION_FACTOR = (float)sensor_Reading_Results / weight_of_object_for_calibration; 

        Serial.println("Saving to flash...");
        preferences.putFloat("CFVal", CALIBRATION_FACTOR); 
        delay(500);

        Serial.println("Loading from flash...");
        float LOAD_CALIBRATION_FACTOR = preferences.getFloat("CFVal", 0);
        LOADCELL_HX711.set_scale(LOAD_CALIBRATION_FACTOR);
        delay(1000);  // Extra time for scale setting

        Serial.printf("CALIBRATION FACTOR: %.6f\n", LOAD_CALIBRATION_FACTOR);

        calibration_completed = true;
        show_Weighing_Results = true;

        Serial.println("CALIBRATION COMPLETE!");
        Serial.println("Ready for bottle counting!");
        
        displayCalibrationComplete(LOAD_CALIBRATION_FACTOR);
      } else {
        Serial.println("HX711 not ready!");
        displayCalibrationStatus("HX711 ERROR!");
      }
      hx711_busy = false;  // Release protection
    }
  }

  // Display weight and bottle count with protected HX711 operations
  if (show_Weighing_Results && calibration_completed && !hx711_busy) {
    if (currentTime - lastHX711Reading >= hx711ReadingInterval) {
      
      hx711_busy = true;  // Protect this operation
      
      // Check if HX711 is ready with patience
      bool hx711_ready = false;
      for (int attempts = 0; attempts < 10; attempts++) {
        if (LOADCELL_HX711.is_ready()) {
          hx711_ready = true;
          break;
        }
        delay(50);  // Short delay between ready checks
      }
      
      if (hx711_ready) {
        // Get weight readings with error handling
        long raw_reading = LOADCELL_HX711.get_units(3);  // Less averaging for faster response
        
        // Only update if reading seems valid (not too far from previous)
        if (abs(raw_reading) < 50000) {  // Reasonable bounds check
          weight_In_g = raw_reading;
          
          if (weight_In_g < 0) weight_In_g = 0;
          
          weight_In_oz = (float)weight_In_g / 28.34952;
          
          bottle_count = round((float)weight_In_g / BOTTLE_WEIGHT);
          if (bottle_count < 0) bottle_count = 0;
          
          // Update status based on bottle count changes
          updateStatus(bottle_count);
          
          // Reset failure counter
          consecutive_failures = 0;
          
          // Update display less frequently to reduce interference
          if (currentTime - lastDisplayUpdate >= displayUpdateInterval) {
            displayWeight();
            lastDisplayUpdate = currentTime;
          }
          
          // MQTT publish with separate timing and connection check
          if (currentTime - lastMQTTPublish >= mqttPublishInterval) {
            Serial.printf("  %dg | %.1foz | %d bottles | %s\n", 
                         weight_In_g, weight_In_oz, bottle_count, current_status.c_str());
            
            // Publish MQTT data
            publishMQTTData();
            
            lastMQTTPublish = currentTime;
          }
        } else {
          Serial.printf("Invalid HX711 reading: %ld\n", raw_reading);
          consecutive_failures++;
        }
        
        lastHX711Reading = currentTime;
      } else {
        consecutive_failures++;
        
        if (consecutive_failures >= MAX_CONSECUTIVE_FAILURES) {
          display.clearDisplay();
          display.setTextSize(1);
          display.setTextColor(SSD1306_WHITE);
          display.setCursor(0, 20);
          display.println("HX711 Communication");
          display.println("Error - Retrying...");
          display.display();
          Serial.println("HX711 communication error - retrying...");
          
          // Try to reinitialize HX711
          delay(500);
          LOADCELL_HX711.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
          delay(500);
          
          consecutive_failures = 0;
        }
      }
      
      hx711_busy = false;  // Release protection
    }
  } else if (!calibration_completed) {
    static unsigned long lastWelcomeUpdate = 0;
    if (millis() - lastWelcomeUpdate >= 5000) {
      displayWelcomeScreen();
      lastWelcomeUpdate = millis();
    }
  }

  // Minimal delay to prevent watchdog issues while allowing quick response
  delay(10);
}

void setupWiFi() {
  // Disable WiFi power saving to avoid timing issues
  WiFi.setSleep(false);
  
  WiFiManager wifiManager;
  
  // Set a shorter timeout to avoid blocking too long
  wifiManager.setConfigPortalTimeout(180); // 3 minutes timeout
  
  bool res = wifiManager.autoConnect("My Esp32", "12345678");
  
  if (!res) {
    Serial.println("Failed to connect to WiFi");
    // Don't restart immediately, allow HX711 to continue working
    Serial.println("Continuing without WiFi...");
  } else {
    Serial.println("Connected to WiFi");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  }
}

void setupMQTT() {
  mqttClient.setServer("broker.hivemq.com", 1883);
  mqttClient.setCallback(receviveCallback);
  
  // Set shorter timeouts to avoid blocking
  mqttClient.setSocketTimeout(5);  // 5 second timeout
}

void connectToBroker() {
  // Only try to connect if WiFi is connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping MQTT");
    return;
  }
  
  // Non-blocking connection attempt with longer intervals
  static unsigned long lastConnectionAttempt = 0;
  unsigned long currentTime = millis();
  
  if (currentTime - lastConnectionAttempt < 15000) {  // Wait 15 seconds between attempts
    return;
  }
  
  lastConnectionAttempt = currentTime;
  
  Serial.println("Connecting to MQTT Broker...");
  
  // Create unique client ID using the defined prefix
  String clientId = String(mqtt_client_id) + String(WiFi.macAddress());
  clientId.replace(":", "");
  
  if (mqttClient.connect(clientId.c_str())) {
    Serial.println("Connected to MQTT Broker");
    mqttClient.subscribe("weight_count");
    mqttClient.subscribe(mqtt_topic_data);
  } else {
    Serial.print("Failed to connect to MQTT, rc=");
    Serial.println(mqttClient.state());
    Serial.println("Will retry in 15 seconds...");
  }
}

void receviveCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  char payloadCharAr[length + 1];
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
    payloadCharAr[i] = (char)payload[i];
  }
  payloadCharAr[length] = '\0';
  Serial.println();
}