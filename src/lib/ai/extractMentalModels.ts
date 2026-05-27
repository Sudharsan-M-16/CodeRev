import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export type ExtractedModel = {
  name: string;
  type: "TRANSFORMATION" | "INVARIANT" | "PROOF_TECHNIQUE" | "DECOMPOSITION" | "OPTIMIZATION" | "STATE_COMPRESSION" | "HEURISTIC";
  description: string;
  confidence: number;
};

export async function extractMentalModels(
  problemContext: { title: string; summary: string; notes: string },
  replayInsights: { title: string; description: string; type: string }[]
): Promise<ExtractedModel[]> {
  
  const prompt = `
You are an expert algorithm researcher mapping the cognitive models of competitive programmers.
Extract core, reusable "Mental Models" from the following user session.

DO NOT extract generic algorithm tags (e.g., "Dynamic Programming", "Dijkstra").
DO extract specific, transferable reasoning patterns, invariant setups, or state compression techniques (e.g., "Contribution to the Sum technique", "Prefix Difference Array Transformation", "Greedy Exchange Argument").

Problem Context:
Title: ${problemContext.title}
Summary: ${problemContext.summary}
User Notes: ${problemContext.notes}

Replay Behavioral Insights:
${JSON.stringify(replayInsights, null, 2)}

Output strictly as a JSON array matching this schema:
[{
  "name": "Catchy, descriptive name of the mental model",
  "type": "TRANSFORMATION" | "INVARIANT" | "PROOF_TECHNIQUE" | "DECOMPOSITION" | "OPTIMIZATION" | "STATE_COMPRESSION" | "HEURISTIC",
  "description": "Detailed explanation of how this model works and when it is applicable, generalizing away from this specific problem.",
  "confidence": 0.0 to 1.0 (How confident are you that the user actually applied or discovered this model in their session?)
}]
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      temperature: 0.2,
      system: "You are an expert cognitive modeler. Output ONLY raw JSON arrays. No markdown backticks. No conversational text.",
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const textOutput = (response.content[0] as any).text.trim();
    const models: ExtractedModel[] = JSON.parse(textOutput);
    return models;
  } catch (error) {
    console.error("Mental Model Extraction Failed", error);
    return [];
  }
}
