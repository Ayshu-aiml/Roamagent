import React from 'react';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Itinerary } from '../types/travel';

interface RouteOptionsSwitcherProps {
  itineraries: {
    recommended: Itinerary;
    cheapest: Itinerary;
    fastest: Itinerary;
  };
  selectedId: string;
  onSelect: (type: 'recommended' | 'cheapest' | 'fastest') => void;
}

export const RouteOptionsSwitcher: React.FC<RouteOptionsSwitcherProps> = ({
  itineraries,
  selectedId,
  onSelect
}) => {
  const { recommended, cheapest, fastest } = itineraries;

  const routes: Array<{
    type: 'recommended' | 'cheapest' | 'fastest';
    itinerary: Itinerary;
    tierLabel: string;
    tierSubtitle: string;
  }> = [
    {
      type: 'recommended',
      itinerary: recommended,
      tierLabel: 'Recommended Corridor',
      tierSubtitle: 'Optimal balance of cost, transit time & connection buffers'
    },
    {
      type: 'cheapest',
      itinerary: cheapest,
      tierLabel: 'Lowest Total Fare',
      tierSubtitle: 'Minimum door-to-door group expenditure'
    },
    {
      type: 'fastest',
      itinerary: fastest,
      tierLabel: 'Fastest Travel Time',
      tierSubtitle: 'Express routing with shortest travel duration'
    }
  ];

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
          Multimodal Itinerary Alternatives ({routes.length})
        </span>
        <span className="text-[11px]">Select an option to inspect route details and cost breakdown</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {routes.map(({ type, itinerary, tierLabel }) => {
          const isSelected = selectedId === itinerary.id || selectedId.includes(type);
          const costDelta = itinerary.totalCost.totalGroupCost - recommended.totalCost.totalGroupCost;
          const timeDelta = itinerary.totalDurationMinutes - recommended.totalDurationMinutes;

          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className={`p-4 rounded-xl text-left transition cursor-pointer border ${
                isSelected
                  ? 'bg-blue-50/40 border-blue-600 ring-1 ring-blue-600 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              {/* Header Tier */}
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                  {tierLabel}
                </span>
                {isSelected ? (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Selected
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Select
                  </span>
                )}
              </div>

              {/* Title */}
              <h4 className="text-sm font-bold text-slate-900 truncate mb-0.5">
                {itinerary.title}
              </h4>
              <p className="text-[11px] text-slate-500 line-clamp-1 mb-3">
                {itinerary.summary}
              </p>

              {/* Cost & Duration Metrics */}
              <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Total Fare</span>
                  <span className="text-base font-extrabold text-emerald-700 font-mono">
                    ₹{itinerary.totalCost.totalGroupCost.toLocaleString()}
                  </span>
                  {type !== 'recommended' && (
                    <span className="block text-[10px] text-slate-500 font-mono">
                      {costDelta > 0 ? `+₹${costDelta.toLocaleString()}` : `-₹${Math.abs(costDelta).toLocaleString()}`}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Duration</span>
                  <span className="text-base font-bold text-slate-800 font-mono">
                    {formatDuration(itinerary.totalDurationMinutes)}
                  </span>
                  {type !== 'recommended' && (
                    <span className="block text-[10px] text-slate-500 font-mono">
                      {timeDelta > 0 ? `+${timeDelta}m` : `${timeDelta}m`}
                    </span>
                  )}
                </div>
              </div>

              {/* Schedule and Deadline verification */}
              <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 text-slate-500">
                <span className="flex items-center gap-1 font-mono font-medium text-slate-700">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {itinerary.departureTime} → {itinerary.arrivalTime}
                </span>

                <div>
                  {itinerary.satisfiesDeadline ? (
                    <span className="text-emerald-700 flex items-center gap-1 font-semibold text-[10px]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> On Time
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1 font-semibold text-[10px]">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Exceeds
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
