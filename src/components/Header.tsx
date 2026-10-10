import React from 'react';
import { Route, Languages, BookmarkCheck, FlaskConical, Printer } from 'lucide-react';

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
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900">
                RoamAgent
              </span>
              <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
                / National & Intercity Multimodal Transit
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Provider Network Status */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span>{isDemoMode ? 'Simulator Data' : 'GDS Live Feeds'}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
          </div>

          {/* Test Scenarios button */}
          <button
            onClick={onOpenTestScenarios}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition cursor-pointer"
            title="Pre-configured route benchmarks"
          >
            <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Route Scenarios</span>
          </button>

          {/* Language selector */}
          <div className="relative flex items-center">
            <label htmlFor="language-select" className="sr-only">Language</label>
            <Languages className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
            <select
              id="language-select"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="en">EN</option>
              <option value="te">తెలుగు</option>
              <option value="hi">हिन्दी</option>
              <option value="es">ES</option>
            </select>
          </div>

          {/* Saved Trips */}
          <button
            onClick={onOpenSavedTrips}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition cursor-pointer"
            title="View saved itineraries"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Saved</span>
            {savedTripsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                {savedTripsCount}
              </span>
            )}
          </button>

          {/* Export / Print */}
          {onExportTrip && (
            <button
              onClick={onExportTrip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer shadow-xs"
              title="Print or export itinerary"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
