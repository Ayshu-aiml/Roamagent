import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Mic,
  ArrowRightLeft,
  Volume2,
  Pause,
  Play,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { TransportMode, TravelConstraints } from '../types/travel';

interface TravelSearchConsoleProps {
  activeConstraints: TravelConstraints;
  onSearch: (constraints: TravelConstraints) => Promise<void>;
  onNaturalLanguageQuery: (query: string) => Promise<void>;
  isLoading: boolean;
  speechSummary: string;
  serverAudioBase64?: string;
  preferredLanguage: string;
}

export const TravelSearchConsole: React.FC<TravelSearchConsoleProps> = ({
  activeConstraints,
  onSearch,
  onNaturalLanguageQuery,
  isLoading,
  speechSummary,
  serverAudioBase64,
  preferredLanguage
}) => {
  const [activeTab, setActiveTab] = useState<'structured' | 'voice'>('structured');

  // Form Fields
  const [origin, setOrigin] = useState(activeConstraints.origin);
  const [destination, setDestination] = useState(activeConstraints.destination);
  const [travelDate, setTravelDate] = useState(activeConstraints.travelDate);
  const [departureTime, setDepartureTime] = useState(activeConstraints.preferredDepartureTime || '05:30');
  const [arrivalDeadline, setArrivalDeadline] = useState(activeConstraints.arrivalDeadline || '18:00');
  const [travelers, setTravelers] = useState(activeConstraints.travelers || 1);
  const [totalBudget, setTotalBudget] = useState(activeConstraints.totalBudget || 3000);
  const [comfortLevel, setComfortLevel] = useState(activeConstraints.comfortLevel || 'comfortable');
  const [preferredModes, setPreferredModes] = useState<TransportMode[]>(activeConstraints.preferredModes || ['train', 'bus', 'cab']);

  // Natural language query & voice input
  const [naturalText, setNaturalText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Audio Playback State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Sync state when activeConstraints updates externally
  useEffect(() => {
    setOrigin(activeConstraints.origin);
    setDestination(activeConstraints.destination);
    setTravelDate(activeConstraints.travelDate);
    setDepartureTime(activeConstraints.preferredDepartureTime || '05:30');
    setArrivalDeadline(activeConstraints.arrivalDeadline || '18:00');
    setTravelers(activeConstraints.travelers || 1);
    setTotalBudget(activeConstraints.totalBudget || 3000);
    setComfortLevel(activeConstraints.comfortLevel || 'comfortable');
    setPreferredModes(activeConstraints.preferredModes || ['train', 'bus', 'cab']);
  }, [activeConstraints]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      const langMap: Record<string, string> = {
        en: 'en-US',
        te: 'te-IN',
        hi: 'hi-IN',
        es: 'es-ES'
      };
      recognition.lang = langMap[preferredLanguage] || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (final) {
          setNaturalText(prev => prev ? `${prev} ${final}` : final);
        } else if (interim) {
          setNaturalText(interim);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setSpeechError(`Voice input: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, [preferredLanguage]);

  // Audio Playback handler
  useEffect(() => {
    if (serverAudioBase64) {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(`data:audio/wav;base64,${serverAudioBase64}`);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      audioRef.current = audio;
    }
  }, [serverAudioBase64]);

  const toggleVoiceCapture = () => {
    if (!recognitionRef.current) {
      setSpeechError('Web Speech API not supported in this browser. Please type below.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setSpeechError(null);
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition start err:', err);
      }
    }
  };

  const handleAudioPlayback = () => {
    if (!speechSummary) return;

    if (isPlayingAudio) {
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
      return;
    }

    if (audioRef.current && serverAudioBase64) {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch(() => {
        fallbackBrowserSpeak();
      });
    } else {
      fallbackBrowserSpeak();
    }
  };

  const fallbackBrowserSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechSummary);
    const langMap: Record<string, string> = {
      en: 'en-US',
      te: 'te-IN',
      hi: 'hi-IN',
      es: 'es-ES'
    };
    utterance.lang = langMap[preferredLanguage] || 'en-US';
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSwapStations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleStructuredSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim() || isLoading) return;

    const updated: TravelConstraints = {
      ...activeConstraints,
      origin: origin.trim(),
      destination: destination.trim(),
      travelDate,
      preferredDepartureTime: departureTime,
      arrivalDeadline,
      travelers: Number(travelers) || 1,
      totalBudget: Number(totalBudget) || undefined,
      comfortLevel,
      preferredModes
    };

    onSearch(updated);
  };

  const handleNaturalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalText.trim() || isLoading) return;
    onNaturalLanguageQuery(naturalText.trim());
  };

  const toggleMode = (mode: TransportMode) => {
    if (preferredModes.includes(mode)) {
      if (preferredModes.length > 1) {
        setPreferredModes(preferredModes.filter(m => m !== mode));
      }
    } else {
      setPreferredModes([...preferredModes, mode]);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Search Header Bar */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('structured')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeTab === 'structured'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Route Search
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'voice'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-slate-500" />
            <span>Voice / Quick Text</span>
          </button>
        </div>

        {/* Audio Briefing Controls */}
        {speechSummary && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleAudioPlayback}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                isPlayingAudio
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Play audio route advisory"
            >
              {isPlayingAudio ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Briefing</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-blue-600" />
                  <span>Audio Briefing</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (audioRef.current) audioRef.current.currentTime = 0;
                handleAudioPlayback();
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 transition cursor-pointer"
              title="Replay from start"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Structured Search Form */}
      {activeTab === 'structured' && (
        <form onSubmit={handleStructuredSubmit} className="p-5 space-y-4">
          {/* Row 1: Departure & Arrival Stations */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-center">
            <div>
              <label htmlFor="origin-input" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Departure Station / Origin:
              </label>
              <div className="relative flex items-center">
                <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 pointer-events-none" />
                <input
                  id="origin-input"
                  type="text"
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                  placeholder="e.g. Visakhapatnam railway station"
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-slate-900 outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="flex justify-center md:pt-5">
              <button
                type="button"
                onClick={handleSwapStations}
                className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer"
                title="Swap stations"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label htmlFor="destination-input" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Arrival Station / Destination:
              </label>
              <div className="relative flex items-center">
                <MapPin className="w-4 h-4 text-rose-600 absolute left-3 pointer-events-none" />
                <input
                  id="destination-input"
                  type="text"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  placeholder="e.g. Hyderabad airport"
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-slate-900 outline-none transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Row 2: Timing, Passengers, Budget */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-1 text-xs">
            <div>
              <label htmlFor="date-input" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Travel Date:
              </label>
              <input
                id="date-input"
                type="date"
                value={travelDate}
                onChange={e => setTravelDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                required
              />
            </div>

            <div>
              <label htmlFor="dep-time-input" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Earliest Dep:
              </label>
              <input
                id="dep-time-input"
                type="time"
                value={departureTime}
                onChange={e => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label htmlFor="deadline-input" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Arrival Deadline:
              </label>
              <input
                id="deadline-input"
                type="time"
                value={arrivalDeadline}
                onChange={e => setArrivalDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label htmlFor="travelers-input" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Travelers:
              </label>
              <input
                id="travelers-input"
                type="number"
                min={1}
                max={10}
                value={travelers}
                onChange={e => setTravelers(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="budget-input" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Budget Cap (₹):
              </label>
              <input
                id="budget-input"
                type="number"
                step={200}
                value={totalBudget}
                onChange={e => setTotalBudget(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-emerald-700 font-bold outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Row 3: Mode selectors & Search CTA */}
          <div className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500">Transit Modes:</span>
              {(['train', 'bus', 'flight', 'cab', 'metro'] as TransportMode[]).map(mode => {
                const isSelected = preferredModes.includes(mode);
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => toggleMode(mode)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer capitalize ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs tracking-wide transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Computing Routes...' : 'Search Route Options'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Mode 2: Quick Voice or Natural Language Input */}
      {activeTab === 'voice' && (
        <form onSubmit={handleNaturalSubmit} className="p-5 space-y-3">
          <div className="relative">
            <textarea
              rows={3}
              value={naturalText}
              onChange={e => setNaturalText(e.target.value)}
              placeholder='Dictate or type complete route instructions (e.g. "Plan a trip from Visakhapatnam railway station to Hyderabad airport tomorrow. Budget ₹3,000, arrive before 6 PM, safe and comfortable.")'
              className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white leading-relaxed transition"
            />

            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleVoiceCapture}
                className={`p-2 rounded-lg transition cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title={isListening ? 'Stop voice recording' : 'Start speech-to-text'}
              >
                <Mic className="w-4 h-4" />
              </button>

              <button
                type="submit"
                disabled={isLoading || !naturalText.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>
          </div>

          {isListening && (
            <div className="text-xs text-blue-600 flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Listening in {preferredLanguage.toUpperCase()}...</span>
            </div>
          )}

          {speechError && (
            <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
            <span className="text-[11px] text-slate-500 font-semibold">Corridor shortcuts:</span>
            <button
              type="button"
              onClick={() => setNaturalText("Visakhapatnam railway station to Hyderabad airport tomorrow under ₹3,000, arrive before 6 PM")}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] transition cursor-pointer"
            >
              Vizag → Hyd Airport (&lt; 6 PM)
            </button>
            <button
              type="button"
              onClick={() => setNaturalText("Cheapest route from Visakhapatnam to Bengaluru for 2 passengers, arrive before 8 AM")}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] transition cursor-pointer"
            >
              Vizag → Bengaluru (2 Pax, &lt; 8 AM)
            </button>
          </div>
        </form>
      )}

      {/* Route Advisory Briefing Banner */}
      {speechSummary && (
        <div className="px-5 py-3 border-t border-blue-100 bg-blue-50/50 flex items-start gap-3 text-xs text-slate-700">
          <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold text-slate-900">Route Advisory: </span>
            <span className="text-slate-700">{speechSummary}</span>
          </div>
        </div>
      )}
    </div>
  );
};
