import { createCustomList, initDb } from "@/lib/db";

export async function POST(req: Request) {
  await initDb();

  const body = await req.json();
  const raw = body?.questions;

  if (!Array.isArray(raw)) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const questions = raw
    .map((q: unknown) => (typeof q === "string" ? q.trim() : ""))
    .filter((q) => q.length > 0)
    .map((q) => q.slice(0, 140));

  if (questions.length !== 5 && questions.length !== 10) {
    return Response.json(
      { error: "List must contain 5 or 10 questions" },
      { status: 400 }
    );
  }

  const slug = await createCustomList(questions);
  return Response.json({ slug });
}
