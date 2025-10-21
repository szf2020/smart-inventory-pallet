"""
Real-time MQTT Data Collector and Visualizer
============================================
This script connects to your MQTT broker and collects real data from your 
Smart Inventory Pallet system for analysis and visualization.

Run this script while your system is operating to collect actual data
for your abstract paper graphs.
"""

import paho.mqtt.client as mqtt
import json
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime, timedelta
import time
import threading
import signal
import sys

# MQTT Configuration (matches your system)
MQTT_BROKER = "broker.hivemq.com"
MQTT_TOPICS = [
    "bottle-scale/weight",
    "bottle-scale/bottles", 
    "bottle-scale/status",
    "bottle-scale/data"
]

# Data storage
collected_data = []
is_collecting = False

def on_connect(client, userdata, flags, rc):
    """Callback for when the MQTT client connects"""
    if rc == 0:
        print("✅ Connected to MQTT broker")
        for topic in MQTT_TOPICS:
            client.subscribe(topic)
            print(f"📡 Subscribed to: {topic}")
    else:
        print(f"❌ Failed to connect to MQTT broker, return code {rc}")

def on_message(client, userdata, msg):
    """Callback for when an MQTT message is received"""
    global collected_data, is_collecting
    
    if not is_collecting:
        return
    
    try:
        topic = msg.topic
        timestamp = datetime.now()
        
        if topic == "bottle-scale/data":
            # Parse JSON data
            data = json.loads(msg.payload.decode())
            data['timestamp'] = timestamp
            data['topic'] = topic
            collected_data.append(data)
            print(f"📊 Data: {data['bottles']} bottles, {data['weight_g']}g, {data['status']}")
            
        else:
            # Parse individual topic data
            payload = msg.payload.decode()
            data_point = {
                'timestamp': timestamp,
                'topic': topic,
                'value': payload
            }
            collected_data.append(data_point)
            print(f"📨 {topic}: {payload}")
            
    except Exception as e:
        print(f"❌ Error parsing message: {e}")

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    global is_collecting
    print('\n🛑 Stopping data collection...')
    is_collecting = False
    
def collect_data_for_duration(duration_minutes=10):
    """Collect MQTT data for specified duration"""
    global is_collecting, collected_data
    
    print(f"🔄 Starting data collection for {duration_minutes} minutes...")
    print("📋 Make sure your Smart Inventory Pallet is running and publishing to MQTT!")
    print("💡 Try adding/removing bottles during collection for better data variety")
    print("⌨️  Press Ctrl+C to stop early\n")
    
    # Setup MQTT client
    client = mqtt.Client(client_id=f"data_collector_{int(time.time())}")
    client.on_connect = on_connect
    client.on_message = on_message
    
    # Connect to broker
    try:
        client.connect(MQTT_BROKER, 1883, 60)
        client.loop_start()
        
        # Start collecting
        is_collecting = True
        signal.signal(signal.SIGINT, signal_handler)
        
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)
        
        while is_collecting and time.time() < end_time:
            remaining = end_time - time.time()
            print(f"⏱️  Collecting data... {remaining/60:.1f} minutes remaining", end='\r')
            time.sleep(1)
        
        is_collecting = False
        client.loop_stop()
        client.disconnect()
        
        print(f"\n✅ Data collection complete! Collected {len(collected_data)} messages")
        return collected_data
        
    except Exception as e:
        print(f"❌ Error connecting to MQTT broker: {e}")
        return []

def process_collected_data(data):
    """Process raw MQTT data into analysis format"""
    if not data:
        print("❌ No data to process")
        return None
    
    # Separate JSON data from individual topics
    json_data = [d for d in data if d.get('topic') == 'bottle-scale/data']
    
    if not json_data:
        print("❌ No JSON data found. Make sure your system is publishing to 'bottle-scale/data'")
        return None
    
    # Convert to DataFrame
    df = pd.DataFrame(json_data)
    
    # Clean and process data
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')
    
    # Calculate derived metrics
    df['weight_error'] = 0  # Would need actual vs measured comparison
    df['bottle_accuracy'] = 100.0  # Placeholder
    
    print(f"📊 Processed {len(df)} data points")
    print(f"⏰ Time range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    print(f"⚖️  Weight range: {df['weight_g'].min()}g to {df['weight_g'].max()}g")
    print(f"🍾 Bottle range: {df['bottles'].min()} to {df['bottles'].max()} bottles")
    
    return df

def plot_realtime_data(df):
    """Generate plots from real collected data"""
    if df is None or len(df) == 0:
        print("❌ No data to plot")
        return
    
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle('Smart Inventory Pallet: Real-Time Data Analysis', fontsize=16)
    
    # Plot 1: Weight vs Time
    ax1.plot(df['timestamp'], df['weight_g'], 'b-', marker='o', markersize=3, linewidth=1)
    ax1.set_ylabel('Weight (grams)')
    ax1.set_title('Weight Measurements Over Time')
    ax1.grid(True, alpha=0.3)
    ax1.tick_params(axis='x', rotation=45)
    
    # Plot 2: Bottle Count vs Time  
    ax2.plot(df['timestamp'], df['bottles'], 'g-', marker='s', markersize=4, linewidth=2)
    ax2.set_ylabel('Bottle Count')
    ax2.set_title('Bottle Count Over Time')
    ax2.grid(True, alpha=0.3)
    ax2.tick_params(axis='x', rotation=45)
    
    # Plot 3: Weight vs Bottles Correlation
    ax3.scatter(df['bottles'], df['weight_g'], alpha=0.7, s=30)
    # Add theoretical line
    max_bottles = df['bottles'].max()
    theoretical_x = np.arange(0, max_bottles + 1)
    theoretical_y = theoretical_x * 275  # 275g per bottle
    ax3.plot(theoretical_x, theoretical_y, 'r--', linewidth=2, label='Theoretical (275g/bottle)')
    ax3.set_xlabel('Bottle Count')
    ax3.set_ylabel('Weight (grams)')
    ax3.set_title('Weight vs Bottle Count Correlation')
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    # Plot 4: Status Distribution
    status_counts = df['status'].value_counts()
    colors = {'idle': 'gray', 'loading': 'blue', 'unloading': 'orange'}
    bar_colors = [colors.get(status, 'purple') for status in status_counts.index]
    
    bars = ax4.bar(status_counts.index, status_counts.values, color=bar_colors)
    ax4.set_ylabel('Frequency')
    ax4.set_title('System Status Distribution')
    ax4.grid(True, alpha=0.3)
    
    # Add count labels on bars
    for bar, count in zip(bars, status_counts.values):
        height = bar.get_height()
        ax4.text(bar.get_x() + bar.get_width()/2., height + 0.5,
                f'{count}', ha='center', va='bottom')
    
    plt.tight_layout()
    plt.savefig('realtime_data_analysis.png', dpi=300, bbox_inches='tight')
    plt.show()

def main():
    """Main function for real-time data collection and analysis"""
    print("🔬 Smart Inventory Pallet - Real-Time Data Collector")
    print("=" * 55)
    print("This tool collects live data from your MQTT system for analysis\n")
    
    # Get collection duration
    try:
        duration = float(input("Enter collection duration in minutes (default 5): ") or 5)
    except ValueError:
        duration = 5
    
    # Collect data
    data = collect_data_for_duration(duration)
    
    if not data:
        print("❌ No data collected. Please check:")
        print("   • Your Smart Inventory Pallet system is running")
        print("   • MQTT broker is accessible")
        print("   • System is publishing to correct topics")
        return
    
    # Process and analyze
    df = process_collected_data(data)
    
    if df is not None:
        # Save raw data
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_filename = f'realtime_data_{timestamp}.csv'
        df.to_csv(csv_filename, index=False)
        print(f"💾 Raw data saved to: {csv_filename}")
        
        # Generate plots
        plot_realtime_data(df)
        print(f"📈 Analysis plot saved to: realtime_data_analysis.png")
        
        # Print summary statistics
        print(f"\n📊 DATA SUMMARY:")
        print(f"   Collection Duration: {(df['timestamp'].max() - df['timestamp'].min()).total_seconds()/60:.1f} minutes")
        print(f"   Total Messages: {len(df)}")
        print(f"   Average Weight: {df['weight_g'].mean():.1f}g")
        print(f"   Average Bottles: {df['bottles'].mean():.1f}")
        print(f"   Weight per Bottle: {df['weight_g'].sum()/df['bottles'].sum():.1f}g" if df['bottles'].sum() > 0 else "   Weight per Bottle: N/A")
        
        status_dist = df['status'].value_counts()
        print(f"   Status Distribution:")
        for status, count in status_dist.items():
            print(f"      {status}: {count} ({count/len(df)*100:.1f}%)")

if __name__ == "__main__":
    main()