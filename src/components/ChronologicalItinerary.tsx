import React from 'react';
import {
  CalendarClock,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Footprints,
  Train,
  Bus,
  Plane,
  Car,
  Navigation,
  ArrowDown
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
        return <Footprints className="w-4 h-4 text-emerald-400" />;
      case 'cab':
        return <Car className="w-4 h-4 text-amber-400" />;
      case 'bus':
        return <Bus className="w-4 h-4 text-blue-400" />;
      case 'train':
        return <Train className="w-4 h-4 text-cyan-400" />;
      case 'flight':
        return <Plane className="w-4 h-4 text-purple-400" />;
      case 'metro':
        return <Navigation className="w-4 h-4 text-emerald-400" />;
      default:
        return <Car className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl shadow-black/40">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-cyan-400" />
            Chronological Door-to-Door Itinerary
          </h3>
          <p className="text-xs text-slate-400">
            Step-by-step verified timeline with transfer buffers & authorized booking links
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
          {edges.length} Journey Legs
        </span>
      </div>

      {/* Timeline Steps */}
      <div className="mt-6 space-y-6 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-800 before:z-0">
        {edges.map((edge, idx) => {
          const fromNode = graph.nodes.find(n => n.id === edge.fromNodeId) || graph.nodes[idx];
          const toNode = graph.nodes.find(n => n.id === edge.toNodeId) || graph.nodes[idx + 1];

          return (
            <div key={edge.id} className="relative z-10 flex items-start gap-4">
              {/* Step Icon Badge */}
              <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 shadow-md">
                {getModeIcon(edge.mode)}
              </div>

              {/* Step Content Card */}
              <div className="flex-1 bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition">
                {/* Header Timing & Mode */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      Leg {idx + 1}: {edge.mode}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs font-semibold text-white">
                      {edge.departureTime} – {edge.arrivalTime}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({edge.durationMinutes} mins)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400">
                      ₹{edge.totalFare.toLocaleString()} total
                    </span>
                    {edge.bookingUrl && (
                      <a
                        href={edge.bookingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/50 border border-cyan-800/60 px-2 py-0.5 rounded transition"
                      >
                        Book Ticket <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Service Details */}
                <h4 className="text-sm font-bold text-white mb-1">
                  {edge.name} <span className="text-xs font-normal text-slate-400">by {edge.operator}</span>
                </h4>

                {/* Stations From / To */}
                <div className="text-xs text-slate-300 flex flex-col gap-1 my-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span>From: <strong>{fromNode?.label || edge.fromNodeId}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                    <span>To: <strong>{toNode?.label || edge.toNodeId}</strong></span>
                  </div>
                </div>

                {/* Instructions / Amenities */}
                <p className="text-xs text-slate-400 leading-relaxed mb-2">
                  {edge.instructions}
                </p>

                {edge.amenities && edge.amenities.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {edge.amenities.map((amenity, aIdx) => (
                      <span
                        key={aIdx}
                        className="text-[10px] text-slate-300 bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                )}

                {/* Waiting & Transfer Buffer info */}
                {edge.waitingTimeMinutes > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/60 text-[11px] text-amber-300/90 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>
                      Recommended station transfer & security buffer: <strong>{edge.waitingTimeMinutes} minutes</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
