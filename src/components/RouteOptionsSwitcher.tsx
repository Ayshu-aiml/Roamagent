import React from 'react';
import { Award, Zap, DollarSign, Clock, ArrowRight, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
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
    icon: React.ReactNode;
    badge: string;
    badgeColor: string;
  }> = [
    {
      type: 'recommended',
      itinerary: recommended,
      icon: <Award className="w-4 h-4 text-cyan-400" />,
      badge: 'Best Overall',
      badgeColor: 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300'
    },
    {
      type: 'cheapest',
      itinerary: cheapest,
      icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
      badge: 'Lowest Fare',
      badgeColor: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
    },
    {
      type: 'fastest',
      itinerary: fastest,
      icon: <Zap className="w-4 h-4 text-purple-400" />,
      badge: 'Fastest Travel',
      badgeColor: 'border-purple-500/50 bg-purple-950/40 text-purple-300'
    }
  ];

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Pareto-Optimal Journey Alternatives
        </h3>
        <span className="text-xs text-slate-400">Select route to update graph and door-to-door cost</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {routes.map(({ type, itinerary, icon, badge, badgeColor }) => {
          const isSelected = selectedId === itinerary.id || (selectedId.includes(type));
          const costDelta = itinerary.totalCost.totalGroupCost - recommended.totalCost.totalGroupCost;
          const timeDelta = itinerary.totalDurationMinutes - recommended.totalDurationMinutes;

          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className={`p-4 rounded-xl text-left transition relative border cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/90 border-cyan-500 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/40'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {icon}
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${badgeColor}`}>
                    {badge}
                  </span>
                </div>
                {isSelected && (
                  <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                    ACTIVE
                  </span>
                )}
              </div>

              {/* Title & Timing */}
              <h4 className="text-sm font-bold text-white truncate mb-1">
                {itinerary.title}
              </h4>
              <p className="text-xs text-slate-400 line-clamp-1 mb-3">
                {itinerary.summary}
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Total Cost</span>
                  <span className="text-base font-bold text-emerald-400">
                    ₹{itinerary.totalCost.totalGroupCost.toLocaleString()}
                  </span>
                  {type !== 'recommended' && (
                    <span className="block text-[10px] text-slate-400">
                      {costDelta > 0 ? `+₹${costDelta.toLocaleString()}` : `-₹${Math.abs(costDelta).toLocaleString()}`} vs best
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Total Time</span>
                  <span className="text-base font-bold text-slate-200">
                    {formatDuration(itinerary.totalDurationMinutes)}
                  </span>
                  {type !== 'recommended' && (
                    <span className="block text-[10px] text-slate-400">
                      {timeDelta > 0 ? `+${timeDelta}m slower` : `${Math.abs(timeDelta)}m faster`}
                    </span>
                  )}
                </div>
              </div>

              {/* Arrival & Constraints Badge */}
              <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-1 text-slate-300">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Dep {itinerary.departureTime} → Arr {itinerary.arrivalTime}</span>
                </div>
                <div>
                  {itinerary.satisfiesDeadline ? (
                    <span className="text-emerald-400 flex items-center gap-0.5" title="Arrival satisfies deadline">
                      <CheckCircle2 className="w-3 h-3 inline" /> On Time
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-0.5" title="Arrival exceeds specified deadline">
                      <AlertTriangle className="w-3 h-3 inline" /> Deadline Exceeded
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
