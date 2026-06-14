export function shareCard(
  data: { name: string; value: number }[],
  city: string,
  currencySymbol: string,
  subtitle = "avg cost per date"
) {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── Background ────────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1b1428");
  bg.addColorStop(1, "#0d0d18");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle dot grid
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let x = 60; x < W; x += 60) {
    for (let y = 60; y < H; y += 60) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Header ────────────────────────────────────────────────────────────────
  ctx.fillStyle = "#e05533";
  ctx.font = `bold 40px -apple-system, 'Segoe UI', sans-serif`;
  ctx.fillText("COSTLIEST DATES TO GO ON", 80, 110);

  ctx.fillStyle = "#f0eef8";
  ctx.font = `bold 96px -apple-system, 'Segoe UI', sans-serif`;
  ctx.fillText(city, 80, 220);

  ctx.fillStyle = "#6b6890";
  ctx.font = `28px -apple-system, 'Segoe UI', sans-serif`;
  ctx.fillText(subtitle + "  •  community data, fully anonymous", 80, 268);

  // ── Bar chart ─────────────────────────────────────────────────────────────
  const n = Math.min(data.length, 6);
  const chartLeft = 80;
  const chartRight = W - 80;
  const chartWidth = chartRight - chartLeft;
  const gap = 28;
  const barW = (chartWidth - gap * (n - 1)) / n;
  const chartBottom = 860;
  const chartTop = 360;
  const chartH = chartBottom - chartTop;
  const maxVal = Math.max(...data.slice(0, n).map((d) => d.value), 1);

  data.slice(0, n).forEach((d, i) => {
    const x = chartLeft + i * (barW + gap);
    const barH = Math.max(32, (d.value / maxVal) * chartH);
    const y = chartBottom - barH;
    const isTop = i === 0;

    // Bar fill
    const grad = ctx.createLinearGradient(x, y, x, chartBottom);
    if (isTop) {
      grad.addColorStop(0, "#e05533");
      grad.addColorStop(1, "#9a2d14");
    } else {
      grad.addColorStop(0, "#3d3862");
      grad.addColorStop(1, "#242240");
    }
    ctx.fillStyle = grad;

    // Rounded top corners
    const r = Math.min(10, barW / 4);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, chartBottom);
    ctx.lineTo(x, chartBottom);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.fill();

    const cx = x + barW / 2;

    // Value above bar
    ctx.textAlign = "center";
    ctx.fillStyle = isTop ? "#e05533" : "#9996bb";
    ctx.font = `bold ${isTop ? 32 : 26}px -apple-system, 'Segoe UI', sans-serif`;
    ctx.fillText(`${currencySymbol}${(d.value / 100).toFixed(0)}`, cx, y - 16);

    // Name below chart
    ctx.fillStyle = isTop ? "#f0eef8" : "#7774a0";
    ctx.font = `${isTop ? "bold" : "normal"} ${isTop ? 30 : 24}px -apple-system, 'Segoe UI', sans-serif`;
    ctx.fillText(d.name, cx, chartBottom + 44);
  });

  ctx.textAlign = "left";

  // ── Divider ───────────────────────────────────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, H - 140);
  ctx.lineTo(W - 80, H - 140);
  ctx.stroke();

  // ── Footer ────────────────────────────────────────────────────────────────
  ctx.fillStyle = "#e05533";
  ctx.font = `bold 34px -apple-system, 'Segoe UI', sans-serif`;
  ctx.fillText("whoamidating.singles", 80, H - 76);

  ctx.fillStyle = "#4a4870";
  ctx.font = `26px -apple-system, 'Segoe UI', sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("log your own dates · stay anon", W - 80, H - 76);
  ctx.textAlign = "left";

  // ── Share or download ─────────────────────────────────────────────────────
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const filename = `whoamidating-${city.toLowerCase().replace(/\s+/g, "-")}.png`;
    const file = new File([blob], filename, { type: "image/png" });

    // Mobile: open native share sheet (WhatsApp, Instagram, Telegram, etc.)
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Costliest Dates in ${city}`,
          text: `who are you even dating in ${city}? 👀 whoamidating.singles`,
        });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // user cancelled — do nothing
      }
    }

    // Desktop fallback: download the image
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
