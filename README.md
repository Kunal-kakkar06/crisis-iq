# CrisisIQ 🌐

## AI-Powered Disaster Resource Allocation & Fairness Analytics System

*Built for Google Solution Challenge 2026*

CrisisIQ is an AI-powered disaster management system that ensures **fast, fair, and explainable allocation of life-saving resources** during emergencies.

Unlike traditional dashboards, CrisisIQ acts as a **decision-making and execution system**, helping authorities respond intelligently in real time.

---

## 🚨 Problem Statement

> Disaster response doesn’t fail due to lack of resources —
> it fails due to **misallocation, delays, and lack of real-time coordination**.

CrisisIQ solves this by combining **AI prediction, real-time data, and fairness analytics** into a unified platform.

---

## 🧠 How CrisisIQ Works

1. **Crisis Detection**
   Disaster events (floods, earthquakes, etc.) are identified

2. **Data Collection**

   * Citizen SOS requests
   * Sensors & APIs
   * Government & NGO data

3. **AI Processing (Vertex AI)**

   * Predicts severity
   * Estimates resource demand

4. **Smart Allocation Engine**
   Resources distributed based on:

   * Severity
   * Distance
   * Urgency

5. **Real-Time Visualization**

   * Google Maps shows demand & supply
   * Live tracking of response

6. **Monitoring & Feedback Loop**

   * Continuous updates
   * System learns and improves

---

## 🏆 Why CrisisIQ is Different

* ⚡ Not just a dashboard — **full decision + execution system**
* 🤖 **AI-driven real-time allocation**, not manual coordination
* ⚖️ Built-in **fairness engine** to prevent bias
* 🔍 **Explainable decisions** with audit logs
* 🌐 **Unified coordination** across govt, NGOs, responders
* 📡 Works even in **low connectivity scenarios**

---

## 🌟 Key Features

* 📊 Real-time resource tracking (ambulances, food, rescue teams)
* 🗺️ Hybrid disaster map (citizen + satellite data)
* ⚠️ Severity scoring & prioritization
* 🚚 AI-based smart resource allocation
* ⚖️ Fairness engine for equitable distribution
* 📜 Transparency & audit system

---

## 📊 Impact

* 🌍 Covers **20+ states across India**
* ⚡ Real-time updates with low latency
* 🤖 AI improves allocation efficiency
* ⚖️ Prevents resource bias in critical situations
* 🚑 Enables faster response during the **first critical hours**

---

## 🚀 Google Technologies Used

* **Google Maps Platform** → Visualization, routing, geospatial data
* **Google Cloud Vertex AI** → Prediction & allocation intelligence
* **Firebase (Firestore + RTDB)** → Real-time data sync
* **Google Cloud Translation** → Multi-language support
* **Google Gemini API** → Natural language command center

---

## 🏗️ System Architecture (Simplified)

```
User Requests → Firebase → Vertex AI → Allocation Engine → Google Maps → Dashboard
```

---

## 🌍 Live Demo

🔗 [https://crisisiq-platform.web.app](https://crisisiq-platform.web.app)

---

## 🎥 Demo Video

🔗 [https://drive.google.com/drive/folders/1ur3k8zDUygJIZhBDTUKWvRbKtodOlul?usp=sharing](https://drive.google.com/drive/folders/1ur3k8zDUygJIZhBDTUKWvRbKtodOlul?usp=sharing)

---

## 🛠 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/smonishkumar/neurostack.git
cd crisisiq
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create `.env` file:

```env
VITE_GOOGLE_MAPS_API_KEY=YOUR_MAPS_API_KEY
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_KEY
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_DATABASE_URL=YOUR_RTDB_URL
```

### 4. Seed Database

```bash
node pushData.js
```

### 5. Run Project

```bash
npm run dev
```

---

## 📸 Screenshots

<img width="1201" height="742" alt="Screenshot 2026-04-28 at 4 45 06 PM" src="https://github.com/user-attachments/assets/09c93383-242c-450e-b748-646d39fb9496" />
<img width="1201" height="577" alt="Screenshot 2026-04-28 at 4 45 24 PM" src="https://github.com/user-attachments/assets/f1bd5ed8-0f17-4cad-8a8f-69efa714e1c5" />
<img width="1215" height="756" alt="Screenshot 2026-04-28 at 4 45 58 PM" src="https://github.com/user-attachments/assets/34726e72-8ab7-454d-aba0-d27a30ceeab5" />
<img width="615" height="402" alt="Screenshot 2026-04-28 at 4 46 22 PM" src="https://github.com/user-attachments/assets/0e38d003-8378-4c8a-a058-c9b6a8ae8a32" />
<img width="1223" height="787" alt="Screenshot 2026-04-28 at 4 46 57 PM" src="https://github.com/user-attachments/assets/8efde3f1-7822-4387-a105-9a885d2df95e" />

## 👥 Team

* **Kunal Kakkar** — Project Lead & Lead Developer
* **Monish Kumar S** — Backend & System Integration
* AI Integrations — Yatharth VijayVargiya
* UI/UX Designer — Shaurya 

---

## 🔮 Future Enhancements

* 📈 Higher prediction accuracy
* 🔐 Advanced security & compliance
* 🤝 Real-time collaboration tools
* 🌐 Multi-language expansion
* 📊 Improved analytics & reporting

---

## 📌 Final Note

CrisisIQ is designed to become a **national-level disaster intelligence backbone**, enabling faster, smarter, and fairer emergency response systems.
