export interface QuestionResult {
  text: string;
  isHot: boolean;
  hotPct: number;
}

const W = 720;
const H = 1280;

// Timeline: intro (1.5s) + questions (2.5s each) + summary (2.5s)
const INTRO_DUR = 1.5;
const Q_DUR = 2.5;
const SUMMARY_DUR = 2.5;

function totalDuration(count: number) {
  return INTRO_DUR + count * Q_DUR + SUMMARY_DUR;
}

export async function generateRecapVideo(
  results: QuestionResult[],
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(30);

  // Pick MIME type
  const candidates = [
    "video/mp4;codecs=avc1,mp4a",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const mimeType =
    candidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";

  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const duration = totalDuration(results.length);

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || "video/webm" });
      resolve(blob);
    };
    recorder.onerror = () => reject(new Error("Recording failed"));

    recorder.start(100);
    const startTime = performance.now();

    const agreementCount = results.filter((r) => {
      const userPct = r.isHot ? r.hotPct : 100 - r.hotPct;
      return userPct >= 50;
    }).length;

    const frame = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed >= duration) {
        // Draw one last frame then stop
        drawFrame(ctx, results, duration - 0.01, agreementCount);
        setTimeout(() => recorder.stop(), 100);
        onProgress?.(100);
        return;
      }

      drawFrame(ctx, results, elapsed, agreementCount);
      onProgress?.(Math.round((elapsed / duration) * 100));
      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  });
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  results: QuestionResult[],
  elapsed: number,
  agreementCount: number
) {
  // Clear
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Determine which section we're in
  if (elapsed < INTRO_DUR) {
    drawIntro(ctx, elapsed);
  } else if (elapsed < INTRO_DUR + results.length * Q_DUR) {
    const qElapsed = elapsed - INTRO_DUR;
    const qIndex = Math.floor(qElapsed / Q_DUR);
    const qTime = qElapsed - qIndex * Q_DUR;
    drawQuestion(ctx, results[qIndex], qIndex, results.length, qTime);
  } else {
    const sTime = elapsed - INTRO_DUR - results.length * Q_DUR;
    drawSummary(ctx, results, agreementCount, sTime);
  }

  // Persistent bottom branding
  ctx.fillStyle = "#d4d4d4";
  ctx.font = `500 ${22}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("hotnot.app", W / 2, H - 40);
}

function drawIntro(ctx: CanvasRenderingContext2D, t: number) {
  const alpha = easeOut(Math.min(t / 0.4, 1));
  ctx.globalAlpha = alpha;

  // Fire emoji
  ctx.font = `120px -apple-system, BlinkMacSystemFont, 'Apple Color Emoji', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("\uD83D\uDD25", W / 2, H / 2 - 120);

  // Title
  ctx.fillStyle = "#0a0a0a";
  ctx.font = `900 72px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText("My Hot Takes", W / 2, H / 2 + 10);

  // Subtitle
  ctx.fillStyle = "#a3a3a3";
  ctx.font = `500 32px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText("Do you agree?", W / 2, H / 2 + 70);

  ctx.globalAlpha = 1;
  ctx.textBaseline = "alphabetic";
}

function drawQuestion(
  ctx: CanvasRenderingContext2D,
  q: QuestionResult,
  index: number,
  total: number,
  t: number
) {
  const userPct = q.isHot ? q.hotPct : 100 - q.hotPct;
  const isMajority = userPct >= 50;

  // Progress dots at top
  ctx.textAlign = "center";
  const dotY = 80;
  const dotSize = 10;
  const dotGap = 28;
  const dotsStartX = W / 2 - ((total - 1) * dotGap) / 2;
  for (let i = 0; i < total; i++) {
    ctx.fillStyle = i <= index ? "#f97316" : "#e5e5e5";
    ctx.beginPath();
    ctx.arc(dotsStartX + i * dotGap, dotY, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Phase 1: Question appears (0 - 0.5s)
  const qAlpha = easeOut(Math.min(t / 0.35, 1));
  ctx.globalAlpha = qAlpha;

  ctx.fillStyle = "#0a0a0a";
  ctx.font = `900 68px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  wrapText(ctx, q.text, W / 2, 340, W - 120, 80);
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = 1;

  // Phase 2: User's answer (0.6s+)
  if (t >= 0.6) {
    const aAlpha = easeOut(Math.min((t - 0.6) / 0.25, 1));
    ctx.globalAlpha = aAlpha;

    // Answer pill
    const pillW = 300;
    const pillH = 80;
    const pillX = W / 2 - pillW / 2;
    const pillY = 520;

    ctx.fillStyle = q.isHot ? "#dcfce7" : "#fee2e2";
    roundRect(ctx, pillX, pillY, pillW, pillH, 20);
    ctx.fill();

    ctx.fillStyle = q.isHot ? "#166534" : "#991b1b";
    ctx.font = `800 36px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = "center";
    const emoji = q.isHot ? "\uD83D\uDD25" : "\u274C";
    ctx.fillText(
      `I said ${q.isHot ? "HOT" : "NOT"} ${emoji}`,
      W / 2,
      pillY + pillH / 2 + 13
    );

    ctx.globalAlpha = 1;
  }

  // Phase 3: Crowd result (1.2s+)
  if (t >= 1.2) {
    const cAlpha = easeOut(Math.min((t - 1.2) / 0.25, 1));
    ctx.globalAlpha = cAlpha;

    // Split bar
    const barX = 80;
    const barY = 700;
    const barW = W - 160;
    const barH = 56;
    const hotWidth = Math.max(barW * (q.hotPct / 100), barW * 0.08);
    const notWidth = barW - hotWidth;

    // Hot side (left, green)
    ctx.fillStyle = "#4ade80";
    roundRectLeft(ctx, barX, barY, hotWidth, barH, 16);
    ctx.fill();

    // Not side (right, red)
    ctx.fillStyle = "#fca5a5";
    roundRectRight(ctx, barX + hotWidth, barY, notWidth, barH, 16);
    ctx.fill();

    // Percentages on bar
    ctx.fillStyle = "#166534";
    ctx.font = `800 24px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = "left";
    if (q.hotPct >= 15) {
      ctx.fillText(`\uD83D\uDD25 ${q.hotPct}%`, barX + 14, barY + barH / 2 + 9);
    }

    ctx.fillStyle = "#991b1b";
    ctx.textAlign = "right";
    if (100 - q.hotPct >= 15) {
      ctx.fillText(
        `${100 - q.hotPct}% \u274C`,
        barX + barW - 14,
        barY + barH / 2 + 9
      );
    }

    // YOU marker
    const userOnHot = q.isHot;
    const markerX = userOnHot
      ? barX + hotWidth / 2
      : barX + hotWidth + notWidth / 2;

    ctx.fillStyle = "#0a0a0a";
    roundRect(ctx, markerX - 32, barY + barH + 12, 64, 30, 15);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 16px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("YOU", markerX, barY + barH + 33);

    // Reaction text
    ctx.fillStyle = "#525252";
    ctx.font = `700 34px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = "center";
    if (isMajority) {
      ctx.fillText("With the majority \u2705", W / 2, barY + barH + 100);
    } else {
      ctx.fillText(
        `Only ${userPct}% agree with me \uD83D\uDC40`,
        W / 2,
        barY + barH + 100
      );
    }

    ctx.globalAlpha = 1;
  }
}

function drawSummary(
  ctx: CanvasRenderingContext2D,
  results: QuestionResult[],
  agreementCount: number,
  t: number
) {
  const alpha = easeOut(Math.min(t / 0.4, 1));
  ctx.globalAlpha = alpha;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Big number
  ctx.fillStyle = "#0a0a0a";
  ctx.font = `900 140px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText(`${agreementCount}/${results.length}`, W / 2, H / 2 - 100);

  // Label
  ctx.fillStyle = "#525252";
  ctx.font = `600 36px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText("with the crowd", W / 2, H / 2);

  // CTA
  if (t >= 0.8) {
    const ctaAlpha = easeOut(Math.min((t - 0.8) / 0.3, 1));
    ctx.globalAlpha = ctaAlpha;

    ctx.fillStyle = "#f97316";
    ctx.font = `700 32px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText("Think you can do better?", W / 2, H / 2 + 80);
  }

  ctx.globalAlpha = 1;
  ctx.textBaseline = "alphabetic";
}

// --- Helpers ---

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  // Try to fit in one line first, shrink if needed
  let fontSize = 68;
  ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;

  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }

  // Try smaller font
  while (fontSize > 40 && ctx.measureText(text).width > maxWidth) {
    fontSize -= 4;
    ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  }

  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }

  // Word wrap
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
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

function roundRectLeft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRectRight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}
