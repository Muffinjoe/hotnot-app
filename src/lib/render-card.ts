interface Choice {
  text: string;
  isHot: boolean;
}

export function renderShareCard(
  choices: Choice[],
  tagline: string,
  scoreLine: string
): HTMLCanvasElement {
  const scale = 2;
  const SIZE = 540 * scale; // 1080px square

  const pad = 28 * scale;
  const rowGap = 8 * scale;
  const pillH = 44 * scale;
  const pillW = SIZE - pad * 2;

  const headerH = 80 * scale;
  const footerH = 70 * scale;
  const listH = choices.length * pillH + (choices.length - 1) * rowGap;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Title
  ctx.fillStyle = "#171717";
  ctx.font = `800 ${22 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("My Hot Takes \uD83D\uDD25", SIZE / 2, 32 * scale);

  // Tagline
  ctx.fillStyle = "#a3a3a3";
  ctx.font = `400 ${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText(tagline, SIZE / 2, 52 * scale);

  // List - vertically centered in the available space
  const listTop = headerH + (SIZE - headerH - footerH - listH) / 2;

  choices.forEach((c, i) => {
    const x = pad;
    const y = listTop + i * (pillH + rowGap);

    // Pill background
    ctx.fillStyle = c.isHot ? "#f0fdf4" : "#fef2f2";
    roundRect(ctx, x, y, pillW, pillH, 12 * scale);
    ctx.fill();

    // Pill border
    ctx.strokeStyle = c.isHot ? "#dcfce7" : "#fecaca";
    ctx.lineWidth = 1.5 * scale;
    roundRect(ctx, x, y, pillW, pillH, 12 * scale);
    ctx.stroke();

    // Text (left aligned)
    ctx.font = `600 ${15 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = "#171717";
    ctx.textAlign = "left";
    const maxTextW = pillW - 50 * scale;
    let text = c.text;
    while (ctx.measureText(text).width > maxTextW && text.length > 3) {
      text = text.slice(0, -1);
    }
    if (text !== c.text) text += "\u2026";
    ctx.fillText(text, x + 16 * scale, y + pillH / 2 + 6 * scale);

    // Emoji (right aligned)
    ctx.font = `${18 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = "right";
    const emoji = c.isHot ? "\uD83D\uDD25" : "\u274C";
    ctx.fillText(emoji, x + pillW - 14 * scale, y + pillH / 2 + 7 * scale);
  });

  // Footer
  const footerTop = SIZE - footerH;
  const footerCenter = footerTop + footerH / 2;

  ctx.textAlign = "center";
  ctx.fillStyle = "#737373";
  ctx.font = `600 ${13 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText(scoreLine, SIZE / 2, footerCenter - 8 * scale);

  ctx.fillStyle = "#525252";
  ctx.font = `600 ${14 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText("hotnot.app", SIZE / 2, footerCenter + 16 * scale);

  return canvas;
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
