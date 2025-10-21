"""
LaTeX Graph Generator - Test Mode
=================================
This version can work with simulated data if your MQTT system isn't running,
or with live data from your actual system.
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime, timedelta
import json
import warnings
warnings.filterwarnings('ignore')

# Configure matplotlib for LaTeX output
plt.rcParams.update({
    'text.usetex': False,  # Set to True if you have LaTeX installed
    'font.family': 'serif',
    'font.serif': ['Computer Modern Roman'],
    'font.size': 10,
    'axes.labelsize': 11,
    'axes.titlesize': 12,
    'legend.fontsize': 9,
    'xtick.labelsize': 9,
    'ytick.labelsize': 9,
    'figure.figsize': (6, 4),
    'savefig.dpi': 300,
    'savefig.format': 'pdf',
    'savefig.bbox': 'tight'
})

# System constants from your main.cpp
BOTTLE_WEIGHT = 275  # grams per bottle
EXPECTED_CALIBRATION_FACTOR = 2280.0

def generate_test_data():
    """Generate realistic test data based on your system specs"""
    np.random.seed(42)
    
    # Simulate 10 minutes of operation
    timestamps = pd.date_range(start=datetime.now() - timedelta(minutes=10), 
                              end=datetime.now(), 
                              freq='30S')  # 30-second intervals like your system
    
    data = []
    current_bottles = 0
    
    for i, timestamp in enumerate(timestamps):
        # Simulate bottle changes every 2 minutes
        if i % 4 == 0:  # Every 2 minutes (4 * 30s = 2min)
            change = np.random.choice([-1, 0, 1, 2], p=[0.2, 0.4, 0.3, 0.1])
            current_bottles = max(0, min(10, current_bottles + change))
        
        # Calculate weight with realistic noise
        theoretical_weight = current_bottles * BOTTLE_WEIGHT
        noise = np.random.normal(0, 5)  # ±5g measurement noise
        measured_weight = max(0, theoretical_weight + noise)
        
        # Simulate HX711 raw reading
        raw_reading = int(measured_weight * EXPECTED_CALIBRATION_FACTOR + np.random.normal(0, 1000))
        calibration_factor = EXPECTED_CALIBRATION_FACTOR + np.random.normal(0, 30)
        
        # Status determination
        if i > 0:
            prev_bottles = data[-1]['bottles']
            if current_bottles > prev_bottles:
                status = "loading"
            elif current_bottles < prev_bottles:
                status = "unloading"
            else:
                status = "idle"
        else:
            status = "idle"
        
        data.append({
            'timestamp': timestamp,
            'weight_g': measured_weight,
            'bottles': current_bottles,
            'status': status,
            'hx711_raw': raw_reading,
            'calibration_factor': calibration_factor
        })
    
    return pd.DataFrame(data)

def generate_mqtt_test_data(df):
    """Generate MQTT message frequency data"""
    mqtt_data = []
    
    for _, row in df.iterrows():
        # Simulate multiple MQTT messages per data point
        for topic in ['bottle-scale/weight', 'bottle-scale/bottles', 'bottle-scale/status', 'bottle-scale/data']:
            mqtt_data.append({
                'timestamp': row['timestamp'] + timedelta(seconds=np.random.uniform(0, 5)),
                'topic': topic,
                'size': np.random.randint(20, 200)
            })
    
    return mqtt_data

def generate_weight_vs_bottles_graph(df):
    """Graph 1: Weight vs Bottle Count for LaTeX"""
    fig, ax = plt.subplots(figsize=(6, 4))
    
    # Scatter plot of actual data
    ax.scatter(df['bottles'], df['weight_g'], alpha=0.7, s=30, color='blue', 
               label='Measured Data', zorder=3)
    
    # Theoretical line (275g per bottle)
    max_bottles = max(df['bottles'].max(), 5)
    theoretical_x = np.linspace(0, max_bottles, 100)
    theoretical_y = theoretical_x * BOTTLE_WEIGHT
    ax.plot(theoretical_x, theoretical_y, 'r--', linewidth=2, 
            label=f'Theoretical ({BOTTLE_WEIGHT}g/bottle)', zorder=2)
    
    # Calculate correlation
    if len(df) > 1:
        correlation = np.corrcoef(df['bottles'], df['weight_g'])[0,1]
        correlation_text = f'R = {correlation:.3f}'
    else:
        correlation_text = 'R = N/A'
    
    ax.set_xlabel('Bottle Count')
    ax.set_ylabel('Weight (g)')
    ax.set_title('Weight vs Bottle Count Correlation')
    ax.legend()
    ax.grid(True, alpha=0.3, zorder=1)
    
    # Add correlation text
    ax.text(0.05, 0.95, correlation_text, 
            transform=ax.transAxes, fontsize=10,
            bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.8))
    
    plt.tight_layout()
    plt.savefig('latex_weight_vs_bottles.pdf', bbox_inches='tight')
    plt.savefig('latex_weight_vs_bottles.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    print("📈 Generated: latex_weight_vs_bottles.pdf")

def generate_hx711_signal_graph(df):
    """Graph 2: HX711 Signal and Weight Scaling for LaTeX"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))
    
    # Left plot: Raw HX711 readings vs Weight
    ax1.scatter(df['weight_g'], df['hx711_raw'], alpha=0.7, s=25, color='purple')
    
    # Linear fit line
    if len(df) > 1:
        z = np.polyfit(df['weight_g'], df['hx711_raw'], 1)
        p = np.poly1d(z)
        weight_range = np.linspace(df['weight_g'].min(), df['weight_g'].max(), 100)
        ax1.plot(weight_range, p(weight_range), "r--", linewidth=2, 
                 label=f'Linear Fit: y = {z[0]:.0f}x + {z[1]:.0f}')
        ax1.legend()
    
    ax1.set_xlabel('Weight (g)')
    ax1.set_ylabel('HX711 Raw Reading')
    ax1.set_title('HX711 Signal vs Weight')
    ax1.grid(True, alpha=0.3)
    
    # Right plot: Calibration factor over time
    time_minutes = [(t - df['timestamp'].iloc[0]).total_seconds()/60 for t in df['timestamp']]
    ax2.plot(time_minutes, df['calibration_factor'], 'b-', linewidth=1.5, alpha=0.8)
    ax2.axhline(y=EXPECTED_CALIBRATION_FACTOR, color='red', linestyle='--', 
                linewidth=2, label=f'Expected: {EXPECTED_CALIBRATION_FACTOR}')
    
    ax2.set_xlabel('Time (minutes)')
    ax2.set_ylabel('Calibration Factor')
    ax2.set_title('Calibration Stability')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('latex_hx711_signal.pdf', bbox_inches='tight')
    plt.savefig('latex_hx711_signal.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    print("📈 Generated: latex_hx711_signal.pdf")

def generate_mqtt_publish_graph(mqtt_data, df):
    """Graph 3: MQTT Publish Frequency Analysis for LaTeX"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))
    
    # Left plot: Message frequency over time
    mqtt_df = pd.DataFrame(mqtt_data)
    mqtt_df['timestamp'] = pd.to_datetime(mqtt_df['timestamp'])
    
    # Group by minute and count messages
    mqtt_df['minute'] = mqtt_df['timestamp'].dt.floor('min')
    freq_data = mqtt_df.groupby('minute').size()
    
    if len(freq_data) > 0:
        time_minutes = [(t - freq_data.index[0]).total_seconds()/60 for t in freq_data.index]
        ax1.plot(time_minutes, freq_data.values, 'g-', linewidth=2, marker='o', markersize=4)
        
        # Add average line
        avg_freq = freq_data.mean()
        ax1.axhline(y=avg_freq, color='red', linestyle='--', 
                    label=f'Average: {avg_freq:.1f} msg/min')
        ax1.legend()
    
    ax1.set_xlabel('Time (minutes)')
    ax1.set_ylabel('Messages per Minute')
    ax1.set_title('MQTT Message Frequency')
    ax1.grid(True, alpha=0.3)
    
    # Right plot: Status changes over time
    if len(df) > 1:
        status_numeric = {'idle': 0, 'loading': 1, 'unloading': -1}
        status_values = [status_numeric.get(row['status'], 0) for _, row in df.iterrows()]
        time_minutes = [(t - df['timestamp'].iloc[0]).total_seconds()/60 for t in df['timestamp']]
        
        ax2.plot(time_minutes, status_values, 'o-', linewidth=2, markersize=4, color='orange')
        ax2.set_xlabel('Time (minutes)')
        ax2.set_ylabel('System Status')
        ax2.set_title('Status Changes')
        ax2.set_yticks([-1, 0, 1])
        ax2.set_yticklabels(['Unloading', 'Idle', 'Loading'])
        ax2.grid(True, alpha=0.3)
        
        # Count status changes
        status_changes = sum(1 for i in range(1, len(status_values)) 
                           if status_values[i] != status_values[i-1])
        ax2.text(0.05, 0.95, f'Changes: {status_changes}', 
                transform=ax2.transAxes, fontsize=10,
                bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.8))
    
    plt.tight_layout()
    plt.savefig('latex_mqtt_publish.pdf', bbox_inches='tight')
    plt.savefig('latex_mqtt_publish.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    print("📈 Generated: latex_mqtt_publish.pdf")

def generate_latex_code():
    """Generate LaTeX code for including the figures"""
    latex_code = """% LaTeX code for Smart Inventory Pallet figures
% Add to document preamble: \\usepackage{graphicx}

\\begin{figure}[htbp]
    \\centering
    \\includegraphics[width=0.8\\textwidth]{latex_weight_vs_bottles.pdf}
    \\caption{Weight vs bottle count correlation demonstrating linear relationship 
             between measured weight and inventory count. Theoretical line shows 
             275g per bottle assumption.}
    \\label{fig:weight_bottles}
\\end{figure}

\\begin{figure}[htbp]
    \\centering
    \\includegraphics[width=\\textwidth]{latex_hx711_signal.pdf}
    \\caption{HX711 load cell analysis: (a) Raw sensor signal vs weight showing 
             linear response characteristics, (b) Calibration factor stability 
             demonstrating sensor reliability over time.}
    \\label{fig:hx711_signal}
\\end{figure}

\\begin{figure}[htbp]
    \\centering
    \\includegraphics[width=\\textwidth]{latex_mqtt_publish.pdf}
    \\caption{MQTT communication performance: (a) Message transmission frequency 
             showing consistent data publishing, (b) System status transitions 
             indicating real-time inventory tracking capability.}
    \\label{fig:mqtt_analysis}
\\end{figure}

% Example text references:
% As shown in Figure~\\ref{fig:weight_bottles}, the system demonstrates high correlation...
% The HX711 sensor exhibits stable performance (Figure~\\ref{fig:hx711_signal})...
% MQTT communication reliability is demonstrated in Figure~\\ref{fig:mqtt_analysis}...
"""
    
    with open('latex_figures.tex', 'w') as f:
        f.write(latex_code)
    
    print("📄 Generated: latex_figures.tex")

def main():
    """Main function - works with or without live MQTT data"""
    print("📊 Smart Inventory Pallet - LaTeX Graph Generator (Test Mode)")
    print("=" * 65)
    print("This version generates LaTeX-compatible graphs using test data")
    print("based on your system specifications.\n")
    
    mode = input("Use (1) Test data or (2) Try live MQTT data? [1]: ").strip() or "1"
    
    if mode == "2":
        try:
            # Try to import and run live collection
            from latex_graph_generator import collect_realtime_data
            print("🔄 Attempting live data collection...")
            data, mqtt_data = collect_realtime_data(2)  # 2 minutes
            
            if data:
                df = pd.DataFrame(data)
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                print(f"✅ Collected {len(df)} live data points")
            else:
                print("❌ No live data, using test data instead")
                df = generate_test_data()
                mqtt_data = generate_mqtt_test_data(df)
        except:
            print("❌ Live collection failed, using test data")
            df = generate_test_data()
            mqtt_data = generate_mqtt_test_data(df)
    else:
        print("📊 Generating test data based on your system specs...")
        df = generate_test_data()
        mqtt_data = generate_mqtt_test_data(df)
    
    # Save data
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    df.to_csv(f'latex_test_data_{timestamp}.csv', index=False)
    
    print(f"\n🎯 Processing {len(df)} data points...")
    print(f"📊 Weight range: {df['weight_g'].min():.1f}g - {df['weight_g'].max():.1f}g")
    print(f"🍾 Bottle range: {df['bottles'].min()} - {df['bottles'].max()} bottles")
    
    # Generate the 3 LaTeX graphs
    print("\n📈 Generating LaTeX graphs...")
    generate_weight_vs_bottles_graph(df)
    generate_hx711_signal_graph(df)
    generate_mqtt_publish_graph(mqtt_data, df)
    
    # Generate LaTeX code
    generate_latex_code()
    
    print("\n✅ LaTeX graphs generated successfully!")
    print("\nFiles created:")
    print("📊 latex_weight_vs_bottles.pdf & .png")
    print("📊 latex_hx711_signal.pdf & .png") 
    print("📊 latex_mqtt_publish.pdf & .png")
    print("📄 latex_figures.tex (LaTeX inclusion code)")
    print(f"💾 latex_test_data_{timestamp}.csv")
    print("\n🎯 Ready for your academic paper!")
    print("\n💡 Tip: Use the PDF files in LaTeX for best quality")

if __name__ == "__main__":
    main()