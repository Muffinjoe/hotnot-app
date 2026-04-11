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
  const SIZE = 540 * scale; // 1080 - perfect for IG square
  const pad = 24 * scale;
  const colGap = 8 * scale;
  const colW = (SIZE - pad * 2 - colGap) / 2;

  const rows = Math.ceil(choices.length / 2);

  // Calculate pill height and gap to fill available space
  const headerH = 70 * scale;
  const footerH = 60 * scale;
  const availableH = SIZE - headerH - footerH;
  const rowGap = 5 * scale;
  const pillH = Math.floor((availableH - (rows - 1) * rowGap) / rows);
  const gridH = rows * pillH + (rows - 1) * rowGap;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  // Background - full square, no rounded corners
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Title
  ctx.fillStyle = "#171717";
  ctx.font = `800 ${18 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("My Hot Takes \uD83D\uDD25", SIZE / 2, 28 * scale);

  // Tagline
  ctx.fillStyle = "#a3a3a3";
  ctx.font = `400 ${11 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText(tagline, SIZE / 2, 44 * scale);

  // Grid
  const gridTop = headerH;
  ctx.textAlign = "left";

  choices.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = pad + col * (colW + colGap);
    const y = gridTop + row * (pillH + rowGap);

    // Pill background
    ctx.fillStyle = c.isHot ? "#f0fdf4" : "#fef2f2";
    roundRect(ctx, x, y, colW, pillH, 8 * scale);
    ctx.fill();

    // Pill border
    ctx.strokeStyle = c.isHot ? "#dcfce7" : "#fecaca";
    ctx.lineWidth = 1 * scale;
    roundRect(ctx, x, y, colW, pillH, 8 * scale);
    ctx.stroke();

    // Emoji
    ctx.font = `${13 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = "#171717";
    const emoji = c.isHot ? "\uD83D\uDD25" : "\u274C";
    ctx.fillText(emoji, x + 8 * scale, y + pillH / 2 + 5 * scale);

    // Text
    ctx.font = `500 ${11 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = "#171717";
    const maxTextW = colW - 32 * scale;
    let text = c.text;
    while (ctx.measureText(text).width > maxTextW && text.length > 3) {
      text = text.slice(0, -1);
    }
    if (text !== c.text) text += "\u2026";
    ctx.fillText(text, x + 24 * scale, y + pillH / 2 + 4 * scale);
  });

  // Footer - centered in remaining space
  const footerTop = gridTop + gridH;
  const footerCenter = footerTop + footerH / 2;

  ctx.textAlign = "center";
  ctx.fillStyle = "#737373";
  ctx.font = `600 ${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText(scoreLine, SIZE / 2, footerCenter - 6 * scale);

  ctx.fillStyle = "#525252";
  ctx.font = `600 ${13 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
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
