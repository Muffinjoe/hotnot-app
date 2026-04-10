import { vote, initDb } from "@/lib/db";

export async function POST(req: Request) {
  await initDb();

  const { id, isHot } = await req.json();

  if (typeof id !== "number" || typeof isHot !== "boolean") {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const prompt = await vote(id, isHot);

  if (!prompt) {
    return Response.json({ error: "Prompt not found" }, { status: 404 });
  }

  const total = prompt.hot_votes + prompt.not_votes;
  const hotPct = total > 0 ? Math.round((prompt.hot_votes / total) * 100) : 0;

  return Response.json({ ...prompt, hotPct });
}
