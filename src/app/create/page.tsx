"use client";

import { useState } from "react";
import Link from "next/link";

type Step = "size" | "questions" | "done";

export default function CreatePage() {
  const [step, setStep] = useState<Step>("size");
  const [questions, setQuestions] = useState<string[]>(Array(5).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [slug, setSlug] = useState("");
  const [copied, setCopied] = useState(false);

  const chooseSize = (n: 5 | 10) => {
    setQuestions(Array(n).fill(""));
    setStep("questions");
  };

  const updateQuestion = (i: number, value: string) => {
    const next = [...questions];
    next[i] = value.slice(0, 140);
    setQuestions(next);
  };

  const canSubmit = questions.every((q) => q.trim().length > 0);

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/custom/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: questions.map((q) => q.trim()) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }
      const data = await res.json();
      setSlug(data.slug);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const shareUrl =
    typeof window !== "undefined" && slug
      ? `${window.location.origin}/c/${slug}`
      : "";

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const shareLink = async () => {
    if (!shareUrl) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url: shareUrl, title: "Hot or Not?" });
        return;
      } catch {
        // user cancelled
      }
    }
    copyLink();
  };

  return (
    <main className="min-h-screen bg-white text-neutral-900 flex flex-col">
      <header className="grid grid-cols-3 items-center px-5 pt-3 h-14 shrink-0">
        <Link href="/" className="text-lg font-bold tracking-tight justify-self-start">
          HotNot<span className="text-neutral-400">.app</span>
        </Link>
        <div className="justify-self-center text-sm font-medium text-neutral-500">
          Make Your Own
        </div>
        <div className="justify-self-end" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-start md:justify-center px-6 py-6">
        {step === "size" && (
          <div className="w-full max-w-sm animate-[fadeIn_0.2s_ease-out]">
            <h2 className="text-3xl font-black text-center mb-2">
              How many questions?
            </h2>
            <p className="text-center text-neutral-500 mb-8 text-sm">
              Pick a length for your list
            </p>
            <div className="space-y-3">
              <button
                onClick={() => chooseSize(5)}
                className="w-full py-6 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all text-white font-bold text-2xl cursor-pointer"
              >
                5 questions
              </button>
              <button
                onClick={() => chooseSize(10)}
                className="w-full py-6 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 transition-all text-white font-bold text-2xl cursor-pointer"
              >
                10 questions
              </button>
            </div>
          </div>
        )}

        {step === "questions" && (
          <div className="w-full max-w-sm animate-[fadeIn_0.2s_ease-out]">
            <h2 className="text-2xl font-black text-center mb-1">
              Your questions
            </h2>
            <p className="text-center text-neutral-500 mb-5 text-sm">
              Anything goes. Friends vote Hot or Not.
            </p>
            <div className="space-y-2 mb-4">
              {questions.map((q, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-neutral-400 text-sm font-mono w-6 text-right shrink-0">
                    {i + 1}.
                  </span>
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => updateQuestion(i, e.target.value)}
                    placeholder={i === 0 ? "e.g. Pineapple on pizza?" : "Question..."}
                    maxLength={140}
                    className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 text-base outline-none focus:border-orange-400 transition-colors"
                  />
                </div>
              ))}
            </div>
            {error && (
              <p className="text-sm text-red-500 text-center mb-3">{error}</p>
            )}
            <button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all text-white font-bold text-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => setStep("size")}
              className="w-full mt-2 py-2 text-sm text-neutral-400 cursor-pointer"
            >
              Back
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="w-full max-w-sm animate-[fadeIn_0.2s_ease-out] text-center">
            <p className="text-5xl mb-3">&#x1F389;</p>
            <h2 className="text-2xl font-black mb-1">List created</h2>
            <p className="text-neutral-500 text-sm mb-6">
              Share this link with friends
            </p>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 mb-4 break-all text-sm font-mono text-neutral-700">
              {shareUrl}
            </div>
            <div className="space-y-3">
              <button
                onClick={shareLink}
                className="w-full py-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 transition-all text-white font-bold text-lg cursor-pointer"
              >
                Share Link &#x1F4F2;
              </button>
              <button
                onClick={copyLink}
                className="w-full py-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-all text-neutral-900 font-bold text-lg cursor-pointer border border-neutral-200"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <Link
                href={`/c/${slug}`}
                className="block w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all text-white font-bold text-lg cursor-pointer text-center"
              >
                Try it yourself &#x1F525;
              </Link>
            </div>
          </div>
        )}
      </div>
      <div className="h-8 shrink-0" />
    </main>
  );
}
