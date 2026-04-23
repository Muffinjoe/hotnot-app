import { getCustomList, initDb } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  await initDb();
  const { slug } = await params;
  const list = await getCustomList(slug);
  if (!list) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(list, { headers: { "Cache-Control": "no-store" } });
}
