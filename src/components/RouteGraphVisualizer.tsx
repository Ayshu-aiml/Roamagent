import React, { useState } from 'react';
import {
  MapPin,
  Train,
  Bus,
  Plane,
  Car,
  Footprints,
  Clock,
  AlertTriangle,
  Navigation,
  GitBranch
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

  const { graph, edges } = itinerary;

  const getModeIcon = (mode: TransportMode) => {
    switch (mode) {
      case 'walk':
        return <Footprints className="w-3.5 h-3.5 text-slate-600" />;
      case 'cab':
        return <Car className="w-3.5 h-3.5 text-slate-600" />;
      case 'bus':
        return <Bus className="w-3.5 h-3.5 text-slate-600" />;
      case 'train':
        return <Train className="w-3.5 h-3.5 text-slate-600" />;
      case 'flight':
        return <Plane className="w-3.5 h-3.5 text-slate-600" />;
      case 'metro':
        return <Navigation className="w-3.5 h-3.5 text-slate-600" />;
      default:
        return <Car className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getNodeIcon = (type: GraphNode['type']) => {
    switch (type) {
      case 'origin':
        return <MapPin className="w-4 h-4 text-emerald-600" />;
      case 'destination':
        return <MapPin className="w-4 h-4 text-rose-600" />;
      case 'airport':
        return <Plane className="w-4 h-4 text-sky-600" />;
      case 'station':
        return <Train className="w-4 h-4 text-amber-600" />;
      case 'metro_station':
        return <Navigation className="w-4 h-4 text-teal-600" />;
      default:
        return <MapPin className="w-4 h-4 text-slate-600" />;
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
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      {/* Schematic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Transit Schematic & Multimodal Routing Graph
          </h3>
        </div>

        <div className="text-[11px] text-slate-500">
          Click any station or transit leg to inspect parameters & test network disruptions
        </div>
      </div>

      {/* Transit Schematic Flow */}
      <div className="mt-5 overflow-x-auto pb-4">
        <div className="min-w-[780px] py-3 flex items-center justify-between relative px-2">
          {/* Schematic Track Base */}
          <div className="absolute top-8 left-10 right-10 h-1 bg-slate-200 z-0" />

          {graph.nodes.map((node, index) => {
            const edgeAfter = edges[index];
            const isOrigin = node.type === 'origin';
            const isDest = node.type === 'destination';
            const isNodeSelected = selectedNode?.id === node.id;

            return (
              <React.Fragment key={node.id}>
                {/* Station Node Marker */}
                <div className="relative z-10 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => handleSelectNode(node)}
                    className={`w-11 h-11 rounded-lg flex items-center justify-center transition cursor-pointer border-2 shadow-xs ${
                      isNodeSelected
                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-100'
                        : isOrigin
                        ? 'bg-emerald-50 border-emerald-600 hover:border-emerald-700'
                        : isDest
                        ? 'bg-rose-50 border-rose-600 hover:border-rose-700'
                        : 'bg-white border-slate-300 hover:border-slate-500'
                    }`}
                    title={`Inspect node: ${node.label}`}
                  >
                    {getNodeIcon(node.type)}
                  </button>

                  <div className="mt-2 text-center max-w-[130px]">
                    <span className="text-[11px] font-bold text-slate-800 block truncate" title={node.label}>
                      {node.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {node.scheduledArrival ? `Arr ${node.scheduledArrival}` : `Dep ${node.scheduledDeparture}`}
                    </span>
                  </div>
                </div>

                {/* Transit Leg Track & Fare Edge */}
                {edgeAfter && (
                  <div className="flex-1 px-2.5 relative z-10 flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => handleSelectEdge(edgeAfter)}
                      className={`w-full py-2 px-2.5 rounded-lg border text-left transition cursor-pointer shadow-xs ${
                        selectedEdge?.id === edgeAfter.id
                          ? 'bg-blue-50/60 border-blue-600 ring-1 ring-blue-600'
                          : edgeAfter.isDisrupted
                          ? 'bg-rose-50 border-rose-300 text-rose-900'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                      }`}
                      title="Inspect this transit leg or test disruption"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5">
                          {getModeIcon(edgeAfter.mode)}
                          <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                            {edgeAfter.mode}
                          </span>
                        </div>
                        {edgeAfter.isDisrupted ? (
                          <span className="text-[9px] font-bold text-rose-600 uppercase">
                            Disrupted
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-700 font-bold">
                            ₹{edgeAfter.farePerPerson.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-200/80 pt-1">
                        <span>{edgeAfter.durationMinutes}m</span>
                        <span>{edgeAfter.distanceKm}km</span>
                      </div>
                    </button>

                    {/* Transfer Buffer */}
                    {edgeAfter.waitingTimeMinutes > 0 && (
                      <span className="mt-1 text-[9px] text-slate-500 font-mono">
                        +{edgeAfter.waitingTimeMinutes}m buffer
                      </span>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Detail Inspector & Network Disruption Controller */}
      {(selectedEdge || selectedNode) && (
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              {selectedEdge ? `Leg Details: ${selectedEdge.name}` : `Station Details: ${selectedNode?.label}`}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedEdge(null);
                setSelectedNode(null);
              }}
              className="text-slate-500 hover:text-slate-900 px-2.5 py-0.5 rounded bg-white border border-slate-200 cursor-pointer font-medium"
            >
              Close
            </button>
          </div>

          {selectedEdge && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <div className="bg-white p-2.5 rounded border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Timetable</span>
                  <span className="font-mono text-slate-900 font-semibold">
                    {selectedEdge.departureTime} → {selectedEdge.arrivalTime}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Carrier / Operator</span>
                  <span className="text-slate-900 font-semibold truncate block">
                    {selectedEdge.operator}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Fare & Confidence</span>
                  <span className="text-emerald-700 font-bold font-mono">
                    ₹{selectedEdge.farePerPerson.toLocaleString()} ({selectedEdge.confidence})
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Data Source</span>
                  <span className="text-slate-700 font-medium truncate block">
                    {selectedEdge.source}
                  </span>
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed bg-white p-2.5 rounded border border-slate-200 mb-3">
                {selectedEdge.instructions}
              </p>

              {/* Network Disruption Simulator */}
              <div className="pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-bold text-[11px]">Network Disruption Test:</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isDisrupting}
                    onClick={() => onSimulateDisruption(selectedEdge.id, 45, false)}
                    className="px-3 py-1 rounded-md text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition cursor-pointer disabled:opacity-50"
                  >
                    +45m Delay
                  </button>

                  <button
                    type="button"
                    disabled={isDisrupting}
                    onClick={() => onSimulateDisruption(selectedEdge.id, 90, false)}
                    className="px-3 py-1 rounded-md text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition cursor-pointer disabled:opacity-50"
                  >
                    +90m Delay
                  </button>

                  <button
                    type="button"
                    disabled={isDisrupting}
                    onClick={() => onSimulateDisruption(selectedEdge.id, 0, true)}
                    className="px-3 py-1 rounded-md text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel Service
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedNode && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Station Coordinates</span>
                <span className="font-mono text-slate-800 font-medium">
                  {selectedNode.coordinates.lat.toFixed(4)}, {selectedNode.coordinates.lng.toFixed(4)}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Terminal Address</span>
                <span className="text-slate-800 font-medium truncate block">
                  {selectedNode.address || `${selectedNode.label}, ${selectedNode.city}`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
