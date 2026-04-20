# CrisisIQ 🌐

**AI-Powered Disaster Resource Allocation & Fairness Analytics Dashboard**  
*Built for the Google Solution Challenge 2026*

CrisisIQ is a real-time disaster management platform designed to optimize the allocation of life-saving resources during critical events. By combining predictive AI with geospatial visualizers, CrisisIQ ensures equitable distribution across affected districts—prioritizing human lives while remaining actively audited for bias.

---

## 🚀 Google Technologies Used

*   **Google Maps Platform:** Interactive map layers, real-time Resource Request Densities (Heatmaps), Places Autocomplete API, and accurate automated driver route rendering via Directions API.
*   **Google Cloud Vertex AI:** Predicts resource needs based on regional severity, real-time demand, and dynamic variables.
*   **Google Firebase (Firestore):** Provides real-time synchronization between citizen requests, transparency audit logs, and command dashboards.
*   **Google Cloud Translation:** Automatic UI-language translation to support seamless collaboration localized for regional contexts.
*   **Google Cloud Speech-to-Text & Vision API:** Processing asynchronous citizen multimedia distress submissions natively in regional dialects.

## 🛠 Setup Instructions

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/crisisiq.git
    cd crisisiq
    ```
2.  **Install dependencies**
    ```bash
    npm install
    ```
3.  **Environment Setup**
    Create a `.env` file in the root directory and add the following keys. Ensure you enable Billing on Google Cloud Console!
    ```env
    VITE_GOOGLE_MAPS_API_KEY=YOUR_MAPS_API_KEY
    VITE_FIREBASE_API_KEY=YOUR_FIREBASE_KEY
    VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
    ```
4.  **Database Seeding (Mock Demo Data)**
    Include the `seedDatabase()` hook from `src/seedData.js` temporarily in your App root to instantiate the Firebase structure.
5.  **Run Development Server**
    ```bash
    npm run dev
    ```

## 🌍 Live Demo
*App preview coming soon!* — [Hosted on Firebase]()

## 👥 Team
*   Team Lead / Developer — (Your Name)
*   AI Integrations — (Teammate)
*   UI/UX Designer — (Teammate)

## 📸 Screenshots
*(Coming Soon)*
