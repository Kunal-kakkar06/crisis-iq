# CrisisIQ 🌐

**AI-Powered Disaster Resource Allocation & Fairness Analytics Dashboard**  
*Built for the Google Solution Challenge 2026*

CrisisIQ is a real-time disaster management platform designed to optimize the allocation of life-saving resources during critical events. By combining predictive AI with geospatial visualizers, CrisisIQ ensures equitable distribution across affected districts—prioritizing human lives while remaining actively audited for bias.

---

### 🌟 Latest Updates (Branch: `latest-update`)
- **Standard Navigation Protocol:** Implemented a ultra-stable navigation system that ensures 100% reliability during page transitions by performing fresh browser reloads for complex map pages.
- **Global Map Architecture:** Migrated to a centralized Google Maps lifecycle management system to prevent API collisions and improve startup performance.
- **System Resilience:** Integrated a root-level **Error Boundary & Repair System** that automatically detects UI crashes and offers a one-click "Repair System" restoration.
- **India-Wide National Scope:** Expanded coverage to 20 key states across India with real-time disaster zone monitoring.

---

## 🚀 Google Technologies Used

*   **Google Maps Platform:** Interactive map layers, real-time Resource Request Densities, Places Autocomplete API, and Directions API for automated driver routing.
*   **Google Cloud Vertex AI:** Predicts resource needs based on regional severity and real-time demand.
*   **Google Firebase (Firestore & RTDB):** Real-time synchronization for citizen requests, transparency audit logs, and system connectivity monitoring.
*   **Google Cloud Translation:** Multi-language support localized for regional Indian contexts.
*   **Google Cloud Gemini API:** Powering the **Gemini Command Center** for natural language disaster queries and situational reports.

## 🛠 Setup Instructions

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/smonishkumar/neurostack.git
    cd crisisiq
    ```
2.  **Install dependencies**
    ```bash
    npm install
    ```
3.  **Environment Setup**
    Create a `.env` file in the `crisisiq` directory:
    ```env
    VITE_GOOGLE_MAPS_API_KEY=YOUR_MAPS_API_KEY
    VITE_FIREBASE_API_KEY=YOUR_FIREBASE_KEY
    VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
    VITE_FIREBASE_DATABASE_URL=YOUR_RTDB_URL
    ```
4.  **Database Seeding**
    Run `node pushData.js` to seed the Realtime Database with mock disaster zones and hospital data.
5.  **Run Development Server**
    ```bash
    npm run dev
    ```


## 🌍 Live Demo
*Live Production Build:* **[https://crisisiq-platform.web.app](https://crisisiq-platform.web.app)**

## 👥 Team
*   **Kunal Kakkar** — Project Lead & Lead Developer
*   AI Integrations — (Teammate)
*   UI/UX Designer — (Teammate)

## 📸 Screenshots
*(Coming Soon)*
