/*
  Module 2: NFC Card Reader System Test
  
  Purpose: Test HM-033 v0.2.1 NFC reader functionality
  
  Hardware Connections:
  HM-033: VCC=3.3V, GND=GND, SCK=GPIO18, MISO=GPIO19, MOSI=GPIO23, SS=GPIO2
  Blue LED: GPIO25 + 220Ω resistor (Card detected)
  Green LED: GPIO26 + 220Ω resistor (Valid card)  
  Red LED: GPIO27 + 220Ω resistor (Invalid card)
  Buzzer: GPIO32 (Audio feedback)
  
  Test Features:
  - NFC card detection and UID reading
  - Card-to-truck mapping system
  - Single tap vs double tap detection
  - Visual and audio feedback
  - Serial commands for testing
*/

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>  // Library compatible with HM-033

// ============================================================================
// PIN DEFINITIONS
// ============================================================================

// HM-033 NFC Reader (SPI)
#define NFC_SCK       18
#define NFC_MISO      19  
#define NFC_MOSI      23
#define NFC_SS        2
#define NFC_RST       -1  // Not connected (software reset)

// Status Indicators
#define BLUE_LED      25  // Card detected
#define GREEN_LED     26  // Valid card
#define RED_LED       27  // Invalid card
#define BUZZER_PIN    32  // Audio feedback

// ============================================================================
// CONFIGURATION
// ============================================================================

// Tap detection timing
const unsigned long DOUBLE_TAP_WINDOW = 2000;  // 2 seconds for double tap
const unsigned long DEBOUNCE_DELAY = 500;      // 500ms debounce between reads
const unsigned long CARD_READ_TIMEOUT = 100;   // 100ms timeout for card reading

// ============================================================================
// GLOBAL OBJECTS AND VARIABLES
// ============================================================================
MFRC522 nfc(NFC_SS, NFC_RST);

// Truck database structure
struct TruckInfo {
    String cardUID;
    String truckID;
    String driverName;
    bool isActive;
};

// Test truck database (update these with your actual card UIDs)
TruckInfo trucks[] = {
    {"", "TRUCK_A", "Driver John", true},    // Will be updated with actual UID
    {"", "TRUCK_B", "Driver Mike", true},    // Will be updated with actual UID
    {"", "TRUCK_C", "Driver Sarah", true}    // Will be updated with actual UID
};
const int NUM_TRUCKS = 3;

// NFC event tracking
enum NFCEventType {
    NFC_NO_EVENT,
    NFC_CARD_DETECTED,
    NFC_SINGLE_TAP,
    NFC_DOUBLE_TAP,
    NFC_UNKNOWN_CARD
};

struct NFCState {
    String lastCardUID;
    String currentTruckID;
    unsigned long lastTapTime;
    unsigned long cardDetectedTime;
    NFCEventType lastEvent;
    bool cardPresent;
    int tapCount;
    bool isWaitingForSecondTap;
};

NFCState nfcState;

// Statistics
int totalCardReads = 0;
int validCardReads = 0;
int unknownCardReads = 0;
int singleTaps = 0;
int doubleTaps = 0;

// ============================================================================
// SETUP FUNCTION
// ============================================================================
void setup() {
    Serial.begin(115200);
    delay(2000);
    
    Serial.println("========================================");
    Serial.println("Module 2: NFC Card Reader System Test");
    Serial.println("========================================");
    
    // Initialize SPI and NFC reader
    Serial.print("Initializing SPI bus... ");
    SPI.begin();
    Serial.println("SUCCESS");
    
    Serial.print("Initializing HM-033 NFC reader... ");
    nfc.PCD_Init();
    
    // Test NFC communication
    byte version = nfc.PCD_ReadRegister(nfc.VersionReg);
    if (version == 0x00 || version == 0xFF) {
        Serial.println("FAILED!");
        Serial.println("No communication with HM-033 module");
        Serial.println("Check connections:");
        Serial.println("- VCC → ESP32 3.3V (NOT 5V!)");
        Serial.println("- GND → ESP32 GND");
        Serial.println("- SCK → ESP32 GPIO18");
        Serial.println("- MISO → ESP32 GPIO19");
        Serial.println("- MOSI → ESP32 GPIO23");
        Serial.println("- SS → ESP32 GPIO2");
        while (true) {
            setLEDState(0, 0, 1); // Red LED blinking
            delay(500);
            setLEDState(0, 0, 0);
            delay(500);
        }
    }
    
    Serial.printf("SUCCESS - Firmware Version: 0x%02X\n", version);
    
    // Initialize LEDs and buzzer
    Serial.print("Initializing indicators... ");
    pinMode(BLUE_LED, OUTPUT);
    pinMode(GREEN_LED, OUTPUT);
    pinMode(RED_LED, OUTPUT);
    pinMode(BUZZER_PIN, OUTPUT);
    
    // Turn off all LEDs
    setLEDState(0, 0, 0);
    Serial.println("SUCCESS");
    
    // Initialize NFC state
    nfcState.lastCardUID = "";
    nfcState.currentTruckID = "";
    nfcState.lastTapTime = 0;
    nfcState.cardDetectedTime = 0;
    nfcState.lastEvent = NFC_NO_EVENT;
    nfcState.cardPresent = false;
    nfcState.tapCount = 0;
    nfcState.isWaitingForSecondTap = false;
    
    // Startup indication
    testLEDs();
    playBuzzer(200, 2);
    
    Serial.println();
    printCommands();
    Serial.println("========================================");
    Serial.println("Ready! Tap NFC cards to test...");
    Serial.println("Use 'r' command to register new cards");
    Serial.println("========================================");
}

// ============================================================================
// MAIN LOOP
// ============================================================================
void loop() {
    // Handle serial commands
    if (Serial.available()) {
        handleSerialCommands();
    }
    
    // Process NFC events
    NFCEventType event = processNFCEvents();
    
    if (event != NFC_NO_EVENT) {
        handleNFCEvent(event);
    }
    
    // Handle double tap timeout
    if (nfcState.isWaitingForSecondTap && 
        (millis() - nfcState.lastTapTime) > DOUBLE_TAP_WINDOW) {
        // Timeout - treat first tap as single tap
        nfcState.isWaitingForSecondTap = false;
        Serial.printf("Single tap confirmed for %s (timeout)\n", nfcState.currentTruckID.c_str());
        singleTaps++;
        playBuzzer(200, 1);
        setLEDState(0, 1, 0); // Green LED
    }
    
    // Print statistics every 30 seconds
    static unsigned long lastStatsTime = 0;
    if (millis() - lastStatsTime > 30000) {
        printStatistics();
        lastStatsTime = millis();
    }
    
    delay(50); // Small delay to prevent excessive polling
}

// ============================================================================
// NFC PROCESSING FUNCTIONS
// ============================================================================
NFCEventType processNFCEvents() {
    // Check if a new card is present
    if (!nfc.PICC_IsNewCardPresent()) {
        // No card present
        if (nfcState.cardPresent) {
            // Card was removed
            nfcState.cardPresent = false;
            setLEDState(0, 0, 0); // Turn off LEDs
        }
        return NFC_NO_EVENT;
    }
    
    // Try to read the card serial
    if (!nfc.PICC_ReadCardSerial()) {
        return NFC_NO_EVENT;
    }
    
    // Format card UID
    String cardUID = formatCardUID(nfc.uid.uidByte, nfc.uid.size);
    unsigned long currentTime = millis();
    
    // Debounce protection - ignore if same card read too quickly
    if (cardUID == nfcState.lastCardUID && 
        (currentTime - nfcState.cardDetectedTime) < DEBOUNCE_DELAY) {
        return NFC_NO_EVENT;
    }
    
    // New card detected
    nfcState.cardPresent = true;
    nfcState.cardDetectedTime = currentTime;
    nfcState.lastCardUID = cardUID;
    totalCardReads++;
    
    Serial.printf("Card detected: %s\n", cardUID.c_str());
    setLEDState(1, 0, 0); // Blue LED for card detection
    
    // Find truck info
    String truckID = getTruckID(cardUID);
    nfcState.currentTruckID = truckID;
    
    if (truckID.isEmpty()) {
        // Unknown card
        unknownCardReads++;
        Serial.printf("Unknown card: %s\n", cardUID.c_str());
        setLEDState(0, 0, 1); // Red LED for unknown card
        playBuzzer(100, 3); // Triple short beep for error
        return NFC_UNKNOWN_CARD;
    }
    
    // Valid card - check for tap pattern
    validCardReads++;
    Serial.printf("Valid card - Truck: %s\n", truckID.c_str());
    
    // Determine tap type
    if (nfcState.isWaitingForSecondTap && 
        (currentTime - nfcState.lastTapTime) <= DOUBLE_TAP_WINDOW) {
        // This is the second tap within the time window
        nfcState.isWaitingForSecondTap = false;
        doubleTaps++;
        Serial.printf("Double tap detected for %s\n", truckID.c_str());
        playBuzzer(200, 2); // Double beep for double tap
        setLEDState(0, 1, 0); // Green LED
        return NFC_DOUBLE_TAP;
    } else {
        // This might be the first tap of a potential double tap
        nfcState.isWaitingForSecondTap = true;
        nfcState.lastTapTime = currentTime;
        // Don't immediately declare it as single tap - wait for timeout
        return NFC_CARD_DETECTED;
    }
}

void handleNFCEvent(NFCEventType event) {
    switch (event) {
        case NFC_CARD_DETECTED:
            // Card detected - waiting to determine tap type
            break;
            
        case NFC_SINGLE_TAP:
            Serial.printf("Single tap: %s\n", nfcState.currentTruckID.c_str());
            singleTaps++;
            playBuzzer(200, 1);
            setLEDState(0, 1, 0); // Green LED
            break;
            
        case NFC_DOUBLE_TAP:
            Serial.printf("Double tap: %s\n", nfcState.currentTruckID.c_str());
            doubleTaps++;
            playBuzzer(200, 2);
            setLEDState(0, 1, 0); // Green LED
            break;
            
        case NFC_UNKNOWN_CARD:
            Serial.println("Unknown card detected");
            setLEDState(0, 0, 1); // Red LED
            playBuzzer(100, 3);
            break;
            
        default:
            break;
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
String formatCardUID(byte* uid, byte uidSize) {
    String uidString = "";
    for (byte i = 0; i < uidSize; i++) {
        if (i > 0) uidString += "";
        if (uid[i] < 0x10) uidString += "0";
        uidString += String(uid[i], HEX);
    }
    uidString.toUpperCase();
    return uidString;
}

String getTruckID(String cardUID) {
    for (int i = 0; i < NUM_TRUCKS; i++) {
        if (trucks[i].cardUID == cardUID && trucks[i].isActive) {
            return trucks[i].truckID;
        }
    }
    return "";
}

TruckInfo* getTruckInfo(String cardUID) {
    for (int i = 0; i < NUM_TRUCKS; i++) {
        if (trucks[i].cardUID == cardUID) {
            return &trucks[i];
        }
    }
    return nullptr;
}

void setLEDState(int blue, int green, int red) {
    digitalWrite(BLUE_LED, blue ? HIGH : LOW);
    digitalWrite(GREEN_LED, green ? HIGH : LOW);
    digitalWrite(RED_LED, red ? HIGH : LOW);
}

void playBuzzer(int duration, int count) {
    for (int i = 0; i < count; i++) {
        digitalWrite(BUZZER_PIN, HIGH);
        delay(duration);
        digitalWrite(BUZZER_PIN, LOW);
        if (i < count - 1) delay(150);
    }
}

void testLEDs() {
    Serial.println("Testing LEDs...");
    setLEDState(1, 0, 0); delay(300);
    setLEDState(0, 1, 0); delay(300);
    setLEDState(0, 0, 1); delay(300);
    setLEDState(0, 0, 0);
}

// ============================================================================
// DISPLAY AND INFO FUNCTIONS
// ============================================================================
void printCommands() {
    Serial.println("Available Commands:");
    Serial.println("'r' - Register new card to truck");
    Serial.println("'l' - List all registered trucks");
    Serial.println("'s' - Show system status");
    Serial.println("'t' - Test NFC reader communication");
    Serial.println("'c' - Clear statistics");
    Serial.println("'d' - Toggle debug mode");
    Serial.println("'h' - Show this help");
}

void printTruckDatabase() {
    Serial.println("========== TRUCK DATABASE ==========");
    for (int i = 0; i < NUM_TRUCKS; i++) {
        Serial.printf("Slot %d: ", i + 1);
        if (trucks[i].cardUID.isEmpty()) {
            Serial.printf("EMPTY - %s\n", trucks[i].truckID.c_str());
        } else {
            Serial.printf("%s - %s (%s) %s\n", 
                         trucks[i].cardUID.c_str(),
                         trucks[i].truckID.c_str(),
                         trucks[i].driverName.c_str(),
                         trucks[i].isActive ? "ACTIVE" : "INACTIVE");
        }
    }
}

void printSystemStatus() {
    Serial.println("========== SYSTEM STATUS ==========");
    Serial.printf("ESP32 Free Heap: %d bytes\n", ESP.getFreeHeap());
    Serial.printf("CPU Frequency: %d MHz\n", ESP.getCpuFreqMHz());
    Serial.printf("Uptime: %lu seconds\n", millis() / 1000);
    
    // NFC reader status
    byte version = nfc.PCD_ReadRegister(nfc.VersionReg);
    Serial.printf("NFC Firmware Version: 0x%02X\n", version);
    
    // Current state
    Serial.printf("Card Present: %s\n", nfcState.cardPresent ? "YES" : "NO");
    Serial.printf("Last Card UID: %s\n", nfcState.lastCardUID.c_str());
    Serial.printf("Current Truck: %s\n", nfcState.currentTruckID.c_str());
    Serial.printf("Waiting for 2nd Tap: %s\n", nfcState.isWaitingForSecondTap ? "YES" : "NO");
}

void printStatistics() {
    Serial.println("========== STATISTICS ==========");
    Serial.printf("Total Card Reads: %d\n", totalCardReads);
    Serial.printf("Valid Cards: %d\n", validCardReads);
    Serial.printf("Unknown Cards: %d\n", unknownCardReads);
    Serial.printf("Single Taps: %d\n", singleTaps);
    Serial.printf("Double Taps: %d\n", doubleTaps);
    Serial.printf("Success Rate: %.1f%%\n", 
                 totalCardReads > 0 ? (float)validCardReads * 100 / totalCardReads : 0);
}

void testNFCCommunication() {
    Serial.println("========== NFC COMMUNICATION TEST ==========");
    
    // Read version register
    byte version = nfc.PCD_ReadRegister(nfc.VersionReg);
    Serial.printf("Version Register: 0x%02X\n", version);
    
    // Test self-test
    bool selfTestResult = nfc.PCD_PerformSelfTest();
    Serial.printf("Self Test: %s\n", selfTestResult ? "PASS" : "FAIL");
    
    // Re-initialize after self test
    nfc.PCD_Init();
    
    // Test antenna gain
    byte gain = nfc.PCD_GetAntennaGain();
    Serial.printf("Antenna Gain: 0x%02X\n", gain);
    
    Serial.println("Communication test complete");
}

// ============================================================================
// COMMAND HANDLING
// ============================================================================
void handleSerialCommands() {
    char command = Serial.read();
    while (Serial.available()) Serial.read(); // Clear buffer
    
    Serial.println();
    
    switch (command) {
        case 'r':
        case 'R':
            registerNewCard();
            break;
            
        case 'l':
        case 'L':
            printTruckDatabase();
            break;
            
        case 's':
        case 'S':
            printSystemStatus();
            break;
            
        case 't':
        case 'T':
            testNFCCommunication();
            break;
            
        case 'c':
        case 'C':
            clearStatistics();
            break;
            
        case 'h':
        case 'H':
            printCommands();
            break;
            
        default:
            Serial.printf("Unknown command: '%c'. Type 'h' for help.\n", command);
            break;
    }
    
    Serial.println();
}

void registerNewCard() {
    Serial.println("========== CARD REGISTRATION ==========");
    printTruckDatabase();
    Serial.println("\nWhich truck slot to register (1-3)?");
    
    while (!Serial.available()) delay(100);
    int slot = Serial.parseInt() - 1;
    while (Serial.available()) Serial.read(); // Clear buffer
    
    if (slot < 0 || slot >= NUM_TRUCKS) {
        Serial.println("Invalid slot number!");
        return;
    }
    
    Serial.printf("Selected: %s\n", trucks[slot].truckID.c_str());
    Serial.println("Now tap the NFC card for this truck...");
    
    // Wait for card
    unsigned long startTime = millis();
    while (millis() - startTime < 10000) { // 10 second timeout
        if (nfc.PICC_IsNewCardPresent() && nfc.PICC_ReadCardSerial()) {
            String cardUID = formatCardUID(nfc.uid.uidByte, nfc.uid.size);
            
            // Check if card is already registered
            for (int i = 0; i < NUM_TRUCKS; i++) {
                if (trucks[i].cardUID == cardUID) {
                    Serial.printf("Card already registered to %s!\n", trucks[i].truckID.c_str());
                    return;
                }
            }
            
            // Register the card
            trucks[slot].cardUID = cardUID;
            trucks[slot].isActive = true;
            
            Serial.printf("Card %s registered to %s\n", cardUID.c_str(), trucks[slot].truckID.c_str());
            playBuzzer(500, 1); // Success beep
            setLEDState(0, 1, 0); // Green LED
            delay(1000);
            setLEDState(0, 0, 0);
            return;
        }
        delay(100);
    }
    
    Serial.println("Timeout - no card detected");
}

void clearStatistics() {
    totalCardReads = 0;
    validCardReads = 0;
    unknownCardReads = 0;
    singleTaps = 0;
    doubleTaps = 0;
    Serial.println("Statistics cleared");
}