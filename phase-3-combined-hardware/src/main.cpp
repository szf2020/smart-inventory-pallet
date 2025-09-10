/*
  Smart Inventory Palette - Phase 2
  Dual Load Cell Weight Measurement with MQTT Integration
  Hardware: ESP32 + 2x HX711 + 2x 10kg Load Cells + Built-in OLED Display
  
  Pin Configuration:
  Load Cell 1 (HX711_1):
  - HX711_1 DT  -> ESP32 D4 (GPIO 4)
  - HX711_1 SCK -> ESP32 D5 (GPIO 5)
  - HX711_1 VCC -> ESP32 3V3
  - HX711_1 GND -> ESP32 GND
  
  Load Cell 2 (HX711_2):
  - HX711_2 DT  -> ESP32 D18 (GPIO 18)  
  - HX711_2 SCK -> ESP32 D19 (GPIO 19)
  - HX711_2 VCC -> ESP32 3V3
  - HX711_2 GND -> ESP32 GND
  
  Built-in Display: SDA=GPIO21, SCL=GPIO22
*/

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <HX711.h>

// ============================================================================
// CONFIGURATION
// ============================================================================

// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// MQTT Configuration
const char* MQTT_SERVER = "YOUR_MQTT_BROKER_IP";  // e.g., "192.168.1.100"
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "smart_palette_001";
const char* MQTT_USERNAME = "your_mqtt_username";  // Optional
const char* MQTT_PASSWORD = "your_mqtt_password";  // Optional

// MQTT Topics
const char* TOPIC_WEIGHT = "palette/weight";
const char* TOPIC_BOTTLES = "palette/bottles";
const char* TOPIC_STATUS = "palette/status";
const char* TOPIC_SYSTEM = "palette/system";

// Display Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C
#define DISPLAY_SDA_PIN 21
#define DISPLAY_SCL_PIN 22

// Load Cell Configuration
#define HX711_1_DOUT_PIN 4
#define HX711_1_SCK_PIN 5
#define HX711_2_DOUT_PIN 18
#define HX711_2_SCK_PIN 19

// Measurement Configuration
#define BOTTLE_WEIGHT 0.65          // Weight of one bottle in kg
#define MIN_WEIGHT_THRESHOLD 0.1    // Minimum weight to consider (kg)
#define MAX_WEIGHT 20.0             // Maximum total weight (kg)
#define STABILITY_THRESHOLD 0.05    // Weight stability threshold (kg)
#define FILTER_SAMPLES 10           // Moving average filter samples

// Timing Configuration
#define READING_INTERVAL 100        // Weight reading interval (ms)
#define DISPLAY_INTERVAL 500        // Display update interval (ms)
#define MQTT_INTERVAL 2000          // MQTT publish interval (ms)
#define WIFI_CHECK_INTERVAL 30000   // WiFi connection check interval (ms)

// Calibration Values (Update these after calibration!)
// Load Cell 1
float SCALE_FACTOR_1 = 1.0;
long TARE_OFFSET_1 = 0;

// Load Cell 2  
float SCALE_FACTOR_2 = 1.0;
long TARE_OFFSET_2 = 0;

// ============================================================================
// GLOBAL OBJECTS
// ============================================================================
HX711 scale1, scale2;
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// ============================================================================
// MEASUREMENT VARIABLES
// ============================================================================
float weight1 = 0.0, weight2 = 0.0;
float total_weight = 0.0;
float filtered_weight = 0.0;
int bottle_count = 0;
int previous_bottle_count = 0;
bool is_stable = false;
bool system_ready = false;
bool wifi_connected = false;
bool mqtt_connected = false;

// Timing variables
unsigned long last_reading_time = 0;
unsigned long last_display_time = 0;
unsigned long last_mqtt_time = 0;
unsigned long last_wifi_check = 0;

// Moving average filters
float weight_readings[FILTER_SAMPLES];
int reading_index = 0;

// Status tracking
String system_status = "INITIALIZING";
String last_action = "System started";

// ============================================================================
// FUNCTION DECLARATIONS
// ============================================================================
void initializeHardware();
void initializeDisplay();
void initializeLoadCells();
void initializeWiFi();
void initializeMQTT();
void readWeights();
void updateDisplay();
void publishMQTTData();
void handleMQTTConnection();
void handleWiFiConnection();
void calibrateLoadCells();
void tareLoadCells();
void showRawReadings();
void showSystemInfo();
void printHelp();
bool checkLoadCellConnections();
void handleSerialCommands();
String getSystemStatus();

// ============================================================================
// SETUP FUNCTION
// ============================================================================
void setup() {
    Serial.begin(115200);
    delay(2000);
    
    Serial.println("========================================");
    Serial.println("Smart Inventory Palette v2.0 - Phase 2");
    Serial.println("Dual Load Cell + MQTT Integration");
    Serial.println("========================================");
    Serial.println("Hardware: ESP32 + 2x HX711 + 2x 10kg Load Cells");
    Serial.println("Features: WiFi + MQTT + Real-time Updates");
    Serial.println("========================================");
    
    // Initialize hardware
    initializeHardware();
    
    // Initialize WiFi
    initializeWiFi();
    
    // Initialize MQTT
    initializeMQTT();
    
    // Initialize filter array
    for (int i = 0; i < FILTER_SAMPLES; i++) {
        weight_readings[i] = 0.0;
    }
    
    system_ready = true;
    system_status = "READY";
    last_action = "System ready for operation";
    
    Serial.println("Phase 2 initialization complete!");
    Serial.println("========================================");
    printHelp();
    Serial.println("========================================");
    
    delay(2000);
}

// ============================================================================
// MAIN LOOP
// ============================================================================
void loop() {
    unsigned long current_time = millis();
    
    // Handle serial commands
    if (Serial.available()) {
        handleSerialCommands();
    }
    
    // Handle WiFi connection
    if (current_time - last_wifi_check >= WIFI_CHECK_INTERVAL) {
        handleWiFiConnection();
        last_wifi_check = current_time;
    }
    
    // Handle MQTT connection
    if (wifi_connected) {
        handleMQTTConnection();
        mqttClient.loop();
    }
    
    // Read weights at regular intervals
    if (current_time - last_reading_time >= READING_INTERVAL) {
        readWeights();
        last_reading_time = current_time;
    }
    
    // Update display at regular intervals
    if (current_time - last_display_time >= DISPLAY_INTERVAL) {
        updateDisplay();
        last_display_time = current_time;
    }
    
    // Publish MQTT data at regular intervals
    if (current_time - last_mqtt_time >= MQTT_INTERVAL && mqtt_connected) {
        publishMQTTData();
        last_mqtt_time = current_time;
    }
}

// ============================================================================
// HARDWARE INITIALIZATION
// ============================================================================
void initializeHardware() {
    Serial.println("Initializing hardware components...");
    
    // Initialize I2C for display
    Wire.begin(DISPLAY_SDA_PIN, DISPLAY_SCL_PIN);
    
    // Initialize display
    initializeDisplay();
    
    // Initialize load cells
    initializeLoadCells();
    
    Serial.println("Hardware initialization completed!");
}

void initializeDisplay() {
    Serial.print("Initializing OLED display... ");
    
    if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
        Serial.print("failed at 0x3C, trying 0x3D... ");
        if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3D)) {
            Serial.println("FAILED!");
            Serial.println("ERROR: OLED display not found!");
            while (true) delay(1000);
        } else {
            Serial.println("SUCCESS at 0x3D!");
        }
    } else {
        Serial.println("SUCCESS at 0x3C!");
    }
    
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    
    // Show startup screen
    display.setCursor(0, 0);
    display.println("Smart Palette v2.0");
    display.println("==================");
    display.println("Phase 2: Dual Cells");
    display.println("+ MQTT Integration");
    display.println("");
    display.println("Initializing...");
    display.display();
}

void initializeLoadCells() {
    Serial.println("Initializing dual load cell system...");
    
    // Initialize Load Cell 1
    Serial.print("Load Cell 1 (HX711_1)... ");
    scale1.begin(HX711_1_DOUT_PIN, HX711_1_SCK_PIN);
    if (scale1.is_ready()) {
        scale1.set_scale(SCALE_FACTOR_1);
        scale1.set_offset(TARE_OFFSET_1);
        Serial.println("SUCCESS!");
    } else {
        Serial.println("FAILED!");
        Serial.println("Check Load Cell 1 connections!");
    }
    
    // Initialize Load Cell 2
    Serial.print("Load Cell 2 (HX711_2)... ");
    scale2.begin(HX711_2_DOUT_PIN, HX711_2_SCK_PIN);
    if (scale2.is_ready()) {
        scale2.set_scale(SCALE_FACTOR_2);
        scale2.set_offset(TARE_OFFSET_2);
        Serial.println("SUCCESS!");
    } else {
        Serial.println("FAILED!");
        Serial.println("Check Load Cell 2 connections!");
    }
    
    if (!checkLoadCellConnections()) {
        Serial.println("ERROR: Load cell system not properly connected!");
        Serial.println("Check all HX711 and load cell connections");
        while (true) {
            display.clearDisplay();
            display.setCursor(0, 0);
            display.println("LOAD CELL ERROR!");
            display.println("Check connections:");
            display.println("HX711_1: D4,D5");
            display.println("HX711_2: D18,D19");
            display.display();
            delay(1000);
        }
    }
    
    Serial.println("Dual load cell system ready!");
    display.println("Load cells: OK");
    display.display();
}

void initializeWiFi() {
    Serial.printf("Connecting to WiFi: %s", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        wifi_connected = true;
        Serial.println(" SUCCESS!");
        Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("Signal Strength: %d dBm\n", WiFi.RSSI());
    } else {
        wifi_connected = false;
        Serial.println(" FAILED!");
        Serial.println("Continuing without WiFi...");
    }
}

void initializeMQTT() {
    if (!wifi_connected) {
        Serial.println("Skipping MQTT initialization - no WiFi");
        return;
    }
    
    Serial.printf("Connecting to MQTT broker: %s:%d\n", MQTT_SERVER, MQTT_PORT);
    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    
    // Try to connect
    if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
        mqtt_connected = true;
        Serial.println("MQTT connected successfully!");
        
        // Publish system startup message
        publishSystemMessage("Smart Palette Phase 2 started");
        
    } else {
        mqtt_connected = false;
        Serial.printf("MQTT connection failed! Error code: %d\n", mqttClient.state());
        Serial.println("Continuing without MQTT...");
    }
}

// ============================================================================
// WEIGHT READING AND PROCESSING
// ============================================================================
void readWeights() {
    if (!checkLoadCellConnections()) {
        Serial.println("WARNING: Load cell connection lost!");
        return;
    }
    
    // Read from both load cells
    weight1 = scale1.get_units(1);
    weight2 = scale2.get_units(1);
    
    // Handle negative weights
    if (weight1 < 0) weight1 = 0.0;
    if (weight2 < 0) weight2 = 0.0;
    
    // Calculate total weight
    total_weight = weight1 + weight2;
    
    // Apply moving average filter
    weight_readings[reading_index] = total_weight;
    reading_index = (reading_index + 1) % FILTER_SAMPLES;
    
    // Calculate filtered weight
    float sum = 0.0;
    for (int i = 0; i < FILTER_SAMPLES; i++) {
        sum += weight_readings[i];
    }
    filtered_weight = sum / FILTER_SAMPLES;
    
    // Check stability
    float max_deviation = 0.0;
    for (int i = 0; i < FILTER_SAMPLES; i++) {
        float deviation = abs(weight_readings[i] - filtered_weight);
        if (deviation > max_deviation) {
            max_deviation = deviation;
        }
    }
    is_stable = (max_deviation < STABILITY_THRESHOLD);
    
    // Calculate bottle count
    previous_bottle_count = bottle_count;
    
    if (filtered_weight > MIN_WEIGHT_THRESHOLD) {
        bottle_count = (int)(filtered_weight / BOTTLE_WEIGHT);
    } else {
        bottle_count = 0;
        filtered_weight = 0.0;
    }
    
    // Detect bottle changes
    if (bottle_count != previous_bottle_count && is_stable) {
        int change = bottle_count - previous_bottle_count;
        if (change > 0) {
            last_action = String("Added ") + change + " bottles";
            system_status = "BOTTLES_ADDED";
        } else if (change < 0) {
            last_action = String("Removed ") + abs(change) + " bottles";
            system_status = "BOTTLES_REMOVED";
        }
        
        Serial.printf("Bottle count changed: %d -> %d (%+d)\n", 
                     previous_bottle_count, bottle_count, change);
    } else if (is_stable) {
        system_status = "STABLE";
    } else {
        system_status = "MEASURING";
    }
    
    // Ensure weight doesn't exceed maximum
    if (filtered_weight > MAX_WEIGHT) {
        Serial.println("WARNING: Weight exceeds maximum capacity!");
        filtered_weight = MAX_WEIGHT;
    }
}

// ============================================================================
// DISPLAY UPDATE
// ============================================================================
void updateDisplay() {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    
    // Title bar
    display.setCursor(0, 0);
    display.println("Smart Palette v2.0");
    display.drawLine(0, 10, SCREEN_WIDTH, 10, SSD1306_WHITE);
    
    // Weight display (dual cells)
    display.setCursor(0, 12);
    display.printf("Cell1: %.2fkg Cell2: %.2fkg", weight1, weight2);
    
    // Total weight (large font)
    display.setCursor(0, 22);
    display.print("Total:");
    display.setTextSize(2);
    display.setCursor(50, 22);
    display.printf("%.2f kg", filtered_weight);
    
    // Bottle count
    display.setTextSize(1);
    display.setCursor(0, 40);
    display.printf("Bottles: %d units", bottle_count);
    
    // Connection status
    display.setCursor(0, 50);
    display.print("WiFi:");
    display.print(wifi_connected ? "OK" : "X");
    display.print(" MQTT:");
    display.print(mqtt_connected ? "OK" : "X");
    
    // System status
    display.setCursor(0, 58);
    display.print("Status: ");
    if (system_status == "STABLE") {
        display.print("Ready");
        display.fillCircle(120, 61, 2, SSD1306_WHITE);
    } else if (system_status == "BOTTLES_ADDED") {
        display.print("Added");
        display.fillCircle(120, 61, 2, SSD1306_WHITE);
    } else if (system_status == "BOTTLES_REMOVED") {
        display.print("Removed");
        display.drawCircle(120, 61, 2, SSD1306_WHITE);
    } else {
        display.print("Measure");
        display.drawPixel(120, 61, SSD1306_WHITE);
    }
    
    display.display();
}

// ============================================================================
// MQTT FUNCTIONS
// ============================================================================
void publishMQTTData() {
    if (!mqtt_connected) return;
    
    // Create JSON payload
    StaticJsonDocument<300> doc;
    doc["timestamp"] = millis();
    doc["weight_total"] = filtered_weight;
    doc["weight_cell1"] = weight1;
    doc["weight_cell2"] = weight2;
    doc["bottle_count"] = bottle_count;
    doc["is_stable"] = is_stable;
    doc["status"] = system_status;
    doc["last_action"] = last_action;
    
    char buffer[300];
    serializeJson(doc, buffer);
    
    // Publish to different topics
    mqttClient.publish(TOPIC_WEIGHT, String(filtered_weight, 3).c_str(), true);
    mqttClient.publish(TOPIC_BOTTLES, String(bottle_count).c_str(), true);
    mqttClient.publish(TOPIC_STATUS, buffer, true);
    
    Serial.printf("MQTT Published - Weight: %.3f kg, Bottles: %d, Status: %s\n", 
                 filtered_weight, bottle_count, system_status.c_str());
}

void publishSystemMessage(String message) {
    if (!mqtt_connected) return;
    
    StaticJsonDocument<200> doc;
    doc["timestamp"] = millis();
    doc["message"] = message;
    doc["uptime"] = millis() / 1000;
    doc["free_heap"] = ESP.getFreeHeap();
    
    char buffer[200];
    serializeJson(doc, buffer);
    
    mqttClient.publish(TOPIC_SYSTEM, buffer);
    Serial.printf("System message published: %s\n", message.c_str());
}

void handleMQTTConnection() {
    if (!wifi_connected) return;
    
    if (!mqttClient.connected()) {
        mqtt_connected = false;
        Serial.println("MQTT connection lost. Attempting to reconnect...");
        
        if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
            mqtt_connected = true;
            Serial.println("MQTT reconnected!");
            publishSystemMessage("MQTT reconnected");
        } else {
            Serial.printf("MQTT reconnection failed. Error: %d\n", mqttClient.state());
        }
    } else {
        mqtt_connected = true;
    }
}

void handleWiFiConnection() {
    if (WiFi.status() != WL_CONNECTED) {
        wifi_connected = false;
        mqtt_connected = false;
        Serial.println("WiFi connection lost. Attempting to reconnect...");
        WiFi.reconnect();
        
        delay(5000);
        
        if (WiFi.status() == WL_CONNECTED) {
            wifi_connected = true;
            Serial.println("WiFi reconnected!");
            Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
        }
    } else {
        wifi_connected = true;
    }
}

// ============================================================================
// SERIAL COMMAND HANDLING
// ============================================================================
void handleSerialCommands() {
    char command = Serial.read();
    while (Serial.available()) Serial.read(); // Clear input buffer
    
    switch (command) {
        case 't':
        case 'T':
            tareLoadCells();
            break;
            
        case 'c':
        case 'C':
            calibrateLoadCells();
            break;
            
        case 'r':
        case 'R':
            showRawReadings();
            break;
            
        case 'i':
        case 'I':
            showSystemInfo();
            break;
            
        case 'w':
        case 'W':
            Serial.printf("WiFi Status: %s\n", wifi_connected ? "Connected" : "Disconnected");
            if (wifi_connected) {
                Serial.printf("IP: %s, RSSI: %d dBm\n", 
                             WiFi.localIP().toString().c_str(), WiFi.RSSI());
            }
            break;
            
        case 'm':
        case 'M':
            Serial.printf("MQTT Status: %s\n", mqtt_connected ? "Connected" : "Disconnected");
            if (mqtt_connected) {
                Serial.printf("Server: %s:%d\n", MQTT_SERVER, MQTT_PORT);
            }
            break;
            
        case 'h':
        case 'H':
            printHelp();
            break;
            
        default:
            Serial.printf("Unknown command: '%c'. Type 'h' for help.\n", command);
            break;
    }
}

// ============================================================================
// CALIBRATION FUNCTIONS
// ============================================================================
void tareLoadCells() {
    Serial.println("Taring both load cells...");
    
    if (!checkLoadCellConnections()) {
        Serial.println("ERROR: Cannot tare - load cells not connected!");
        return;
    }
    
    scale1.tare(20);
    scale2.tare(20);
    
    Serial.println("Both load cells tared successfully!");
    Serial.printf("Load Cell 1 offset: %ld\n", scale1.get_offset());
    Serial.printf("Load Cell 2 offset: %ld\n", scale2.get_offset());
    
    publishSystemMessage("Load cells tared");
}

void calibrateLoadCells() {
    if (!checkLoadCellConnections()) {
        Serial.println("ERROR: Cannot calibrate - load cells not connected!");
        return;
    }
    
    Serial.println("========================================");
    Serial.println("DUAL LOAD CELL CALIBRATION");
    Serial.println("========================================");
    Serial.println("This will calibrate both load cells simultaneously");
    Serial.println("Make sure weight is evenly distributed across both cells");
    
    // Step 1: Tare
    Serial.println("\nStep 1: Remove all weight and press Enter...");
    while (!Serial.available()) delay(100);
    Serial.read();
    
    scale1.tare(25);
    scale2.tare(25);
    Serial.println("Both load cells tared.");
    
    // Step 2: Add known weight
    Serial.println("\nStep 2: Place known weight evenly across both cells");
    Serial.println("Enter total weight in kg (e.g., 2.0 for 2kg):");
    
    while (!Serial.available()) delay(100);
    float known_weight = Serial.parseFloat();
    while (Serial.available()) Serial.read();
    
    if (known_weight <= 0 || known_weight > MAX_WEIGHT) {
        Serial.println("ERROR: Invalid weight!");
        return;
    }
    
    Serial.println("Taking calibration readings...");
    
    // Calibrate both cells
    long reading1 = 0, reading2 = 0;
    for (int i = 0; i < 30; i++) {
        reading1 += scale1.read();
        reading2 += scale2.read();
        delay(100);
    }
    
    reading1 /= 30;
    reading2 /= 30;
    
    // Assume weight is distributed proportionally based on raw readings
    float total_reading = reading1 + reading2;
    float weight1_portion = (float)reading1 / total_reading * known_weight;
    float weight2_portion = (float)reading2 / total_reading * known_weight;
    
    float scale_factor1 = (reading1 - scale1.get_offset()) / weight1_portion;
    float scale_factor2 = (reading2 - scale2.get_offset()) / weight2_portion;
    
    Serial.println("\nCalibration Results:");
    Serial.printf("Load Cell 1 - Scale Factor: %.2f, Weight Portion: %.3f kg\n", 
                 scale_factor1, weight1_portion);
    Serial.printf("Load Cell 2 - Scale Factor: %.2f, Weight Portion: %.3f kg\n", 
                 scale_factor2, weight2_portion);
    
    Serial.println("\nUpdate your code with these values:");
    Serial.printf("SCALE_FACTOR_1 = %.2f;\n", scale_factor1);
    Serial.printf("TARE_OFFSET_1 = %ld;\n", scale1.get_offset());
    Serial.printf("SCALE_FACTOR_2 = %.2f;\n", scale_factor2);
    Serial.printf("TARE_OFFSET_2 = %ld;\n", scale2.get_offset());
    
    // Apply temporarily for testing
    scale1.set_scale(scale_factor1);
    scale2.set_scale(scale_factor2);
    
    delay(2000);
    float test1 = scale1.get_units(10);
    float test2 = scale2.get_units(10);
    float test_total = test1 + test2;
    
    Serial.printf("\nTest results: %.3f kg (expected: %.3f kg)\n", test_total, known_weight);
    Serial.printf("Error: %.0f grams\n", abs(test_total - known_weight) * 1000);
}

// ============================================================================
// DIAGNOSTIC FUNCTIONS
// ============================================================================
void showRawReadings() {
    Serial.println("========================================");
    Serial.println("RAW DUAL LOAD CELL READINGS");
    Serial.println("Press any key to stop...");
    Serial.println("========================================");
    
    while (!Serial.available()) {
        if (checkLoadCellConnections()) {
            long raw1 = scale1.read();
            long raw2 = scale2.read();
            float weight1_val = scale1.get_units();
            float weight2_val = scale2.get_units();
            
            Serial.printf("Cell1: %8ld (%7.3f kg) | Cell2: %8ld (%7.3f kg) | Total: %7.3f kg\n", 
                         raw1, weight1_val, raw2, weight2_val, weight1_val + weight2_val);
        } else {
            Serial.println("Load cells not responding!");
        }
        delay(500);
    }
    
    while (Serial.available()) Serial.read();
    Serial.println("Raw readings stopped.");
}

void showSystemInfo() {
    Serial.println("========================================");
    Serial.println("SYSTEM INFORMATION - PHASE 2");
    Serial.println("========================================");
    Serial.println("Firmware: Smart Palette v2.0");
    Serial.println("Hardware: ESP32 + Dual HX711 + Dual 10kg Load Cells");
    Serial.println("Features: WiFi + MQTT + Real-time Updates");
    Serial.println("----------------------------------------");
    Serial.printf("ESP32 Model: %s\n", ESP.getChipModel());
    Serial.printf("CPU Frequency: %d MHz\n", ESP.getCpuFreqMHz());
    Serial.printf("Free Heap: %d bytes\n", ESP.getFreeHeap());
    Serial.printf("Uptime: %lu seconds\n", millis() / 1000);
    Serial.println("----------------------------------------");
    Serial.printf("Load Cell 1: GPIO %d/%d, Scale: %.2f, Offset: %ld\n", 
                 HX711_1_DOUT_PIN, HX711_1_SCK_PIN, scale1.get_scale(), scale1.get_offset());
    Serial.printf("Load Cell 2: GPIO %d/%d, Scale: %.2f, Offset: %ld\n", 
                 HX711_2_DOUT_PIN, HX711_2_SCK_PIN, scale2.get_scale(), scale2.get_offset());
    Serial.println("----------------------------------------");
    Serial.printf("WiFi: %s", wifi_connected ? "Connected" : "Disconnected");
    if (wifi_connected) {
        Serial.printf(" (%s, %d dBm)", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    }
    Serial.println();
    Serial.printf("MQTT: %s", mqtt_connected ? "Connected" : "Disconnected");
    if (mqtt_connected) {
        Serial.printf(" (%s:%d)", MQTT_SERVER, MQTT_PORT);
    }
    Serial.println();
    Serial.println("----------------------------------------");
    Serial.printf("Current Weights: %.3f + %.3f = %.3f kg\n", weight1, weight2, filtered_weight);
    Serial.printf("Bottle Count: %d\n", bottle_count);
    Serial.printf("System Status: %s\n", system_status.c_str());
    Serial.printf("Last Action: %s\n", last_action.c_str());
    Serial.println("========================================");
}

void printHelp() {
    Serial.println("AVAILABLE COMMANDS - PHASE 2:");
    Serial.println("'t' or 'T' - Tare both load cells");
    Serial.println("'c' or 'C' - Calibrate dual load cell system");
    Serial.println("'r' or 'R' - Show raw sensor readings");
    Serial.println("'w' or 'W' - Show WiFi connection status");
    Serial.println("'m' or 'M' - Show MQTT connection status");
    Serial.println("'i' or 'I' - Show complete system information");
    Serial.println("'h' or 'H' - Show this help menu");
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
bool checkLoadCellConnections() {
    return (scale1.is_ready() && scale2.is_ready());
}

String getSystemStatus() {
    if (!system_ready) return "INITIALIZING";
    if (!checkLoadCellConnections()) return "HARDWARE_ERROR";
    if (!is_stable) return "MEASURING";
    if (bottle_count == 0) return "EMPTY";
    return "READY";
}