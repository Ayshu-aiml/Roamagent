import React, { useEffect, useState } from 'react';
import { X, FlaskConical, Play, CheckCircle2, Clock, IndianRupee, Users } from 'lucide-react';
import { TravelConstraints } from '../types/travel';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  constraints: TravelConstraints;
}

interface TestScenariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (constraints: TravelConstraints) => void;
}

export const TestScenariosModal: React.FC<TestScenariosModalProps> = ({
  isOpen,
  onClose,
  onSelectScenario
}) => {
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/test-scenarios')
        .then(res => res.json())
        .then(data => {
          setScenarios(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-800">
          <FlaskConical className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-base font-bold text-white">
              Prompt Verification & Benchmark Test Suite
            </h2>
            <p className="text-xs text-slate-400">
              Run pre-configured test scenarios to verify agent reasoning, graph generation, and cost arithmetic
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Loading test scenarios...
          </div>
        ) : (
          <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-1">
            {scenarios.map(sc => (
              <div
                key={sc.id}
                className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl hover:border-slate-700 transition flex items-start justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white">{sc.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                    {sc.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Route: {sc.constraints.origin} → {sc.constraints.destination}
                    </span>
                    {sc.constraints.totalBudget && (
                      <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-emerald-400">
                        ₹{sc.constraints.totalBudget.toLocaleString()}
                      </span>
                    )}
                    {sc.constraints.arrivalDeadline && (
                      <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-amber-300">
                        Before {sc.constraints.arrivalDeadline}
                      </span>
                    )}
                    <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {sc.constraints.travelers} Pax
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectScenario(sc.constraints);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-md"
                >
                  <Play className="w-3 h-3" />
                  <span>Execute Test</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
