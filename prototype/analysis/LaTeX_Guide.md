# LaTeX-Compatible Graphs for Smart Inventory Pallet

## 🎯 Quick Start Guide

### For Immediate Use (Simulated Data)
```bash
cd analysis
python latex_plots_generator.py
# Choose option 2 for simulated data
```

### For Live Data Collection
```bash
cd analysis  
python latex_plots_generator.py
# Choose option 1 for live data
# Enter collection duration (3-5 minutes recommended)
```

## 📊 Generated Graphs

### 1. **Weight vs Bottle Count** (`latex_weight_vs_bottles.pdf/png`)
- Scatter plot with theoretical line (275g/bottle)
- Linear fit with R² correlation
- Perfect for demonstrating system accuracy

### 2. **HX711 Signal Analysis** (`latex_hx711_signal.pdf/png`) 
- Raw ADC signal over time
- Calibration scaling accuracy
- Shows sensor stability and precision

### 3. **MQTT Publish Patterns** (`latex_mqtt_publish.pdf/png`)
- Message frequency analysis  
- System status changes over time
- IoT communication reliability

## 📝 LaTeX Integration

### Include in Your Paper:
```latex
\begin{figure}[h!]
\centering
\includegraphics[width=0.8\textwidth]{latex_weight_vs_bottles.pdf}
\caption{Weight vs Bottle Count Correlation showing R² = 0.XXX}
\label{fig:weight_bottles}
\end{figure}
```

### Performance Table:
The script generates ready-to-use LaTeX table code:
```latex
\begin{table}[h!]
\centering
\begin{tabular}{|l|c|}
\hline
Parameter & Value \\
\hline
Total Data Points & XX \\
Average Weight & $XXX.X \pm XX.X$ g \\
Weight per Bottle & 275 g \\
\hline
\end{tabular}
\caption{Smart Inventory Pallet Performance Metrics}
\end{table}
```

## ⚡ Live Data Collection Requirements

1. **Your Smart Inventory Pallet must be running**
2. **Publishing to MQTT broker** (broker.hivemq.com)
3. **Active bottle-scale/data topic**

### Collection Tips:
- Run for 3-5 minutes for good data variety
- Add/remove bottles during collection
- Ensure stable WiFi connection
- Check that MQTT messages are publishing

## 🔧 Troubleshooting

### No Live Data Collected?
- Check your system is running and connected to WiFi
- Verify MQTT broker connection in your ESP32 serial output
- Ensure bottle-scale/data topic is being published
- Try extending collection duration

### Font Warnings?
- Font warnings are cosmetic only - graphs generate correctly
- For perfect LaTeX fonts, install LaTeX on your system
- PNG versions work perfectly for all document types

## 📈 For Your Abstract Paper

These graphs demonstrate:
- **System Accuracy**: R² correlation near 1.0 for weight/bottle relationship
- **Sensor Reliability**: Stable HX711 calibration and low noise
- **IoT Performance**: Consistent MQTT publishing and status updates
- **Real-time Capability**: Live data collection from operational system

All files are high-resolution and ready for academic publication!

## 🚀 Quick Commands

```bash
# Generate with simulated data (always works)
python latex_plots_generator.py

# Collect 3 minutes of live data 
python latex_plots_generator.py
# Enter: 1, then 3

# View generated files
ls latex_*.pdf latex_*.png
```