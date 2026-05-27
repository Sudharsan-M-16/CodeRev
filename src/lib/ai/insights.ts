import Anthropic from "@anthropic-ai/sdk";
import { HeuristicReport, SerializedSessionEvent } from "@/lib/analytics/heuristics";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export type GeneratedInsight = {
  type: "HESITATION" | "CONTEXT_SWITCHING" | "IMPLEMENTATION_FIRST" | "BRUTE_FORCE_FIXATION" | "MENTAL_MODEL_FAILURE";
  title: string;
  description: string;
  timestampStart: Date;
  timestampEnd?: Date;
  confidence: number;
  recommendation?: string;
};

export async function generateReplayInsights(
  problemTitle: string,
  heuristics: HeuristicReport,
  events: SerializedSessionEvent[]
): Promise<GeneratedInsight[]> {
  
  // We don't send raw keystrokes to Claude (too many tokens). We send a compressed summary + heuristics.
  const timelineSummary = events
    .filter(e => e.eventType !== "NOTE_TYPED") // filter out the spammy events if needed
    .map(e => `[${e.timestamp.toISOString()}] ${e.eventType}`)
    .join("\n");

  const prompt = `
You are an elite Competitive Programming Coach. 
Analyze this user's Drill Session Replay for the problem "${problemTitle}".

### Deterministic Heuristics:
- Total Duration: ${heuristics.totalDurationSeconds}s
- Context Switches (Tab changes): ${heuristics.contextSwitchCount}
- Hints Revealed: ${heuristics.hintDependency}
- Pacing Collapse Detected: ${heuristics.pacingCollapse}

### Major Hesitation Blocks:
${heuristics.hesitationRegions.map(r => `- ${r.durationSeconds}s block starting at ${r.startTime.toISOString()}`).join("\n")}

### Timeline Summary:
${timelineSummary}

Based on this data, generate 1 to 3 critical coaching insights. 
Output strictly as a JSON array matching this schema:
[{
  "type": "HESITATION" | "CONTEXT_SWITCHING" | "IMPLEMENTATION_FIRST" | "BRUTE_FORCE_FIXATION" | "MENTAL_MODEL_FAILURE",
  "title": "Short catchy title",
  "description": "Why they failed or what this behavior indicates",
  "timestampStart": "ISO Date corresponding to the exact event",
  "timestampEnd": "ISO Date (optional)",
  "confidence": 0.0 to 1.0,
  "recommendation": "Actionable advice"
}]
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      temperature: 0.2,
      system: "You are a competitive programming coach. Output ONLY raw JSON arrays. No markdown backticks. No conversational text.",
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const textOutput = (response.content[0] as any).text.trim();
    const insights: any[] = JSON.parse(textOutput);
    
    return insights.map(i => ({
      ...i,
      timestampStart: new Date(i.timestampStart),
      timestampEnd: i.timestampEnd ? new Date(i.timestampEnd) : undefined,
    }));
  } catch (error) {
    console.error("AI Insight Generation Failed", error);
    return [];
  }
}
