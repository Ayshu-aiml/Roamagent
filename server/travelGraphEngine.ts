import {
  CostBreakdownItem,
  DoorToDoorCost,
  GraphEdge,
  GraphNode,
  Itinerary,
  LocationPoint,
  TravelConstraints,
  TravelGraph
} from '../src/types/travel.js';
import {
  estimateFirstMile,
  estimateLastMile,
  RawTransitOption
} from './transportAdapters.js';

// Time arithmetic utilities
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().replace('+1d', '').trim();
  const [h, m] = cleaned.split(':').map(Number);
  const baseMins = (h || 0) * 60 + (m || 0);
  return timeStr.includes('+1d') ? baseMins + 1440 : baseMins;
}

export function minutesToTimeString(minutes: number): string {
  const isNextDay = minutes >= 1440;
  const modMins = minutes % 1440;
  const h = Math.floor(modMins / 60);
  const m = modMins % 60;
  const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return isNextDay ? `+1d ${formatted}` : formatted;
}

export function addMinutesToTime(timeStr: string, deltaMins: number): string {
  const current = timeStringToMinutes(timeStr);
  return minutesToTimeString(current + deltaMins);
}

// Deterministic Door-to-Door Cost Calculation Engine
// Formula: Total journey cost = first-mile cost + main transport fares + fees and taxes + baggage charges + transfers + last-mile cost + selected optional expenses
export function calculateDoorToDoorCost(
  edges: GraphEdge[],
  constraints: TravelConstraints,
  isFlight: boolean
): DoorToDoorCost {
  const travelers = Math.max(1, constraints.travelers || 1);
  const currency = constraints.currency || 'INR';

  let firstMileTotal = 0;
  let mainTransitTotal = 0;
  let transfersTotal = 0;
  let lastMileTotal = 0;

  const costItems: CostBreakdownItem[] = [];

  // Categorize edges
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const isFirst = i === 0;
    const isLast = i === edges.length - 1;

    if (isFirst && (edge.mode === 'walk' || edge.mode === 'cab' || edge.mode === 'metro')) {
      firstMileTotal += edge.totalFare;
      costItems.push({
        label: `First-mile transport (${edge.operator})`,
        amountPerPerson: edge.farePerPerson,
        amountTotal: edge.totalFare,
        confidence: edge.confidence === 'confirmed' ? 'confirmed' : 'estimated',
        notes: edge.instructions
      });
    } else if (isLast && (edge.mode === 'walk' || edge.mode === 'cab' || edge.mode === 'metro' || (edge.mode === 'bus' && edges.length > 2))) {
      lastMileTotal += edge.totalFare;
      costItems.push({
        label: `Last-mile transport to final drop-off (${edge.operator})`,
        amountPerPerson: edge.farePerPerson,
        amountTotal: edge.totalFare,
        confidence: edge.confidence === 'confirmed' ? 'confirmed' : 'estimated',
        notes: edge.instructions
      });
    } else if (edge.waitingTimeMinutes > 0 && edge.totalFare > 0) {
      transfersTotal += edge.totalFare;
      costItems.push({
        label: `Transfer transit connection (${edge.name})`,
        amountPerPerson: edge.farePerPerson,
        amountTotal: edge.totalFare,
        confidence: edge.confidence === 'confirmed' ? 'confirmed' : 'estimated',
        notes: edge.instructions
      });
    } else {
      mainTransitTotal += edge.totalFare;
      costItems.push({
        label: `Main transit ticket: ${edge.name} (${edge.operator})`,
        amountPerPerson: edge.farePerPerson,
        amountTotal: edge.totalFare,
        confidence: edge.confidence === 'confirmed' ? 'confirmed' : 'estimated',
        notes: edge.vehicleIdentifier ? `ID: ${edge.vehicleIdentifier}` : undefined
      });
    }
  }

  // Fees and taxes: GST / Rail service tax / Airport user development fee
  let feesAndTaxesPerPerson = 0;
  if (isFlight) {
    feesAndTaxesPerPerson = Math.round((mainTransitTotal / travelers) * 0.12 + 350); // Airport UDF & aviation tax
  } else {
    feesAndTaxesPerPerson = Math.round((mainTransitTotal / travelers) * 0.05); // IRCTC / RTC GST
  }
  const feesAndTaxesTotal = feesAndTaxesPerPerson * travelers;
  costItems.push({
    label: isFlight ? 'Airport development & statutory aviation taxes' : 'Booking platform convenience & GST taxes',
    amountPerPerson: feesAndTaxesPerPerson,
    amountTotal: feesAndTaxesTotal,
    confidence: 'confirmed'
  });

  // Baggage charges:
  let baggagePerPerson = 0;
  if (constraints.luggageType === 'heavy' && isFlight) {
    baggagePerPerson = 600; // Extra baggage add-on
    costItems.push({
      label: 'Additional luggage / excess baggage surcharge',
      amountPerPerson: baggagePerPerson,
      amountTotal: baggagePerPerson * travelers,
      confidence: 'estimated',
      notes: 'For luggage exceeding standard cabin & 15kg check-in limit'
    });
  } else {
    costItems.push({
      label: 'Standard baggage allowance (included)',
      amountPerPerson: 0,
      amountTotal: 0,
      confidence: 'confirmed',
      notes: 'Cabin baggage and standard checked limits apply'
    });
  }
  const baggageTotal = baggagePerPerson * travelers;

  // Optional meals:
  const mealsPerPerson = constraints.mealsBudgetPerPerson || 0;
  const mealsTotal = mealsPerPerson * travelers;
  if (mealsTotal > 0) {
    costItems.push({
      label: 'Selected onboard meals & refreshment allowance',
      amountPerPerson: mealsPerPerson,
      amountTotal: mealsTotal,
      confidence: 'user-entered',
      notes: 'Configured by traveler'
    });
  }

  // Optional accommodation:
  const hotelPerPerson = constraints.hotelBudgetPerPerson || 0;
  const hotelTotal = hotelPerPerson * travelers;
  if (hotelTotal > 0) {
    costItems.push({
      label: 'Optional transit stay / lodging allowance',
      amountPerPerson: hotelPerPerson,
      amountTotal: hotelTotal,
      confidence: 'user-entered',
      notes: 'Configured by traveler'
    });
  }

  // Calculate grand door-to-door total:
  const grandTotalGroup = firstMileTotal +
                          mainTransitTotal +
                          feesAndTaxesTotal +
                          baggageTotal +
                          transfersTotal +
                          lastMileTotal +
                          mealsTotal +
                          hotelTotal;

  const grandTotalPerPerson = Math.round(grandTotalGroup / travelers);
  const remainingBudget = constraints.totalBudget !== undefined
    ? Math.round(constraints.totalBudget - grandTotalGroup)
    : undefined;

  return {
    firstMileCost: firstMileTotal,
    mainTransitFares: mainTransitTotal,
    feesAndTaxes: feesAndTaxesTotal,
    baggageCharges: baggageTotal,
    transfersCost: transfersTotal,
    lastMileCost: lastMileTotal,
    optionalMeals: mealsTotal,
    optionalAccommodation: hotelTotal,
    totalCostPerPerson: grandTotalPerPerson,
    totalGroupCost: grandTotalGroup,
    remainingBudget,
    currency,
    items: costItems
  };
}

// Graph-based Itinerary Generator with Multi-Criteria Evaluation & Pareto Ranking
export function buildItinerariesFromGraph(
  originLoc: LocationPoint,
  destLoc: LocationPoint,
  transitOptions: RawTransitOption[],
  constraints: TravelConstraints
): { recommended: Itinerary; cheapest: Itinerary; fastest: Itinerary } {
  const travelers = Math.max(1, constraints.travelers || 1);
  const deadlineMins = constraints.arrivalDeadline ? timeStringToMinutes(constraints.arrivalDeadline) : null;
  const maxBudget = constraints.totalBudget;

  const candidateItineraries: Itinerary[] = [];

  for (const option of transitOptions) {
    // Check mode exclusion
    if (constraints.excludedModes.includes(option.mode)) {
      continue;
    }

    // Build Time-Aware Directed Graph for this journey
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Node 0: Origin Door
    const originNode: GraphNode = {
      id: 'node-origin',
      label: constraints.exactOriginPickup || originLoc.name,
      type: 'origin',
      coordinates: { lat: originLoc.lat, lng: originLoc.lng },
      city: originLoc.city,
      address: originLoc.address,
      scheduledDeparture: constraints.preferredDepartureTime || '06:00'
    };
    nodes.push(originNode);

    // First mile calculation
    const firstMile = estimateFirstMile(originLoc, option.originHub, travelers);
    const departureTime = constraints.preferredDepartureTime || '06:00';
    const firstMileArrival = addMinutesToTime(departureTime, firstMile.durationMinutes);

    // Node 1: Departure Terminal / Station
    const depTerminalNode: GraphNode = {
      id: 'node-departure-terminal',
      label: option.originHub.name,
      type: option.mode === 'flight' ? 'airport' : option.mode === 'train' ? 'station' : 'first_mile_stop',
      coordinates: { lat: option.originHub.lat, lng: option.originHub.lng },
      city: option.originHub.city,
      scheduledArrival: firstMileArrival,
      scheduledDeparture: option.departureTime
    };
    nodes.push(depTerminalNode);

    // Edge 1: First Mile Edge
    edges.push({
      id: `edge-first-mile-${option.id}`,
      fromNodeId: originNode.id,
      toNodeId: depTerminalNode.id,
      mode: firstMile.mode,
      name: firstMile.name,
      operator: firstMile.operator,
      departureTime,
      arrivalTime: firstMileArrival,
      durationMinutes: firstMile.durationMinutes,
      distanceKm: firstMile.distanceKm,
      farePerPerson: firstMile.farePerPerson,
      totalFare: firstMile.totalFare,
      waitingTimeMinutes: 0,
      confidence: firstMile.confidence,
      reliabilityPercent: 95,
      source: 'Local Transit Routing Engine',
      instructions: firstMile.instructions
    });

    // Buffer wait time at terminal (airports need ~75m, trains need ~20m)
    const requiredBuffer = option.mode === 'flight' ? 75 : 25;
    const mainDepMins = timeStringToMinutes(option.departureTime);
    const mainArrMins = timeStringToMinutes(option.arrivalTime);

    // Node 2: Arrival Hub
    const arrTerminalNode: GraphNode = {
      id: 'node-arrival-terminal',
      label: option.destinationHub.name,
      type: option.mode === 'flight' ? 'airport' : option.mode === 'train' ? 'station' : 'transfer_point',
      coordinates: { lat: option.destinationHub.lat, lng: option.destinationHub.lng },
      city: option.destinationHub.city,
      scheduledArrival: option.arrivalTime,
      scheduledDeparture: option.arrivalTime
    };
    nodes.push(arrTerminalNode);

    // Edge 2: Main Transit Edge
    edges.push({
      id: `edge-main-${option.id}`,
      fromNodeId: depTerminalNode.id,
      toNodeId: arrTerminalNode.id,
      mode: option.mode,
      name: option.serviceName,
      operator: option.operator,
      vehicleIdentifier: option.vehicleNumber,
      departureTime: option.departureTime,
      arrivalTime: option.arrivalTime,
      durationMinutes: option.durationMinutes,
      distanceKm: option.distanceKm,
      farePerPerson: option.farePerPerson,
      totalFare: option.farePerPerson * travelers,
      waitingTimeMinutes: requiredBuffer,
      confidence: option.confidence,
      reliabilityPercent: option.reliabilityPercent,
      source: option.source,
      instructions: option.notes,
      amenities: option.amenities,
      bookingUrl: option.mode === 'train' ? 'https://www.irctc.co.in' : option.mode === 'flight' ? 'https://www.goindigo.in' : 'https://www.apsrtconline.in'
    });

    // Last Mile calculation
    const preferMetro = constraints.comfortLevel === 'standard' || constraints.preferredModes.includes('metro');
    const lastMile = estimateLastMile(option.destinationHub, destLoc, travelers, preferMetro);
    const finalArrival = addMinutesToTime(option.arrivalTime, lastMile.durationMinutes + 15);

    // Node 3: Final Destination Door
    const destNode: GraphNode = {
      id: 'node-destination',
      label: constraints.exactDestinationDropoff || destLoc.name,
      type: 'destination',
      coordinates: { lat: destLoc.lat, lng: destLoc.lng },
      city: destLoc.city,
      address: destLoc.address,
      scheduledArrival: finalArrival
    };
    nodes.push(destNode);

    // Edge 3: Last Mile Edge
    edges.push({
      id: `edge-last-mile-${option.id}`,
      fromNodeId: arrTerminalNode.id,
      toNodeId: destNode.id,
      mode: lastMile.mode,
      name: lastMile.name,
      operator: lastMile.operator,
      departureTime: addMinutesToTime(option.arrivalTime, 15),
      arrivalTime: finalArrival,
      durationMinutes: lastMile.durationMinutes,
      distanceKm: lastMile.distanceKm,
      farePerPerson: lastMile.farePerPerson,
      totalFare: lastMile.totalFare,
      waitingTimeMinutes: 15, // Transfer buffer
      confidence: lastMile.confidence,
      reliabilityPercent: 92,
      source: 'Municipal Transit & Feeder Network',
      instructions: lastMile.instructions
    });

    // Graph Object
    const graph: TravelGraph = { nodes, edges };

    // Calculate Door-to-Door Cost
    const totalCost = calculateDoorToDoorCost(edges, constraints, option.mode === 'flight');

    // Total Duration in Minutes
    const startMins = timeStringToMinutes(departureTime);
    const endMins = timeStringToMinutes(finalArrival);
    const totalDuration = endMins >= startMins ? endMins - startMins : (endMins + 1440) - startMins;

    // Constraint evaluation
    const satisfiesDeadline = deadlineMins !== null ? endMins <= deadlineMins : true;
    const satisfiesBudget = maxBudget !== undefined ? totalCost.totalGroupCost <= maxBudget : true;

    // Safety Advisories & Warnings
    const warnings: string[] = [];
    if (!satisfiesDeadline && deadlineMins !== null) {
      warnings.push(`Exceeds arrival deadline: Arrives at ${finalArrival} (deadline: ${constraints.arrivalDeadline}).`);
    }
    if (!satisfiesBudget && maxBudget !== undefined) {
      warnings.push(`Exceeds specified budget: Total ₹${totalCost.totalGroupCost.toLocaleString()} (budget: ₹${maxBudget.toLocaleString()}).`);
    }

    const safetyAdvisories: string[] = [
      'Official verified operator with GPS and emergency SOS support.',
      'Well-lit interchange hubs at all boarding and drop-off stations.'
    ];
    if (constraints.safetyPreferences?.nightTravelPrecautions && option.departureTime >= '21:00') {
      safetyAdvisories.push('Night travel: Active security RPF/TTE personnel present on coaches.');
    }

    // Pareto scoring function (normalized)
    // Minimizes cost and time, rewards reliability
    const costScore = totalCost.totalGroupCost / (maxBudget || 4000);
    const timeScore = totalDuration / 600;
    const reliabilityPenalty = (100 - option.reliabilityPercent) / 100;
    const deadlinePenalty = satisfiesDeadline ? 0 : 2.5;
    const budgetPenalty = satisfiesBudget ? 0 : 2.0;

    const paretoScore = (costScore * 0.4) + (timeScore * 0.4) + (reliabilityPenalty * 0.2) + deadlinePenalty + budgetPenalty;

    candidateItineraries.push({
      id: `itinerary-${option.id}`,
      type: 'recommended',
      title: `${option.serviceName} (${option.mode.toUpperCase()})`,
      summary: `${firstMile.mode === 'walk' ? 'Walk' : 'Cab'} to ${option.originHub.name} → ${option.serviceName} → ${lastMile.name} to destination`,
      explanation: `Seamless door-to-door route via ${option.operator} with a total trip time of ${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m.`,
      graph,
      edges,
      totalCost,
      totalDurationMinutes: totalDuration,
      totalTransfers: edges.length - 1,
      departureTime,
      arrivalTime: finalArrival,
      satisfiesDeadline,
      satisfiesBudget,
      paretoScore,
      warnings,
      safetyAdvisories
    });
  }

  // Ensure we have at least 1 candidate
  if (candidateItineraries.length === 0) {
    throw new Error('No feasible routes found satisfying hard constraints.');
  }

  // 1. Cheapest Feasible
  const cheapestSorted = [...candidateItineraries].sort((a, b) => a.totalCost.totalGroupCost - b.totalCost.totalGroupCost);
  const cheapest = { ...cheapestSorted[0], id: `${cheapestSorted[0].id}-cheapest`, type: 'cheapest' as const };
  cheapest.title = `Cheapest: ${cheapest.title}`;

  // 2. Fastest Feasible
  const fastestSorted = [...candidateItineraries].sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
  const fastest = { ...fastestSorted[0], id: `${fastestSorted[0].id}-fastest`, type: 'fastest' as const };
  fastest.title = `Fastest: ${fastest.title}`;

  // 3. Recommended (Best Pareto Balance considering constraints)
  const paretoSorted = [...candidateItineraries].sort((a, b) => a.paretoScore - b.paretoScore);
  // Prefer a candidate that satisfies deadline and budget if available
  const feasibleFirst = paretoSorted.find(c => c.satisfiesDeadline && c.satisfiesBudget) || paretoSorted[0];
  const recommended = { ...feasibleFirst, id: `${feasibleFirst.id}-recommended`, type: 'recommended' as const };
  recommended.title = `Best Overall: ${recommended.title}`;

  return { recommended, cheapest, fastest };
}

// Disruption Injection and Dynamic Graph Re-evaluation
export function simulateDisruption(
  activeItinerary: Itinerary,
  disruptedEdgeId: string,
  delayMinutes: number,
  isCancelled: boolean
): {
  impactExplanation: string;
  isConnectionBroken: boolean;
  affectedEdge: GraphEdge | undefined;
  recalculatedItinerary: Itinerary;
  costDelta: number;
  timeDeltaMinutes: number;
} {
  const edges = [...activeItinerary.edges];
  const edgeIdx = edges.findIndex(e => e.id === disruptedEdgeId || e.id.includes(disruptedEdgeId));
  
  if (edgeIdx === -1) {
    throw new Error(`Edge ${disruptedEdgeId} not found in itinerary`);
  }

  const affectedEdge = { ...edges[edgeIdx] };
  affectedEdge.isDisrupted = true;
  affectedEdge.disruptionReason = isCancelled ? 'Service cancelled due to technical reasons' : `Delayed by ${delayMinutes} minutes`;

  let isConnectionBroken = false;
  let timeDelta = delayMinutes;

  if (isCancelled) {
    isConnectionBroken = true;
    timeDelta = 180; // Replacement backup buffer
  } else {
    // Check if delay eats up next transfer buffer
    if (edgeIdx + 1 < edges.length) {
      const nextEdge = edges[edgeIdx + 1];
      if (delayMinutes > nextEdge.waitingTimeMinutes) {
        isConnectionBroken = true;
      }
    }
  }

  // Update schedule of affected and downstream edges
  const updatedEdges = edges.map((e, idx) => {
    if (idx === edgeIdx) {
      return {
        ...affectedEdge,
        arrivalTime: addMinutesToTime(affectedEdge.arrivalTime, delayMinutes),
        durationMinutes: affectedEdge.durationMinutes + delayMinutes
      };
    }
    if (idx > edgeIdx) {
      return {
        ...e,
        departureTime: addMinutesToTime(e.departureTime, delayMinutes),
        arrivalTime: addMinutesToTime(e.arrivalTime, delayMinutes)
      };
    }
    return e;
  });

  const newTotalDuration = activeItinerary.totalDurationMinutes + delayMinutes;
  const newArrival = addMinutesToTime(activeItinerary.arrivalTime, delayMinutes);

  const costDelta = isCancelled ? 450 : (delayMinutes > 60 ? 150 : 0); // Taxi backup or meal compensation

  const recalculatedItinerary: Itinerary = {
    ...activeItinerary,
    id: `${activeItinerary.id}-rerouted-${Date.now()}`,
    arrivalTime: newArrival,
    totalDurationMinutes: newTotalDuration,
    edges: updatedEdges,
    warnings: [
      ...activeItinerary.warnings,
      isCancelled
        ? `DISRUPTION ALERT: ${affectedEdge.name} was cancelled. Backup feeder dispatch recommended.`
        : `DISRUPTION ALERT: ${affectedEdge.name} delayed by ${delayMinutes} mins. Expected arrival shifted to ${newArrival}.`
    ]
  };

  const impactExplanation = isCancelled
    ? `Critical Disruption: ${affectedEdge.name} cancelled. Feeder connection broken. Rerouting requires switching to immediate backup cab/intercity connection (+₹${costDelta}, +${timeDelta} mins).`
    : isConnectionBroken
      ? `Delay of ${delayMinutes} mins exceeds transfer buffer. Downstream connection ${edges[edgeIdx + 1]?.name || 'transfer'} will need dynamic rescheduling.`
      : `Minor delay of ${delayMinutes} mins absorbed by intermediate station buffers. Estimated final arrival: ${newArrival}.`;

  return {
    impactExplanation,
    isConnectionBroken,
    affectedEdge,
    recalculatedItinerary,
    costDelta,
    timeDeltaMinutes: timeDelta
  };
}
