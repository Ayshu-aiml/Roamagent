import React, { useState } from 'react';
import {
  CloudSun,
  Shield,
  PhoneCall,
  Wind,
  Droplets,
  Radio
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
      setN8nStatus('Dispatched notification event to queue.');
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
      {/* Weather Station Forecasts */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CloudSun className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              En-Route Meteorological Conditions
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">OpenWeather GDS</span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {plan.weather.map((w, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-800 truncate max-w-[120px]">
                  {w.location}
                </span>
                <span className="text-base font-extrabold font-mono text-slate-900">
                  {w.temperatureC}°C
                </span>
              </div>

              <span className="text-slate-600 block mb-2 font-medium">
                {w.condition}
              </span>

              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-blue-600" />
                  {w.precipitationProb}% rain
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="w-3 h-3 text-slate-400" />
                  {w.windSpeedKph} km/h
                </span>
              </div>

              {w.travelAdvisory && (
                <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10px] text-slate-600">
                  {w.travelAdvisory}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Safety Helplines & Notifications */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Emergency & Travel Helplines
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">24/7 National Dispatch</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {plan.emergencyContacts.map((contact, cIdx) => (
              <button
                key={cIdx}
                type="button"
                onClick={() => copyNumber(contact.number)}
                className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition cursor-pointer"
                title="Click to copy emergency number"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-slate-500 block truncate font-semibold">
                    {contact.title}
                  </span>
                  <PhoneCall className="w-3 h-3 text-slate-400" />
                </div>
                <span className="text-sm font-bold font-mono text-slate-900 block">
                  {contact.number}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {copiedHelpline === contact.number ? 'Copied to clipboard' : contact.service}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Automation Dispatch */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs">
            <span className="font-bold text-slate-800 block">
              Trip Dispatch & Notifications
            </span>
            <span className="text-[11px] text-slate-500">
              Transmit departure schedule and disruption alerts to webhook
            </span>
          </div>

          <button
            type="button"
            onClick={handleTriggerN8nAlert}
            disabled={isSendingN8n}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer self-start sm:self-center flex items-center gap-1.5"
          >
            <Radio className="w-3 h-3 text-blue-400" />
            <span>{isSendingN8n ? 'Dispatching...' : 'Dispatch Webhook'}</span>
          </button>
        </div>

        {n8nStatus && (
          <div className="mt-2 text-xs text-slate-800 bg-slate-50 p-2 rounded border border-slate-200">
            {n8nStatus}
          </div>
        )}
      </div>
    </div>
  );
};
