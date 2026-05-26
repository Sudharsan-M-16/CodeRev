import { jsonOk } from "@/lib/api/response";

export async function GET() {
  return jsonOk([
    { id: "LEETCODE", name: "LeetCode", slug: "leetcode" },
    { id: "CODEFORCES", name: "Codeforces", slug: "codeforces" },
    { id: "ATCODER", name: "AtCoder", slug: "atcoder" },
    { id: "CUSTOM", name: "Custom", slug: "custom" },
  ]);
}
