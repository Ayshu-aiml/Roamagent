import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Calendar,
  MapPin,
  Clock,
  IndianRupee,
  Users,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { TravelConstraints } from '../types/travel';

interface AgentChatVoiceProps {
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  activeConstraints: TravelConstraints;
  onOpenConstraintsModal: () => void;
  speechSummary: string;
  serverAudioBase64?: string;
  preferredLanguage: string;
}

export const AgentChatVoice: React.FC<AgentChatVoiceProps> = ({
  onSendMessage,
  isLoading,
  activeConstraints,
  onOpenConstraintsModal,
  speechSummary,
  serverAudioBase64,
  preferredLanguage
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Audio Playback State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition if available in browser
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      // Language mappings
      const langMap: Record<string, string> = {
        en: 'en-US',
        te: 'te-IN',
        hi: 'hi-IN',
        es: 'es-ES'
      };
      recognition.lang = langMap[preferredLanguage] || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (final) {
          setInputText((prev) => (prev ? `${prev} ${final}` : final));
          setTranscriptPreview('');
        } else {
          setTranscriptPreview(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. You can still type below.');
        } else {
          setSpeechError(`Voice capture note: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [preferredLanguage]);

  // Audio Playback handling (Gemini Server-Side TTS WAV or Web Speech Synthesis)
  useEffect(() => {
    if (serverAudioBase64) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(`data:audio/wav;base64,${serverAudioBase64}`);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      audioRef.current = audio;
    }
  }, [serverAudioBase64]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setSpeechError('Web Speech API is not supported in this browser. Please type your query.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setSpeechError(null);
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  const handleSpeakSummary = () => {
    if (!speechSummary) return;

    if (isPlayingAudio) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
      return;
    }

    if (audioRef.current && serverAudioBase64) {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch(err => {
        console.warn('Audio play error, falling back to synthesis:', err);
        speakWithBrowserSynthesis(speechSummary);
      });
    } else {
      speakWithBrowserSynthesis(speechSummary);
    }
  };

  const speakWithBrowserSynthesis = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap: Record<string, string> = {
      en: 'en-US',
      te: 'te-IN',
      hi: 'hi-IN',
      es: 'es-ES'
    };
    utterance.lang = langMap[preferredLanguage] || 'en-US';
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const msg = inputText;
    setInputText('');
    setTranscriptPreview('');
    await onSendMessage(msg);
  };

  const handlePresetClick = (preset: string) => {
    setInputText(preset);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl shadow-black/40">
      {/* Top Banner & Audio Assistant Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              Conversational Travel Agent
              <span className="text-[10px] font-normal text-slate-400">
                Natural Language · Voice & Text
              </span>
            </h2>
          </div>
        </div>

        {/* Audio Player Controls */}
        {speechSummary && (
          <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl">
            <button
              onClick={handleSpeakSummary}
              className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition ${
                isPlayingAudio
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'
              }`}
              title="Listen to AI voice briefing"
            >
              {isPlayingAudio ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Briefing</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Voice Briefing</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                if (audioRef.current) audioRef.current.currentTime = 0;
                handleSpeakSummary();
              }}
              className="p-1 rounded text-slate-400 hover:text-white transition"
              title="Replay from start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Spoken Briefing Banner */}
      {speechSummary && (
        <div className="mt-3 p-3 bg-cyan-950/20 border border-cyan-900/40 rounded-xl text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
          <Volume2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-cyan-300">Agent Summary: </span>
            <span>{speechSummary}</span>
          </div>
        </div>
      )}

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder='e.g., "Plan a trip from Visakhapatnam railway station to Hyderabad airport tomorrow. Budget ₹3,000, arrive before 6 PM, safe and comfortable."'
            disabled={isLoading}
            className="w-full pl-4 pr-24 py-3.5 text-sm bg-slate-950/90 border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-white placeholder-slate-500 outline-none transition disabled:opacity-60"
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            {/* Voice Input Mic Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-lg transition ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice input (Speech-to-Text)'}
            >
              {isListening ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-40 disabled:hover:bg-cyan-600 shadow-md shadow-cyan-950/40"
              title="Plan trip with agent"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Speech Feedback or Error */}
        {isListening && (
          <div className="mt-2 flex items-center gap-2 text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-3 py-1.5 rounded-lg animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>Listening... Speak in {preferredLanguage.toUpperCase()}: </span>
            <span className="italic text-white">{transcriptPreview || 'Listening for speech...'}</span>
          </div>
        )}

        {speechError && (
          <div className="mt-2 text-xs text-amber-400 bg-amber-950/20 border border-amber-900/30 px-3 py-1 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{speechError}</span>
          </div>
        )}
      </form>

      {/* Quick Prompts */}
      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-400">
        <span className="shrink-0 text-[11px] font-semibold text-slate-500">Try asking:</span>
        <button
          type="button"
          onClick={() => handlePresetClick("Plan a trip from Visakhapatnam railway station to Hyderabad airport tomorrow. My budget is ₹3,000, I must arrive before 6 PM, and I prefer a safe and comfortable journey.")}
          className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 hover:text-slate-200 border border-slate-700/60 transition text-left text-[11px]"
        >
          Vizag to Hyd Airport (₹3,000, arrive &lt; 6 PM)
        </button>
        <button
          type="button"
          onClick={() => handlePresetClick("Plan the cheapest trip from Visakhapatnam to Bengaluru for two people. We need to reach before 8 AM.")}
          className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 hover:text-slate-200 border border-slate-700/60 transition text-left text-[11px]"
        >
          Cheapest Vizag to Bengaluru (2 travelers, &lt; 8 AM)
        </button>
        <button
          type="button"
          onClick={() => handlePresetClick("Fastest journey from Visakhapatnam to Hyderabad tomorrow with heavy luggage.")}
          className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 hover:text-slate-200 border border-slate-700/60 transition text-left text-[11px]"
        >
          Fastest flight option with heavy luggage
        </button>
      </div>

      {/* Active Constraints Strip (Zero-Pill Discipline: Unboxed clean metadata with typographic separators) */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-slate-300 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-cyan-400 inline" />
            {activeConstraints.origin} → {activeConstraints.destination}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>

          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500 inline" />
            {activeConstraints.travelDate}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>

          {activeConstraints.arrivalDeadline && (
            <>
              <span className="flex items-center gap-1 text-amber-300">
                <Clock className="w-3.5 h-3.5 inline" />
                Arrive by {activeConstraints.arrivalDeadline}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
            </>
          )}

          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-500 inline" />
            {activeConstraints.travelers} {activeConstraints.travelers === 1 ? 'Traveler' : 'Travelers'}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>

          {activeConstraints.totalBudget && (
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <IndianRupee className="w-3.5 h-3.5 inline" />
              Budget: ₹{activeConstraints.totalBudget.toLocaleString()}
            </span>
          )}
        </div>

        <button
          onClick={onOpenConstraintsModal}
          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-xs font-medium transition cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Edit Parameters</span>
        </button>
      </div>
    </div>
  );
};
