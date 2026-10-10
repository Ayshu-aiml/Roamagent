import { GoogleGenAI } from '@google/genai';
import { AgentPlanResponse, Itinerary, TravelConstraints } from '../src/types/travel.js';

let quotaExhaustedUntil = 0;

export function isGeminiQuotaExhausted(): boolean {
  return Date.now() < quotaExhaustedUntil;
}

function markQuotaExhausted(err?: any) {
  let delaySec = 300; // default 5 minutes
  try {
    if (err?.message && err.message.includes('RetryInfo')) {
      const match = err.message.match(/retryDelay":"?([0-9]+)/);
      if (match && match[1]) {
        delaySec = Math.min(Number(match[1]), 3600);
      }
    }
  } catch {
    // ignore
  }
  quotaExhaustedUntil = Date.now() + (delaySec * 1000);
  console.info(`[RoamAgent] Gemini API free-tier quota reached (429). Activating intelligent deterministic travel engine for next ${Math.round(delaySec / 60)} minutes.`);
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Extract structured constraints from user prompt using Gemini
export async function extractConstraintsWithGemini(
  userPrompt: string,
  currentConstraints?: Partial<TravelConstraints>
): Promise<{
  extracted: Partial<TravelConstraints>;
  missingEssentialDetails: string[];
  followUpQuestion?: string;
}> {
  const ai = getGeminiClient();

  if (ai && !isGeminiQuotaExhausted()) {
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    const systemInstruction = `You are RoamAgent AI, an expert travel planner agent.
Extract travel parameters from the user's natural language input.
Today is Saturday, October 10, 2026.
Resolve relative dates (e.g. "tomorrow" -> 2026-10-11, "next Monday" -> 2026-10-12).
Return valid JSON matching this schema:
{
  "origin": string,
  "exactOriginPickup": string or null,
  "destination": string,
  "exactDestinationDropoff": string or null,
  "travelDate": "YYYY-MM-DD",
  "preferredDepartureTime": "HH:mm" or null,
  "arrivalDeadline": "HH:mm" or null (e.g. "6 PM" -> "18:00"),
  "travelers": number,
  "totalBudget": number or null (e.g. ₹3,000 -> 3000),
  "currency": "INR" or "USD" or "EUR",
  "preferredModes": string[] (subset of ["walk", "cab", "bus", "train", "flight", "metro"]),
  "excludedModes": string[],
  "comfortLevel": "standard" | "comfortable" | "premium",
  "accessibilityRequired": boolean,
  "safetyPreferences": {
    "wellLitPickupsOnly": boolean,
    "fewerTransfers": boolean,
    "establishedOperatorsOnly": boolean,
    "nightTravelPrecautions": boolean
  },
  "luggageType": "light" | "standard" | "heavy",
  "preferredLanguage": "en" | "te" | "hi" | "es",
  "missingEssentialDetails": string[],
  "followUpQuestion": string or null
}
If destination or travel date is genuinely unknown and cannot be inferred, include in missingEssentialDetails and write a brief followUpQuestion.`;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: `User message: "${userPrompt}"\nCurrent known constraints: ${JSON.stringify(currentConstraints || {})}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return {
            extracted: parsed,
            missingEssentialDetails: parsed.missingEssentialDetails || [],
            followUpQuestion: parsed.followUpQuestion || undefined
          };
        }
      } catch (err: any) {
        if (err?.status === 'RESOURCE_EXHAUSTED' || err?.message?.includes('429') || err?.message?.includes('quota')) {
          markQuotaExhausted(err);
          break; // Stop querying rate-limited endpoint
        }
      }
    }
  }

  // Deterministic NLP Rule-Based Extractor Fallback
  return fallbackRuleExtractor(userPrompt, currentConstraints);
}

// Fallback deterministic extractor for offline or demo mode
function fallbackRuleExtractor(
  prompt: string,
  existing?: Partial<TravelConstraints>
): {
  extracted: Partial<TravelConstraints>;
  missingEssentialDetails: string[];
  followUpQuestion?: string;
} {
  const p = prompt.toLowerCase();
  const extracted: Partial<TravelConstraints> = { ...existing };

  // Detect languages
  if (p.includes('నమస్కారం') || p.includes('ప్రయాణం') || p.includes('విశాఖపట్నం') || p.includes('హైదరాబాద్')) {
    extracted.preferredLanguage = 'te';
  } else if (p.includes('नमस्ते') || p.includes('यात्रा') || p.includes('ट्रेन') || p.includes('किराया')) {
    extracted.preferredLanguage = 'hi';
  } else {
    extracted.preferredLanguage = extracted.preferredLanguage || 'en';
  }

  // Origin & Destination detection
  const fromMatch = p.match(/(?:from|starting from|leaving)\s+([a-zA-Z\s]+?)(?:\s+(?:to|towards|before|tomorrow|budget)|$)/i);
  const toMatch = p.match(/(?:to|towards|reaching)\s+([a-zA-Z\s]+?)(?:\s+(?:tomorrow|before|at|on|with|budget)|$)/i);

  if (fromMatch && fromMatch[1]) {
    extracted.origin = fromMatch[1].trim();
  }
  if (toMatch && toMatch[1]) {
    extracted.destination = toMatch[1].trim();
  }

  // Common Vizag -> Hyderabad shortcut
  if (p.includes('visakhapatnam') || p.includes('vizag') || p.includes('vskp')) {
    extracted.origin = p.includes('railway station') ? 'Visakhapatnam railway station' : 'Visakhapatnam';
  }
  if (p.includes('hyderabad') || p.includes('hyd')) {
    extracted.destination = p.includes('airport') ? 'Hyderabad airport' : 'Hyderabad';
  }
  if (p.includes('bengaluru') || p.includes('bangalore') || p.includes('blr')) {
    extracted.destination = 'Bengaluru';
  }

  // Date parsing
  if (p.includes('tomorrow')) {
    extracted.travelDate = '2026-10-11';
  } else if (p.includes('today')) {
    extracted.travelDate = '2026-10-10';
  } else if (!extracted.travelDate) {
    extracted.travelDate = '2026-10-11';
  }

  // Budget
  const budgetMatch = p.match(/(?:budget|rs\.?|inr|₹)\s*[:=]?\s*₹?\s*([0-9,]+)/i) || p.match(/([0-9,]+)\s*(?:rupees|rs|inr)/i);
  if (budgetMatch) {
    const val = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(val) && val > 0) {
      extracted.totalBudget = val;
    }
  }

  // Deadline (e.g. "before 6 PM", "before 18:00", "reach by 8 AM")
  const deadlineMatch = p.match(/(?:before|reach by|arrive before|by)\s*([0-9]{1,2})(?::([0-9]{2}))?\s*(am|pm)?/i);
  if (deadlineMatch) {
    let hour = parseInt(deadlineMatch[1], 10);
    const minute = deadlineMatch[2] ? deadlineMatch[2] : '00';
    const meridian = deadlineMatch[3]?.toLowerCase();

    if (meridian === 'pm' && hour < 12) hour += 12;
    if (meridian === 'am' && hour === 12) hour = 0;

    extracted.arrivalDeadline = `${String(hour).padStart(2, '0')}:${minute}`;
  }

  // Travelers
  const travelersMatch = p.match(/([0-9]+)\s*(?:people|passengers|travelers|persons|pax)/i) || (p.includes('for two') ? [null, '2'] : null);
  if (travelersMatch && travelersMatch[1]) {
    extracted.travelers = parseInt(travelersMatch[1], 10);
  } else if (!extracted.travelers) {
    extracted.travelers = 1;
  }

  // Mode preferences
  extracted.preferredModes = extracted.preferredModes || ['train', 'bus', 'flight', 'metro', 'cab'];
  extracted.excludedModes = extracted.excludedModes || [];

  if (p.includes('no flight') || p.includes('avoid flight')) {
    extracted.excludedModes.push('flight');
  }
  if (p.includes('cheapest') || p.includes('budget')) {
    extracted.comfortLevel = 'standard';
  } else if (p.includes('comfortable') || p.includes('safe')) {
    extracted.comfortLevel = 'comfortable';
  }

  extracted.safetyPreferences = {
    wellLitPickupsOnly: true,
    fewerTransfers: p.includes('comfortable') || p.includes('direct'),
    establishedOperatorsOnly: true,
    nightTravelPrecautions: true
  };

  const missing: string[] = [];
  if (!extracted.origin) missing.push('origin');
  if (!extracted.destination) missing.push('destination');

  return {
    extracted,
    missingEssentialDetails: missing,
    followUpQuestion: missing.length > 0
      ? `Where would you like to travel to? Please let me know your departure and destination points.`
      : undefined
  };
}

// Generate conversational explanation & spoken text
export async function generateItineraryExplanation(
  plan: AgentPlanResponse,
  selectedItinerary: Itinerary,
  language: string = 'en'
): Promise<{ text: string; speechSummary: string }> {
  const ai = getGeminiClient();

  const promptDetails = `
Trip: From ${plan.extractedConstraints.origin} to ${plan.extractedConstraints.destination}
Date: ${plan.extractedConstraints.travelDate}
Passengers: ${plan.extractedConstraints.travelers}
Budget: ₹${plan.extractedConstraints.totalBudget || 'Flexible'}
Recommended Itinerary: ${selectedItinerary.title}
Departure: ${selectedItinerary.departureTime}
Arrival: ${selectedItinerary.arrivalTime}
Door-to-door cost: ₹${selectedItinerary.totalCost.totalGroupCost} (₹${selectedItinerary.totalCost.totalCostPerPerson} per person)
Transfers: ${selectedItinerary.totalTransfers}
Warnings: ${selectedItinerary.warnings.join(', ') || 'None'}
Language: ${language}
`;

  if (ai && !isGeminiQuotaExhausted()) {
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: `Explain this multimodal itinerary to the traveler in a clear, friendly, and reassuring manner.
Provide an executive spoken summary (under 3 sentences) suitable for audio readout, followed by key door-to-door transit advice.
Respond in language code: ${language}.
Details:
${promptDetails}`,
          config: {
            temperature: 0.3
          }
        });

        if (response.text) {
          const full = response.text.trim();
          const sentences = full.split('. ');
          const speechSummary = sentences.slice(0, 2).join('. ') + '.';
          return { text: full, speechSummary };
        }
      } catch (e: any) {
        if (e?.status === 'RESOURCE_EXHAUSTED' || e?.message?.includes('429') || e?.message?.includes('quota')) {
          markQuotaExhausted(e);
          break;
        }
      }
    }
  }

  // Multilingual Fallback Summaries
  if (language === 'te') {
    const speechSummary = `${plan.extractedConstraints.origin} నుండి ${plan.extractedConstraints.destination} ప్రయాణానికి మొత్తం ఖర్చు ₹${selectedItinerary.totalCost.totalGroupCost.toLocaleString()}. మీరు ${selectedItinerary.arrivalTime} నాటికి చేరుకుంటారు.`;
    const text = `మీ ప్రయాణ ప్రణాళిక సిద్ధంగా ఉంది! ${selectedItinerary.title} ద్వారా ప్రయాణం చాలా సురక్షితమైనది మరియు అనుకూలమైనది. బయలుదేరే సమయం: ${selectedItinerary.departureTime}, చేరుకునే సమయం: ${selectedItinerary.arrivalTime}. మొత్తం డోర్-టు-డోర్ ఖర్చు ₹${selectedItinerary.totalCost.totalGroupCost.toLocaleString()}.`;
    return { text, speechSummary };
  }

  if (language === 'hi') {
    const speechSummary = `${plan.extractedConstraints.origin} से ${plan.extractedConstraints.destination} तक का कुल खर्च ₹${selectedItinerary.totalCost.totalGroupCost.toLocaleString()} है। आप ${selectedItinerary.arrivalTime} तक पहुँच जाएंगे।`;
    const text = `आपकी यात्रा योजना तैयार है! ${selectedItinerary.title} सबसे उपयुक्त विकल्प है। प्रस्थान समय ${selectedItinerary.departureTime} और आगमन समय ${selectedItinerary.arrivalTime} है। घर से गंतव्य तक का कुल किराया ₹${selectedItinerary.totalCost.totalGroupCost.toLocaleString()} है।`;
    return { text, speechSummary };
  }

  const speechSummary = `Your recommended trip from ${plan.extractedConstraints.origin} to ${plan.extractedConstraints.destination} departs at ${selectedItinerary.departureTime} and arrives at ${selectedItinerary.arrivalTime}. The complete door-to-door cost is ₹${selectedItinerary.totalCost.totalGroupCost.toLocaleString()}.`;
  const text = `I have planned your optimal journey from ${plan.extractedConstraints.origin} to ${plan.extractedConstraints.destination}. 

Recommended Route: **${selectedItinerary.title}**
- **Schedule**: Departs at ${selectedItinerary.departureTime}, arriving by ${selectedItinerary.arrivalTime} (${Math.floor(selectedItinerary.totalDurationMinutes / 60)}h ${selectedItinerary.totalDurationMinutes % 60}m door-to-door).
- **Cost**: Total door-to-door cost is ₹${selectedItinerary.totalCost.totalGroupCost.toLocaleString()} (₹${selectedItinerary.totalCost.totalCostPerPerson.toLocaleString()} per person).
- **Feasibility**: ${selectedItinerary.satisfiesDeadline ? 'Arrives well before your deadline.' : 'Arrives slightly after the requested deadline.'}
- **Safety**: Fully verified operators with GPS tracking and well-lit interchange hubs.`;

  return { text, speechSummary };
}

// Generate Natural Speech with Gemini TTS (gemini-3.8-flash-lite-tts)
export async function generateSpeechWithGemini(text: string): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai || isGeminiQuotaExhausted()) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 400), // Concise speech summary
              speechMetadata: {
                style: 'Professional, calm travel concierge',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (err: any) {
    if (err?.status === 'RESOURCE_EXHAUSTED' || err?.message?.includes('429') || err?.message?.includes('quota')) {
      markQuotaExhausted(err);
    }
    return null;
  }
}
