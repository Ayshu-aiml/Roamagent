import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Info,
  Printer
} from 'lucide-react';
import { AgentPlanResponse, Itinerary, TravelConstraints } from './types/travel';
import { Header } from './components/Header';
import { TravelSearchConsole } from './components/TravelSearchConsole';
import { RouteOptionsSwitcher } from './components/RouteOptionsSwitcher';
import { RouteGraphVisualizer } from './components/RouteGraphVisualizer';
import { DoorToDoorCostCard } from './components/DoorToDoorCostCard';
import { ChronologicalItinerary } from './components/ChronologicalItinerary';
import { WeatherSafetyPanel } from './components/WeatherSafetyPanel';
import { ConstraintsModal } from './components/ConstraintsModal';
import { TestScenariosModal } from './components/TestScenariosModal';
import { SavedTripsModal } from './components/SavedTripsModal';

const DEFAULT_CONSTRAINTS: TravelConstraints = {
  origin: 'Visakhapatnam railway station',
  destination: 'Hyderabad airport',
  travelDate: '2026-10-11',
  preferredDepartureTime: '05:30',
  arrivalDeadline: '18:00',
  travelers: 1,
  totalBudget: 3000,
  currency: 'INR',
  preferredModes: ['train', 'bus', 'cab', 'metro'],
  excludedModes: ['flight'],
  comfortLevel: 'comfortable',
  accessibilityRequired: false,
  safetyPreferences: {
    wellLitPickupsOnly: true,
    fewerTransfers: true,
    establishedOperatorsOnly: true,
    nightTravelPrecautions: true
  },
  luggageType: 'standard',
  mealsBudgetPerPerson: 0,
  hotelBudgetPerPerson: 0,
  preferredLanguage: 'en'
};

export default function App() {
  const [plan, setPlan] = useState<AgentPlanResponse | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'recommended' | 'cheapest' | 'fastest'>('recommended');
  const [activeConstraints, setActiveConstraints] = useState<TravelConstraints>(DEFAULT_CONSTRAINTS);
  const [preferredLanguage, setPreferredLanguage] = useState<string>('en');

  // Loading States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDisrupting, setIsDisrupting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notificationBanner, setNotificationBanner] = useState<{ type: 'info' | 'alert' | 'success'; text: string } | null>(null);

  // Audio state
  const [serverAudioBase64, setServerAudioBase64] = useState<string | undefined>();

  // Modals
  const [isConstraintsModalOpen, setIsConstraintsModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isSavedTripsModalOpen, setIsSavedTripsModalOpen] = useState(false);

  // Local Storage Saved Trips
  const [savedTrips, setSavedTrips] = useState<Array<{ id: string; savedAt: string; plan: AgentPlanResponse }>>([]);

  // Load saved trips on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('roamagent_saved_trips');
      if (stored) {
        setSavedTrips(JSON.parse(stored));
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  // Initial Plan Fetch on Mount
  useEffect(() => {
    executePlanRequest(DEFAULT_CONSTRAINTS);
  }, []);

  // Request TTS from server when speechSummary changes
  const requestServerTTS = async (text: string) => {
    if (!text) return;
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.success && data.audioBase64) {
        setServerAudioBase64(data.audioBase64);
      }
    } catch {
      // Fallback to browser synthesis
    }
  };

  const executePlanRequest = async (constraints: TravelConstraints) => {
    setIsLoading(true);
    setErrorMessage(null);
    setNotificationBanner(null);

    try {
      const res = await fetch('/api/plan-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(constraints)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to calculate transit routing.');
      }

      const planData: AgentPlanResponse = await res.json();
      setPlan(planData);
      setActiveConstraints(planData.extractedConstraints);
      setSelectedRouteType('recommended');

      if (planData.speechSummary) {
        requestServerTTS(planData.speechSummary);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An unexpected error occurred while computing routes.');
    } finally {
      setIsLoading(false);
    }
  };

  // Conversational / Voice Query Handler
  const handleNaturalLanguageQuery = async (query: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          currentConstraints: activeConstraints,
          language: preferredLanguage
        })
      });

      if (!res.ok) {
        throw new Error('Failed to resolve route query.');
      }

      const data = await res.json();

      if (data.status === 'needs_clarification') {
        setNotificationBanner({
          type: 'info',
          text: `Route Inquiry: ${data.reply || data.clarificationQuestion}`
        });
        if (data.extractedConstraints) {
          setActiveConstraints(prev => ({ ...prev, ...data.extractedConstraints }));
        }
      } else if (data.plan) {
        setPlan(data.plan);
        setActiveConstraints(data.plan.extractedConstraints);
        setSelectedRouteType('recommended');
        if (data.speechSummary) {
          requestServerTTS(data.speechSummary);
        }
        setNotificationBanner({
          type: 'success',
          text: `Itineraries refreshed: ${data.plan.extractedConstraints.origin} → ${data.plan.extractedConstraints.destination}.`
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing route search.');
    } finally {
      setIsLoading(false);
    }
  };

  // Disruption Simulation Handler
  const handleSimulateDisruption = async (edgeId: string, delayMins: number, isCancelled: boolean) => {
    if (!plan) return;
    setIsDisrupting(true);

    try {
      const activeItinerary = plan.itineraries[selectedRouteType];
      const res = await fetch('/api/disrupt-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeItinerary,
          edgeId,
          delayMinutes: delayMins,
          isCancelled
        })
      });

      if (!res.ok) {
        throw new Error('Failed to evaluate disruption.');
      }

      const result = await res.json();
      const updatedItineraries = {
        ...plan.itineraries,
        [selectedRouteType]: result.recalculatedItinerary
      };

      setPlan({
        ...plan,
        itineraries: updatedItineraries
      });

      setNotificationBanner({
        type: 'alert',
        text: result.impactExplanation
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not simulate disruption.');
    } finally {
      setIsDisrupting(false);
    }
  };

  // Optional Expenses Real-Time Tweak
  const handleUpdateOptionalExpenses = (meals: number, hotel: number) => {
    const updated = {
      ...activeConstraints,
      mealsBudgetPerPerson: meals,
      hotelBudgetPerPerson: hotel
    };
    setActiveConstraints(updated);
    executePlanRequest(updated);
  };

  // Save Trip to Local Storage
  const handleSaveTrip = () => {
    if (!plan) return;
    const newEntry = {
      id: `trip-${Date.now()}`,
      savedAt: new Date().toISOString(),
      plan
    };
    const updated = [newEntry, ...savedTrips];
    setSavedTrips(updated);
    try {
      localStorage.setItem('roamagent_saved_trips', JSON.stringify(updated));
      setNotificationBanner({
        type: 'success',
        text: 'Itinerary saved to your local trip history.'
      });
    } catch {
      // Storage error
    }
  };

  // Delete Saved Trip
  const handleDeleteTrip = (id: string) => {
    const filtered = savedTrips.filter(t => t.id !== id);
    setSavedTrips(filtered);
    try {
      localStorage.setItem('roamagent_saved_trips', JSON.stringify(filtered));
    } catch {
      // Ignore
    }
  };

  // Load Saved Trip
  const handleLoadSavedTrip = (savedPlan: AgentPlanResponse) => {
    setPlan(savedPlan);
    setActiveConstraints(savedPlan.extractedConstraints);
    setSelectedRouteType('recommended');
    setNotificationBanner({
      type: 'info',
      text: `Loaded saved plan: ${savedPlan.extractedConstraints.origin} to ${savedPlan.extractedConstraints.destination}.`
    });
  };

  // Active Selected Route
  const activeItinerary: Itinerary | undefined = plan?.itineraries[selectedRouteType];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        language={preferredLanguage}
        onLanguageChange={(lang) => {
          setPreferredLanguage(lang);
          setActiveConstraints(prev => ({ ...prev, preferredLanguage: lang }));
        }}
        onOpenTestScenarios={() => setIsTestModalOpen(true)}
        onOpenSavedTrips={() => setIsSavedTripsModalOpen(true)}
        savedTripsCount={savedTrips.length}
        isDemoMode={plan?.isDemoMode ?? true}
        onExportTrip={() => window.print()}
      />

      {/* Main Operations Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Notification Banner */}
        {notificationBanner && (
          <div
            className={`p-3.5 rounded-lg border text-xs leading-relaxed flex items-center justify-between gap-3 shadow-xs ${
              notificationBanner.type === 'alert'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : notificationBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {notificationBanner.type === 'alert' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              ) : notificationBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <Info className="w-4 h-4 shrink-0 text-blue-600" />
              )}
              <span className="font-medium">{notificationBanner.text}</span>
            </div>
            <button
              onClick={() => setNotificationBanner(null)}
              className="text-slate-500 hover:text-slate-900 text-xs px-2 py-0.5 rounded transition cursor-pointer font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
            <button
              onClick={() => executePlanRequest(activeConstraints)}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 rounded-md font-semibold text-white transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Multimodal Travel Search Console */}
        <TravelSearchConsole
          activeConstraints={activeConstraints}
          onSearch={executePlanRequest}
          onNaturalLanguageQuery={handleNaturalLanguageQuery}
          isLoading={isLoading}
          speechSummary={plan?.speechSummary || ''}
          serverAudioBase64={serverAudioBase64}
          preferredLanguage={preferredLanguage}
        />

        {/* Loading Overlay */}
        {isLoading && !plan && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs font-medium text-slate-600">
              Interfacing with transit feeds and computing multimodal travel graph...
            </p>
          </div>
        )}

        {/* Results Workspace */}
        {plan && activeItinerary && (
          <div className="space-y-5">
            {/* Pareto Route Alternatives Tier Selector */}
            <RouteOptionsSwitcher
              itineraries={plan.itineraries}
              selectedId={activeItinerary.id}
              onSelect={(type) => setSelectedRouteType(type)}
            />

            {/* Active Corridor Status Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-3 rounded-xl text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Active Itinerary:</span>
                <span className="text-slate-900 font-bold">{activeItinerary.title}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-600 font-mono">
                  {activeItinerary.departureTime} Departure → {activeItinerary.arrivalTime} Arrival
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveTrip}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer text-xs font-semibold"
                  title="Save itinerary to history"
                >
                  <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                  <span>Save</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer text-xs font-semibold shadow-xs"
                  title="Print or export PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ticket</span>
                </button>
              </div>
            </div>

            {/* Time-Aware Transport Graph Schematic */}
            <RouteGraphVisualizer
              itinerary={activeItinerary}
              onSimulateDisruption={handleSimulateDisruption}
              isDisrupting={isDisrupting}
            />

            {/* Two Column Grid: Cost Statement & Chronological Timetable */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* Itemized Fare Statement */}
              <DoorToDoorCostCard
                cost={activeItinerary.totalCost}
                travelers={activeConstraints.travelers}
                totalBudget={activeConstraints.totalBudget}
                onUpdateOptionalExpenses={handleUpdateOptionalExpenses}
                mealsBudgetPerPerson={activeConstraints.mealsBudgetPerPerson || 0}
                hotelBudgetPerPerson={activeConstraints.hotelBudgetPerPerson || 0}
              />

              {/* Chronological Timetable */}
              <ChronologicalItinerary
                itinerary={activeItinerary}
                travelers={activeConstraints.travelers}
              />
            </div>

            {/* Weather & Travel Safety Panel */}
            <WeatherSafetyPanel
              plan={plan}
              activeItinerary={activeItinerary}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-10 border-t border-slate-200 bg-white py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-700">RoamAgent · National Multimodal Transit & Fare Engine</span>
          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
            <span>Time-Aware Transport Graph</span>
            <span>·</span>
            <span>Deterministic Cost Formulas</span>
            <span>·</span>
            <span>GDS Interconnect Feeds</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ConstraintsModal
        isOpen={isConstraintsModalOpen}
        onClose={() => setIsConstraintsModalOpen(false)}
        constraints={activeConstraints}
        onSave={(updated) => {
          setActiveConstraints(updated);
          executePlanRequest(updated);
        }}
      />

      <TestScenariosModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onSelectScenario={(constraints) => {
          setActiveConstraints(constraints);
          executePlanRequest(constraints);
        }}
      />

      <SavedTripsModal
        isOpen={isSavedTripsModalOpen}
        onClose={() => setIsSavedTripsModalOpen(false)}
        savedTrips={savedTrips}
        onLoadTrip={handleLoadSavedTrip}
        onDeleteTrip={handleDeleteTrip}
      />
    </div>
  );
}
