"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { renderShareCard } from "@/lib/render-card";

interface Prompt {
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

type Phase = "voting" | "result" | "done" | "loading";

const BATCH_SIZE = 10;

export default function Home() {
  const [queue, setQueue] = useState<Prompt[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [result, setResult] = useState<VoteResult | null>(null);
  const [userVotedHot, setUserVotedHot] = useState(false);
  const [votedIds, setVotedIds] = useState<number[]>([]);
  const [roundChoices, setRoundChoices] = useState<Choice[]>([]);
  const [roundNumber, setRoundNumber] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "done">("idle");
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [shareImageBlob, setShareImageBlob] = useState<Blob | null>(null);

  const fetchBatch = useCallback(async (excludeIds: number[]) => {
    setPhase("loading");
    try {
      const exclude = excludeIds.join(",");
      const res = await fetch(`/api/prompts/random?exclude=${exclude}`);
      const data = await res.json();
      if (data.done || data.prompts.length === 0) {
        // No more fresh prompts — start a fresh round from the full pool
        const freshRes = await fetch("/api/prompts/random?exclude=");
        const freshData = await freshRes.json();
        if (freshData.done || freshData.prompts.length === 0) return;
        setQueue(freshData.prompts);
        setCurrentIndex(0);
        setPhase("voting");
      } else {
        setQueue(data.prompts);
        setCurrentIndex(0);
        setPhase("voting");
      }
    } catch {
      setTimeout(() => fetchBatch(excludeIds), 500);
    }
  }, []);

  useEffect(() => {
    const storedIds = localStorage.getItem("hotnot_voted");
    const ids: number[] = storedIds ? JSON.parse(storedIds) : [];
    setVotedIds(ids);
    const storedRound = localStorage.getItem("hotnot_round");
    if (storedRound) setRoundNumber(parseInt(storedRound));
    fetchBatch(ids);
    // Track page view
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "page_view" }),
    }).catch(() => {});
  }, [fetchBatch]);

  const prompt = queue[currentIndex] || null;

  const handleVote = async (isHot: boolean) => {
    if (!prompt || phase !== "voting") return;

    setUserVotedHot(isHot);

    try {
      const res = await fetch("/api/prompts/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: prompt.id, isHot }),
      });
      const data = await res.json();
      setResult({ hotPct: data.hotPct });

      const newIds = [...votedIds, prompt.id];
      setVotedIds(newIds);
      localStorage.setItem("hotnot_voted", JSON.stringify(newIds));

      const newChoices = [...roundChoices, { text: prompt.text, isHot }];
      setRoundChoices(newChoices);

      setPhase("result");

      setTimeout(() => {
        if (currentIndex + 1 < queue.length) {
          setCurrentIndex(currentIndex + 1);
          setPhase("voting");
        } else {
          // Round complete
          setPhase("done");
        }
      }, 1500);
    } catch {
      // user can try again
    }
  };

  const handlePlayAgain = () => {
    const newRound = roundNumber + 1;
    setRoundNumber(newRound);
    localStorage.setItem("hotnot_round", String(newRound));
    setRoundChoices([]);
    fetchBatch(votedIds);
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
  const progress = queue.length > 0 ? currentIndex + 1 : 0;

  const taglines = [
    "Unpopular opinions detected \uD83D\uDC40",
    "Bold. Slightly controversial.",
    "You might disagree...",
    "Cold takes incoming \uD83E\uDD76",
  ];
  const tagline = taglines[roundNumber % taglines.length];

  const scoreLine =
    hotPctRound >= 80
      ? `${hotPctRound}% hot. You love everything \u2764\uFE0F`
      : hotPctRound >= 60
        ? `${hotPctRound}% hot. Mostly vibes \u2728`
        : hotPctRound >= 40
          ? "Balanced takes. Fair enough."
          : hotPctRound >= 20
            ? `Mostly NOT \uD83D\uDC40`
            : `${hotPctRound}% hot. You're harsh \uD83D\uDE05`;

  return (
    <main className="fixed inset-0 bg-white text-neutral-900 flex flex-col">
      {/* Header */}
      <header className="grid grid-cols-3 items-center px-5 pt-3 h-14 shrink-0">
        <Link href="/" className="text-lg font-bold tracking-tight justify-self-start">
          HotNot<span className="text-neutral-400">.app</span>
        </Link>
        <div className="justify-self-center">
          {phase === "voting" && queue.length > 0 && (
            <span className="text-2xl font-black tabular-nums">
              {progress}<span className="text-neutral-300">/{queue.length}</span>
            </span>
          )}
        </div>
        <div className="justify-self-end">
          <Link
            href="/record"
            className="md:hidden text-2xl leading-none"
            aria-label="Record a video"
          >
            &#x1F3A5;
          </Link>
          <Link
            href="/hot-list"
            className="hidden md:inline text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
          >
            Hot List
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
        {phase === "loading" ? null : phase === "done" ? (
          <div className="w-full max-w-sm py-6 animate-[fadeIn_0.3s_ease-out]">
            {/* Share Card */}
            <div
              ref={cardRef}
              className="bg-neutral-50 rounded-2xl border border-neutral-200 px-4 pt-4 pb-3 mb-4"
            >
              <h2 className="text-lg font-black text-center leading-tight">
                My Hot Takes &#x1F525;
              </h2>
              <p className="text-[11px] text-neutral-400 text-center mb-2.5">
                {tagline}
              </p>

              <div className="grid grid-cols-2 gap-1">
                {roundChoices.map((c, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                      c.isHot
                        ? "bg-green-50 border border-green-100"
                        : "bg-red-50 border border-red-100"
                    }`}
                  >
                    <span className="shrink-0 text-sm">
                      {c.isHot ? "\uD83D\uDD25" : "\u274C"}
                    </span>
                    <span className="truncate">{c.text}</span>
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

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={async () => {
                  const canvas = renderShareCard(roundChoices, tagline, scoreLine);
                  const blob = await new Promise<Blob | null>((res) =>
                    canvas.toBlob(res, "image/jpeg", 0.92)
                  );
                  if (!blob) return;

                  // Track share click
                  fetch("/api/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event: "share_click" }),
                  }).catch(() => {});

                  // Show in modal so users can long-press to save (iOS-native)
                  // or use share button for sending to other apps
                  if (shareImageUrl) URL.revokeObjectURL(shareImageUrl);
                  setShareImageBlob(blob);
                  setShareImageUrl(URL.createObjectURL(blob));
                }}
                className="w-full py-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 transition-all text-white font-bold text-lg cursor-pointer"
              >
                Download your card &#x1F440;
              </button>
              <button
                onClick={handlePlayAgain}
                className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all text-white font-bold text-lg cursor-pointer"
              >
                Play Again
              </button>
              <Link
                href="/record"
                className="block md:hidden w-full py-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer border border-neutral-200 text-center"
              >
                <span className="font-bold text-neutral-900">
                  Make your video &#x1F3A5;
                </span>
                <span className="block text-xs text-neutral-400 mt-0.5">
                  Share your reactions
                </span>
              </Link>
            </div>
          </div>
        ) : phase === "voting" && prompt ? (
          <div
            key={prompt.id}
            className="text-center w-full max-w-sm animate-[fadeIn_0.2s_ease-out]"
          >
            <p className="text-5xl font-black leading-tight mb-16">
              {prompt.text}
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
            const otherPct = userVotedHot ? notPct : hotPct;
            const userSideIsHot = userVotedHot;
            const hotIsLeft = hotPct >= notPct;

            const leftPct = hotIsLeft ? hotPct : notPct;
            const rightPct = hotIsLeft ? notPct : hotPct;
            const leftIsHot = hotIsLeft;
            const userOnLeft = userSideIsHot === leftIsHot;

            return (
              <div className="w-full max-w-sm animate-[fadeIn_0.15s_ease-out]">
                {/* Main percentage */}
                <p className="text-7xl font-black text-center mb-1">
                  {userPct}%
                </p>
                <p className="text-lg font-medium text-neutral-500 text-center mb-6">
                  said {userVotedHot ? "HOT" : "NOT"}
                </p>

                {/* Split bar */}
                <div className="flex items-center gap-0 rounded-full overflow-hidden h-12 mb-3">
                  <div
                    className={`h-full flex items-center justify-center font-bold text-sm transition-all ${
                      leftIsHot
                        ? "bg-green-400 text-green-900"
                        : "bg-red-400 text-red-900"
                    }`}
                    style={{ width: `${Math.max(leftPct, 8)}%` }}
                  >
                    {leftIsHot ? "\uD83D\uDD25" : "\u274C"} {leftPct}%
                  </div>
                  <div
                    className={`h-full flex items-center justify-center font-bold text-sm transition-all ${
                      leftIsHot
                        ? "bg-red-200 text-red-700"
                        : "bg-green-200 text-green-700"
                    }`}
                    style={{ width: `${Math.max(rightPct, 8)}%` }}
                  >
                    {leftIsHot ? "\u274C" : "\uD83D\uDD25"} {rightPct}%
                  </div>
                </div>

                {/* You marker */}
                <div className="flex mb-6">
                  <div
                    className="flex flex-col items-center transition-all"
                    style={{
                      marginLeft: userOnLeft
                        ? `${Math.max(leftPct / 2 - 5, 2)}%`
                        : `${Math.max(leftPct + rightPct / 2 - 5, 2)}%`,
                    }}
                  >
                    <span className="text-xs font-black text-neutral-900 bg-neutral-200 px-2.5 py-1 rounded-full">
                      YOU
                    </span>
                  </div>
                </div>

                {/* Crowd text */}
                <p className="text-lg font-bold text-center text-neutral-800">
                  {majority
                    ? "Most people agree with you \u2705"
                    : `Only ${userPct}% agree with you \uD83D\uDC40`}
                </p>
              </div>
            );
          })()
        ) : null}
      </div>

      <div className="h-8 shrink-0" />

      {/* Share Image Modal */}
      {shareImageUrl && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex flex-col items-center justify-center px-4 py-6 animate-[fadeIn_0.15s_ease-out]"
          onClick={() => {
            URL.revokeObjectURL(shareImageUrl);
            setShareImageUrl(null);
            setShareImageBlob(null);
          }}
        >
          <div
            className="w-full max-w-sm flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white text-sm font-medium mb-3 text-center">
              Press &amp; hold the image to save &#x1F447;
            </p>
            <img
              src={shareImageUrl}
              alt="My Hot Takes"
              className="w-full shadow-2xl mb-4"
              draggable={false}
            />
            <div className="w-full space-y-2">
              <button
                onClick={async () => {
                  if (!shareImageBlob) return;
                  const file = new File([shareImageBlob], "my-hot-takes.jpg", {
                    type: "image/jpeg",
                  });
                  if (
                    navigator.share &&
                    navigator.canShare &&
                    navigator.canShare({ files: [file] })
                  ) {
                    try {
                      await navigator.share({ files: [file] });
                    } catch {
                      // user cancelled
                    }
                  }
                }}
                className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all text-white font-bold cursor-pointer"
              >
                Share to apps &#x1F4F2;
              </button>
              <button
                onClick={() => {
                  URL.revokeObjectURL(shareImageUrl);
                  setShareImageUrl(null);
                  setShareImageBlob(null);
                }}
                className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white font-medium cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6"
          onClick={() => emailStatus !== "sending" && setShowEmailModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm animate-[fadeIn_0.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {emailStatus === "done" ? (
              <div className="text-center py-4">
                <p className="text-3xl mb-2">&#x1F525;</p>
                <p className="text-lg font-bold">You're on the list!</p>
                <p className="text-sm text-neutral-400 mt-1">
                  We'll let you know when the card game drops.
                </p>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailStatus("idle");
                    setEmail("");
                  }}
                  className="mt-5 w-full py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 font-medium text-sm cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-center">
                  Want more like this? &#x1F440;
                </h3>
                <p className="text-sm text-neutral-400 text-center mt-1 mb-5">
                  Drop your email for early access to the HotNot card game.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!email.trim()) return;
                    setEmailStatus("sending");
                    try {
                      await fetch("/api/email", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: email.trim() }),
                      });
                      setEmailStatus("done");
                    } catch {
                      setEmailStatus("idle");
                    }
                  }}
                >
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-base outline-none focus:border-orange-400 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={emailStatus === "sending"}
                    className="w-full mt-3 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 transition-all text-white font-bold cursor-pointer disabled:opacity-50"
                  >
                    {emailStatus === "sending" ? "..." : "Get Early Access"}
                  </button>
                </form>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="w-full mt-2 py-2 text-sm text-neutral-400 cursor-pointer"
                >
                  No thanks
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
