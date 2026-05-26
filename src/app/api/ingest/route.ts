import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api/response";
import * as cheerio from "cheerio";
import { Platform, QualityLabel } from "@prisma/client";

// This acts as a basic webhook receiver for your Chrome Extension
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request. For Chrome Extensions, you could pass the Clerk Token in headers,
    // or use a secure personal API Key in the headers if Clerk session isn't available.
    const authHeader = request.headers.get("Authorization");
    const { userId } = await auth();
    
    // In a real extension, passing the Clerk session token is best, but a fallback API_KEY check works for server-to-server
    const EXTENSION_API_KEY = process.env.EXTENSION_API_KEY;
    const isExtensionUser = EXTENSION_API_KEY && authHeader === `Bearer ${EXTENSION_API_KEY}`;
    
    const validUserId = userId || (isExtensionUser ? process.env.YOUR_PERSONAL_USER_ID : null);

    if (!validUserId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return jsonError("Valid URL is required", 400);
    }

    // Attempt to fetch the URL
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!response.ok) {
      return jsonError("Failed to fetch the URL", 500);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let title = "Unknown Problem";
    let platform = Platform.CUSTOM;
    let originalRating = "Medium";
    let normalizedDiff = 5.0;

    if (url.includes("leetcode.com")) {
      platform = Platform.LEETCODE;
      // LeetCode's DOM is highly dynamic. The title is usually in the meta tags or specific DOM nodes
      title = $('title').text().split('-')[0].trim() || "LeetCode Problem";
      
      // Look for Easy/Medium/Hard tags if statically available (often rendered via React hydration though)
      const textContent = $('body').text().toLowerCase();
      if (textContent.includes("hard")) { originalRating = "Hard"; normalizedDiff = 8.0; }
      else if (textContent.includes("easy")) { originalRating = "Easy"; normalizedDiff = 2.0; }
      else { originalRating = "Medium"; normalizedDiff = 5.0; }

    } else if (url.includes("codeforces.com")) {
      platform = Platform.CODEFORCES;
      title = $('.title').first().text().trim() || $('title').text().split('-')[0].trim();
      
      // Codeforces usually lists rating dynamically, but we can scrape the tag box
      const ratingTag = $('span[title="Difficulty"]').text().trim();
      if (ratingTag) {
        originalRating = ratingTag;
        normalizedDiff = Math.max(0, Math.min(10, (parseInt(ratingTag.replace('*', '')) - 800) / 200));
      }
    }

    // Extract raw text for the LLM
    const descriptionText = $('body').text().substring(0, 5000); // Take the first 5000 chars

    // Idempotent insertion logic based on URL
    // Check if it already exists
    const existing = await prisma.problem.findFirst({
      where: { userId: validUserId, url }
    });

    if (existing) {
      return jsonOk({ message: "Problem already exists", problem: existing });
    }

    const problem = await prisma.problem.create({
      data: {
        userId: validUserId,
        title,
        platform,
        url,
        originalRating,
        normalizedDiff,
        qualityLabel: QualityLabel.NONE,
        summary: descriptionText.substring(0, 500), // Raw preview
      }
    });

    return jsonOk(problem, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
