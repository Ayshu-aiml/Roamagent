import React from 'react';
import {
  Clock,
  ExternalLink,
  Footprints,
  Train,
  Bus,
  Plane,
  Car,
  Navigation,
  CalendarCheck
} from 'lucide-react';
import { GraphEdge, Itinerary, TransportMode } from '../types/travel';

interface ChronologicalItineraryProps {
  itinerary: Itinerary;
  travelers: number;
}

export const ChronologicalItinerary: React.FC<ChronologicalItineraryProps> = ({
  itinerary,
  travelers
}) => {
  const { edges, graph } = itinerary;

  const getModeIcon = (mode: TransportMode) => {
    switch (mode) {
      case 'walk':
        return <Footprints className="w-3.5 h-3.5 text-slate-600" />;
      case 'cab':
        return <Car className="w-3.5 h-3.5 text-slate-600" />;
      case 'bus':
        return <Bus className="w-3.5 h-3.5 text-slate-600" />;
      case 'train':
        return <Train className="w-3.5 h-3.5 text-slate-600" />;
      case 'flight':
        return <Plane className="w-3.5 h-3.5 text-slate-600" />;
      case 'metro':
        return <Navigation className="w-3.5 h-3.5 text-slate-600" />;
      default:
        return <Car className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Chronological Journey Timetable
          </h3>
        </div>

        <span className="text-[11px] font-mono text-slate-500">
          {edges.length} Connections
        </span>
      </div>

      {/* Timetable Entries */}
      <div className="mt-4 space-y-3">
        {edges.map((edge, idx) => {
          const fromNode = graph.nodes.find(n => n.id === edge.fromNodeId) || graph.nodes[idx];
          const toNode = graph.nodes.find(n => n.id === edge.toNodeId) || graph.nodes[idx + 1];

          return (
            <div
              key={edge.id}
              className="bg-slate-50/70 border border-slate-200 rounded-lg p-3.5 hover:border-slate-300 transition text-xs"
            >
              {/* Header Timing & Service */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-white border border-slate-200 shadow-xs">
                    {getModeIcon(edge.mode)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      {edge.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {edge.operator} {edge.vehicleIdentifier ? `· ${edge.vehicleIdentifier}` : ''}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-xs font-bold text-slate-900 block">
                    {edge.departureTime} → {edge.arrivalTime}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    {edge.durationMinutes} mins · {edge.distanceKm} km
                  </span>
                </div>
              </div>

              {/* Station Route Line */}
              <div className="my-2 py-2 px-3 rounded bg-white border border-slate-200 flex items-center justify-between text-[11px] text-slate-700 shadow-xs">
                <span className="truncate max-w-[45%]">
                  Board: <strong className="text-slate-900">{fromNode?.label}</strong>
                </span>
                <span className="text-slate-400">→</span>
                <span className="truncate max-w-[45%] text-right">
                  Alight: <strong className="text-slate-900">{toNode?.label}</strong>
                </span>
              </div>

              {/* Transit Notes & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-slate-600">
                <p className="line-clamp-2 text-slate-600 leading-normal flex-1">
                  {edge.instructions}
                </p>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center font-mono">
                  <span className="text-emerald-700 font-bold">
                    ₹{edge.totalFare.toLocaleString()}
                  </span>

                  {edge.bookingUrl && (
                    <a
                      href={edge.bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-sans text-blue-700 hover:text-blue-800 font-semibold transition"
                    >
                      <span>Booking Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Transfer Buffer */}
              {edge.waitingTimeMinutes > 0 && (
                <div className="mt-2 pt-1.5 border-t border-slate-200/80 text-[10px] text-slate-500 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Transfer connection buffer: {edge.waitingTimeMinutes} minutes scheduled</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
