"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { generateRecapVideo, type QuestionResult } from "@/lib/render-video";

interface Question {
  id: number;
  text: string;
}

interface VoteResult {
  hotPct: number;
}

interface Choice {
  text: string;
  isHot: boolean;
}

type Phase = "loading" | "not-found" | "voting" | "result" | "done" | "generating";

export default function CustomListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [result, setResult] = useState<VoteResult | null>(null);
  const [userVotedHot, setUserVotedHot] = useState(false);
  const [roundChoices, setRoundChoices] = useState<Choice[]>([]);
  const [roundResults, setRoundResults] = useState<QuestionResult[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPct, setVideoPct] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/custom/${slug}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setPhase("not-found");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (!data.questions || data.questions.length === 0) {
          setPhase("not-found");
          return;
        }
        setQuestions(data.questions);
        setPhase("voting");
      })
      .catch(() => {
        if (!cancelled) setPhase("not-found");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const question = questions[currentIndex] || null;

  const handleVote = async (isHot: boolean) => {
    if (!question || phase !== "voting") return;

    setUserVotedHot(isHot);

    try {
      const res = await fetch("/api/custom/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: question.id, isHot }),
      });
      const data = await res.json();
      setResult({ hotPct: data.hotPct });

      const newChoices = [...roundChoices, { text: question.text, isHot }];
      setRoundChoices(newChoices);
      const newResults = [
        ...roundResults,
        { text: question.text, isHot, hotPct: data.hotPct },
      ];
      setRoundResults(newResults);

      setPhase("result");

      setTimeout(() => {
        if (currentIndex + 1 < questions.length) {
          setCurrentIndex(currentIndex + 1);
          setPhase("voting");
        } else {
          setPhase("done");
        }
      }, 1500);
    } catch {
      // allow retry
    }
  };

  const majority = result
    ? userVotedHot
      ? result.hotPct >= 50
      : result.hotPct < 50
    : false;

  const hotCount = roundChoices.filter((c) => c.isHot).length;
  const notCount = roundChoices.filter((c) => !c.isHot).length;
  const total = hotCount + notCount;
  const hotPctRound = total > 0 ? Math.round((hotCount / total) * 100) : 0;
  const progress = questions.length > 0 ? currentIndex + 1 : 0;

  const scoreLine =
    hotPctRound >= 80
      ? `${hotPctRound}% hot. You love everything ❤️`
      : hotPctRound >= 60
        ? `${hotPctRound}% hot. Mostly vibes ✨`
        : hotPctRound >= 40
          ? "Balanced takes. Fair enough."
          : hotPctRound >= 20
            ? `Mostly NOT 👀`
            : `${hotPctRound}% hot. You're harsh 😅`;

  return (
    <main className="fixed inset-0 bg-white text-neutral-900 flex flex-col">
      <header className="grid grid-cols-3 items-center px-5 pt-3 h-14 shrink-0">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight justify-self-start"
        >
          HotNot<span className="text-neutral-400">.app</span>
        </Link>
        <div className="justify-self-center">
          {phase === "voting" && questions.length > 0 && (
            <span className="text-2xl font-black tabular-nums">
              {progress}
              <span className="text-neutral-300">/{questions.length}</span>
            </span>
          )}
        </div>
        <div className="justify-self-end" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
        {phase === "loading" ? null : phase === "not-found" ? (
          <div className="text-center">
            <p className="text-4xl mb-3">&#x1F937;</p>
            <p className="text-xl font-bold mb-2">List not found</p>
            <p className="text-neutral-500 text-sm mb-6">
              This link may be broken or expired.
            </p>
            <Link
              href="/create"
              className="inline-block py-3 px-6 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all text-white font-bold cursor-pointer"
            >
              Make your own
            </Link>
          </div>
        ) : phase === "generating" ? (
          <div className="text-center animate-[fadeIn_0.15s_ease-out]">
            <p className="text-4xl mb-4">&#x1F3AC;</p>
            <p className="text-xl font-bold mb-3">Creating your video...</p>
            <div className="w-48 h-2 bg-neutral-200 rounded-full mx-auto overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-[width] duration-200"
                style={{ width: `${videoPct}%` }}
              />
            </div>
          </div>
        ) : phase === "done" ? (
          <div className="w-full max-w-sm py-6 animate-[fadeIn_0.3s_ease-out]">
            {videoUrl && (
              <div className="mb-4 flex flex-col items-center">
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  autoPlay
                  muted
                  loop
                  className="rounded-2xl bg-neutral-100 border border-neutral-200"
                  style={{ maxHeight: "55vh", aspectRatio: "9/16" }}
                />
              </div>
            )}

            {!videoUrl && (
              <div className="bg-neutral-50 rounded-2xl border border-neutral-200 px-4 pt-4 pb-3 mb-4">
                <h2 className="text-lg font-black text-center leading-tight">
                  My Hot Takes &#x1F525;
                </h2>
                <p className="text-[11px] text-neutral-400 text-center mb-2.5">
                  Custom list
                </p>

                <div className="space-y-1.5">
                  {roundChoices.map((c, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium ${
                        c.isHot
                          ? "bg-green-50 border border-green-100"
                          : "bg-red-50 border border-red-100"
                      }`}
                    >
                      <span className="truncate mr-2">{c.text}</span>
                      <span className="shrink-0 text-lg">
                        {c.isHot ? "🔥" : "❌"}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-xs font-semibold text-neutral-500 text-center mt-2.5">
                  {scoreLine}
                </p>
                <p className="text-sm font-semibold text-neutral-600 text-center mt-1.5">
                  hotnot.app
                </p>
              </div>
            )}

            <div className="space-y-3">
              {videoUrl ? (
                <>
                  <button
                    onClick={async () => {
                      if (!videoBlob) return;
                      const ext = videoBlob.type.includes("mp4") ? "mp4" : "webm";
                      const file = new File([videoBlob], `hotnot-takes.${ext}`, {
                        type: videoBlob.type,
                      });
                      if (
                        navigator.share &&
                        navigator.canShare?.({ files: [file] })
                      ) {
                        try {
                          await navigator.share({ files: [file] });
                          return;
                        } catch {}
                      }
                      const a = document.createElement("a");
                      a.href = videoUrl;
                      a.download = `hotnot-takes.${ext}`;
                      a.click();
                    }}
                    className="w-full py-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 transition-all text-white font-bold text-lg cursor-pointer"
                  >
                    Share Video &#x1F4F2;
                  </button>
                  <button
                    onClick={() => {
                      if (!videoBlob || !videoUrl) return;
                      const ext = videoBlob.type.includes("mp4") ? "mp4" : "webm";
                      const a = document.createElement("a");
                      a.href = videoUrl;
                      a.download = `hotnot-takes.${ext}`;
                      a.click();
                    }}
                    className="hidden md:block w-full py-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-all text-neutral-700 font-bold text-lg cursor-pointer border border-neutral-200"
                  >
                    Download Video &#x2B07;&#xFE0F;
                  </button>
                </>
              ) : (
                <button
                  onClick={async () => {
                    if (roundResults.length === 0) return;
                    setPhase("generating");
                    setVideoPct(0);
                    try {
                      const blob = await generateRecapVideo(roundResults, setVideoPct);
                      if (videoUrl) URL.revokeObjectURL(videoUrl);
                      setVideoBlob(blob);
                      setVideoUrl(URL.createObjectURL(blob));
                      fetch("/api/track", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ event: "video_made" }),
                      }).catch(() => {});
                    } catch {}
                    setPhase("done");
                  }}
                  className="w-full py-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 transition-all text-white font-bold text-lg cursor-pointer"
                >
                  Export Video &#x1F3AC;
                </button>
              )}
              <Link
                href="/create"
                className="block w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all text-white font-bold text-lg cursor-pointer text-center"
              >
                Make Your Own
              </Link>
            </div>
          </div>
        ) : phase === "voting" && question ? (
          <div
            key={question.id}
            className="text-center w-full max-w-sm animate-[fadeIn_0.2s_ease-out]"
          >
            <p className="text-5xl font-black leading-tight mb-16">
              {question.text}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleVote(true)}
                className="flex-1 py-5 rounded-2xl bg-green-100 hover:bg-green-200 active:scale-95 transition-all text-3xl font-bold cursor-pointer border border-green-200"
              >
                <span className="text-4xl leading-none">&#x1F525;</span>
              </button>
              <button
                onClick={() => handleVote(false)}
                className="flex-1 py-5 rounded-2xl bg-red-100 hover:bg-red-200 active:scale-95 transition-all text-3xl font-bold border border-red-200 cursor-pointer"
              >
                <span className="text-4xl leading-none">&#x274C;</span>
              </button>
            </div>
          </div>
        ) : phase === "result" && result ? (
          (() => {
            const hotPct = result.hotPct;
            const notPct = 100 - hotPct;
            const userPct = userVotedHot ? hotPct : notPct;
            const userOnLeft = userVotedHot;

            return (
              <div className="w-full max-w-sm animate-[fadeIn_0.15s_ease-out]">
                <p className="text-7xl font-black text-center mb-1">
                  {userPct}%
                </p>
                <p className="text-lg font-medium text-neutral-500 text-center mb-6">
                  said {userVotedHot ? "HOT" : "NOT"}
                </p>

                <div className="flex items-center gap-0 rounded-full overflow-hidden h-12 mb-3">
                  <div
                    className="h-full flex items-center justify-center font-bold text-sm bg-green-400 text-green-900"
                    style={{ width: `${Math.max(hotPct, 8)}%` }}
                  >
                    &#x1F525; {hotPct}%
                  </div>
                  <div
                    className="h-full flex items-center justify-center font-bold text-sm bg-red-200 text-red-700"
                    style={{ width: `${Math.max(notPct, 8)}%` }}
                  >
                    &#x274C; {notPct}%
                  </div>
                </div>

                <div className="flex mb-6">
                  <div
                    className="flex flex-col items-center"
                    style={{
                      marginLeft: userOnLeft
                        ? `${Math.max(hotPct / 2 - 5, 2)}%`
                        : `${Math.max(hotPct + notPct / 2 - 5, 2)}%`,
                    }}
                  >
                    <span className="text-xs font-black text-neutral-900 bg-neutral-200 px-2.5 py-1 rounded-full">
                      YOU
                    </span>
                  </div>
                </div>

                <p className="text-lg font-bold text-center text-neutral-800">
                  {majority
                    ? "Most people agree with you ✅"
                    : `Only ${userPct}% agree with you 👀`}
                </p>
              </div>
            );
          })()
        ) : null}
      </div>

      <div className="h-8 shrink-0" />
    </main>
  );
}
