import React from 'react';
import { Receipt, Utensils } from 'lucide-react';
import { DoorToDoorCost } from '../types/travel';

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
        return <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">Confirmed</span>;
      case 'estimated':
        return <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">Estimated</span>;
      case 'user-entered':
        return <span className="text-[10px] text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-semibold">User-entered</span>;
      default:
        return <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">N/A</span>;
    }
  };

  const remainingBudget = totalBudget !== undefined ? totalBudget - cost.totalGroupCost : undefined;
  const budgetUtilizationPercent = totalBudget
    ? Math.min(100, Math.round((cost.totalGroupCost / totalBudget) * 100))
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Door-to-Door Fare Statement
          </h3>
        </div>

        {/* Totals */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-semibold">Per Traveler</span>
            <span className="font-bold text-slate-800">
              ₹{cost.totalCostPerPerson.toLocaleString()}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-sans font-semibold">Total ({travelers} pax)</span>
            <span className="text-base font-extrabold text-emerald-700">
              ₹{cost.totalGroupCost.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Budget Progress Meter */}
      {totalBudget && (
        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-600 font-medium">
              Budget Cap: <strong className="text-slate-900 font-mono">₹{totalBudget.toLocaleString()}</strong>
            </span>
            <span className={`font-mono font-bold ${remainingBudget! >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {remainingBudget! >= 0
                ? `Remaining: ₹${remainingBudget!.toLocaleString()}`
                : `Over Budget: ₹${Math.abs(remainingBudget!).toLocaleString()}`}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                budgetUtilizationPercent! > 100
                  ? 'bg-rose-500'
                  : budgetUtilizationPercent! > 85
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, budgetUtilizationPercent!)}%` }}
            />
          </div>
        </div>
      )}

      {/* Itemized Fare Statement Table */}
      <div className="mt-4 space-y-1">
        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
          Itemized Transit & Fee Breakdown:
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white text-xs">
          {cost.items.map((item, idx) => (
            <div
              key={idx}
              className="p-3 flex items-center justify-between hover:bg-slate-50/70 transition"
            >
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{item.label}</span>
                  {getConfidenceBadge(item.confidence)}
                </div>
                {item.notes && (
                  <span className="text-[10px] text-slate-500 block mt-0.5">{item.notes}</span>
                )}
              </div>

              <div className="text-right shrink-0 font-mono">
                <span className="font-bold text-slate-900 block">
                  ₹{item.amountTotal.toLocaleString()}
                </span>
                {travelers > 1 && item.amountTotal > 0 && (
                  <span className="text-[10px] text-slate-500 block">
                    (₹{item.amountPerPerson.toLocaleString()} ea)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional Allowances Bar */}
      {onUpdateOptionalExpenses && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <Utensils className="w-4 h-4 text-slate-400" />
            <div className="flex items-center gap-1.5">
              <label htmlFor="meals-select" className="text-[11px] font-semibold text-slate-500">Meals:</label>
              <select
                id="meals-select"
                value={mealsBudgetPerPerson}
                onChange={(e) => onUpdateOptionalExpenses(Number(e.target.value), hotelBudgetPerPerson)}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-md px-2 py-1 text-xs outline-none cursor-pointer focus:border-blue-500 font-medium"
              >
                <option value={0}>None (₹0)</option>
                <option value={200}>Snacks (₹200/pax)</option>
                <option value={500}>Meals (₹500/pax)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="stay-select" className="text-[11px] font-semibold text-slate-500">Lodging:</label>
              <select
                id="stay-select"
                value={hotelBudgetPerPerson}
                onChange={(e) => onUpdateOptionalExpenses(mealsBudgetPerPerson, Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-md px-2 py-1 text-xs outline-none cursor-pointer focus:border-blue-500 font-medium"
              >
                <option value={0}>None (₹0)</option>
                <option value={800}>Pod/Dorm (₹800/pax)</option>
                <option value={2000}>Hotel (₹2,000/pax)</option>
              </select>
            </div>
          </div>

          <span className="text-[10px] text-slate-400 font-mono">
            Deterministic Fare Engine
          </span>
        </div>
      )}
    </div>
  );
};
