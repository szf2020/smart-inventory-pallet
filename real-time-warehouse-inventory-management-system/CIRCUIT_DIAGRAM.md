# Circuit Connection Diagram
```
                                    ESP32 WROOM DevKit
                                  ┌─────────────────────┐
                                  │                     │
                    3.3V ────────┤ 3.3V            VIN ├──── External 5V (Optional)
                     GND ────────┤ GND             GND ├──── GND Rail
                                  │                     │
HX711 Load Cell                   │                     │              OLED Display
┌─────────────┐                  │                     │              ┌─────────────┐
│ VCC ────────┼──────────────────┤ 3.3V                │              │ VCC ────────┼── 3.3V
│ GND ────────┼──────────────────┤ GND             21  ├──────────────┼─ SDA        │
│ DT  ────────┼──────────────────┤ 5               22  ├──────────────┼─ SCL        │
│ SCK ────────┼──────────────────┤ 18                  │              │ GND ────────┼── GND
└─────────────┘                  │                     │              └─────────────┘
                                  │                     │
PN532 NFC Module                  │                     │              Status LEDs
┌─────────────┐                  │                     │              ┌─────────────┐
│ VCC ────────┼──────────────────┤ 3.3V                │              │ Yellow LED  │
│ GND ────────┼──────────────────┤ GND             27  ├──[220Ω]──────┼─ +          │
│ SCK ────────┼──────────────────┤ 14              26  ├──[220Ω]──────┼─ Green LED  │
│ MOSI ───────┼──────────────────┤ 13              25  ├──[220Ω]──────┼─ Red LED    │
│ SS  ────────┼──────────────────┤ 15                  │              │ - (Common)  ├── GND
│ MISO ───────┼──────────────────┤ 12                  │              └─────────────┘
└─────────────┘                  │                     │
                                  │                     │
                                  └─────────────────────┘

Load Cell Connection to HX711:
┌─────────────────┐         ┌─────────────┐
│    Load Cell    │         │    HX711    │
│                 │         │             │
│ Red   (E+) ─────┼─────────┼─ E+         │
│ Black (E-) ─────┼─────────┼─ E-         │
│ White (A+) ─────┼─────────┼─ A+         │
│ Green (A-) ─────┼─────────┼─ A-         │
└─────────────────┘         └─────────────┘

Power Rail Distribution:
    3.3V Rail ────┬─── HX711 VCC
                  ├─── OLED VCC
                  ├─── PN532 VCC
                  └─── ESP32 3.3V

    GND Rail ─────┬─── HX711 GND
                  ├─── OLED GND
                  ├─── PN532 GND
                  ├─── LED Common GND
                  └─── ESP32 GND
```

## Component Layout Tips:
1. Place ESP32 in center of breadboard
2. Position NFC module away from other components
3. Keep load cell wires twisted and away from digital signals
4. Mount OLED display for easy viewing
5. Position LEDs for clear visibility
6. Use proper wire management for clean installation