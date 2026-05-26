import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { jsonOk, handleApiError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const problemId = request.nextUrl.searchParams.get("problemId");
    const tagId = request.nextUrl.searchParams.get("tagId");
    const drillType = request.nextUrl.searchParams.get("drillType");

    const history = await prisma.drillSession.findMany({
      where: {
        ...(problemId && { problemId }),
        ...(tagId && { tagId }),
        ...(drillType && { drillType: drillType as "IMPLEMENT" | "MINDSOLVE" }),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        problem: { select: { id: true, title: true } },
        tag: { select: { id: true, name: true } },
      },
    });

    return jsonOk(history);
  } catch (error) {
    return handleApiError(error);
  }
}
