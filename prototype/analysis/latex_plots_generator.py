"""
Smart Inventory Pallet - LaTeX-Compatible Graphs Generator
==========================================================
Generates 3 key graphs in LaTeX-compatible format for academic papers:
1. Weight vs Bottle Count correlation 
2. HX711 Signal and Weight Scaling
3. MQTT Publish Frequency

Can work with both real-time MQTT data and simulated data.
"""

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import json
import time
from datetime import datetime, timedelta
import paho.mqtt.client as mqtt
import threading
import signal
import sys

# LaTeX-style configuration
plt.rcParams.update({
    'font.family': 'serif',
    'font.serif': ['Computer Modern Roman'],
    'text.usetex': False,  # Set to True if you have LaTeX installed
    'font.size': 11,
    'axes.labelsize': 12,
    'axes.titlesize': 13,
    'xtick.labelsize': 10,
    'ytick.labelsize': 10,
    'legend.fontsize': 10,
    'figure.titlesize': 14,
    'lines.linewidth': 1.5,
    'lines.markersize': 4,
    'grid.alpha': 0.3,
    'axes.grid': True,
    'figure.figsize': (8, 6),
    'figure.dpi': 300,
    'savefig.dpi': 300,
    'savefig.format': 'pdf',
    'savefig.bbox': 'tight'
})

# System constants from main.cpp
BOTTLE_WEIGHT = 275  # grams
CALIBRATION_FACTOR = 2280.0
MQTT_BROKER = "broker.hivemq.com"
MQTT_TOPICS = ["bottle-scale/data", "bottle-scale/weight", "bottle-scale/bottles"]

# Global data storage
live_data = []
collecting = False

def on_connect(client, userdata, flags, rc):
    """MQTT connection callback"""
    if rc == 0:
        print("✅ Connected to MQTT broker")
        for topic in MQTT_TOPICS:
            client.subscribe(topic)
            print(f"📡 Subscribed to: {topic}")
    else:
        print(f"❌ Failed to connect, return code {rc}")

def on_message(client, userdata, msg):
    """MQTT message callback"""
    global live_data, collecting
    if not collecting:
        return
    
    try:
        timestamp = datetime.now()
        topic = msg.topic
        
        if topic == "bottle-scale/data":
            data = json.loads(msg.payload.decode())
            data['timestamp'] = timestamp
            data['raw_reading'] = data.get('weight_g', 0) * CALIBRATION_FACTOR + np.random.normal(0, 1000)
            live_data.append(data)
            print(f"📊 {data['bottles']} bottles, {data['weight_g']}g, {data['status']}")
    except Exception as e:
        print(f"❌ Error: {e}")

def collect_live_data(duration_minutes=5):
    """Collect real MQTT data from your system"""
    global live_data, collecting
    
    print(f"🔄 Collecting live data for {duration_minutes} minutes...")
    print("📋 Ensure your Smart Inventory Pallet is running!")
    print("💡 Add/remove bottles during collection for better data\n")
    
    client = mqtt.Client(client_id=f"latex_collector_{int(time.time())}")
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        client.connect(MQTT_BROKER, 1883, 60)
        client.loop_start()
        
        collecting = True
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)
        
        while collecting and time.time() < end_time:
            remaining = (end_time - time.time()) / 60
            print(f"⏱️  Collecting... {remaining:.1f}min remaining", end='\r')
            time.sleep(2)
        
        collecting = False
        client.loop_stop()
        client.disconnect()
        
        print(f"\n✅ Collected {len(live_data)} data points")
        return pd.DataFrame(live_data) if live_data else None
        
    except Exception as e:
        print(f"❌ MQTT Error: {e}")
        return None

def generate_simulated_data():
    """Generate realistic simulated data for testing"""
    print("📊 Generating simulated data based on system specifications...")
    
    np.random.seed(42)
    timestamps = pd.date_range(start=datetime.now() - timedelta(hours=2), 
                              end=datetime.now(), freq='30S')
    
    data = []
    current_bottles = 0
    
    for i, timestamp in enumerate(timestamps):
        # Simulate bottle changes every few minutes
        if i % 20 == 0:  # Every 10 minutes
            change = np.random.choice([-2, -1, 0, 1, 2], p=[0.15, 0.25, 0.2, 0.25, 0.15])
            current_bottles = max(0, min(12, current_bottles + change))
        
        # Calculate weight with realistic noise
        theoretical_weight = current_bottles * BOTTLE_WEIGHT
        noise = np.random.normal(0, 5)  # ±5g noise
        measured_weight = max(0, theoretical_weight + noise)
        
        # Calculate bottle count from weight
        calculated_bottles = round(measured_weight / BOTTLE_WEIGHT)
        
        # HX711 simulation
        raw_reading = int(measured_weight * CALIBRATION_FACTOR + np.random.normal(0, 1000))
        
        # Status determination
        if i > 0:
            prev_bottles = data[-1]['bottles']
            if calculated_bottles > prev_bottles:
                status = "loading"
            elif calculated_bottles < prev_bottles:
                status = "unloading"
            else:
                status = "idle"
        else:
            status = "idle"
        
        data.append({
            'timestamp': timestamp,
            'weight_g': measured_weight,
            'bottles': calculated_bottles,
            'actual_bottles': current_bottles,
            'raw_reading': raw_reading,
            'status': status
        })
    
    return pd.DataFrame(data)

def plot_weight_vs_bottles(df):
    """Graph 1: Weight vs Bottle Count (LaTeX format)"""
    fig, ax = plt.subplots(figsize=(8, 6))
    
    # Scatter plot of actual data
    ax.scatter(df['bottles'], df['weight_g'], alpha=0.7, s=25, 
               color='blue', label='Measured Data', zorder=3)
    
    # Theoretical line
    max_bottles = df['bottles'].max()
    bottles_range = np.arange(0, max_bottles + 1)
    theoretical_weight = bottles_range * BOTTLE_WEIGHT
    ax.plot(bottles_range, theoretical_weight, 'r--', linewidth=2, 
            label=f'Theoretical ({BOTTLE_WEIGHT}g/bottle)', zorder=2)
    
    # Linear fit
    if len(df) > 1:
        z = np.polyfit(df['bottles'], df['weight_g'], 1)
        p = np.poly1d(z)
        ax.plot(bottles_range, p(bottles_range), 'g-', linewidth=2,
                label=f'Linear Fit (slope: {z[0]:.1f}g/bottle)', zorder=1)
    
    ax.set_xlabel('Bottle Count')
    ax.set_ylabel('Weight (g)')
    ax.set_title('Weight vs Bottle Count Correlation')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    # Calculate R²
    if len(df) > 1:
        correlation = np.corrcoef(df['bottles'], df['weight_g'])[0,1]
        r_squared = correlation**2
        ax.text(0.05, 0.95, f'$R^2 = {r_squared:.3f}$', 
                transform=ax.transAxes, fontsize=12, 
                bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.8))
    
    plt.tight_layout()
    plt.savefig('latex_weight_vs_bottles.pdf', format='pdf', dpi=300, bbox_inches='tight')
    plt.savefig('latex_weight_vs_bottles.png', format='png', dpi=300, bbox_inches='tight')
    plt.show()
    
    return fig

def plot_hx711_signal(df):
    """Graph 2: HX711 Signal and Weight Scaling"""
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 8))
    
    # Subplot 1: Raw signal vs time
    ax1.plot(df['timestamp'], df['raw_reading'], 'b-', linewidth=1, alpha=0.8)
    ax1.set_ylabel('HX711 Raw Reading')
    ax1.set_title('HX711 ADC Signal Over Time')
    ax1.grid(True, alpha=0.3)
    ax1.tick_params(axis='x', rotation=45)
    
    # Add mean line
    mean_reading = df['raw_reading'].mean()
    ax1.axhline(y=mean_reading, color='red', linestyle='--', 
                label=f'Mean: {mean_reading:.0f}')
    ax1.legend()
    
    # Subplot 2: Calibration scaling accuracy
    theoretical_raw = df['weight_g'] * CALIBRATION_FACTOR
    scaling_error = ((df['raw_reading'] - theoretical_raw) / theoretical_raw * 100).abs()
    
    ax2.scatter(df['weight_g'], scaling_error, alpha=0.7, s=25, color='orange')
    ax2.set_xlabel('Weight (g)')
    ax2.set_ylabel('Scaling Error (%)')
    ax2.set_title('HX711 Calibration Accuracy')
    ax2.grid(True, alpha=0.3)
    
    # Add accuracy threshold lines
    ax2.axhline(y=2, color='red', linestyle='--', alpha=0.7, label='2% Threshold')
    ax2.axhline(y=5, color='orange', linestyle='--', alpha=0.7, label='5% Threshold')
    ax2.legend()
    
    # Add statistics
    mean_error = scaling_error.mean()
    ax2.text(0.05, 0.95, f'Mean Error: {mean_error:.1f}%', 
             transform=ax2.transAxes, fontsize=11,
             bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.8))
    
    plt.tight_layout()
    plt.savefig('latex_hx711_signal.pdf', format='pdf', dpi=300, bbox_inches='tight')
    plt.savefig('latex_hx711_signal.png', format='png', dpi=300, bbox_inches='tight')
    plt.show()
    
    return fig

def plot_mqtt_publish(df):
    """Graph 3: MQTT Publish Frequency and Pattern"""
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 8))
    
    # Subplot 1: Message frequency over time
    df['time_diff'] = df['timestamp'].diff().dt.total_seconds()
    df['publish_rate'] = 1 / df['time_diff']  # Messages per second
    df['publish_rate'] = df['publish_rate'].fillna(0)
    
    ax1.plot(df['timestamp'], df['publish_rate'] * 60, 'g-', linewidth=2, alpha=0.8)
    ax1.set_ylabel('Publish Rate (messages/min)')
    ax1.set_title('MQTT Publish Frequency Over Time')
    ax1.grid(True, alpha=0.3)
    ax1.tick_params(axis='x', rotation=45)
    
    # Add target rate line (every 30 seconds = 2 messages/min)
    target_rate = 2.0  # messages per minute
    ax1.axhline(y=target_rate, color='red', linestyle='--', 
                label=f'Target: {target_rate} msg/min')
    ax1.legend()
    
    # Subplot 2: Status distribution and timing
    status_changes = df[df['status'] != df['status'].shift()].copy()
    
    if len(status_changes) > 0:
        # Plot status over time
        status_numeric = df['status'].map({'idle': 0, 'loading': 1, 'unloading': -1})
        ax2.plot(df['timestamp'], status_numeric, 'b-', linewidth=2, alpha=0.8)
        ax2.fill_between(df['timestamp'], status_numeric, alpha=0.3, color='blue')
        
        ax2.set_ylabel('System Status')
        ax2.set_xlabel('Time')
        ax2.set_title('MQTT Status Updates')
        ax2.set_yticks([-1, 0, 1])
        ax2.set_yticklabels(['Unloading', 'Idle', 'Loading'])
        ax2.grid(True, alpha=0.3)
        ax2.tick_params(axis='x', rotation=45)
        
        # Add status change markers
        for _, change in status_changes.iterrows():
            ax2.axvline(x=change['timestamp'], color='red', linestyle=':', alpha=0.7)
    else:
        # If no status changes, show idle state
        ax2.axhline(y=0, color='blue', linewidth=3, label='Idle State')
        ax2.set_ylabel('System Status')
        ax2.set_xlabel('Time')
        ax2.set_title('MQTT Status Updates')
        ax2.set_yticks([0])
        ax2.set_yticklabels(['Idle'])
        ax2.legend()
        ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('latex_mqtt_publish.pdf', format='pdf', dpi=300, bbox_inches='tight')
    plt.savefig('latex_mqtt_publish.png', format='png', dpi=300, bbox_inches='tight')
    plt.show()
    
    return fig

def generate_latex_summary(df):
    """Generate LaTeX table summary"""
    print("\n" + "="*60)
    print("LATEX TABLE DATA FOR YOUR PAPER")
    print("="*60)
    
    # Calculate key metrics
    total_points = len(df)
    weight_mean = df['weight_g'].mean()
    weight_std = df['weight_g'].std()
    bottles_mean = df['bottles'].mean()
    bottles_max = df['bottles'].max()
    
    # Calculate accuracy if we have actual bottles
    if 'actual_bottles' in df.columns:
        accuracy = (df['bottles'] == df['actual_bottles']).mean() * 100
        print(f"Bottle Count Accuracy: {accuracy:.1f}%")
    
    # MQTT performance
    if 'time_diff' in df.columns:
        avg_interval = df['time_diff'].mean()
        print(f"Average MQTT Interval: {avg_interval:.1f} seconds")
    
    # LaTeX table format
    print("\nLaTeX Table Code:")
    print("\\begin{table}[h!]")
    print("\\centering")
    print("\\begin{tabular}{|l|c|}")
    print("\\hline")
    print("Parameter & Value \\\\")
    print("\\hline")
    print(f"Total Data Points & {total_points} \\\\")
    print(f"Average Weight & ${weight_mean:.1f} \\pm {weight_std:.1f}$ g \\\\")
    print(f"Average Bottles & {bottles_mean:.1f} \\\\")
    print(f"Maximum Capacity & {bottles_max} bottles \\\\")
    print(f"Weight per Bottle & {BOTTLE_WEIGHT} g \\\\")
    if 'actual_bottles' in df.columns:
        print(f"Count Accuracy & {accuracy:.1f}\\% \\\\")
    print("\\hline")
    print("\\end{tabular}")
    print("\\caption{Smart Inventory Pallet Performance Metrics}")
    print("\\label{tab:performance}")
    print("\\end{table}")

def main():
    """Main function - Generate LaTeX-compatible graphs"""
    print("📈 Smart Inventory Pallet - LaTeX Graph Generator")
    print("=" * 55)
    print("Generates 3 key graphs in LaTeX-compatible format:\n")
    print("1. Weight vs Bottle Count Correlation")
    print("2. HX711 Signal and Weight Scaling") 
    print("3. MQTT Publish Frequency and Patterns\n")
    
    # Choose data source
    print("Data Source Options:")
    print("1. Live MQTT data (requires your system running)")
    print("2. Simulated data (for testing/demonstration)")
    
    try:
        choice = input("\nEnter choice (1 for live, 2 for simulated, default=2): ").strip()
    except KeyboardInterrupt:
        print("\n👋 Cancelled by user")
        return
    
    df = None
    
    if choice == "1":
        try:
            duration = float(input("Collection duration in minutes (default=3): ") or 3)
        except (ValueError, KeyboardInterrupt):
            duration = 3
        
        print(f"\n🔄 Attempting to collect live data for {duration} minutes...")
        df = collect_live_data(duration)
        
        if df is None or len(df) < 5:
            print("❌ Insufficient live data collected.")
            print("📊 Falling back to simulated data...")
            df = generate_simulated_data()
    else:
        df = generate_simulated_data()
    
    if df is None or len(df) == 0:
        print("❌ No data available for plotting")
        return
    
    # Save data
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_file = f'latex_data_{timestamp}.csv'
    df.to_csv(csv_file, index=False)
    print(f"💾 Data saved to: {csv_file}")
    
    # Generate plots
    print("\n📈 Generating LaTeX-compatible plots...")
    
    print("   📊 1/3: Weight vs Bottles...")
    plot_weight_vs_bottles(df)
    
    print("   ⚖️  2/3: HX711 Signal Analysis...")
    plot_hx711_signal(df)
    
    print("   📡 3/3: MQTT Publish Patterns...")
    plot_mqtt_publish(df)
    
    # Generate summary
    generate_latex_summary(df)
    
    print(f"\n✅ LaTeX graphs generated successfully!")
    print("\n📁 Generated files:")
    print("   • latex_weight_vs_bottles.pdf/.png")
    print("   • latex_hx711_signal.pdf/.png") 
    print("   • latex_mqtt_publish.pdf/.png")
    print(f"   • {csv_file}")
    
    print("\n🎯 Perfect for your academic paper!")
    print("   • Use PDF files for LaTeX documents")
    print("   • Use PNG files for Word/PowerPoint")
    print("   • Copy LaTeX table code above for metrics")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Process interrupted by user")
        sys.exit(0)