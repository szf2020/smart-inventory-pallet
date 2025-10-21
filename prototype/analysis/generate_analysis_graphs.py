"""
Smart Inventory Pallet - System Performance Analysis
====================================================
This script generates matplotlib graphs for abstract paper demonstrating:
1. Weight vs Bottle Count correlation
2. MQTT communication patterns 
3. HX711 signal scaling accuracy
4. System reliability metrics

Author: Smart Inventory Pallet Team
Date: September 2025
"""

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import seaborn as sns
import matplotlib.dates as mdates
from matplotlib.patches import Rectangle
import warnings
warnings.filterwarnings('ignore')

# Set style for academic papers
plt.style.use('seaborn-v0_8-whitegrid')
sns.set_palette("husl")
plt.rcParams['figure.figsize'] = (12, 8)
plt.rcParams['font.size'] = 10
plt.rcParams['axes.labelsize'] = 12
plt.rcParams['axes.titlesize'] = 14
plt.rcParams['xtick.labelsize'] = 10
plt.rcParams['ytick.labelsize'] = 10
plt.rcParams['legend.fontsize'] = 11

# System Constants from main.cpp
BOTTLE_WEIGHT = 275  # grams per bottle
CALIBRATION_WEIGHT = 172  # grams
HX711_MAX_READING = 8388607  # 24-bit ADC max value
EXPECTED_CALIBRATION_FACTOR = 2280.0  # Typical calibration factor

def generate_simulated_data():
    """Generate realistic data based on system specifications"""
    np.random.seed(42)
    
    # Simulate 24 hours of operation with various loading scenarios
    timestamps = pd.date_range(start='2025-09-29 08:00:00', 
                              end='2025-09-29 20:00:00', 
                              freq='30S')
    
    data = []
    current_bottles = 0
    
    for i, timestamp in enumerate(timestamps):
        # Simulate loading/unloading events
        if i % 120 == 0:  # Every hour, simulate activity
            # Random loading/unloading
            change = np.random.choice([-2, -1, 0, 1, 2], p=[0.2, 0.2, 0.3, 0.2, 0.1])
            current_bottles = max(0, min(15, current_bottles + change))
        
        # Calculate theoretical weight
        theoretical_weight = current_bottles * BOTTLE_WEIGHT
        
        # Add realistic measurement noise (±2% typical for load cells)
        noise_factor = 1 + np.random.normal(0, 0.02)
        measured_weight = max(0, theoretical_weight * noise_factor)
        
        # Calculate bottle count from measured weight
        calculated_bottles = round(measured_weight / BOTTLE_WEIGHT)
        
        # HX711 raw reading simulation
        calibration_factor = EXPECTED_CALIBRATION_FACTOR + np.random.normal(0, 50)
        raw_reading = int((measured_weight * calibration_factor) + np.random.normal(0, 1000))
        
        # MQTT status
        if abs(calculated_bottles - (data[-1]['calculated_bottles'] if data else 0)) > 0:
            status = "loading" if calculated_bottles > (data[-1]['calculated_bottles'] if data else 0) else "unloading"
        else:
            status = "idle"
        
        data.append({
            'timestamp': timestamp,
            'actual_bottles': current_bottles,
            'theoretical_weight': theoretical_weight,
            'measured_weight': measured_weight,
            'calculated_bottles': calculated_bottles,
            'weight_error': abs(measured_weight - theoretical_weight),
            'bottle_error': abs(calculated_bottles - current_bottles),
            'raw_reading': raw_reading,
            'calibration_factor': calibration_factor,
            'status': status,
            'mqtt_success': np.random.choice([True, False], p=[0.97, 0.03])  # 97% success rate
        })
    
    return pd.DataFrame(data)

def plot_weight_vs_bottles(df):
    """Graph 1: Weight vs Bottle Count Correlation"""
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
    fig.suptitle('Smart Inventory Pallet: Weight vs Bottle Count Analysis', fontsize=16, fontweight='bold')
    
    # Subplot 1: Theoretical vs Measured Weight
    ax1.scatter(df['actual_bottles'], df['measured_weight'], alpha=0.6, s=20, label='Measured Weight', color='blue')
    ax1.plot(df['actual_bottles'], df['theoretical_weight'], 'r-', linewidth=2, label='Theoretical (275g/bottle)')
    ax1.set_xlabel('Actual Bottle Count')
    ax1.set_ylabel('Weight (grams)')
    ax1.set_title('A) Measured vs Theoretical Weight')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Subplot 2: Calculated vs Actual Bottles
    ax2.scatter(df['actual_bottles'], df['calculated_bottles'], alpha=0.6, s=20, color='green')
    ax2.plot([0, df['actual_bottles'].max()], [0, df['actual_bottles'].max()], 'r--', 
             linewidth=2, label='Perfect Correlation')
    ax2.set_xlabel('Actual Bottle Count')
    ax2.set_ylabel('Calculated Bottle Count')
    ax2.set_title('B) Bottle Count Accuracy')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # Subplot 3: Weight Measurement Error Distribution
    ax3.hist(df['weight_error'], bins=30, alpha=0.7, color='orange', edgecolor='black')
    ax3.axvline(df['weight_error'].mean(), color='red', linestyle='--', linewidth=2, 
                label=f'Mean Error: {df["weight_error"].mean():.1f}g')
    ax3.set_xlabel('Weight Error (grams)')
    ax3.set_ylabel('Frequency')
    ax3.set_title('C) Weight Measurement Error Distribution')
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    # Subplot 4: System Accuracy Metrics
    accuracy_data = {
        'Perfect Match': sum(df['bottle_error'] == 0) / len(df) * 100,
        'Within ±1 Bottle': sum(df['bottle_error'] <= 1) / len(df) * 100,
        'Within ±2 Bottles': sum(df['bottle_error'] <= 2) / len(df) * 100
    }
    
    bars = ax4.bar(accuracy_data.keys(), accuracy_data.values(), color=['green', 'yellow', 'orange'])
    ax4.set_ylabel('Accuracy (%)')
    ax4.set_title('D) Bottle Count Accuracy Statistics')
    ax4.grid(True, alpha=0.3)
    
    # Add percentage labels on bars
    for bar, value in zip(bars, accuracy_data.values()):
        height = bar.get_height()
        ax4.text(bar.get_x() + bar.get_width()/2., height + 0.5,
                f'{value:.1f}%', ha='center', va='bottom')
    
    plt.tight_layout()
    plt.savefig('weight_vs_bottles_analysis.png', dpi=300, bbox_inches='tight')
    plt.show()

def plot_mqtt_updates(df):
    """Graph 2: MQTT Communication Patterns"""
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
    fig.suptitle('Smart Inventory Pallet: MQTT Communication Analysis', fontsize=16, fontweight='bold')
    
    # Subplot 1: Status Changes Over Time
    status_numeric = df['status'].map({'idle': 0, 'loading': 1, 'unloading': -1})
    ax1.plot(df['timestamp'], status_numeric, marker='o', markersize=3, linewidth=1)
    ax1.set_ylabel('System Status')
    ax1.set_title('A) System Status Changes Over Time')
    ax1.set_yticks([-1, 0, 1])
    ax1.set_yticklabels(['Unloading', 'Idle', 'Loading'])
    ax1.grid(True, alpha=0.3)
    ax1.tick_params(axis='x', rotation=45)
    
    # Subplot 2: MQTT Success Rate Over Time
    # Calculate rolling success rate (30-minute windows)
    df['mqtt_success_numeric'] = df['mqtt_success'].astype(int)
    rolling_success = df['mqtt_success_numeric'].rolling(window=60, min_periods=1).mean() * 100
    
    ax2.plot(df['timestamp'], rolling_success, color='green', linewidth=2)
    ax2.fill_between(df['timestamp'], rolling_success, alpha=0.3, color='green')
    ax2.axhline(y=95, color='red', linestyle='--', label='Target: 95%')
    ax2.set_ylabel('MQTT Success Rate (%)')
    ax2.set_title('B) MQTT Communication Reliability (30-min Rolling)')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    ax2.tick_params(axis='x', rotation=45)
    
    # Subplot 3: Message Frequency Analysis
    # Group by hour and count messages
    df['hour'] = df['timestamp'].dt.hour
    hourly_counts = df.groupby('hour').size()
    
    ax3.bar(hourly_counts.index, hourly_counts.values, color='skyblue', edgecolor='navy')
    ax3.set_xlabel('Hour of Day')
    ax3.set_ylabel('Messages per Hour')
    ax3.set_title('C) MQTT Message Frequency by Hour')
    ax3.grid(True, alpha=0.3)
    
    # Subplot 4: Data Transmission Statistics
    mqtt_stats = {
        'Total Messages': len(df),
        'Successful': sum(df['mqtt_success']),
        'Failed': sum(~df['mqtt_success']),
        'Status Changes': sum(df['status'] != 'idle'),
        'Idle Periods': sum(df['status'] == 'idle')
    }
    
    colors = ['blue', 'green', 'red', 'orange', 'gray']
    bars = ax4.bar(range(len(mqtt_stats)), list(mqtt_stats.values()), color=colors)
    ax4.set_xticks(range(len(mqtt_stats)))
    ax4.set_xticklabels(mqtt_stats.keys(), rotation=45, ha='right')
    ax4.set_ylabel('Count')
    ax4.set_title('D) MQTT Communication Statistics')
    ax4.grid(True, alpha=0.3)
    
    # Add value labels on bars
    for bar, value in zip(bars, mqtt_stats.values()):
        height = bar.get_height()
        ax4.text(bar.get_x() + bar.get_width()/2., height + max(mqtt_stats.values())*0.01,
                f'{value}', ha='center', va='bottom')
    
    plt.tight_layout()
    plt.savefig('mqtt_communication_analysis.png', dpi=300, bbox_inches='tight')
    plt.show()

def plot_hx711_signal_scaling(df):
    """Graph 3: HX711 Signal Processing and Scaling"""
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
    fig.suptitle('Smart Inventory Pallet: HX711 Signal Processing Analysis', fontsize=16, fontweight='bold')
    
    # Subplot 1: Raw ADC Readings vs Weight
    ax1.scatter(df['measured_weight'], df['raw_reading'], alpha=0.6, s=20, color='purple')
    # Add trendline
    z = np.polyfit(df['measured_weight'], df['raw_reading'], 1)
    p = np.poly1d(z)
    ax1.plot(df['measured_weight'], p(df['measured_weight']), "r--", linewidth=2, 
             label=f'Linear Fit: y = {z[0]:.0f}x + {z[1]:.0f}')
    ax1.set_xlabel('Measured Weight (grams)')
    ax1.set_ylabel('HX711 Raw Reading')
    ax1.set_title('A) HX711 Raw ADC vs Weight Correlation')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Subplot 2: Calibration Factor Stability
    ax2.plot(df['timestamp'], df['calibration_factor'], color='blue', linewidth=1, alpha=0.7)
    ax2.axhline(y=EXPECTED_CALIBRATION_FACTOR, color='red', linestyle='--', linewidth=2,
                label=f'Expected Factor: {EXPECTED_CALIBRATION_FACTOR}')
    ax2.fill_between(df['timestamp'], 
                     EXPECTED_CALIBRATION_FACTOR - 100,
                     EXPECTED_CALIBRATION_FACTOR + 100,
                     alpha=0.2, color='red', label='±100 Tolerance')
    ax2.set_ylabel('Calibration Factor')
    ax2.set_title('B) Calibration Factor Stability Over Time')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    ax2.tick_params(axis='x', rotation=45)
    
    # Subplot 3: Signal-to-Noise Ratio Analysis
    # Calculate SNR approximation (simplified approach)
    signal_strength = df['raw_reading'].abs()
    noise_estimate = df['raw_reading'].rolling(window=10).std().fillna(1000)
    # Avoid division by zero and infinite values
    noise_estimate = np.maximum(noise_estimate, 1000)  # Minimum noise floor
    snr_linear = signal_strength / noise_estimate
    snr_db = 20 * np.log10(snr_linear)
    # Filter out infinite and NaN values
    snr_db_clean = snr_db[np.isfinite(snr_db)]
    
    ax3.hist(snr_db_clean, bins=30, alpha=0.7, color='cyan', edgecolor='black')
    ax3.axvline(snr_db_clean.mean(), color='red', linestyle='--', linewidth=2,
                label=f'Mean SNR: {snr_db_clean.mean():.1f} dB')
    ax3.set_xlabel('Signal-to-Noise Ratio (dB)')
    ax3.set_ylabel('Frequency')
    ax3.set_title('C) HX711 Signal Quality Distribution')
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    # Subplot 4: Scaling Accuracy Assessment
    # Calculate theoretical raw reading based on calibration
    theoretical_raw = df['theoretical_weight'] * EXPECTED_CALIBRATION_FACTOR
    scaling_error = abs(df['raw_reading'] - theoretical_raw) / theoretical_raw * 100
    
    ax4.scatter(df['theoretical_weight'], scaling_error, alpha=0.6, s=20, color='orange')
    ax4.axhline(y=2, color='red', linestyle='--', label='2% Error Threshold')
    ax4.axhline(y=5, color='orange', linestyle='--', label='5% Error Threshold')
    ax4.set_xlabel('Theoretical Weight (grams)')
    ax4.set_ylabel('Scaling Error (%)')
    ax4.set_title('D) HX711 Scaling Accuracy vs Load')
    ax4.legend()
    ax4.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('hx711_signal_analysis.png', dpi=300, bbox_inches='tight')
    plt.show()

def generate_summary_report(df):
    """Generate a comprehensive system performance report"""
    print("="*60)
    print("SMART INVENTORY PALLET - PERFORMANCE ANALYSIS REPORT")
    print("="*60)
    print(f"Analysis Period: {df['timestamp'].min()} to {df['timestamp'].max()}")
    print(f"Total Data Points: {len(df):,}")
    print()
    
    # Weight Accuracy Metrics
    print("WEIGHT MEASUREMENT ACCURACY:")
    print("-" * 30)
    print(f"Mean Weight Error: {df['weight_error'].mean():.2f} ± {df['weight_error'].std():.2f} grams")
    print(f"Maximum Weight Error: {df['weight_error'].max():.2f} grams")
    print(f"Weight Accuracy (±5g): {sum(df['weight_error'] <= 5) / len(df) * 100:.1f}%")
    print(f"Weight Accuracy (±10g): {sum(df['weight_error'] <= 10) / len(df) * 100:.1f}%")
    print()
    
    # Bottle Count Accuracy
    print("BOTTLE COUNT ACCURACY:")
    print("-" * 25)
    print(f"Perfect Matches: {sum(df['bottle_error'] == 0) / len(df) * 100:.1f}%")
    print(f"Within ±1 Bottle: {sum(df['bottle_error'] <= 1) / len(df) * 100:.1f}%")
    print(f"Within ±2 Bottles: {sum(df['bottle_error'] <= 2) / len(df) * 100:.1f}%")
    print()
    
    # MQTT Performance
    print("MQTT COMMUNICATION PERFORMANCE:")
    print("-" * 35)
    print(f"Overall Success Rate: {df['mqtt_success'].mean() * 100:.2f}%")
    print(f"Total Messages Sent: {len(df):,}")
    print(f"Successful Transmissions: {sum(df['mqtt_success']):,}")
    print(f"Failed Transmissions: {sum(~df['mqtt_success']):,}")
    print()
    
    # System Status Distribution
    print("SYSTEM OPERATION ANALYSIS:")
    print("-" * 30)
    status_counts = df['status'].value_counts()
    for status, count in status_counts.items():
        print(f"{status.capitalize()}: {count} ({count/len(df)*100:.1f}%)")
    print()
    
    # HX711 Performance
    print("HX711 SENSOR PERFORMANCE:")
    print("-" * 28)
    print(f"Calibration Factor: {df['calibration_factor'].mean():.1f} ± {df['calibration_factor'].std():.1f}")
    print(f"Raw Reading Range: {df['raw_reading'].min():,} to {df['raw_reading'].max():,}")
    print(f"Signal Stability (CV): {(df['raw_reading'].std() / df['raw_reading'].mean() * 100):.2f}%")
    print()
    
    print("="*60)

def main():
    """Main function to generate all analysis graphs"""
    print("Generating Smart Inventory Pallet Analysis...")
    print("=" * 50)
    
    # Generate simulated data based on system specifications
    print("📊 Generating simulated data...")
    df = generate_simulated_data()
    
    # Save data for reference
    df.to_csv('system_performance_data.csv', index=False)
    print("💾 Data saved to: system_performance_data.csv")
    
    print("\n📈 Generating Weight vs Bottle Count Analysis...")
    plot_weight_vs_bottles(df)
    
    print("📡 Generating MQTT Communication Analysis...")
    plot_mqtt_updates(df)
    
    print("⚖️ Generating HX711 Signal Analysis...")
    plot_hx711_signal_scaling(df)
    
    print("\n📋 Generating Performance Report...")
    generate_summary_report(df)
    
    print("\n✅ Analysis Complete! Generated files:")
    print("   • weight_vs_bottles_analysis.png")
    print("   • mqtt_communication_analysis.png") 
    print("   • hx711_signal_analysis.png")
    print("   • system_performance_data.csv")
    print("\n🎯 All graphs are ready for your abstract paper!")

if __name__ == "__main__":
    main()