import { getHotList, initDb } from "@/lib/db";

export async function GET() {
  await initDb();

  const list = await getHotList();
  return Response.json(list, {
    headers: { "Cache-Control": "no-store" },
  });
}
