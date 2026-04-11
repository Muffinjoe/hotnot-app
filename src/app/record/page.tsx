"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const MOCK_PROMPTS = [
  "Marriage?",
  "Crypto?",
  "Gym at 6am?",
  "Oat milk?",
  "LinkedIn?",
  "Dating apps?",
  "Therapy?",
  "Karaoke?",
  "Pineapple on pizza?",
  "Sleep?",
];

const CANVAS_W = 720;
const CANVAS_H = 1280;
const MAX_DURATION = 90;
const CHOICE_DISPLAY_MS = 1400;

type Phase =
  | "idle"
  | "permission"
  | "ready"
  | "countdown"
  | "recording"
  | "processing"
  | "review"
  | "error";

type Choice = "hot" | "not";

export default function RecordPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [micEnabled, setMicEnabled] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [elapsedTick, setElapsedTick] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoMime, setVideoMime] = useState<string>("");

  // Refs - state read inside the animation loop lives in refs so the loop
  // doesn't need to be recreated on every state change
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartRef = useRef<number>(0);
  const videoBlobRef = useRef<Blob | null>(null);

  const phaseRef = useRef<Phase>("idle");
  const currentIndexRef = useRef(0);
  const choiceRef = useRef<Choice | null>(null);
  const choiceTimestampRef = useRef(0);
  const countdownRef = useRef(3);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    countdownRef.current = countdown;
  }, [countdown]);

  // ----- Canvas drawing -----

  const drawOverlay = useCallback((ctx: CanvasRenderingContext2D) => {
    const p = phaseRef.current;
    const state = {
      index: currentIndexRef.current,
      choice: choiceRef.current,
      choiceTs: choiceTimestampRef.current,
    };

    // Top bar gradient for legibility
    const grad = ctx.createLinearGradient(0, 0, 0, 160);
    grad.addColorStop(0, "rgba(0,0,0,0.55)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, 160);

    // Recording indicator + timer (left)
    if (p === "recording") {
      const elapsed = (Date.now() - recordingStartRef.current) / 1000;
      const blink = Math.floor(Date.now() / 500) % 2 === 0;
      if (blink) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(52, 64, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      const m = Math.floor(elapsed / 60);
      const s = Math.floor(elapsed % 60);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${m}:${s.toString().padStart(2, "0")}`, 80, 76);
    }

    // HotNot branding (center)
    ctx.fillStyle = "#fff";
    ctx.font = "900 30px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HotNot.app", CANVAS_W / 2, 76);

    // Progress (right)
    ctx.fillStyle = "#fff";
    ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      `${state.index + 1}/${MOCK_PROMPTS.length}`,
      CANVAS_W - 40,
      76
    );

    // Prompt card (upper-middle)
    const promptY = 200;
    const promptH = 200;
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    roundRect(ctx, 60, promptY, CANVAS_W - 120, promptH, 28);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const prompt = MOCK_PROMPTS[state.index] ?? "Thanks for playing!";
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "900 76px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitAndDrawText(ctx, prompt, CANVAS_W / 2, promptY + promptH / 2, CANVAS_W - 200);
    ctx.textBaseline = "alphabetic";

    // Choice burst (center, fades out)
    const sinceChoice = Date.now() - state.choiceTs;
    if (state.choice && sinceChoice < CHOICE_DISPLAY_MS) {
      const t = sinceChoice / CHOICE_DISPLAY_MS;
      const alpha = 1 - t * 0.4;
      const scale = 0.7 + Math.min(1, t * 4) * 0.35;
      const isHot = state.choice === "hot";

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(CANVAS_W / 2, CANVAS_H / 2 - 20);
      ctx.scale(scale, scale);

      // Background circle
      ctx.fillStyle = isHot ? "rgba(34,197,94,0.95)" : "rgba(239,68,68,0.95)";
      ctx.beginPath();
      ctx.arc(0, 0, 240, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 10;
      ctx.stroke();

      // Emoji
      ctx.font = "220px -apple-system, BlinkMacSystemFont, 'Apple Color Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(isHot ? "\uD83D\uDD25" : "\u274C", 0, -30);

      // Label
      ctx.fillStyle = "#fff";
      ctx.font = "900 82px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(isHot ? "HOT" : "NOT", 0, 150);
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    }

    // Bottom buttons
    const btnMargin = 60;
    const btnGap = 40;
    const btnW = (CANVAS_W - btnMargin * 2 - btnGap) / 2;
    const btnH = 180;
    const btnY = CANVAS_H - btnH - 100;

    // Hot button
    const hotPressed =
      state.choice === "hot" && sinceChoice < 200;
    drawButton(
      ctx,
      btnMargin,
      btnY,
      btnW,
      btnH,
      hotPressed ? "rgba(34,197,94,0.95)" : "rgba(220,252,231,0.95)",
      hotPressed ? "rgba(255,255,255,0.9)" : "rgba(34,197,94,0.4)",
      "\uD83D\uDD25",
      hotPressed ? "#fff" : "#166534"
    );

    // Not button
    const notPressed =
      state.choice === "not" && sinceChoice < 200;
    drawButton(
      ctx,
      btnMargin + btnW + btnGap,
      btnY,
      btnW,
      btnH,
      notPressed ? "rgba(239,68,68,0.95)" : "rgba(254,226,226,0.95)",
      notPressed ? "rgba(255,255,255,0.9)" : "rgba(239,68,68,0.4)",
      "\u274C",
      notPressed ? "#fff" : "#991b1b"
    );

    // Countdown overlay
    if (p === "countdown") {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = "#fff";
      ctx.font = "900 400px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(countdownRef.current), CANVAS_W / 2, CANVAS_H / 2);
      ctx.textBaseline = "alphabetic";
    }
  }, []);

  const startDrawLoop = useCallback(() => {
    if (animationRef.current != null) return;
    const draw = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      // Background black
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Draw camera frame, cover-fit, mirrored for front camera
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const vAspect = vw / vh;
        const cAspect = CANVAS_W / CANVAS_H;

        let sx = 0,
          sy = 0,
          sw = vw,
          sh = vh;
        if (vAspect > cAspect) {
          // video wider - crop sides
          sw = vh * cAspect;
          sx = (vw - sw) / 2;
        } else {
          // video taller - crop top/bottom
          sh = vw / cAspect;
          sy = (vh - sh) / 2;
        }

        ctx.save();
        ctx.translate(CANVAS_W, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, CANVAS_W, CANVAS_H);
        ctx.restore();
      }

      drawOverlay(ctx);
      animationRef.current = requestAnimationFrame(draw);
    };
    animationRef.current = requestAnimationFrame(draw);
  }, [drawOverlay]);

  // ----- Camera setup -----

  const enableCamera = async () => {
    setPhase("permission");
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: micEnabled,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play().catch(() => {});
      }

      setPhase("ready");
      startDrawLoop();
    } catch (e) {
      const err = e as DOMException;
      setError(
        err.name === "NotAllowedError"
          ? "Camera access denied. Enable it in your browser settings and reload."
          : err.name === "NotFoundError"
            ? "No camera found on this device."
            : "Failed to access camera."
      );
      setPhase("error");
    }
  };

  // ----- Recording -----

  const pickMimeType = (): string => {
    if (typeof MediaRecorder === "undefined") return "";
    const candidates = [
      "video/mp4;codecs=avc1,mp4a",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return "";
  };

  const beginRecording = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !streamRef.current) return;
    if (typeof MediaRecorder === "undefined") {
      setError("Recording is not supported in this browser.");
      setPhase("error");
      return;
    }

    // 3-second countdown
    setPhase("countdown");
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await wait(1000);
    }

    // Reset round state
    currentIndexRef.current = 0;
    choiceRef.current = null;
    choiceTimestampRef.current = 0;

    // Build the recording stream: canvas visuals + optional mic audio
    const canvasStream = canvas.captureStream(30);
    if (micEnabled) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((t) => canvasStream.addTrack(t));
    }

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(canvasStream, { mimeType })
        : new MediaRecorder(canvasStream);
    } catch {
      setError("Failed to start recorder. Try a different browser.");
      setPhase("error");
      return;
    }

    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const type = mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      videoBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setVideoMime(type);
      setPhase("review");
    };

    recorder.onerror = () => {
      setError("Recording error. Try again.");
      setPhase("error");
    };

    try {
      recorder.start(250);
    } catch {
      setError("Failed to start recorder.");
      setPhase("error");
      return;
    }

    recordingStartRef.current = Date.now();
    setPhase("recording");
    setElapsedTick(0);

    // Tick timer & enforce max duration
    timerIntervalRef.current = setInterval(() => {
      const sec = (Date.now() - recordingStartRef.current) / 1000;
      setElapsedTick(sec);
      if (sec >= MAX_DURATION) {
        stopRecording();
      }
    }, 200);
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      setPhase("processing");
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }
  };

  const handleChoice = (c: Choice) => {
    if (phaseRef.current !== "recording") return;
    if (choiceRef.current) return; // debounce
    choiceRef.current = c;
    choiceTimestampRef.current = Date.now();

    setTimeout(() => {
      const next = currentIndexRef.current + 1;
      if (next >= MOCK_PROMPTS.length) {
        stopRecording();
        return;
      }
      currentIndexRef.current = next;
      choiceRef.current = null;
    }, CHOICE_DISPLAY_MS);
  };

  // ----- Review actions -----

  const downloadVideo = () => {
    const blob = videoBlobRef.current;
    if (!blob || !videoUrl) return;
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `hotnot-${Date.now()}.${ext}`;
    a.click();
  };

  const shareVideo = async () => {
    const blob = videoBlobRef.current;
    if (!blob) return;
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const file = new File([blob], `hotnot-takes.${ext}`, { type: blob.type });
    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch {
        // fall through
      }
    }
    downloadVideo();
  };

  const retake = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoBlobRef.current = null;
    setVideoUrl(null);
    setVideoMime("");
    currentIndexRef.current = 0;
    choiceRef.current = null;
    choiceTimestampRef.current = 0;
    setPhase("ready");
  };

  // ----- Cleanup -----

  const fullCleanup = useCallback(() => {
    if (animationRef.current != null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    videoBlobRef.current = null;
  }, [videoUrl]);

  useEffect(() => {
    return () => {
      fullCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Render -----

  const showCanvasView =
    phase === "ready" ||
    phase === "countdown" ||
    phase === "recording" ||
    phase === "processing";

  return (
    <main className="fixed inset-0 bg-white text-neutral-900 flex flex-col overflow-hidden">
      {/* Hidden video element that plays the camera stream */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="hidden"
      />

      {/* IDLE / INTRO */}
      {phase === "idle" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-full max-w-sm">
            <p className="text-5xl mb-4">&#x1F3A5;</p>
            <h1 className="text-3xl font-black mb-2">Record your HotNot</h1>
            <p className="text-sm text-neutral-500 mb-6">
              Tap through 10 prompts on camera and share the clip. Nothing is
              uploaded &mdash; everything stays on your device.
            </p>

            <label className="flex items-center justify-center gap-2 text-sm text-neutral-600 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={micEnabled}
                onChange={(e) => setMicEnabled(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              Include microphone
            </label>

            <button
              onClick={enableCamera}
              className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all text-white font-bold text-lg cursor-pointer"
            >
              Enable Camera
            </button>
            <p className="text-[11px] text-neutral-400 mt-4">
              Max 90s &middot; portrait only &middot; processed locally
            </p>
          </div>
        </div>
      )}

      {/* PERMISSION PENDING */}
      {phase === "permission" && (
        <div className="flex-1 flex items-center justify-center text-neutral-500">
          Waiting for camera permission...
        </div>
      )}

      {/* ERROR */}
      {phase === "error" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-4xl mb-3">&#x26A0;&#xFE0F;</p>
          <p className="text-lg font-bold mb-2">Something went wrong</p>
          <p className="text-sm text-neutral-500 mb-6 max-w-sm">{error}</p>
          <button
            onClick={() => {
              fullCleanup();
              setError("");
              setPhase("idle");
            }}
            className="py-3 px-6 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 font-medium cursor-pointer"
          >
            Start over
          </button>
        </div>
      )}

      {/* CANVAS VIEW (ready / countdown / recording / processing) */}
      {showCanvasView && (
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Canvas fills the viewport while preserving portrait aspect */}
          <div className="relative h-full w-full flex items-center justify-center">
            <div className="relative h-full aspect-[9/16] max-w-full max-h-full">
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="w-full h-full object-contain bg-black"
              />

              {/* Invisible tap zones positioned over the drawn buttons.
                  These are the actual interactive controls during recording. */}
              {phase === "recording" && (
                <>
                  <button
                    onClick={() => handleChoice("hot")}
                    className="absolute active:bg-white/10"
                    style={{
                      left: `${(60 / CANVAS_W) * 100}%`,
                      top: `${((CANVAS_H - 280) / CANVAS_H) * 100}%`,
                      width: `${(((CANVAS_W - 160) / 2) / CANVAS_W) * 100}%`,
                      height: `${(180 / CANVAS_H) * 100}%`,
                    }}
                    aria-label="Hot"
                  />
                  <button
                    onClick={() => handleChoice("not")}
                    className="absolute active:bg-white/10"
                    style={{
                      left: `${((60 + (CANVAS_W - 160) / 2 + 40) / CANVAS_W) * 100}%`,
                      top: `${((CANVAS_H - 280) / CANVAS_H) * 100}%`,
                      width: `${(((CANVAS_W - 160) / 2) / CANVAS_W) * 100}%`,
                      height: `${(180 / CANVAS_H) * 100}%`,
                    }}
                    aria-label="Not"
                  />
                </>
              )}
            </div>
          </div>

          {/* Floating controls below canvas */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 px-6 z-10">
            {phase === "ready" && (
              <>
                <button
                  onClick={() => {
                    fullCleanup();
                    setPhase("idle");
                  }}
                  className="px-5 py-3 rounded-xl bg-white/90 backdrop-blur-sm border border-neutral-200 text-neutral-900 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={beginRecording}
                  className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold cursor-pointer flex items-center gap-2"
                >
                  <span className="w-3 h-3 rounded-full bg-white" />
                  Start Recording
                </button>
              </>
            )}

            {phase === "recording" && (
              <button
                onClick={stopRecording}
                className="px-6 py-3 rounded-xl bg-white/90 backdrop-blur-sm border border-neutral-200 text-neutral-900 font-bold cursor-pointer flex items-center gap-2"
              >
                <span className="w-3 h-3 bg-red-500" />
                Stop
              </button>
            )}

            {phase === "processing" && (
              <div className="px-5 py-3 rounded-xl bg-white/90 backdrop-blur-sm border border-neutral-200 text-neutral-900 text-sm">
                Processing...
              </div>
            )}
          </div>

          {/* Progress bar for max duration */}
          {phase === "recording" && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-200 z-10">
              <div
                className="h-full bg-red-500 transition-[width]"
                style={{
                  width: `${Math.min(100, (elapsedTick / MAX_DURATION) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* REVIEW */}
      {phase === "review" && videoUrl && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <div className="w-full max-w-sm flex-1 flex flex-col">
            <h2 className="text-xl font-black text-center mb-3">
              Your HotNot clip
            </h2>
            <div className="flex-1 flex items-center justify-center mb-4">
              <video
                src={videoUrl}
                controls
                playsInline
                className="max-h-[65vh] w-auto rounded-2xl bg-neutral-100 border border-neutral-200"
              />
            </div>
            <div className="space-y-2">
              <button
                onClick={shareVideo}
                className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all text-white font-bold text-lg cursor-pointer"
              >
                Share video &#x1F440;
              </button>
              <button
                onClick={downloadVideo}
                className="w-full py-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-all font-medium text-neutral-900 border border-neutral-200 cursor-pointer"
              >
                Download
              </button>
              <button
                onClick={retake}
                className="w-full py-3 rounded-2xl bg-transparent hover:bg-neutral-100 active:scale-95 transition-all font-medium text-neutral-500 cursor-pointer"
              >
                Retake
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 text-center mt-3">
              Saved locally on your device. Nothing uploaded.
              {videoMime && ` (${videoMime.split(";")[0]})`}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

// --- helpers ---

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke: string,
  emoji: string,
  _labelColor: string
) {
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, 28);
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.font = "110px -apple-system, BlinkMacSystemFont, 'Apple Color Emoji', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, x + w / 2, y + h / 2 + 4);
  ctx.textBaseline = "alphabetic";
}

function fitAndDrawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxWidth: number
) {
  const baseSize = 76;
  let size = baseSize;
  ctx.font = `900 ${size}px -apple-system, BlinkMacSystemFont, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 36) {
    size -= 4;
    ctx.font = `900 ${size}px -apple-system, BlinkMacSystemFont, sans-serif`;
  }
  ctx.fillText(text, cx, cy);
}
