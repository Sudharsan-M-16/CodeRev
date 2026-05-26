import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { performFuzzySearch } from "@/lib/queries/search";
import { jsonOk, handleApiError, jsonError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return jsonOk({ results: [] });
    }

    const results = await performFuzzySearch(userId, query);

    return jsonOk({ results });
  } catch (error) {
    return handleApiError(error);
  }
}
