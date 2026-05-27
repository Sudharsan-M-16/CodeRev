// Using a string literal union because Prisma doesn't auto-export SessionEventType
// when the enum is defined as @map or when the generated client is stale.
type SessionEventType = "NOTE_TYPED" | "TAB_SWITCHED" | "HINT_REVEALED" | "CODE_RUN" | "SUBMISSION_ATTEMPTED";

export interface SerializedSessionEvent {
  id: string;
  eventType: SessionEventType;
  timestamp: Date;
  payload: any;
}

export interface HeuristicReport {
  totalDurationSeconds: number;
  hesitationRegions: { startTime: Date; endTime: Date; durationSeconds: number }[];
  contextSwitchCount: number;
  hintDependency: number;
  pacingCollapse: boolean;
}

/**
 * Deterministic Heuristic Engine
 * 
 * We process the raw event stream into deterministic behaviors *before* passing to the LLM.
 * This saves tokens and reduces hallucination.
 */
export function extractBehavioralHeuristics(events: SerializedSessionEvent[]): HeuristicReport {
  if (events.length === 0) {
    return {
      totalDurationSeconds: 0,
      hesitationRegions: [],
      contextSwitchCount: 0,
      hintDependency: 0,
      pacingCollapse: false
    };
  }

  // Ensure chronological order
  const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  const startTime = sorted[0].timestamp.getTime();
  const endTime = sorted[sorted.length - 1].timestamp.getTime();
  const totalDurationSeconds = (endTime - startTime) / 1000;

  const hesitationRegions = [];
  let contextSwitchCount = 0;
  let hintDependency = 0;
  const gapThresholdSeconds = 45; // 45 seconds of no events implies a cognitive block

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    
    const gapSeconds = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
    
    // Detect Hesitation (e.g. stopped typing for 45s)
    if (gapSeconds > gapThresholdSeconds) {
      hesitationRegions.push({
        startTime: prev.timestamp,
        endTime: curr.timestamp,
        durationSeconds: gapSeconds
      });
    }

    // Detect Context Switching (e.g. going to another tab)
    if (curr.eventType === "TAB_SWITCHED") {
      contextSwitchCount++;
    }

    // Detect Hint Reliance
    if (curr.eventType === "HINT_REVEALED") {
      hintDependency++;
    }
  }

  // Detect Pacing Collapse: if the last 20% of the session took 80% of the time.
  // (Simplified heuristic for the blueprint)
  const pacingCollapse = hesitationRegions.length > 3 && totalDurationSeconds > 600;

  return {
    totalDurationSeconds,
    hesitationRegions,
    contextSwitchCount,
    hintDependency,
    pacingCollapse
  };
}
