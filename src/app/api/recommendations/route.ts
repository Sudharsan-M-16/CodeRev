import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateTargetedPlaylist } from "@/lib/recommendations/engine";
import { jsonOk, handleApiError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10", 10);
    const playlist = await generateTargetedPlaylist(userId, limit);

    return jsonOk({ playlist });
  } catch (error) {
    return handleApiError(error);
  }
}
