import React, { useState } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { TransportMode, TravelConstraints } from '../types/travel';

interface ConstraintsModalProps {
  isOpen: boolean;
  onClose: () => void;
  constraints: TravelConstraints;
  onSave: (updated: TravelConstraints) => void;
}

export const ConstraintsModal: React.FC<ConstraintsModalProps> = ({
  isOpen,
  onClose,
  constraints,
  onSave
}) => {
  const [form, setForm] = useState<TravelConstraints>({ ...constraints });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  const toggleMode = (mode: TransportMode) => {
    const current = form.preferredModes;
    if (current.includes(mode)) {
      setForm({
        ...form,
        preferredModes: current.filter(m => m !== mode),
        excludedModes: [...form.excludedModes, mode]
      });
    } else {
      setForm({
        ...form,
        preferredModes: [...current, mode],
        excludedModes: form.excludedModes.filter(m => m !== mode)
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <SlidersHorizontal className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">
            Fine-Tune Travel Constraints & Directives
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-origin" className="block text-slate-600 font-semibold mb-1">
                Departure Station / Origin:
              </label>
              <input
                id="modal-origin"
                type="text"
                value={form.origin}
                onChange={e => setForm({ ...form, origin: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label htmlFor="modal-dest" className="block text-slate-600 font-semibold mb-1">
                Destination Drop-off:
              </label>
              <input
                id="modal-dest"
                type="text"
                value={form.destination}
                onChange={e => setForm({ ...form, destination: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Dates & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="modal-date" className="block text-slate-600 font-semibold mb-1">
                Travel Date:
              </label>
              <input
                id="modal-date"
                type="date"
                value={form.travelDate}
                onChange={e => setForm({ ...form, travelDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label htmlFor="modal-dep-time" className="block text-slate-600 font-semibold mb-1">
                Earliest Departure:
              </label>
              <input
                id="modal-dep-time"
                type="time"
                value={form.preferredDepartureTime || '06:00'}
                onChange={e => setForm({ ...form, preferredDepartureTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label htmlFor="modal-deadline" className="block text-slate-600 font-semibold mb-1">
                Arrival Deadline:
              </label>
              <input
                id="modal-deadline"
                type="time"
                value={form.arrivalDeadline || '18:00'}
                onChange={e => setForm({ ...form, arrivalDeadline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Travelers & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-travelers" className="block text-slate-600 font-semibold mb-1">
                Passengers:
              </label>
              <input
                id="modal-travelers"
                type="number"
                min={1}
                max={10}
                value={form.travelers}
                onChange={e => setForm({ ...form, travelers: Math.max(1, Number(e.target.value)) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label htmlFor="modal-budget" className="block text-slate-600 font-semibold mb-1">
                Budget Cap (₹ INR):
              </label>
              <input
                id="modal-budget"
                type="number"
                step={100}
                value={form.totalBudget || 3000}
                onChange={e => setForm({ ...form, totalBudget: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-blue-500 focus:bg-white font-bold"
              />
            </div>
          </div>

          {/* Allowed Modes */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1.5">
              Enabled Transport Modes:
            </label>
            <div className="flex flex-wrap gap-2">
              {(['train', 'bus', 'flight', 'metro', 'cab', 'walk'] as TransportMode[]).map(mode => {
                const isSelected = form.preferredModes.includes(mode);
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => toggleMode(mode)}
                    className={`px-3 py-1.5 rounded-lg border text-xs capitalize transition cursor-pointer font-medium ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {mode} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comfort, Accessibility, Luggage */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label htmlFor="modal-comfort" className="block text-slate-600 font-semibold mb-1">
                Class / Comfort:
              </label>
              <select
                id="modal-comfort"
                value={form.comfortLevel}
                onChange={e => setForm({ ...form, comfortLevel: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none"
              >
                <option value="standard">Standard / Sleeper</option>
                <option value="comfortable">Comfortable (AC / Express)</option>
                <option value="premium">Premium / High Speed</option>
              </select>
            </div>

            <div>
              <label htmlFor="modal-luggage" className="block text-slate-600 font-semibold mb-1">
                Baggage Policy:
              </label>
              <select
                id="modal-luggage"
                value={form.luggageType}
                onChange={e => setForm({ ...form, luggageType: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 outline-none"
              >
                <option value="light">Light (Cabin only)</option>
                <option value="standard">Standard (15kg check-in)</option>
                <option value="heavy">Heavy (Multiple Bags)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Accessibility:
              </label>
              <label className="flex items-center gap-2 mt-2 text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={form.accessibilityRequired}
                  onChange={e => setForm({ ...form, accessibilityRequired: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Wheelchair Ramp / Elevator</span>
              </label>
            </div>
          </div>

          {/* Safety Checkboxes */}
          <div className="pt-2 border-t border-slate-100">
            <span className="block text-slate-600 font-semibold mb-1.5">
              Safety & Security Directives:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={form.safetyPreferences?.wellLitPickupsOnly}
                  onChange={e => setForm({
                    ...form,
                    safetyPreferences: { ...form.safetyPreferences, wellLitPickupsOnly: e.target.checked }
                  })}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Well-lit verified hubs only</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={form.safetyPreferences?.fewerTransfers}
                  onChange={e => setForm({
                    ...form,
                    safetyPreferences: { ...form.safetyPreferences, fewerTransfers: e.target.checked }
                  })}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Minimize intermediate transfers</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition cursor-pointer shadow-xs"
            >
              Apply & Re-Calculate Routes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
