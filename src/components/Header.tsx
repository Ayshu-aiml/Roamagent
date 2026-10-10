import React from 'react';
import { Compass, Sparkles, Languages, BookmarkCheck, FlaskConical, Share2 } from 'lucide-react';

interface HeaderProps {
  language: string;
  onLanguageChange: (lang: string) => void;
  onOpenTestScenarios: () => void;
  onOpenSavedTrips: () => void;
  savedTripsCount: number;
  isDemoMode: boolean;
  onExportTrip?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  onOpenTestScenarios,
  onOpenSavedTrips,
  savedTripsCount,
  isDemoMode,
  onExportTrip
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/20 text-white">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">RoamAgent AI</span>
              <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Intelligent Agentic Travel & Graph Routing Planner
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Demo Mode indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/80 border border-slate-700/80 text-slate-300">
            <span className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span>{isDemoMode ? 'Hybrid Demo Simulator' : 'Live Connected APIs'}</span>
          </div>

          {/* Test Scenarios button */}
          <button
            onClick={onOpenTestScenarios}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Run prompt benchmark tests"
          >
            <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Benchmark Tests</span>
          </button>

          {/* Language selector */}
          <div className="relative flex items-center">
            <label htmlFor="language-select" className="sr-only">Preferred Language</label>
            <Languages className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
            <select
              id="language-select"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="pl-7 pr-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="en">English (US/IN)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="es">Español (Spanish)</option>
            </select>
          </div>

          {/* Saved Trips */}
          <button
            onClick={onOpenSavedTrips}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="View saved itineraries"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Saved</span>
            {savedTripsCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                {savedTripsCount}
              </span>
            )}
          </button>

          {/* Export / Share */}
          {onExportTrip && (
            <button
              onClick={onExportTrip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm"
              title="Share or print plan"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
