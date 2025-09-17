/*
 * HX711 Load Cell with OLED Display and Bottle Counter
 * Converted for PlatformIO with ESP32 WROOM DevKit
 * 
 * Features:
 * - Load cell calibration with 172g weight
 * - OLED display showing weight and bottle count
 * - Bottle count = round(total_weight / 275g)
 * - Calibration factor stored in flash memory
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
 * 
 * Calibration Process:
 * 1. Send 'P' to prepare for calibration
 * 2. Place 172g weight on scale
 * 3. Send 'C' to start calibration
 */

#include <Arduino.h>
#include "HX711.h"
#include <Preferences.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// HX711 Pin Configuration
#define LOADCELL_DOUT_PIN 5
#define LOADCELL_SCK_PIN  18

// OLED Display Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1  // Reset pin (or -1 if sharing Arduino reset pin)
#define SCREEN_ADDRESS 0x3C  // Common I2C address for SSD1306

// Calibration weight configuration (172g for your project)
#define weight_of_object_for_calibration 172

// Bottle weight configuration (275g per bottle)
#define BOTTLE_WEIGHT 275

// Variables for sensor readings and calibration
long sensor_Reading_Results; 
float CALIBRATION_FACTOR;
bool show_Weighing_Results = false;
bool calibration_completed = false;
int weight_In_g;
float weight_In_oz;
int bottle_count;

// Initialize libraries
HX711 LOADCELL_HX711;
Preferences preferences;
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Display update timing
unsigned long lastDisplayUpdate = 0;
const unsigned long displayUpdateInterval = 500;  // Update every 500ms

// HX711 error handling
static int consecutive_failures = 0;
const int MAX_CONSECUTIVE_FAILURES = 5;

void initializeDisplay() {
  // Initialize OLED display
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("❌ SSD1306 allocation failed"));
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
  display.println(F("=== BOTTLE SCALE ==="));
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
  
  // Title
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(F("=== BOTTLE SCALE ==="));
  
  // Weight display
  display.setTextSize(1);
  display.setCursor(0, 15);
  display.print(F("Weight: "));
  display.print(weight_In_g);
  display.println(F(" g"));
  
  display.setCursor(0, 25);
  display.print(F("        "));
  display.print(weight_In_oz, 1);
  display.println(F(" oz"));
  
  // Bottle count - large display
  display.setTextSize(1);
  display.setCursor(0, 40);
  display.println(F("Bottles:"));
  
  display.setTextSize(3);
  display.setCursor(70, 35);
  display.println(bottle_count);
  
  // Calculation info
  display.setTextSize(1);
  display.setCursor(0, 56);
  display.print(F("("));
  display.print(weight_In_g);
  display.print(F("/275g)"));
  
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
  
  // Initialize display first
  initializeDisplay();

  Serial.println("=== HX711 Bottle Scale System ===");
  Serial.println("Setup...");
  delay(1000);

  // Initialize Preferences
  preferences.begin("CF", false);
  delay(100);

  Serial.println();
  Serial.println("⚠️  IMPORTANT: Remove all objects from scale during setup!");
  delay(1000);

  // Initialize HX711
  Serial.println("Initializing HX711...");
  LOADCELL_HX711.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  // Wait for HX711 to stabilize
  delay(1000);
  
  // Check if HX711 is responding (give it multiple tries)
  bool hx711_ok = false;
  for (int i = 0; i < 10; i++) {
    if (LOADCELL_HX711.is_ready()) {
      hx711_ok = true;
      break;
    }
    delay(100);
  }
  
  if (!hx711_ok) {
    Serial.println("⚠️ Warning: HX711 not responding, but continuing...");
  } else {
    Serial.println("✅ HX711 initialized successfully");
  }

  // Check if we have a stored calibration factor
  float stored_cal_factor = preferences.getFloat("CFVal", 0);
  if (stored_cal_factor != 0) {
    Serial.println("✅ Found stored calibration factor!");
    Serial.printf("🔧 Loading calibration factor: %.6f\n", stored_cal_factor);
    LOADCELL_HX711.set_scale(stored_cal_factor);
    LOADCELL_HX711.tare();  // Zero the scale
    calibration_completed = true;
    show_Weighing_Results = true;
    
    displayCalibrationComplete(stored_cal_factor);
  } else {
    Serial.println("⚠️  No calibration found - calibration required");
    displayWelcomeScreen();
  }

  Serial.println("✅ Setup complete.");
  delay(1000);

  if (!calibration_completed) {
    Serial.println();
    Serial.println("=== CALIBRATION INSTRUCTIONS ===");
    Serial.println("📋 Commands:");
    Serial.println("   P - Prepare for calibration");
    Serial.println("   C - Start calibration");
    Serial.println();
    Serial.printf("📏 Calibration weight: %d grams\n", weight_of_object_for_calibration);
    Serial.printf("🍼 Bottle weight: %d grams each\n", BOTTLE_WEIGHT);
    Serial.println();
    Serial.println("📨 Send 'P' to begin...");
  }
}

void loop() {
  // Handle serial commands
  if(Serial.available()) {
    char inChar = (char)Serial.read();
    Serial.println();
    Serial.print("📨 Received: ");
    Serial.println(inChar);

    // PREPARATION PHASE
    if (inChar == 'P' || inChar == 'p') {
      show_Weighing_Results = false;
      delay(1000);
      
      if (LOADCELL_HX711.is_ready()) {  
        Serial.println("🔄 PREPARATION PHASE");
        Serial.println("⚠️  Remove all objects from scale!");
        
        displayCalibrationStatus("Remove all objects", 0);
        delay(2000);
        
        // Countdown for preparation
        for (byte i = 5; i > 0; i--) {
          Serial.printf("   %d...\n", i);
          displayCalibrationStatus("Preparing...", i);
          delay(1000);
        }
        
        // Set scale and tare
        LOADCELL_HX711.set_scale(); 
        Serial.println("⚙️  Setting baseline...");
        displayCalibrationStatus("Setting baseline...");
        delay(1000);
        
        LOADCELL_HX711.tare();
        Serial.println("✅ Scale zeroed");
        Serial.printf("📦 Place %d gram weight\n", weight_of_object_for_calibration);
        
        displayCalibrationStatus("Place 172g weight");
        delay(2000);
        
        // Countdown for weight placement
        for (byte i = 5; i > 0; i--) {
          Serial.printf("   %d...\n", i);
          displayCalibrationStatus("Wait...", i);
          delay(1000);
        }
        
        Serial.println("📨 Send 'C' to calibrate...");
        displayCalibrationStatus("Send 'C' to start");
      } else {
        Serial.println("❌ HX711 not ready!");
        displayCalibrationStatus("HX711 ERROR!");
      }
    }

    // CALIBRATION PHASE
    if (inChar == 'C' || inChar == 'c') {
      if (LOADCELL_HX711.is_ready()) {
        Serial.println("🔧 CALIBRATION PHASE");
        Serial.println("📊 Taking readings...");
        
        displayCalibrationStatus("Calibrating...");
        
        // Take readings
        for (byte i = 0; i < 5; i++) {
          sensor_Reading_Results = LOADCELL_HX711.get_units(10);
          Serial.printf("📈 Reading %d: %ld\n", i+1, sensor_Reading_Results);
          delay(1000);
        }

        // Calculate and save calibration factor
        CALIBRATION_FACTOR = (float)sensor_Reading_Results / weight_of_object_for_calibration; 

        Serial.println("💾 Saving to flash...");
        preferences.putFloat("CFVal", CALIBRATION_FACTOR); 
        delay(500);

        Serial.println("📖 Loading from flash...");
        float LOAD_CALIBRATION_FACTOR = preferences.getFloat("CFVal", 0); 
        LOADCELL_HX711.set_scale(LOAD_CALIBRATION_FACTOR);
        delay(500);
        
        Serial.printf("✅ CALIBRATION FACTOR: %.6f\n", LOAD_CALIBRATION_FACTOR);
        
        calibration_completed = true;
        show_Weighing_Results = true;

        Serial.println("🎉 CALIBRATION COMPLETE!");
        Serial.println("📊 Ready for bottle counting!");
        
        displayCalibrationComplete(LOAD_CALIBRATION_FACTOR);
      } else {
        Serial.println("❌ HX711 not ready!");
        displayCalibrationStatus("HX711 ERROR!");
      }
    }
  }

  // Display weight and bottle count
  if (show_Weighing_Results && calibration_completed) {
    unsigned long currentTime = millis();
    if (currentTime - lastDisplayUpdate >= displayUpdateInterval) {
      // Try to get reading with multiple attempts
      
      if (LOADCELL_HX711.is_ready()) {
        // Get weight readings
        weight_In_g = LOADCELL_HX711.get_units(10); 
        
        // Ensure non-negative weight
        if (weight_In_g < 0) weight_In_g = 0;
        
        // Convert to ounces
        weight_In_oz = (float)weight_In_g / 28.34952;
        
        // Calculate bottle count (round to nearest integer)
        bottle_count = round((float)weight_In_g / BOTTLE_WEIGHT);
        if (bottle_count < 0) bottle_count = 0;
        
        // Update display
        displayWeight();
        
        // Reset failure counter on successful read
        consecutive_failures = 0;
        
        // Serial output (less frequent)
        static unsigned long lastSerialOutput = 0;
        if (currentTime - lastSerialOutput >= 2000) {  // Every 2 seconds
          Serial.printf("  %dg | %.1foz | %d bottles\n", 
                       weight_In_g, weight_In_oz, bottle_count);
          lastSerialOutput = currentTime;
        }
        
        lastDisplayUpdate = currentTime;
      } else {
        consecutive_failures++;
        
        // Only show error after multiple consecutive failures
        if (consecutive_failures > MAX_CONSECUTIVE_FAILURES) {
          display.clearDisplay();
          display.setTextSize(2);
          display.setTextColor(SSD1306_WHITE);
          display.setCursor(10, 25);
          display.println("HX711");
          display.println("  ERROR!");
          display.display();
          Serial.println("❌ HX711 not found!");
          
          // Reset failure counter to avoid spam
          consecutive_failures = 0;
        }
        // If less than MAX_CONSECUTIVE_FAILURES, just skip this reading cycle
      }
    }
  } else if (!calibration_completed) {
    // Show welcome screen if not calibrated
    static unsigned long lastWelcomeUpdate = 0;
    if (millis() - lastWelcomeUpdate >= 5000) {
      displayWelcomeScreen();
      lastWelcomeUpdate = millis();
    }
  }

  delay(100);  // Small delay to prevent excessive CPU usage
}