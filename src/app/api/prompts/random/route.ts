import { type NextRequest } from "next/server";
import { getRandomBatch, initDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  await initDb();

  const excludeParam = req.nextUrl.searchParams.get("exclude") || "";
  const excludeIds = excludeParam
    .split(",")
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n));

  const batch = await getRandomBatch(excludeIds, 10);

  if (batch.length === 0) {
    return Response.json({ done: true, prompts: [] });
  }

  return Response.json({ done: false, prompts: batch }, {
    headers: { "Cache-Control": "no-store" },
  });
}
