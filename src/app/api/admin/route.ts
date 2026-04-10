import { type NextRequest } from "next/server";
import { getAdminStats, initDb } from "@/lib/db";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "hotnot2026";

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password");

  if (password !== ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await initDb();
  const stats = await getAdminStats();
  return Response.json(stats, {
    headers: { "Cache-Control": "no-store" },
  });
}
