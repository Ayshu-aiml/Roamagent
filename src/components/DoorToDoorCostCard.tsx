import React from 'react';
import {
  IndianRupee,
  Receipt,
  Users,
  Utensils,
  Hotel,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  TrendingDown
} from 'lucide-react';
import { DoorToDoorCost, TravelConstraints } from '../types/travel';

interface DoorToDoorCostCardProps {
  cost: DoorToDoorCost;
  travelers: number;
  totalBudget?: number;
  onUpdateOptionalExpenses?: (meals: number, hotel: number) => void;
  mealsBudgetPerPerson: number;
  hotelBudgetPerPerson: number;
}

export const DoorToDoorCostCard: React.FC<DoorToDoorCostCardProps> = ({
  cost,
  travelers,
  totalBudget,
  onUpdateOptionalExpenses,
  mealsBudgetPerPerson,
  hotelBudgetPerPerson
}) => {
  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'confirmed':
        return (
          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
            Confirmed
          </span>
        );
      case 'estimated':
        return (
          <span className="text-[10px] font-medium text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">
            Estimated
          </span>
        );
      case 'user-entered':
        return (
          <span className="text-[10px] font-medium text-blue-400 bg-blue-950/60 border border-blue-800/60 px-1.5 py-0.5 rounded">
            User-entered
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
            Unavailable
          </span>
        );
    }
  };

  const remainingBudget = totalBudget !== undefined ? totalBudget - cost.totalGroupCost : undefined;
  const budgetUtilizationPercent = totalBudget
    ? Math.min(100, Math.round((cost.totalGroupCost / totalBudget) * 100))
    : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl shadow-black/40">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            Deterministic Door-to-Door Cost Engine
          </h3>
          <p className="text-xs text-slate-400">
            Total journey cost = first-mile + main transit + taxes + baggage + transfers + last-mile + optional extras
          </p>
        </div>

        {/* Big Total Figures */}
        <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Per Person</span>
            <span className="text-sm font-bold text-slate-200">
              ₹{cost.totalCostPerPerson.toLocaleString()}
            </span>
          </div>
          <div className="h-7 w-px bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Total Group ({travelers} pax)</span>
            <span className="text-lg font-extrabold text-emerald-400">
              ₹{cost.totalGroupCost.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Budget Meter */}
      {totalBudget && (
        <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              Budget Allocated: <strong className="text-white">₹{totalBudget.toLocaleString()}</strong>
            </span>
            <span className={`font-semibold ${remainingBudget! >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {remainingBudget! >= 0
                ? `Remaining Budget: ₹${remainingBudget!.toLocaleString()}`
                : `Over Budget by: ₹${Math.abs(remainingBudget!).toLocaleString()}`}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                budgetUtilizationPercent! > 100
                  ? 'bg-rose-500'
                  : budgetUtilizationPercent! > 85
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, budgetUtilizationPercent!)}%` }}
            />
          </div>
        </div>
      )}

      {/* Cost Line Items Breakdown */}
      <div className="mt-5 space-y-2.5">
        <span className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
          Transparent Segment Line Items:
        </span>

        <div className="divide-y divide-slate-800/80 border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/60">
          {cost.items.map((item, idx) => (
            <div
              key={idx}
              className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/60 transition"
            >
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-200">{item.label}</span>
                  {getConfidenceBadge(item.confidence)}
                </div>
                {item.notes && (
                  <span className="text-[11px] text-slate-400 block mt-0.5">{item.notes}</span>
                )}
              </div>

              <div className="text-right shrink-0">
                <span className="font-semibold text-white block">
                  ₹{item.amountTotal.toLocaleString()}
                </span>
                {travelers > 1 && item.amountTotal > 0 && (
                  <span className="text-[10px] text-slate-400 block">
                    ₹{item.amountPerPerson.toLocaleString()} / person
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional Expenses Interactive Tweak Bar */}
      {onUpdateOptionalExpenses && (
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-amber-400" />
              Configure Optional Allowances:
            </span>

            {/* Meals per person */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="meals-select" className="text-slate-400">Meals:</label>
              <select
                id="meals-select"
                value={mealsBudgetPerPerson}
                onChange={(e) => onUpdateOptionalExpenses(Number(e.target.value), hotelBudgetPerPerson)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs outline-none"
              >
                <option value={0}>None (₹0)</option>
                <option value={200}>Light Snacks (₹200/pax)</option>
                <option value={500}>Full Meals (₹500/pax)</option>
                <option value={1000}>Premium Dining (₹1,000/pax)</option>
              </select>
            </div>

            {/* Hotel accommodation per person */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="stay-select" className="text-slate-400">Transit Stay:</label>
              <select
                id="stay-select"
                value={hotelBudgetPerPerson}
                onChange={(e) => onUpdateOptionalExpenses(mealsBudgetPerPerson, Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs outline-none"
              >
                <option value={0}>None (₹0)</option>
                <option value={800}>Pod/Dormitory (₹800/pax)</option>
                <option value={2000}>Transit Hotel (₹2,000/pax)</option>
              </select>
            </div>
          </div>

          <span className="text-[11px] text-slate-500 italic">
            Deterministic recalculation updates immediately
          </span>
        </div>
      )}
    </div>
  );
};
