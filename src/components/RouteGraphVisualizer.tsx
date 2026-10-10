import React, { useState } from 'react';
import {
  MapPin,
  Train,
  Bus,
  Plane,
  Car,
  Footprints,
  Clock,
  IndianRupee,
  ShieldCheck,
  AlertTriangle,
  Info,
  ExternalLink,
  Zap,
  RotateCcw,
  Navigation
} from 'lucide-react';
import { GraphEdge, GraphNode, Itinerary, TransportMode } from '../types/travel';

interface RouteGraphVisualizerProps {
  itinerary: Itinerary;
  onSimulateDisruption: (edgeId: string, delayMins: number, isCancelled: boolean) => Promise<void>;
  isDisrupting: boolean;
}

export const RouteGraphVisualizer: React.FC<RouteGraphVisualizerProps> = ({
  itinerary,
  onSimulateDisruption,
  isDisrupting
}) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [disruptDelayInput, setDisruptDelayInput] = useState<number>(60);

  const { graph, edges } = itinerary;

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

  const getNodeIcon = (type: GraphNode['type']) => {
    switch (type) {
      case 'origin':
        return <MapPin className="w-4 h-4 text-emerald-400" />;
      case 'destination':
        return <MapPin className="w-4 h-4 text-rose-400" />;
      case 'airport':
        return <Plane className="w-4 h-4 text-purple-400" />;
      case 'station':
        return <Train className="w-4 h-4 text-cyan-400" />;
      case 'metro_station':
        return <Navigation className="w-4 h-4 text-teal-400" />;
      default:
        return <MapPin className="w-4 h-4 text-blue-400" />;
    }
  };

  const handleSelectEdge = (edge: GraphEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  const handleSelectNode = (node: GraphNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl shadow-black/40">
      {/* Visualizer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            Interactive Time-Aware Transport Graph
          </h3>
          <p className="text-xs text-slate-400">
            Directed multi-modal journey DAG · Click any node or edge to inspect details or test live disruptions
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Origin/Walk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Rail/Express
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" /> Air
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" /> Destination
          </span>
        </div>
      </div>

      {/* Interactive Graph Canvas / Flow Layout */}
      <div className="mt-6 overflow-x-auto pb-4">
        <div className="min-w-[760px] py-4 flex items-center justify-between relative px-2">
          {/* Background DAG timeline connector line */}
          <div className="absolute top-1/2 left-8 right-8 h-1 bg-slate-800 -translate-y-1/2 z-0" />

          {graph.nodes.map((node, index) => {
            const edgeAfter = edges[index];
            const isOrigin = node.type === 'origin';
            const isDest = node.type === 'destination';
            const isNodeSelected = selectedNode?.id === node.id;

            return (
              <React.Fragment key={node.id}>
                {/* Graph Node */}
                <div className="relative z-10 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => handleSelectNode(node)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition cursor-pointer shadow-lg ${
                      isNodeSelected
                        ? 'ring-4 ring-cyan-500 bg-slate-800 scale-110 shadow-cyan-500/30'
                        : isOrigin
                        ? 'bg-emerald-950 border-2 border-emerald-500 text-emerald-300 hover:scale-105'
                        : isDest
                        ? 'bg-rose-950 border-2 border-rose-500 text-rose-300 hover:scale-105'
                        : 'bg-slate-800 border-2 border-slate-700 text-slate-200 hover:border-cyan-500 hover:scale-105'
                    }`}
                    title={`Click to inspect ${node.label}`}
                  >
                    {getNodeIcon(node.type)}
                  </button>

                  {/* Node Labels */}
                  <div className="mt-2 text-center max-w-[120px]">
                    <span className="text-[11px] font-bold text-white block truncate" title={node.label}>
                      {node.label}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {node.scheduledArrival ? `Arr: ${node.scheduledArrival}` : `Dep: ${node.scheduledDeparture}`}
                    </span>
                  </div>
                </div>

                {/* Graph Edge (Transport Connection) */}
                {edgeAfter && (
                  <div className="flex-1 px-3 relative z-10 flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => handleSelectEdge(edgeAfter)}
                      className={`w-full py-2 px-2.5 rounded-xl border text-center transition cursor-pointer shadow-md ${
                        selectedEdge?.id === edgeAfter.id
                          ? 'bg-cyan-950 border-cyan-400 ring-2 ring-cyan-500/50'
                          : edgeAfter.isDisrupted
                          ? 'bg-rose-950/80 border-rose-500 text-rose-200 animate-pulse'
                          : 'bg-slate-800/90 border-slate-700 hover:border-slate-600 hover:bg-slate-800 text-slate-300'
                      }`}
                      title="Click to inspect or simulate disruption on this leg"
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        {getModeIcon(edgeAfter.mode)}
                        <span className="text-[11px] font-bold text-white truncate max-w-[90px]">
                          {edgeAfter.mode.toUpperCase()}
                        </span>
                        {edgeAfter.isDisrupted && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-700/60 pt-1">
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {edgeAfter.durationMinutes}m
                        </span>
                        <span className="font-semibold text-emerald-400">
                          ₹{edgeAfter.farePerPerson.toLocaleString()}
                        </span>
                      </div>
                    </button>

                    {/* Transfer / Buffer Notice */}
                    {edgeAfter.waitingTimeMinutes > 0 && (
                      <span className="mt-1 text-[9px] text-amber-300/80 font-medium">
                        {edgeAfter.waitingTimeMinutes}m buffer
                      </span>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Deep Inspector & Disruption Trigger Panel */}
      {(selectedEdge || selectedNode) && (
        <div className="mt-6 p-4 sm:p-5 bg-slate-950/90 border border-slate-800 rounded-xl relative">
          <button
            type="button"
            onClick={() => {
              setSelectedEdge(null);
              setSelectedNode(null);
            }}
            className="absolute top-3 right-3 text-xs text-slate-500 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800"
          >
            Close Inspector
          </button>

          {/* Edge Inspector */}
          {selectedEdge && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
                  {getModeIcon(selectedEdge.mode)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {selectedEdge.name} ({selectedEdge.operator})
                  </h4>
                  <span className="text-xs text-slate-400">
                    Source: {selectedEdge.source} · Reliability: {selectedEdge.reliabilityPercent}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3 text-xs">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">SCHEDULE</span>
                  <span className="font-semibold text-white">
                    {selectedEdge.departureTime} → {selectedEdge.arrivalTime}
                  </span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">FARE (PER PERSON)</span>
                  <span className="font-semibold text-emerald-400">
                    ₹{selectedEdge.farePerPerson.toLocaleString()} ({selectedEdge.confidence})
                  </span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">DISTANCE & TIME</span>
                  <span className="font-semibold text-white">
                    {selectedEdge.distanceKm} km · {selectedEdge.durationMinutes} mins
                  </span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">WAITING / BUFFER</span>
                  <span className="font-semibold text-amber-400">
                    {selectedEdge.waitingTimeMinutes} mins transfer
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 mb-4">
                <Info className="w-3.5 h-3.5 text-cyan-400 inline mr-1" />
                {selectedEdge.instructions}
              </p>

              {/* Disruption Simulator Actions */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-200">
                    Test Live Disruption Simulator:
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isDisrupting}
                    onClick={() => onSimulateDisruption(selectedEdge.id, 45, false)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800 transition disabled:opacity-50"
                  >
                    Simulate 45m Delay
                  </button>

                  <button
                    type="button"
                    disabled={isDisrupting}
                    onClick={() => onSimulateDisruption(selectedEdge.id, 90, false)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-orange-950/60 hover:bg-orange-900/60 text-orange-300 border border-orange-800 transition disabled:opacity-50"
                  >
                    Simulate 90m Delay
                  </button>

                  <button
                    type="button"
                    disabled={isDisrupting}
                    onClick={() => onSimulateDisruption(selectedEdge.id, 0, true)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 transition disabled:opacity-50"
                  >
                    Simulate Cancellation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Node Inspector */}
          {selectedNode && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white">
                  {getNodeIcon(selectedNode.type)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {selectedNode.label}
                  </h4>
                  <span className="text-xs text-slate-400">
                    City: {selectedNode.city} · Type: {selectedNode.type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 my-3 text-xs">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">COORDINATES</span>
                  <span className="font-mono text-slate-200">
                    {selectedNode.coordinates.lat.toFixed(4)}, {selectedNode.coordinates.lng.toFixed(4)}
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">ADDRESS / FACILITY</span>
                  <span className="text-slate-200 truncate block">
                    {selectedNode.address || `${selectedNode.label}, ${selectedNode.city}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
