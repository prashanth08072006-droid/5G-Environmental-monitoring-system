# EcoSense 5G — Hardware Engineering & Field Deployment Guide

## 1. Prototype Bill of Materials (BOM)

| Component | Part / Model | Purpose / Specifications | Interface |
| :--- | :--- | :--- | :--- |
| **Microcontroller** | ESP32-WROOM-32D / ESP32-S3 | Dual Xtensa 32-bit LX6 @ 240MHz, 520KB SRAM | I2C, SPI, 3x UART |
| **5G Cellular Modem** | SIMCom SIM8200EA-M2 / Quectel RM500Q | 5G NR Sub-6GHz (Rel-16), 4G LTE-A Cat 20 Fallback | UART / USB 3.0 |
| **Particulate Sensor** | Plantower PMS5003 | Laser particle scattering ($0.3\mu m$ to $10\mu m$) | UART2 (9600 baud) |
| **Meteorological Unit** | Bosch Sensortec BME280 | Barometric pressure, temperature, relative humidity | I2C (Address 0x76) |
| **Hazardous Gas Sensor** | Winsen MQ-135 / MQ-7 | SnO2 electrochemical for CO, NO2, NH3, VOCs | Analog ADC1 (12-bit) |
| **Power Management** | TP4056 + MP2307 DC-DC Step Down | 3.7V 18650 Li-Ion (3400mAh) + 5V/3A 5G power rail | Micro-USB / Solar |
| **Antenna** | 4x Omnidirectional 5G NR Blade | 600MHz - 6000MHz SMA Dipole | IPEX to SMA |

---

## 2. Wiring & Pinout Diagram

```
+-----------------------------------------------------------------------+
|                             ESP32 Microcontroller                     |
|                                                                       |
|  [GPIO 21 (SDA)] <---------------------> BME280 [SDA]                 |
|  [GPIO 22 (SCL)] <---------------------> BME280 [SCL]                 |
|                                                                       |
|  [GPIO 16 (RX2)] <---------------------> PMS5003 [TX (Pin 4)]         |
|  [GPIO 17 (TX2)] <---------------------> PMS5003 [RX (Pin 5)]         |
|                                                                       |
|  [GPIO 26 (RX1)] <---------------------> SIM8200 5G [TXD]             |
|  [GPIO 27 (TX1)] <---------------------> SIM8200 5G [RXD]             |
|  [GPIO 04 (PWR)] <---------------------> SIM8200 5G [PWRKEY]          |
|                                                                       |
|  [GPIO 34 (ADC)] <---------------------> MQ-135 [AOUT (Analog Out)]   |
|                                                                       |
|  [3.3V / GND]    <---------------------> Sensor VCC / Ground          |
|  [5.0V / 3A]     <---------------------> SIM8200 Modem VCC Rail       |
+-----------------------------------------------------------------------+
```

---

## 3. Power Consumption & Field Battery Life Analysis

- **Sensor Steady-State Current:**
  - ESP32 active processing: $\approx 80\text{ mA}$
  - PMS5003 laser diode & fan: $\approx 100\text{ mA}$
  - BME280 environmental module: $< 1\text{ mA}$
  - MQ-135 internal heater: $\approx 150\text{ mA}$
  - SIM8200 5G modem (URLLC burst transmit): up to $1.2\text{ A}$ peak, $45\text{ mA}$ idle.
- **Power Budget with 10W Solar Panel & 6800mAh Battery Pack:**
  - 24/7 continuous operation with 3-day autonomy under cloudy monsoon conditions.

---

## 4. Calibration & QA Protocol

1. **Zero-Point Calibration:** Calibrate MQ sensors in clean zero-air chamber for 24 hours to establish $R_0$ baseline resistance.
2. **Relative Humidity Compensation:** Laser particulate sensors exhibit hygroscopic growth in ambient humidity $> 70\%$. Apply empirical equation:
$$PM_{corrected} = \frac{PM_{raw}}{1.0 + 0.25 \times (RH / 100)^2}$$
3. **Reference Comparison:** Co-locate prototype alongside reference Continuous Ambient Air Quality Monitoring Station (CAAQMS) for 7 days to derive regression slope and offset coefficients.
