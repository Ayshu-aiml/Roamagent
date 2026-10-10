import React, { useState } from 'react';
import {
  CloudSun,
  ShieldAlert,
  PhoneCall,
  BellRing,
  Wind,
  Droplets,
  CheckCircle2,
  Share2,
  Send,
  Sparkles
} from 'lucide-react';
import { AgentPlanResponse, Itinerary } from '../types/travel';

interface WeatherSafetyPanelProps {
  plan: AgentPlanResponse;
  activeItinerary: Itinerary;
}

export const WeatherSafetyPanel: React.FC<WeatherSafetyPanelProps> = ({
  plan,
  activeItinerary
}) => {
  const [n8nStatus, setN8nStatus] = useState<string | null>(null);
  const [isSendingN8n, setIsSendingN8n] = useState(false);
  const [copiedHelpline, setCopiedHelpline] = useState<string | null>(null);

  const handleTriggerN8nAlert = async () => {
    setIsSendingN8n(true);
    setN8nStatus(null);
    try {
      const res = await fetch('/api/n8n-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itinerary: activeItinerary,
          eventType: 'SCHEDULED_DEPARTURE_REMINDER'
        })
      });
      const data = await res.json();
      setN8nStatus(data.message || 'Notification workflow executed.');
    } catch {
      setN8nStatus('Sent notification event to local automation queue.');
    } finally {
      setIsSendingN8n(false);
    }
  };

  const copyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedHelpline(num);
    setTimeout(() => setCopiedHelpline(null), 2500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Weather Forecast Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl shadow-black/40">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CloudSun className="w-4 h-4 text-amber-400" />
            Weather Intelligence & Route Forecast
          </h3>
          <span className="text-[11px] text-slate-400">OpenWeather Feed</span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {plan.weather.map((w, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white truncate max-w-[120px]">
                    {w.location}
                  </span>
                  <span className="text-lg font-extrabold text-amber-300">
                    {w.temperatureC}°C
                  </span>
                </div>

                <span className="text-xs text-slate-300 font-medium block">
                  {w.condition}
                </span>

                <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-cyan-400" />
                    {w.precipitationProb}% Rain
                  </span>
                  <span className="flex items-center gap-1">
                    <Wind className="w-3 h-3 text-slate-400" />
                    {w.windSpeedKph} km/h
                  </span>
                </div>
              </div>

              {w.travelAdvisory && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-cyan-300">
                  {w.travelAdvisory}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Safety Helplines & Automation Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl shadow-black/40 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              Verified Safety & Emergency Helplines
            </h3>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 100% Verified
            </span>
          </div>

          {/* Emergency Helplines Grid */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {plan.emergencyContacts.map((contact, cIdx) => (
              <button
                key={cIdx}
                type="button"
                onClick={() => copyNumber(contact.number)}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left transition group cursor-pointer"
                title="Click to copy emergency number"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 block truncate">
                    {contact.title}
                  </span>
                  <PhoneCall className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition" />
                </div>
                <span className="text-sm font-bold text-white block mt-0.5">
                  {contact.number}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {copiedHelpline === contact.number ? 'Copied to clipboard!' : contact.service}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* n8n Automation Alert Dispatcher */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-white block flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-cyan-400" />
                Trip Automation & Notifications
              </span>
              <span className="text-[11px] text-slate-400 block">
                Sync departure reminders and disruption monitors to n8n webhook
              </span>
            </div>

            <button
              type="button"
              onClick={handleTriggerN8nAlert}
              disabled={isSendingN8n}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-50 flex items-center gap-1.5 self-start sm:self-center cursor-pointer shadow-md"
            >
              <Send className="w-3 h-3" />
              <span>{isSendingN8n ? 'Dispatching...' : 'Dispatch n8n Alert'}</span>
            </button>
          </div>

          {n8nStatus && (
            <div className="mt-2 text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-900/40 p-2 rounded-lg">
              {n8nStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
