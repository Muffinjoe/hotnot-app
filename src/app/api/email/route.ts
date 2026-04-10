import { saveEmail, initDb } from "@/lib/db";

export async function POST(req: Request) {
  await initDb();

  const { email } = await req.json();

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  const saved = await saveEmail(email.trim().toLowerCase());

  return Response.json({
    ok: true,
    message: saved ? "You're on the list!" : "You're already signed up!",
  });
}
