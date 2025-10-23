PN532 NFC (SPI) Wiring and Integration Guide

Overview

This project uses the Adafruit PN532 module (SPI mode) connected to an ESP32 (WROOM DevKit) to identify vehicles via NFC tags/cards.
The ESP32 reads NFC card UID and publishes transaction events via MQTT for the web dashboard to show vehicle load/unload transactions.

Hardware connections (ESP32 - PN532 using SPI)

- PN532 VCC  -> ESP32 3.3V (IMPORTANT: do NOT use 5V)
- PN532 GND  -> ESP32 GND
- PN532 SCK  -> ESP32 GPIO 14
- PN532 MOSI -> ESP32 GPIO 13
- PN532 MISO -> ESP32 GPIO 12
- PN532 SS   -> ESP32 GPIO 15 (chip select)

LEDs (optional status LEDs)

- LED_RED_PIN    -> ESP32 GPIO 25
- LED_GREEN_PIN  -> ESP32 GPIO 26
- LED_YELLOW_PIN -> ESP32 GPIO 27

Notes

- Ensure solid 3.3V power for PN532. If you power other peripherals from the ESP32, consider using a separate 3.3V regulator if you see instability.
- Some PN532 breakout boards have a DIP switch to select SPI vs I2C. Set it to SPI.
- Keep SPI wires short and avoid routing near noisy power traces.

NFC Workflow (as implemented in `src/main.cpp`)

1. Single tap (first tap): system enters "LOAD READY" state. Yellow LED turns on. The MCU records the starting bottle count.
2. Second tap by the same card: completes LOAD transaction. Green LED turns on briefly. MCU computes bottles loaded = (start count - end count), publishes an MQTT transaction JSON on `bottle-scale/nfc/transaction` and `bottle-scale/nfc/vehicle-id`. The web dashboard records the transaction.
3. Double tap within 3s: if the same card is tapped twice within 3 seconds, MCU enters "UNLOAD READY" state. Red LED turns on. After unloading, tapping the card again completes the UNLOAD transaction. MCU computes bottles unloaded = (end count - start count) and publishes transaction JSON.

MQTT Topics used

- `bottle-scale/data` - JSON with full state (weight, bottles, status, nfc_state, vehicle_id)
- `bottle-scale/nfc/vehicle-id` - Plain vehicle UID string on each tap
- `bottle-scale/nfc/transaction` - JSON describing completed NFC transactions:
  {
    "vehicle_id": "<UID>",
    "transaction_type": "LOAD" | "UNLOAD",
    "bottle_count": <number of bottles moved>,
    "total_bottles": <current bottles on scale>,
    "timestamp": <millis() or unix timestamp>
  }

Software notes

- The MCU `src/main.cpp` already contains PN532 initialization and the transaction logic.
- The web dashboard subscribes to these MQTT topics and displays recent transactions when available.

Troubleshooting

- If PN532 isn't found, confirm wiring and that the module is set to SPI mode. See PN532_TROUBLESHOOTING.md for more tips.
- If NFC reads are flaky, try adding a small delay after successful reads (the firmware already has a 500ms debounce).

Safety

- Do not connect PN532 VCC to 5V on ESP32. It requires 3.3V. Exceeding voltage can damage the module and ESP32.

"Try it" steps (quick)

1. Power the ESP32 and PN532 with correct wiring.
2. Start the MCU; open serial monitor at 115200 to see NFC initialization logs.
3. Open the web dashboard and ensure it's connected to the MQTT broker (HiveMQ used by default).
4. Tap an NFC card and watch the MCU logs and web dashboard for vehicle ID and transactions.

