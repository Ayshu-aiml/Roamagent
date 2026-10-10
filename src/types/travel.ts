export type TransportMode = 'walk' | 'cab' | 'bus' | 'train' | 'flight' | 'metro';

export type ConfidenceLevel = 'confirmed' | 'estimated' | 'demo';

export interface LocationPoint {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  city: string;
}

export interface TravelConstraints {
  origin: string;
  exactOriginPickup?: string;
  destination: string;
  exactDestinationDropoff?: string;
  travelDate: string; // YYYY-MM-DD
  preferredDepartureTime?: string; // HH:mm
  arrivalDeadline?: string; // HH:mm
  travelers: number;
  totalBudget?: number;
  budgetPerPerson?: number;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  preferredModes: TransportMode[];
  excludedModes: TransportMode[];
  comfortLevel: 'standard' | 'comfortable' | 'premium';
  accessibilityRequired: boolean;
  safetyPreferences: {
    wellLitPickupsOnly?: boolean;
    fewerTransfers?: boolean;
    establishedOperatorsOnly?: boolean;
    nightTravelPrecautions?: boolean;
    shareTripEnabled?: boolean;
  };
  luggageType: 'light' | 'standard' | 'heavy';
  mealsBudgetPerPerson?: number;
  hotelBudgetPerPerson?: number;
  preferredLanguage: string; // 'en' | 'te' | 'hi' | 'es'
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'origin' | 'first_mile_stop' | 'station' | 'airport' | 'metro_station' | 'transfer_point' | 'destination';
  coordinates: {
    lat: number;
    lng: number;
  };
  city: string;
  address?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  notes?: string;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  mode: TransportMode;
  name: string;
  operator: string;
  vehicleIdentifier?: string; // e.g. Train 20833 Vande Bharat, Flight 6E 421
  departureTime: string; // ISO or HH:mm
  arrivalTime: string; // ISO or HH:mm
  durationMinutes: number;
  distanceKm: number;
  farePerPerson: number;
  totalFare: number;
  waitingTimeMinutes: number;
  confidence: ConfidenceLevel;
  reliabilityPercent: number;
  source: string;
  instructions: string;
  isDisrupted?: boolean;
  disruptionReason?: string;
  bookingUrl?: string;
  amenities?: string[];
  carbonKg?: number;
}

export interface CostBreakdownItem {
  label: string;
  amountPerPerson: number;
  amountTotal: number;
  confidence: 'confirmed' | 'estimated' | 'user-entered' | 'unavailable';
  notes?: string;
}

export interface DoorToDoorCost {
  firstMileCost: number;
  mainTransitFares: number;
  feesAndTaxes: number;
  baggageCharges: number;
  transfersCost: number;
  lastMileCost: number;
  optionalMeals: number;
  optionalAccommodation: number;
  totalCostPerPerson: number;
  totalGroupCost: number;
  remainingBudget?: number;
  currency: string;
  items: CostBreakdownItem[];
}

export interface TravelGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Itinerary {
  id: string;
  type: 'recommended' | 'cheapest' | 'fastest';
  title: string;
  summary: string;
  explanation: string;
  graph: TravelGraph;
  edges: GraphEdge[];
  totalCost: DoorToDoorCost;
  totalDurationMinutes: number;
  totalTransfers: number;
  departureTime: string;
  arrivalTime: string;
  satisfiesDeadline: boolean;
  satisfiesBudget: boolean;
  paretoScore: number;
  warnings: string[];
  safetyAdvisories: string[];
}

export interface WeatherForecast {
  location: string;
  temperatureC: number;
  condition: string;
  precipitationProb: number;
  windSpeedKph: number;
  icon: string;
  forecastTime: string;
  travelAdvisory?: string;
}

export interface AgentPlanResponse {
  query: string;
  status: 'complete' | 'needs_clarification';
  clarificationQuestion?: string;
  extractedConstraints: TravelConstraints;
  itineraries: {
    recommended: Itinerary;
    cheapest: Itinerary;
    fastest: Itinerary;
  };
  selectedItineraryId: string;
  weather: WeatherForecast[];
  emergencyContacts: {
    title: string;
    number: string;
    service: string;
  }[];
  operatorVerifications: {
    operator: string;
    verified: boolean;
    rating: number;
  }[];
  speechSummary: string;
  isDemoMode: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
  spokenAudioBase64?: string;
  spokenAudioMime?: string;
  extractedConstraints?: Partial<TravelConstraints>;
  suggestedQuestions?: string[];
  associatedPlan?: AgentPlanResponse;
}
