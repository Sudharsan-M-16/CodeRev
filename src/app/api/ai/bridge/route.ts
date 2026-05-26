import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const { failedProblemId } = await request.json();
    if (!failedProblemId) return jsonError("Failed Problem ID required", 400);

    // 1. Fetch the failed problem
    const failedProblem = await prisma.problem.findUnique({
      where: { id: failedProblemId },
      include: { tags: { include: { tag: true } } },
    });

    if (!failedProblem || failedProblem.userId !== userId) {
      return jsonError("Problem not found or unauthorized", 404);
    }

    const tagIds = failedProblem.tags.map(t => t.tagId);

    // 2. Query for a problem with the SAME tags that the user successfully solved recently (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const successfulProblem = await prisma.problem.findFirst({
      where: {
        userId,
        id: { not: failedProblemId }, // Don't pick the same problem
        tags: { some: { tagId: { in: tagIds } } },
        drillSessions: {
          some: {
            createdAt: { gte: thirtyDaysAgo },
            outcome: { in: ["NAILED", "MOSTLY"] } // Indicates success
          }
        }
      },
      orderBy: { normalizedDiff: "desc" } // Get the hardest successful one
    });

    if (!successfulProblem) {
      return jsonOk({ 
        message: "No bridging problem found in your recent history.", 
        bridgingExplanation: null 
      });
    }

    // 3. Construct prompt for Claude to perform conceptual bridging
    const systemPrompt = `You are a master algorithmic tutor. Your student has failed to solve the "Failed Problem", but successfully solved the "Anchor Problem" recently. 
Your goal is to explain the Failed Problem BY EXPLICITLY REFERENCING the mental model, invariant, or technique they used in the Anchor Problem. Bridge the conceptual gap. Do not give away the full code. Output your response strictly in JSON:
{
  "bridgeExplanation": "Your ELI5 explanation connecting the Anchor to the Failed problem."
}`;

    const promptText = `
[Anchor Problem (User Solved Successfully)]:
Title: ${successfulProblem.title}
Summary/Notes: ${successfulProblem.summary ?? ""} ${successfulProblem.notes ?? ""}

[Failed Problem (User is Struggling)]:
Title: ${failedProblem.title}
Summary/Notes: ${failedProblem.summary ?? ""} ${failedProblem.notes ?? ""}
    `;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: promptText }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let parsedData = { bridgeExplanation: "" };
    try {
      const jsonStr = text.replace(/```json|```/g, '').trim();
      parsedData = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse Claude bridge response.");
    }

    return jsonOk({
      anchorProblem: successfulProblem,
      bridgeExplanation: parsedData.bridgeExplanation
    });

  } catch (error) {
    return handleApiError(error);
  }
}
