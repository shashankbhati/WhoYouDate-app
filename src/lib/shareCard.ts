// ── Shared drawing helpers ────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1b1428");
  bg.addColorStop(1, "#0d0d18");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // Dot grid
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let x = 60; x < W; x += 60)
    for (let y = 60; y < H; y += 60) {
      ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
    }
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  data: { name: string; value: number }[],
  opts: { left: number; top: number; width: number; height: number; formatVal: (v: number) => string }
) {
  const n = Math.min(data.length, 6);
  const gap = 28;
  const barW = (opts.width - gap * (n - 1)) / n;
  const maxVal = Math.max(...data.slice(0, n).map((d) => d.value), 1);

  data.slice(0, n).forEach((d, i) => {
    const x = opts.left + i * (barW + gap);
    const barH = Math.max(32, (d.value / maxVal) * opts.height);
    const y = opts.top + opts.height - barH;
    const isTop = i === 0;

    const grad = ctx.createLinearGradient(x, y, x, opts.top + opts.height);
    if (isTop) { grad.addColorStop(0, "#e05533"); grad.addColorStop(1, "#9a2d14"); }
    else { grad.addColorStop(0, "#3d3862"); grad.addColorStop(1, "#242240"); }
    ctx.fillStyle = grad;

    const r = Math.min(10, barW / 4);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, opts.top + opts.height);
    ctx.lineTo(x, opts.top + opts.height);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.fill();

    const cx = x + barW / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = isTop ? "#e05533" : "#9996bb";
    ctx.font = `bold ${isTop ? 30 : 24}px -apple-system,'Segoe UI',sans-serif`;
    ctx.fillText(opts.formatVal(d.value), cx, y - 14);
    ctx.fillStyle = isTop ? "#f0eef8" : "#7774a0";
    ctx.font = `${isTop ? "bold" : "normal"} ${isTop ? 28 : 22}px -apple-system,'Segoe UI',sans-serif`;
    ctx.fillText(d.name, cx, opts.top + opts.height + 42);
    ctx.textAlign = "left";
  });
}

function drawFooter(ctx: CanvasRenderingContext2D, W: number, H: number, right = "log your own dates · stay anon") {
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, H - 140); ctx.lineTo(W - 80, H - 140); ctx.stroke();
  ctx.fillStyle = "#e05533";
  ctx.font = `bold 34px -apple-system,'Segoe UI',sans-serif`;
  ctx.fillText("whoamidating.singles", 80, H - 76);
  ctx.fillStyle = "#4a4870";
  ctx.font = `26px -apple-system,'Segoe UI',sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(right, W - 80, H - 76);
  ctx.textAlign = "left";
}

async function shareOrDownload(canvas: HTMLCanvasElement, filename: string, text: string) {
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "WhoAmIDating", text });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function makeCanvas(W = 1080, H = 1080) {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  return { canvas, ctx: canvas.getContext("2d")! };
}

// ── 1. Community: Costliest names chart ──────────────────────────────────────

export function shareCard(
  data: { name: string; value: number }[],
  city: string,
  currencySymbol: string
) {
  const W = 1080, H = 1080;
  const { canvas, ctx } = makeCanvas(W, H);
  drawBackground(ctx, W, H);

  ctx.fillStyle = "#e05533";
  ctx.font = `bold 40px -apple-system,'Segoe UI',sans-serif`;
  ctx.fillText("COSTLIEST DATES TO GO ON", 80, 110);
  ctx.fillStyle = "#f0eef8";
  ctx.font = `bold 96px -apple-system,'Segoe UI',sans-serif`;
  ctx.fillText(city, 80, 220);
  ctx.fillStyle = "#6b6890";
  ctx.font = `28px -apple-system,'Segoe UI',sans-serif`;
  ctx.fillText("avg cost per date  •  community data, fully anonymous", 80, 268);

  drawBars(ctx, data, {
    left: 80, top: 340, width: W - 160, height: 500,
    formatVal: (v) => `${currencySymbol}${(v / 100).toFixed(0)}`,
  });

  drawFooter(ctx, W, H);
  shareOrDownload(canvas, `whoamidating-${city.toLowerCase().replace(/\s+/g, "-")}.png`,
    `who are you even dating in ${city}? 👀 whoamidating.singles`);
}

// ── 2. Community: Trending partner names chart ────────────────────────────────

const TRENDING_META = {
  cost:  { title: "MOST EXPENSIVE NAMES TO DATE",  sub: "avg cost per date  •  community data" },
  happy: { title: "HAPPIEST NAMES TO DATE",         sub: "happy date rate (mood 4+)  •  community data" },
  dates: { title: "MOST POPULAR NAMES",             sub: "total dates logged  •  community data" },
} as const;

export function shareTrendingCard(
  data: { name: string; value: number }[],
  metric: "cost" | "happy" | "dates",
  currencySymbol: string
) {
  const W = 1080, H = 1080;
  const { canvas, ctx } = makeCanvas(W, H);
  const meta = TRENDING_META[metric];
  drawBackground(ctx, W, H);

  ctx.fillStyle = "#e05533";
  ctx.font = `bold 40px -apple-system,'Segoe UI',sans-serif`;
  ctx.fillText(meta.title, 80, 110);
  ctx.fillStyle = "#6b6890";
  ctx.font = `28px -apple-system,'Segoe UI',sans-serif`;
  ctx.fillText(meta.sub, 80, 165);

  const formatVal =
    metric === "cost"  ? (v: number) => `${currencySymbol}${(v / 100).toFixed(0)}` :
    metric === "happy" ? (v: number) => `${v.toFixed(0)}%` :
                         (v: number) => `${Math.round(v)}`;

  drawBars(ctx, data, {
    left: 80, top: 260, width: W - 160, height: 580,
    formatVal,
  });

  drawFooter(ctx, W, H);
  shareOrDownload(canvas, `whoamidating-trending-${metric}.png`,
    `see who's trending on dates 👀 whoamidating.singles`);
}

// ── 3. Personal stats card ────────────────────────────────────────────────────

export interface PersonalStats {
  username: string;
  totalDates: number;
  totalSpent: number;    // in minor currency units (cents/paise)
  avgPerDate: number;    // in minor currency units
  currencySymbol: string;
  happyRate: number;     // 0–100
  successRate: number;   // 0–100
  avgMood: number;       // 1–5
  favActivity: string;   // e.g. "☕ Coffee"
}

export function sharePersonalCard(stats: PersonalStats) {
  const W = 1080, H = 1080;
  const { canvas, ctx } = makeCanvas(W, H);
  drawBackground(ctx, W, H);

  // Header
  ctx.fillStyle = "#e05533";
  ctx.font = `bold 36px -apple-system,'Segoe UI',sans-serif`;
  ctx.fillText("MY DATING STATS", 80, 100);
  ctx.fillStyle = "#4a4870";
  ctx.font = `28px -apple-system,'Segoe UI',sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("2026", W - 80, 100);
  ctx.textAlign = "left";

  // Username
  ctx.fillStyle = "#7774a0";
  ctx.font = `28px -apple-system,'Segoe UI',sans-serif`;
  ctx.fillText(`u/${stats.username}`, 80, 152);

  // Hero: total spent
  const spentStr = `${stats.currencySymbol}${(stats.totalSpent / 100).toFixed(0)}`;
  ctx.fillStyle = "#f0eef8";
  ctx.font = `bold 130px -apple-system,'Segoe UI',sans-serif`;
  // Scale font down if too wide
  let fontSize = 130;
  while (ctx.measureText(spentStr).width > W - 160 && fontSize > 60) {
    fontSize -= 8;
    ctx.font = `bold ${fontSize}px -apple-system,'Segoe UI',sans-serif`;
  }
  ctx.fillText(spentStr, 80, 330);

  ctx.fillStyle = "#6b6890";
  ctx.font = `30px -apple-system,'Segoe UI',sans-serif`;
  ctx.fillText(`spent across ${stats.totalDates} date${stats.totalDates !== 1 ? "s" : ""}`, 80, 382);

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, 420); ctx.lineTo(W - 80, 420); ctx.stroke();

  // 4-stat grid
  const statItems = [
    { label: "avg / date", value: `${stats.currencySymbol}${(stats.avgPerDate / 100).toFixed(0)}` },
    { label: "happy rate", value: `${stats.happyRate}%` },
    { label: "2nd date rate", value: stats.totalDates > 0 ? `${stats.successRate}%` : "—" },
    { label: "avg mood", value: `${stats.avgMood.toFixed(1)} / 5` },
  ];
  const colW = (W - 160) / 4;
  statItems.forEach((s, i) => {
    const x = 80 + i * colW;
    // Box bg
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    const bx = x + 8, by = 440, bw = colW - 16, bh = 140;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 14);
    ctx.fill();
    // Value
    ctx.fillStyle = "#f0eef8";
    ctx.font = `bold 46px -apple-system,'Segoe UI',sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(s.value, x + colW / 2, 510);
    // Label
    ctx.fillStyle = "#6b6890";
    ctx.font = `22px -apple-system,'Segoe UI',sans-serif`;
    ctx.fillText(s.label, x + colW / 2, 548);
    ctx.textAlign = "left";
  });

  // Fav activity band
  ctx.fillStyle = "rgba(224,85,51,0.12)";
  ctx.beginPath(); ctx.roundRect(80, 616, W - 160, 90, 16); ctx.fill();
  ctx.strokeStyle = "rgba(224,85,51,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(80, 616, W - 160, 90, 16); ctx.stroke();

  ctx.fillStyle = "#9996bb";
  ctx.font = `26px -apple-system,'Segoe UI',sans-serif`;
  ctx.fillText("go-to date type", 120, 654);
  ctx.fillStyle = "#f0eef8";
  ctx.font = `bold 36px -apple-system,'Segoe UI',sans-serif`;
  ctx.fillText(stats.favActivity, 120, 692);

  drawFooter(ctx, W, H, "track your own · stay anon");
  shareOrDownload(canvas, `whoamidating-my-stats.png`,
    `i spent ${stats.currencySymbol}${(stats.totalSpent / 100).toFixed(0)} on ${stats.totalDates} dates lmao 💀 whoamidating.singles`);
}
