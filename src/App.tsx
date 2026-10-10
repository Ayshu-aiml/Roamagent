import React, { useState, useEffect } from 'react';
import {
  Compass,
  AlertTriangle,
  Bookmark,
  Share2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Info,
  Calendar,
  Sparkles,
  Printer
} from 'lucide-react';
import { AgentPlanResponse, Itinerary, TravelConstraints } from './types/travel';
import { Header } from './components/Header';
import { AgentChatVoice } from './components/AgentChatVoice';
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
        throw new Error(errData.error || 'Failed to calculate optimal itineraries.');
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
      setErrorMessage(err.message || 'An unexpected error occurred while planning your trip.');
    } finally {
      setIsLoading(false);
    }
  };

  // Conversational Natural Language Message Handler
  const handleSendMessage = async (text: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          currentConstraints: activeConstraints,
          language: preferredLanguage
        })
      });

      if (!res.ok) {
        throw new Error('Failed to communicate with conversational travel agent.');
      }

      const data = await res.json();

      if (data.status === 'needs_clarification') {
        setNotificationBanner({
          type: 'info',
          text: `RoamAgent: ${data.reply || data.clarificationQuestion}`
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
          text: `Trip plan generated successfully for ${data.plan.extractedConstraints.origin} → ${data.plan.extractedConstraints.destination}.`
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing your travel request.');
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
        text: 'Itinerary saved to your local trip history!'
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation Bar */}
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Notification Banner */}
        {notificationBanner && (
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-center justify-between gap-3 ${
              notificationBanner.type === 'alert'
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                : notificationBanner.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                : 'bg-cyan-950/40 border-cyan-800/60 text-cyan-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notificationBanner.type === 'alert' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              ) : notificationBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <Info className="w-4 h-4 shrink-0 text-cyan-400" />
              )}
              <span>{notificationBanner.text}</span>
            </div>
            <button
              onClick={() => setNotificationBanner(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-slate-800/60 transition"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => executePlanRequest(activeConstraints)}
              className="px-2.5 py-1 bg-rose-900/80 hover:bg-rose-800 rounded font-semibold text-white transition flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Conversational & Voice Planning Control Panel */}
        <AgentChatVoice
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          activeConstraints={activeConstraints}
          onOpenConstraintsModal={() => setIsConstraintsModalOpen(true)}
          speechSummary={plan?.speechSummary || ''}
          serverAudioBase64={serverAudioBase64}
          preferredLanguage={preferredLanguage}
        />

        {/* Loading Overlay State */}
        {isLoading && !plan && (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-sm font-medium">
              RoamAgent is calculating optimal transport graphs and door-to-door fares...
            </p>
          </div>
        )}

        {/* Main Dashboard Results */}
        {plan && activeItinerary && (
          <div className="space-y-6">
            {/* Pareto Route Options Switcher */}
            <RouteOptionsSwitcher
              itineraries={plan.itineraries}
              selectedId={activeItinerary.id}
              onSelect={(type) => setSelectedRouteType(type)}
            />

            {/* Action Toolbar (Save Trip, Export, Recalculate) */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Active Plan:</span>
                <span className="text-cyan-400 font-bold">{activeItinerary.title}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">
                  Departs {activeItinerary.departureTime} → Arrives {activeItinerary.arrivalTime}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveTrip}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title="Save this itinerary to local trip history"
                >
                  <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Trip</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title="Print or save as PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Print Itinerary</span>
                </button>
              </div>
            </div>

            {/* Interactive Directed Transport Graph Visualizer */}
            <RouteGraphVisualizer
              itinerary={activeItinerary}
              onSimulateDisruption={handleSimulateDisruption}
              isDisrupting={isDisrupting}
            />

            {/* Two Column Grid: Cost Engine & Chronological Itinerary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left: Deterministic Cost Engine */}
              <DoorToDoorCostCard
                cost={activeItinerary.totalCost}
                travelers={activeConstraints.travelers}
                totalBudget={activeConstraints.totalBudget}
                onUpdateOptionalExpenses={handleUpdateOptionalExpenses}
                mealsBudgetPerPerson={activeConstraints.mealsBudgetPerPerson || 0}
                hotelBudgetPerPerson={activeConstraints.hotelBudgetPerPerson || 0}
              />

              {/* Right: Step-by-Step Chronological Timeline */}
              <ChronologicalItinerary
                itinerary={activeItinerary}
                travelers={activeConstraints.travelers}
              />
            </div>

            {/* Weather & Safety Intelligence Panel */}
            <WeatherSafetyPanel
              plan={plan}
              activeItinerary={activeItinerary}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>RoamAgent AI · Intelligent Agentic Multimodal Travel Planner</span>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Graph-Based Routing</span>
            <span>·</span>
            <span>Deterministic Cost Formulas</span>
            <span>·</span>
            <span>Multilingual Voice Integration</span>
          </div>
        </div>
      </footer>

      {/* Constraints Modal */}
      <ConstraintsModal
        isOpen={isConstraintsModalOpen}
        onClose={() => setIsConstraintsModalOpen(false)}
        constraints={activeConstraints}
        onSave={(updated) => {
          setActiveConstraints(updated);
          executePlanRequest(updated);
        }}
      />

      {/* Benchmark Tests Modal */}
      <TestScenariosModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onSelectScenario={(constraints) => {
          setActiveConstraints(constraints);
          executePlanRequest(constraints);
        }}
      />

      {/* Saved Trips Modal */}
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
