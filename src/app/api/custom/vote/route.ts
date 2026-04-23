import { voteCustom, initDb } from "@/lib/db";

export async function POST(req: Request) {
  await initDb();

  const { id, isHot } = await req.json();

  if (typeof id !== "number" || typeof isHot !== "boolean") {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const result = await voteCustom(id, isHot);
  if (!result) {
    return Response.json({ error: "Question not found" }, { status: 404 });
  }
  return Response.json(result);
}
