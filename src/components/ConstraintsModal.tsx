import React, { useState } from 'react';
import { X, SlidersHorizontal, Check, MapPin, Calendar, Clock, IndianRupee, Users, Shield, Luggage } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white">
            Fine-Tune Travel Constraints & Preferences
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Origin / Pickup Point:
              </label>
              <input
                type="text"
                value={form.origin}
                onChange={e => setForm({ ...form, origin: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Destination / Drop-off Point:
              </label>
              <input
                type="text"
                value={form.destination}
                onChange={e => setForm({ ...form, destination: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          {/* Dates & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Travel Date:
              </label>
              <input
                type="date"
                value={form.travelDate}
                onChange={e => setForm({ ...form, travelDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Preferred Departure Time:
              </label>
              <input
                type="time"
                value={form.preferredDepartureTime || '06:00'}
                onChange={e => setForm({ ...form, preferredDepartureTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Arrival Deadline (Max Time):
              </label>
              <input
                type="time"
                value={form.arrivalDeadline || '18:00'}
                onChange={e => setForm({ ...form, arrivalDeadline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Travelers & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Number of Travelers:
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.travelers}
                onChange={e => setForm({ ...form, travelers: Math.max(1, Number(e.target.value)) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Total Budget (₹ INR):
              </label>
              <input
                type="number"
                step={100}
                value={form.totalBudget || 3000}
                onChange={e => setForm({ ...form, totalBudget: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Allowed Modes */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">
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
                    className={`px-3 py-1.5 rounded-lg border text-xs capitalize transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-200'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
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
              <label className="block text-slate-400 font-medium mb-1">
                Comfort Preference:
              </label>
              <select
                value={form.comfortLevel}
                onChange={e => setForm({ ...form, comfortLevel: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none"
              >
                <option value="standard">Standard / Budget</option>
                <option value="comfortable">Comfortable (AC / Sleeper)</option>
                <option value="premium">Premium / High Speed</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Luggage Allowance:
              </label>
              <select
                value={form.luggageType}
                onChange={e => setForm({ ...form, luggageType: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none"
              >
                <option value="light">Light (Backpack only)</option>
                <option value="standard">Standard (Cabin + Trolley)</option>
                <option value="heavy">Heavy (Multiple Bags)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Accessibility:
              </label>
              <label className="flex items-center gap-2 mt-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.accessibilityRequired}
                  onChange={e => setForm({ ...form, accessibilityRequired: e.target.checked })}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <span>Wheelchair Ramp / Elevator Needed</span>
              </label>
            </div>
          </div>

          {/* Safety Checkboxes */}
          <div className="pt-2 border-t border-slate-800">
            <span className="block text-slate-400 font-medium mb-1.5">
              Safety & Security Directives:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.safetyPreferences?.wellLitPickupsOnly}
                  onChange={e => setForm({
                    ...form,
                    safetyPreferences: { ...form.safetyPreferences, wellLitPickupsOnly: e.target.checked }
                  })}
                  className="rounded border-slate-700 text-cyan-500"
                />
                <span>Well-lit pickup points only</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.safetyPreferences?.fewerTransfers}
                  onChange={e => setForm({
                    ...form,
                    safetyPreferences: { ...form.safetyPreferences, fewerTransfers: e.target.checked }
                  })}
                  className="rounded border-slate-700 text-cyan-500"
                />
                <span>Minimize intermediate transfers</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition shadow-md"
            >
              Apply & Re-Calculate Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
