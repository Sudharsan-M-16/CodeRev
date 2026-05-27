import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { jsonOk, handleApiError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    // Surface the mental models and their linked problems
    const models = await prisma.mentalModel.findMany({
      where: { userId },
      include: {
        problems: {
          include: {
            problem: {
              select: { id: true, title: true, normalizedDiff: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return jsonOk({ models });
  } catch (error) {
    return handleApiError(error);
  }
}
