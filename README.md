# RoamAgent AI — Intelligent Agentic Travel Planner

RoamAgent AI is a modern, responsive, full-stack AI-powered travel planning web application that functions as an intelligent travel concierge. It extracts travel constraints from natural language and multilingual voice input, interfaces with transport and weather data adapters, constructs a time-aware directed transport graph, calculates deterministic door-to-door costs, evaluates Pareto-optimal travel alternatives, and communicates with travelers through voice and text.

---

## Key Features

1. **Agentic Conversational Planning**
   - Natural language understanding powered by Google Gemini (`gemini-3.8-flash`).
   - Extracts starting point, destination, dates, arrival deadlines, passenger counts, budgets, preferred/excluded transit modes, comfort, accessibility, luggage, and safety preferences.
   - Asks concise follow-up questions when essential travel details are missing.

2. **Graph-Based Itinerary Planning (Directed Time-Aware Graph)**
   - Models the journey as a directed acyclic transport graph (DAG) with nodes for Origin Door, First-Mile pickup, Terminals/Stations/Airports, Main Intercity Transit, Transfer Hubs, Last-Mile, and Destination Door.
   - Edges store departure/arrival schedules, monetary cost, duration, distance, waiting buffers, and reliability confidence.
   - Multi-criteria Pareto optimization ranks 3 distinct alternatives:
     - **Best Overall (Recommended)**: Balanced Pareto score considering deadlines, buffers, and comfort.
     - **Cheapest Feasible**: Minimizes total door-to-door group expenditure.
     - **Fastest Feasible**: Minimizes total travel duration.

3. **Deterministic Door-to-Door Cost Engine**
   - Exact cost formula:
     $$\text{Total Cost} = \text{first-mile} + \text{main fares} + \text{taxes/fees} + \text{baggage} + \text{transfers} + \text{last-mile} + \text{optional expenses}$$
   - Clearly labels every line item as **Confirmed**, **Estimated**, or **User-Entered**.
   - Displays both cost per person and total group expenditure with real-time budget utilization meters.
   - Interactive sliders to configure optional meals and transit accommodation allowances with instant recalculation.

4. **Multilingual Voice Assistant**
   - Web Speech API integration for real-time speech-to-text with support for English, Telugu (తెలుగు), Hindi (हिन्दी), and Spanish (Español).
   - Real-time speech transcription preview with ability to correct text before submission.
   - Spoken AI responses using server-side Gemini TTS (`gemini-3.8-flash-lite-tts`) with seamless browser `SpeechSynthesis` fallback.
   - Dedicated voice playback controls (Play, Pause, Replay, Mute).

5. **Weather, Safety & Live Disruption Engine**
   - Weather forecasts for origin, transfer points, and destination with temperatures, precipitation chances, wind, and travel advisories.
   - Safety assistance: Official emergency numbers (National Emergency 112, Railway RailMadad 139, Women Safety 1091, Highway Emergency 1033), verified operator checks, and well-lit station advice.
   - Live Disruption Simulator: Test delays (+45m, +90m) or service cancellations directly on any graph edge to observe automatic graph re-routing, buffer adjustments, and cost/time impact.
   - Automation readiness: Dispatch trip summaries and departure alerts to n8n webhooks.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React, Motion.
- **Backend**: Node.js, Express, Vite middleware in dev.
- **AI Models**:
  - LLM: Google Gemini (`gemini-3.8-flash`) via `@google/genai` TypeScript SDK.
  - TTS: Google Gemini Text-to-Speech (`gemini-3.8-flash-lite-tts`).
- **Data Adapters**: Multimodal transport adapter (IRCTC trains, RTC/Volvo buses, Domestic airlines, Metros, Cabs), OpenWeather adapter, and Geocoding service with hybrid demo fallback.

---

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set your configuration values:
```env
# Required for live Gemini features (automatically provided in Google AI Studio)
GEMINI_API_KEY="your_gemini_api_key_here"

# Optional external keys (the app features a built-in realistic simulator if omitted)
# GOOGLE_MAPS_API_KEY="your_google_maps_key"
# OPENWEATHER_API_KEY="your_openweather_key"
# N8N_WEBHOOK_URL="https://n8n.example.com/webhook/travel-alerts"
```

### 3. Start the Development Server
```bash
npm run dev
```
The application will start on port 3000 at `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## How to Test a Complete Request

1. **Benchmark Query**:
   In the conversational input or voice mic, speak or type:
   > *"Plan a trip from Visakhapatnam railway station to Hyderabad airport tomorrow. My budget is ₹3,000, I must arrive before 6 PM, and I prefer a safe and comfortable journey."*

2. **Review Graph & Alternatives**:
   - Inspect the **Interactive Directed Transport Graph** showing First-Mile Auto → Vande Bharat / Superfast Express → TSRTC Pushpak Airport Liner → RGIA Airport.
   - Click on any node or edge to inspect platforms, operators, baggage rules, and buffer times.
   - Switch between **Best Overall**, **Cheapest**, and **Fastest** route tabs.

3. **Test Disruption Re-routing**:
   - In the graph inspector, click **"Simulate 90m Delay"** on the main transit leg.
   - Notice the connection alert, rescheduled downstream buffer times, and revised door-to-door arrival time.

4. **Listen to Voice Briefing**:
   - Click the **"Voice Briefing"** button to hear RoamAgent's spoken audio summary.

5. **Run Test Suite**:
   - Click **"Benchmark Tests"** in the top navigation bar to execute any of the 6+ automated test scenarios (Tight budget, Morning deadline, 4-person group, Telugu voice planning).
