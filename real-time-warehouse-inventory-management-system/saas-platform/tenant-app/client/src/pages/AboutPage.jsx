import React, { useState, useEffect } from 'react';
import { Github, Download, Cpu, Wifi, Activity, CheckCircle, ArrowRight, Zap, Database, FileText } from 'lucide-react';

const AboutPage = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState({});

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible((prev) => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting,
          }));
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[id]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const HardwareCard = ({ title, description, reason, icon: Icon, delay }) => (
    <div
      className={`p-6 rounded-xl border border-gray-200 bg-white hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 ${
        isVisible.hardware ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3 mb-3">
        {Icon && <Icon className="w-6 h-6 text-red-600" />}
        <h4 className="font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {title}
        </h4>
      </div>
      <p className="text-sm text-gray-600 mb-2">{description}</p>
      <p className="text-xs text-red-600 font-semibold">✓ {reason}</p>
    </div>
  );

  const FeatureItem = ({ text, delay }) => (
    <div
      className={`flex items-start gap-3 transition-all duration-500 ${
        isVisible.features ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <CheckCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <span className="text-gray-700">{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Open Sans, sans-serif' }}>
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 bg-red-600 opacity-5 rounded-full blur-3xl"
          style={{
            top: '10%',
            left: '20%',
            transform: `translateY(${scrollY * 0.3}px)`,
          }}
        />
        <div
          className="absolute w-96 h-96 bg-gray-900 opacity-5 rounded-full blur-3xl"
          style={{
            bottom: '20%',
            right: '10%',
            transform: `translateY(${-scrollY * 0.2}px)`,
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section
          id="hero"
          className={`transition-all duration-1000 ${
            isVisible.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="bg-gradient-to-br from-red-600 to-black rounded-3xl shadow-2xl p-8 md:p-12 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-400 opacity-10 rounded-full -ml-24 -mb-24" />
            
            <div className="relative z-10">
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Smart Inventory Pallet
              </h1>
              <p className="text-xl md:text-2xl mb-2 text-red-100">
                Automating Warehouse Inventory Management with IoT, Load Cells, and NFC Integration
              </p>
              <p className="text-lg mb-8 text-red-50 max-w-4xl">
                A next-generation embedded system that automates loading and unloading tracking for beverage distribution
                agencies through real-time weight sensing, NFC vehicle identification, and seamless SaaS cloud integration.
              </p>

              <div className="flex flex-wrap gap-4">
                <a
                  href="https://github.com/chameerakhd/smart-inventory-pallet"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                >
                  <Github className="w-5 h-5" />
                  View on GitHub
                </a>
                <a
                  href="/Smart_Inventory_Pallet_Research_Paper.pdf"
                  download
                  className="inline-flex items-center gap-2 bg-red-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-800 transition-all transform hover:scale-105 shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  Download Research Paper
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Why Smart Inventory Pallet? */}
        <section
          id="why"
          className={`mt-16 transition-all duration-1000 delay-100 ${
            isVisible.why ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2
              className="text-3xl md:text-4xl font-bold text-black mb-6"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Why Smart Inventory Pallet?
            </h2>
            
            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-6 py-4 text-left font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Traditional Method Challenges
                    </th>
                    <th className="px-6 py-4 text-left font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Smart Inventory Pallet Solution
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-6 py-4 text-gray-700">❌ Manual counting of crates leads to human errors</td>
                    <td className="px-6 py-4 text-gray-700">✅ Automated weight-based detection eliminates counting errors</td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="px-6 py-4 text-gray-700">❌ Time-consuming data entry into records</td>
                    <td className="px-6 py-4 text-gray-700">✅ Real-time cloud updates via MQTT & REST APIs</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-6 py-4 text-gray-700">❌ No real-time visibility of inventory status</td>
                    <td className="px-6 py-4 text-gray-700">✅ Live dashboard with instant stock updates</td>
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="px-6 py-4 text-gray-700">❌ Difficult to track vehicle-specific transactions</td>
                    <td className="px-6 py-4 text-gray-700">✅ NFC-based vehicle identification system</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-6 py-4 text-gray-700">❌ Paper-based records prone to loss/damage</td>
                    <td className="px-6 py-4 text-gray-700">✅ Cloud storage with permanent digital records</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-gradient-to-r from-red-50 to-gray-50 rounded-xl p-6 border-l-4 border-red-600">
              <h3 className="text-xl font-bold mb-3 text-black" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Innovation Highlights
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span>First IoT-enabled inventory pallet designed specifically for beverage distribution</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span>Seamless integration of load cells, NFC, and cloud technologies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span>Zero manual intervention required - fully automated workflow</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span>Multi-tenant SaaS platform supporting multiple warehouses simultaneously</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 bg-black text-white rounded-xl p-6">
              <p className="text-lg font-semibold text-center">
                <span className="text-red-400">Outcome:</span> 95% reduction in manual data entry, 
                100% accuracy in stock tracking, and real-time visibility across the entire supply chain.
              </p>
            </div>
          </div>
        </section>

        {/* System Overview */}
        <section
          id="overview"
          className={`mt-16 transition-all duration-1000 delay-300 ${
            isVisible.overview ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2
              className="text-3xl md:text-4xl font-bold text-black mb-6"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Project Overview
            </h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 leading-relaxed mb-4">
                The Smart Inventory Pallet is an IoT-enabled embedded solution designed to automate warehouse inventory
                management. Using a single <strong className="text-red-600">10 kg load cell</strong> integrated with an HX711 amplifier, the system continuously
                monitors weight variations during the loading and unloading of beverage crates.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Each pallet is equipped with a <strong className="text-red-600">PN532 NFC reader</strong> that identifies delivery vehicles via NFC cards.
                Tap-based interactions trigger system events such as <strong className="text-black">start loading</strong>,{' '}
                <strong className="text-black">submit record</strong>, and{' '}
                <strong className="text-black">start unloading</strong>.
              </p>
              <p className="text-gray-700 leading-relaxed">
                The data is then transmitted to a cloud-based SaaS platform via MQTT and REST APIs, automatically updating
                warehouse records without manual entry.
              </p>
            </div>
          </div>
        </section>

        {/* Architecture Diagram */}
        <section
          id="architecture"
          className={`mt-16 transition-all duration-1000 delay-400 ${
            isVisible.architecture ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2
              className="text-3xl md:text-4xl font-bold text-black mb-4"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Architecture Diagram
            </h2>
            <p className="text-gray-600 mb-6">
              This architecture illustrates the flow of data from physical sensors to the cloud platform.
            </p>
            <div className="rounded-xl overflow-hidden border-2 border-black shadow-lg bg-gradient-to-br from-gray-50 to-white p-6">
              <img
                src="/architecture-diagram.png"
                alt="System Architecture Diagram"
                className="w-full h-auto rounded-lg hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </section>

        {/* Hardware Configuration */}
        <section
          id="hardware"
          className={`mt-16 transition-all duration-1000 delay-500 ${
            isVisible.hardware ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2
              className="text-3xl md:text-4xl font-bold text-black mb-8"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Hardware Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <HardwareCard
                title="ESP32"
                description="Microcontroller with Wi-Fi and Bluetooth"
                reason="Enables cloud connectivity"
                icon={Cpu}
                delay={0}
              />
              <HardwareCard
                title="HX711 ADC"
                description="24-bit amplifier for load cell"
                reason="High accuracy for weight sensing"
                icon={Activity}
                delay={100}
              />
              <HardwareCard
                title="Load Cell (10 kg)"
                description="Measures weight changes"
                reason="Detects load/unload events"
                icon={Database}
                delay={200}
              />
              <HardwareCard
                title="PN532 NFC Reader"
                description="Reads NFC cards/tags"
                reason="Identifies vehicles and triggers actions"
                icon={Wifi}
                delay={300}
              />
              <HardwareCard
                title="LED Indicators"
                description="Blue, Green, Red LEDs"
                reason="Show operational status (Ready, Submit, Unload)"
                icon={Zap}
                delay={400}
              />
            </div>

            <div className="rounded-xl overflow-hidden border-2 border-black shadow-lg bg-gradient-to-br from-gray-50 to-white p-6">
              <h3 className="font-semibold text-lg mb-4 text-gray-800">Hardware Setup</h3>
              <div className="rounded-lg overflow-hidden flex justify-center">
                <img
                  src="/hardware-setup.png"
                  alt="Hardware Setup"
                  className="h-auto hover:scale-105 transition-transform duration-500"
                  style={{ maxWidth: '500px', width: '100%' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features & Implementation */}
        <section
          id="features"
          className={`mt-16 transition-all duration-1000 delay-600 ${
            isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2
              className="text-3xl md:text-4xl font-bold text-black mb-8"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Features & Implementation
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Key Features
                </h3>
                <div className="space-y-3">
                  <FeatureItem text="Real-time automatic stock tracking" delay={0} />
                  <FeatureItem text="NFC-based vehicle identification" delay={100} />
                  <FeatureItem text="REST + MQTT Cloud Integration" delay={200} />
                  <FeatureItem text="Intelligent load/unload event detection" delay={300} />
                  <FeatureItem text="User-friendly LED indication system" delay={400} />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Technologies Used
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-600">
                    <Cpu className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900">Hardware</div>
                      <div className="text-sm text-gray-600">ESP32, HX711, PN532, Load Cell (10kg)</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-l-4 border-black">
                    <Activity className="w-5 h-5 text-black mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900">Software</div>
                      <div className="text-sm text-gray-600">PlatformIO (C++), Node.js, React</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-600">
                    <Wifi className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900">Cloud</div>
                      <div className="text-sm text-gray-600">MQTT Broker, RESTful APIs</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-l-4 border-black">
                    <Github className="w-5 h-5 text-black mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900">Version Control</div>
                      <div className="text-sm text-gray-600">
                        <a
                          href="https://github.com/chameerakhd/smart-inventory-pallet"
                          className="text-red-600 hover:underline"
                        >
                          GitHub Repository
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product Showcase */}
        <section
          id="product"
          className={`mt-16 transition-all duration-1000 delay-700 ${
            isVisible.product ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2
              className="text-3xl md:text-4xl font-bold text-black mb-6"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Product Showcase
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl overflow-hidden border-2 border-red-600 shadow-lg hover:shadow-2xl transition-shadow duration-300">
                <img
                  src="/product-image-1.jpeg"
                  alt="Smart Inventory Pallet - View 1"
                  className="w-full h-auto hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="rounded-xl overflow-hidden border-2 border-red-600 shadow-lg hover:shadow-2xl transition-shadow duration-300">
                <img
                  src="/product-image-2.jpeg"
                  alt="Smart Inventory Pallet - View 2"
                  className="w-full h-auto hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
            <p className="text-center text-gray-600 mt-6 italic">
              Prototype design showcasing the integrated load cell, NFC reader, and ESP32 microcontroller
            </p>
          </div>
        </section>

        {/* Research Paper Download */}
        <section
          id="download"
          className={`mt-16 transition-all duration-1000 delay-800 ${
            isVisible.download ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="bg-gradient-to-r from-red-600 to-black rounded-2xl shadow-lg p-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Download Research Paper
                </h2>
                <p className="text-red-100">
                  Download the complete project documentation and research publication to explore the detailed methodology,
                  performance analysis, and implementation insights.
                </p>
              </div>
              <a
                href="/Smart_Inventory_Pallet_Research_Paper.pdf"
                download
                className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl whitespace-nowrap"
              >
                <Download className="w-6 h-6" />
                Download PDF
              </a>
            </div>
          </div>
        </section>

        {/* Future Enhancements & References */}
        <section
          id="future"
          className={`mt-16 transition-all duration-1000 delay-900 ${
            isVisible.future ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2
                className="text-2xl md:text-3xl font-bold text-black mb-6"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Future Enhancements
              </h2>
              <ul className="space-y-3">
                {[
                  'Smart Pallet Network – Connect multiple pallets for full warehouse automation and synchronized inventory tracking.',
                  'Cloud AI Analytics – Predict demand, optimize stock flow, and generate smart insights.',
                  'Machine Vision Integration – Identify bottle types and sizes automatically during loading.',
                  'Smart Power Management – Introduce energy-efficient operation with low-power modes or solar options.',
                  'ERP/SaaS Integration – Sync pallet data with enterprise and cloud platforms seamlessly.',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <ArrowRight className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2
                className="text-2xl md:text-3xl font-bold text-black mb-6"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                References
              </h2>
              <ol className="space-y-3 text-sm text-gray-700">
                <li>[1] Kodmy, "Amazon Dash Smart Shelf – Smart Online Shopping," Kodmy, Jun. 30, 2025.</li>
                <li>
                  [2] Adafruit Industries, "HX711 24-Bit ADC Breakout Board," Adafruit Learning System, 2023.
                </li>
                <li>
                  [3] Kamble, V. A., Shinde, V. D., and Kittur, J. K., "Overview of Load Cells," Journal of Mechanical and
                  Mechanics Engineering, 2021.
                </li>
                <li>
                  [4] Zhang et al., "The Application of NFC Verification System in Warehouse Management System,"
                  ResearchGate, 2016.
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 text-center pb-8">
          <div className="inline-block bg-white rounded-2xl shadow-lg p-8 border-t-4 border-red-600">
            <h3 className="text-xl font-bold text-black mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Developed by Dinith Chameera
            </h3>
            <p className="text-gray-600 mb-3">B.Sc. (Hons) in Computer Science & Engineering</p>
            <p className="text-gray-600 mb-4">University of Moratuwa</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <a href="mailto:dinith.22@cse.mrt.ac.lk" className="text-red-600 hover:underline">
                📧 dinith.22@cse.mrt.ac.lk
              </a>
              <span className="text-gray-400">|</span>
              <a
                href="https://github.com/chameerakhd/smart-inventory-pallet.git"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-red-600 hover:underline"
              >
                <Github className="w-4 h-4" />
                GitHub Repository
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AboutPage;
