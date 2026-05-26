import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { description } = await request.json();

    if (!description || typeof description !== "string") {
      return jsonError("Valid description is required", 400);
    }

    const systemPrompt = `You are an elite competitive programming assistant. Your task is to analyze a given problem description and extract metadata strictly in JSON format. Do not include any explanations, markdown wrapping, or text outside of the JSON object.

Your output must precisely match this JSON schema:
{
  "tags": ["tag1", "tag2"],
  "mathInvariant": "string"
}

- "tags": An array of 1 to 5 highly specific competitive programming concepts (e.g., "Dynamic Programming", "Segment Tree", "Knuth Optimization", "Centroid Decomposition", "Binary Search on Answer").
- "mathInvariant": A formal, concise statement of the loop invariant or mathematical property maintained throughout the optimal solution. Include LaTeX if necessary. Keep it under 2 sentences.`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Here is the problem description:\n\n${description}`,
        },
      ],
    });

    // Extract JSON safely
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let parsedData = { tags: [], mathInvariant: "" };
    
    try {
      // Find the JSON block in case Claude wraps it in markdown despite the prompt
      const jsonStr = text.replace(/```json|```/g, '').trim();
      parsedData = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse JSON from LLM:", text);
      return jsonError("Failed to parse AI response", 500);
    }

    return jsonOk(parsedData);
  } catch (error) {
    return handleApiError(error);
  }
}
