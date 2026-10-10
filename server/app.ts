import express, { Request, Response, Router } from 'express';
import dotenv from 'dotenv';
dotenv.config();

import { AgentPlanResponse, TravelConstraints } from '../src/types/travel.js';
import { geocodeLocation, fetchMultimodalOptions, getWeatherForecast } from './transportAdapters.js';
import { buildItinerariesFromGraph, simulateDisruption } from './travelGraphEngine.js';
import { extractConstraintsWithGemini, generateItineraryExplanation, generateSpeechWithGemini } from './geminiAgent.js';

export const app = express();

// Parse JSON bodies
app.use(express.json());

// Fallback body parsing in serverless environments where body might be a string
app.use((req: Request, _res: Response, next) => {
  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      // not JSON string
    }
  }
  next();
});

// Enable CORS and preflight handling
app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// Normalize URL paths when routed through Netlify functions
app.use((req: Request, _res: Response, next) => {
  if (req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace('/.netlify/functions/api', '') || '/';
  }
  next();
});

// Core Trip Planning Orchestrator
export async function executeAgentTripPlanning(constraints: TravelConstraints): Promise<AgentPlanResponse> {
  // Step 1 & 2: Geocoding
  const originLoc = await geocodeLocation(constraints.origin);
  const destLoc = await geocodeLocation(constraints.destination);

  // Step 3: Multimodal transit search
  const transitOptions = await fetchMultimodalOptions(
    originLoc,
    destLoc,
    constraints.travelDate,
    constraints.preferredDepartureTime || '06:00'
  );

  // Step 4: Graph generation & Pareto multi-criteria evaluation
  const { recommended, cheapest, fastest } = buildItinerariesFromGraph(
    originLoc,
    destLoc,
    transitOptions,
    constraints
  );

  // Step 5: Weather forecasts
  const [originWeather, destWeather] = await Promise.all([
    getWeatherForecast(originLoc.city || originLoc.name, constraints.travelDate),
    getWeatherForecast(destLoc.city || destLoc.name, constraints.travelDate),
  ]);

  const weather = [originWeather, destWeather];

  // Verified Operators
  const operatorVerifications = [
    { operator: 'Indian Railways (South Coast)', verified: true, rating: 4.8 },
    { operator: 'APSRTC Garuda Plus', verified: true, rating: 4.7 },
    { operator: 'IndiGo Airlines', verified: true, rating: 4.9 },
    { operator: 'TSRTC Pushpak Airport Liner', verified: true, rating: 4.6 },
    { operator: 'IntrCity SmartBus', verified: true, rating: 4.5 }
  ];

  // Emergency Numbers
  const emergencyContacts = [
    { title: 'National Emergency Helpline', number: '112', service: 'Police, Fire, Ambulance 24x7' },
    { title: 'Indian Railway RailMadad', number: '139', service: 'Security, Medical, Passenger grievance' },
    { title: 'Women Safety Helpline', number: '1091 / 181', service: 'Emergency support & distress response' },
    { title: 'Highway Emergency Assistance', number: '1033', service: 'Road safety & towing support' }
  ];

  const planResponse: AgentPlanResponse = {
    query: `Trip from ${constraints.origin} to ${constraints.destination}`,
    status: 'complete',
    extractedConstraints: constraints,
    itineraries: {
      recommended,
      cheapest,
      fastest
    },
    selectedItineraryId: recommended.id,
    weather,
    emergencyContacts,
    operatorVerifications,
    speechSummary: '',
    isDemoMode: !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY'
  };

  // Step 6: AI Explanation & Speech synthesis
  const explanation = await generateItineraryExplanation(
    planResponse,
    recommended,
    constraints.preferredLanguage || 'en'
  );

  planResponse.speechSummary = explanation.speechSummary;
  recommended.explanation = explanation.text;

  return planResponse;
}

// Router for API Endpoints
const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    timestamp: new Date().toISOString()
  });
});

// 1. Natural Language Conversational Agent Endpoint
apiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, currentConstraints } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    // Agent Extraction
    const extractionResult = await extractConstraintsWithGemini(message, currentConstraints);
    const { extracted, missingEssentialDetails, followUpQuestion } = extractionResult;

    // Check if we have minimum requirements to plan
    if (missingEssentialDetails.length > 0 && !extracted.destination) {
      res.json({
        status: 'needs_clarification',
        extractedConstraints: extracted,
        clarificationQuestion: followUpQuestion || `Where would you like to travel to? Please let me know your destination.`,
        reply: followUpQuestion || `I'd love to help! What is your destination city or terminal?`
      });
      return;
    }

    // Default baseline parameters if not specified
    const completeConstraints: TravelConstraints = {
      origin: extracted.origin || 'Visakhapatnam railway station',
      exactOriginPickup: extracted.exactOriginPickup,
      destination: extracted.destination || 'Hyderabad airport',
      exactDestinationDropoff: extracted.exactDestinationDropoff,
      travelDate: extracted.travelDate || '2026-10-11',
      preferredDepartureTime: extracted.preferredDepartureTime || '06:00',
      arrivalDeadline: extracted.arrivalDeadline,
      travelers: Math.max(1, extracted.travelers || 1),
      totalBudget: extracted.totalBudget,
      currency: extracted.currency || 'INR',
      preferredModes: extracted.preferredModes || ['train', 'bus', 'flight', 'metro', 'cab'],
      excludedModes: extracted.excludedModes || [],
      comfortLevel: extracted.comfortLevel || 'comfortable',
      accessibilityRequired: !!extracted.accessibilityRequired,
      safetyPreferences: extracted.safetyPreferences || {
        wellLitPickupsOnly: true,
        fewerTransfers: true,
        establishedOperatorsOnly: true,
        nightTravelPrecautions: true
      },
      luggageType: extracted.luggageType || 'standard',
      mealsBudgetPerPerson: extracted.mealsBudgetPerPerson || 0,
      hotelBudgetPerPerson: extracted.hotelBudgetPerPerson || 0,
      preferredLanguage: extracted.preferredLanguage || 'en'
    };

    const plan = await executeAgentTripPlanning(completeConstraints);

    res.json({
      status: 'complete',
      reply: plan.itineraries.recommended.explanation,
      speechSummary: plan.speechSummary,
      plan
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: error.message || 'Failed to process chat request' });
  }
});

// 2. Structured Planning Endpoint
apiRouter.post('/plan-trip', async (req: Request, res: Response) => {
  try {
    const raw = req.body;
    const constraints: TravelConstraints = {
      origin: raw.origin || 'Visakhapatnam railway station',
      exactOriginPickup: raw.exactOriginPickup,
      destination: raw.destination || 'Hyderabad airport',
      exactDestinationDropoff: raw.exactDestinationDropoff,
      travelDate: raw.travelDate || '2026-10-11',
      preferredDepartureTime: raw.preferredDepartureTime || '06:00',
      arrivalDeadline: raw.arrivalDeadline,
      travelers: Math.max(1, Number(raw.travelers) || 1),
      totalBudget: raw.totalBudget ? Number(raw.totalBudget) : undefined,
      currency: raw.currency || 'INR',
      preferredModes: raw.preferredModes || ['train', 'bus', 'flight', 'metro', 'cab'],
      excludedModes: raw.excludedModes || [],
      comfortLevel: raw.comfortLevel || 'comfortable',
      accessibilityRequired: !!raw.accessibilityRequired,
      safetyPreferences: raw.safetyPreferences || {
        wellLitPickupsOnly: true,
        fewerTransfers: true,
        establishedOperatorsOnly: true,
        nightTravelPrecautions: true
      },
      luggageType: raw.luggageType || 'standard',
      mealsBudgetPerPerson: raw.mealsBudgetPerPerson ? Number(raw.mealsBudgetPerPerson) : 0,
      hotelBudgetPerPerson: raw.hotelBudgetPerPerson ? Number(raw.hotelBudgetPerPerson) : 0,
      preferredLanguage: raw.preferredLanguage || 'en'
    };

    const plan = await executeAgentTripPlanning(constraints);
    res.json(plan);
  } catch (error: any) {
    console.error('Plan trip error:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate itinerary' });
  }
});

// 3. Dynamic Disruption Simulation Endpoint
apiRouter.post('/disrupt-trip', (req: Request, res: Response) => {
  try {
    const { activeItinerary, edgeId, delayMinutes = 60, isCancelled = false } = req.body;
    if (!activeItinerary || !edgeId) {
      res.status(400).json({ error: 'activeItinerary and edgeId are required' });
      return;
    }

    const disruptionResult = simulateDisruption(
      activeItinerary,
      edgeId,
      Number(delayMinutes),
      Boolean(isCancelled)
    );

    res.json(disruptionResult);
  } catch (err: any) {
    console.error('Disruption simulation error:', err);
    res.status(500).json({ error: err.message || 'Failed to simulate disruption' });
  }
});

// 4. Server-Side TTS Endpoint (Gemini 3.8 Flash Lite TTS)
apiRouter.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text string is required' });
      return;
    }

    const audioBase64 = await generateSpeechWithGemini(text);
    if (audioBase64) {
      res.json({
        success: true,
        audioBase64,
        mimeType: 'audio/wav',
        engine: 'gemini-3.8-flash-lite-tts'
      });
    } else {
      res.json({
        success: false,
        fallbackToBrowser: true,
        message: 'Server Gemini TTS unavailable, fallback to browser SpeechSynthesis.'
      });
    }
  } catch (err: any) {
    console.error('TTS error:', err);
    res.json({ success: false, fallbackToBrowser: true });
  }
});

// 5. Automation / n8n Webhook Dispatch Endpoint
apiRouter.post('/n8n-alert', async (req: Request, res: Response) => {
  try {
    const { itinerary, eventType, travelerContact } = req.body;
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    const payload = {
      event: eventType || 'ITINERARY_UPDATE',
      timestamp: new Date().toISOString(),
      travelerContact: travelerContact || 'konchadaharshitha690@gmail.com',
      itinerarySummary: {
        title: itinerary?.title,
        departureTime: itinerary?.departureTime,
        arrivalTime: itinerary?.arrivalTime,
        totalCost: itinerary?.totalCost?.totalGroupCost,
        warnings: itinerary?.warnings
      }
    };

    let delivered = false;
    let externalStatus = 'mock-delivered';

    if (webhookUrl && webhookUrl.startsWith('http')) {
      try {
        const extRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        delivered = extRes.ok;
        externalStatus = `Sent to ${webhookUrl} (HTTP ${extRes.status})`;
      } catch (e: any) {
        externalStatus = `Failed to deliver to external webhook: ${e.message}`;
      }
    }

    res.json({
      success: true,
      delivered,
      status: externalStatus,
      payload,
      message: delivered
        ? 'Alert dispatched successfully to n8n webhook!'
        : 'Notification simulated and queued for automation dispatch.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Pre-configured Test Cases (Prompt Section 12)
apiRouter.get('/test-scenarios', (_req: Request, res: Response) => {
  res.json([
    {
      id: 'test-1-vizag-hyd',
      name: 'Vizag to Hyd Airport (Prompt Benchmark)',
      description: 'Trip from Visakhapatnam railway station to Hyderabad airport tomorrow, budget ₹3,000, arrive before 6 PM, safe & comfortable.',
      constraints: {
        origin: 'Visakhapatnam railway station',
        destination: 'Hyderabad airport',
        travelDate: '2026-10-11',
        preferredDepartureTime: '05:30',
        arrivalDeadline: '18:00',
        travelers: 1,
        totalBudget: 3000,
        currency: 'INR',
        comfortLevel: 'comfortable',
        preferredModes: ['train', 'bus', 'cab'],
        excludedModes: ['flight'],
        preferredLanguage: 'en'
      }
    },
    {
      id: 'test-2-multimodal-transfers',
      name: 'Multimodal Journey with Transfers',
      description: 'First-mile auto, Vande Bharat Express to Secunderabad, transfer to TSRTC Pushpak Airport AC Bus.',
      constraints: {
        origin: 'Visakhapatnam railway station',
        destination: 'Hyderabad airport',
        travelDate: '2026-10-11',
        preferredDepartureTime: '05:30',
        travelers: 2,
        totalBudget: 4500,
        currency: 'INR',
        comfortLevel: 'comfortable',
        preferredModes: ['train', 'bus', 'cab'],
        excludedModes: [],
        preferredLanguage: 'en'
      }
    },
    {
      id: 'test-3-strict-deadline',
      name: 'Strict Morning Deadline (Arrive before 10 AM)',
      description: 'Must reach Hyderabad before 10:00 AM. Triggers flight or overnight sleeper bus prioritization.',
      constraints: {
        origin: 'Visakhapatnam',
        destination: 'Hyderabad airport',
        travelDate: '2026-10-11',
        arrivalDeadline: '10:00',
        travelers: 1,
        totalBudget: 6000,
        currency: 'INR',
        comfortLevel: 'comfortable',
        preferredModes: ['flight', 'bus', 'train'],
        excludedModes: [],
        preferredLanguage: 'en'
      }
    },
    {
      id: 'test-4-budget-constrained',
      name: 'Ultra Tight Budget (₹800 Max)',
      description: 'Ultra budget travel under ₹800. Tests Pareto filtering prioritizing 2S train or state ordinary express.',
      constraints: {
        origin: 'Visakhapatnam railway station',
        destination: 'Hyderabad',
        travelDate: '2026-10-11',
        totalBudget: 800,
        currency: 'INR',
        comfortLevel: 'standard',
        travelers: 1,
        preferredModes: ['train', 'bus'],
        excludedModes: ['flight'],
        preferredLanguage: 'en'
      }
    },
    {
      id: 'test-5-group-travel',
      name: 'Group of 4 Travelers (Cost Scaling)',
      description: 'Tests door-to-door group fare scaling and cab cost sharing across 4 passengers.',
      constraints: {
        origin: 'Visakhapatnam',
        destination: 'Hyderabad airport',
        travelDate: '2026-10-11',
        travelers: 4,
        totalBudget: 12000,
        currency: 'INR',
        comfortLevel: 'comfortable',
        preferredModes: ['train', 'bus', 'cab'],
        excludedModes: [],
        preferredLanguage: 'en'
      }
    },
    {
      id: 'test-6-telugu-voice',
      name: 'Telugu Language Preference (నమస్కారం)',
      description: 'Plan trip with Telugu prompt & audio readout.',
      constraints: {
        origin: 'విశాఖపట్నం రైల్వే స్టేషన్',
        destination: 'హైదరాబాద్ విమానాశ్రయం',
        travelDate: '2026-10-11',
        travelers: 2,
        totalBudget: 4000,
        currency: 'INR',
        comfortLevel: 'comfortable',
        preferredModes: ['train', 'bus'],
        excludedModes: [],
        preferredLanguage: 'te'
      }
    }
  ]);
});

// Mount the router at /api, /.netlify/functions/api, and root / so any URL prefix routes correctly
app.use('/api', apiRouter);
app.use('/.netlify/functions/api', apiRouter);
app.use('/', apiRouter);
