import React from 'react';
import { X, BookmarkCheck, Trash2, ArrowRight, Calendar, IndianRupee, Clock } from 'lucide-react';
import { AgentPlanResponse } from '../types/travel';

interface SavedTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedTrips: { id: string; savedAt: string; plan: AgentPlanResponse }[];
  onLoadTrip: (plan: AgentPlanResponse) => void;
  onDeleteTrip: (id: string) => void;
}

export const SavedTripsModal: React.FC<SavedTripsModalProps> = ({
  isOpen,
  onClose,
  savedTrips,
  onLoadTrip,
  onDeleteTrip
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
          <BookmarkCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-base font-bold text-white">Saved Travel Itineraries</h2>
            <p className="text-xs text-slate-400">
              Locally persisted trip history & graph configurations
            </p>
          </div>
        </div>

        {savedTrips.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            No saved itineraries yet. Click &quot;Save Trip&quot; on any generated plan to store it here.
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {savedTrips.map(item => {
              const rec = item.plan.itineraries.recommended;
              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl hover:border-slate-700 transition flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white mb-0.5">
                      {item.plan.extractedConstraints.origin} → {item.plan.extractedConstraints.destination}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1 mb-2">
                      {rec.title} ({rec.departureTime} – {rec.arrivalTime})
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="text-emerald-400 font-semibold">
                        ₹{rec.totalCost.totalGroupCost.toLocaleString()}
                      </span>
                      <span>{item.plan.extractedConstraints.travelDate}</span>
                      <span>Saved: {new Date(item.savedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onLoadTrip(item.plan);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <span>Load</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteTrip(item.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                      title="Delete saved trip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
