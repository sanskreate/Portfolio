(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- year ---------- */
  document.getElementById("yr").textContent = new Date().getFullYear();

  /* ---------- neural field background ---------- */
  const cv = document.getElementById("field");
  const ctx = cv.getContext("2d");
  let W, H, pts = [], mouse = { x: -9999, y: -9999 };
  const COLORS = ["139,92,246", "34,211,238", "245,158,11", "244,114,182"];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.width = innerWidth * dpr;
    H = cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + "px";
    cv.style.height = innerHeight + "px";
    const n = Math.round(Math.min(90, (innerWidth * innerHeight) / 16000));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35 * dpr, vy: (Math.random() - 0.5) * 0.35 * dpr,
      r: (Math.random() * 1.6 + 0.6) * dpr,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const LINK = 130 * dpr;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      const mdx = p.x - mouse.x * dpr, mdy = p.y - mouse.y * dpr, md = Math.hypot(mdx, mdy);
      if (md < 140 * dpr) { p.x += (mdx / md) * 0.8; p.y += (mdy / md) * 0.8; }
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j], d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(${p.c},${(1 - d / LINK) * 0.22})`;
          ctx.lineWidth = dpr * 0.8;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      ctx.fillStyle = `rgba(${p.c},0.85)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    if (!reduce) requestAnimationFrame(draw);
  }
  resize(); draw();
  addEventListener("resize", resize);

  /* ---------- cursor glow + spotlight ---------- */
  const glow = document.querySelector(".cursor-glow");
  addEventListener("pointermove", (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    glow.style.left = e.clientX + "px"; glow.style.top = e.clientY + "px";
  });
  document.querySelectorAll(".pillar").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });

  /* ---------- rotating word ---------- */
  const words = ["AI systems", "data platforms", "automations", "multi-agent bots", "clear decisions"];
  const rot = document.getElementById("rot");
  let wi = 0;
  if (!reduce) setInterval(() => {
    rot.classList.add("out");
    setTimeout(() => { wi = (wi + 1) % words.length; rot.textContent = words[wi]; rot.classList.remove("out"); }, 350);
  }, 2400);

  /* ---------- reveal + counters ---------- */
  const fmt = (n) => n.toLocaleString("en-US");
  function count(el) {
    const end = +el.dataset.count, pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
    if (reduce) { el.textContent = pre + fmt(end) + suf; return; }
    const t0 = performance.now(), dur = 1600;
    (function tick(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = pre + fmt(Math.round(end * e)) + suf;
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      en.target.querySelectorAll("[data-count]").forEach(count);
      if (en.target.matches("[data-count]")) count(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 70 + "ms";
    io.observe(el);
  });

  /* ---------- Audiocular PEQ demo ---------- */
  const SW = 600, SH = 240, DB = 12, FMIN = 20, FMAX = 20000;
  const xOf = (f) => (Math.log10(f / FMIN) / Math.log10(FMAX / FMIN)) * SW;
  const yOf = (g) => SH / 2 - (g / DB) * (SH / 2 - 14);
  const bands = [
    { el: "sb", out: "vb", fc: 70, w: 1.4 },
    { el: "sm", out: "vm", fc: 1000, w: 1.5 },
    { el: "st", out: "vt", fc: 9000, w: 1.3 },
  ];
  const grid = document.getElementById("eqGrid");
  let g = "";
  [100, 1000, 10000].forEach((f) => (g += `<line x1="${xOf(f)}" x2="${xOf(f)}" y1="0" y2="${SH}" stroke="rgba(255,255,255,.07)"/>`));
  [-6, 0, 6].forEach((d) => (g += `<line x1="0" x2="${SW}" y1="${yOf(d)}" y2="${yOf(d)}" stroke="rgba(255,255,255,${d === 0 ? 0.16 : 0.07})" ${d === 0 ? "" : 'stroke-dasharray="4 6"'}/>`));
  grid.innerHTML = g;

  const current = [0, 0, 0];
  let target = [0, 0, 0];
  function curve(gains) {
    let d = "";
    for (let i = 0; i <= 160; i++) {
      const f = FMIN * Math.pow(FMAX / FMIN, i / 160);
      let gain = 0;
      bands.forEach((b, k) => { const o = Math.log2(f / b.fc); gain += gains[k] * Math.exp(-(o * o) / (2 * b.w * b.w)); });
      gain = Math.max(-DB, Math.min(DB, gain));
      d += (i ? "L" : "M") + xOf(f).toFixed(1) + " " + yOf(gain).toFixed(1);
    }
    return d;
  }
  const line = document.getElementById("eqLine"), area = document.getElementById("eqArea");
  function render() {
    const d = curve(current);
    line.setAttribute("d", d);
    area.setAttribute("d", d + `L${SW} ${SH} L0 ${SH} Z`);
  }
  function animateTo() {
    let moving = false;
    for (let k = 0; k < 3; k++) {
      const diff = target[k] - current[k];
      if (Math.abs(diff) > 0.02) { current[k] += diff * (reduce ? 1 : 0.14); moving = true; } else current[k] = target[k];
    }
    render();
    if (moving) requestAnimationFrame(animateTo);
  }
  function setTarget(vals, fromSlider) {
    target = vals.slice();
    bands.forEach((b, k) => {
      const s = document.getElementById(b.el);
      if (!fromSlider) s.value = vals[k];
      document.getElementById(b.out).textContent = (vals[k] > 0 ? "+" : "") + vals[k] + " dB";
    });
    requestAnimationFrame(animateTo);
  }
  bands.forEach((b) => {
    document.getElementById(b.el).addEventListener("input", () => {
      document.querySelectorAll(".presets button").forEach((x) => x.classList.remove("on"));
      setTarget(bands.map((bb) => +document.getElementById(bb.el).value), true);
    });
  });
  const PRESETS = { flat: [0, 0, 0], v: [7, -4, 6], vocal: [-3, 5, 1.5], ears: [2, 1, 8.5] };
  document.querySelectorAll(".presets button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".presets button").forEach((x) => x.classList.remove("on"));
      btn.classList.add("on");
      setTarget(PRESETS[btn.dataset.preset]);
    });
  });
  render();
  // Gentle demo on first view
  const eqCard = document.querySelector(".eq-card");
  const eqIO = new IntersectionObserver((en) => {
    if (en[0].isIntersecting) {
      eqIO.disconnect();
      if (!reduce) setTimeout(() => document.querySelector('[data-preset="ears"]').click(), 600);
    }
  }, { threshold: 0.5 });
  eqIO.observe(eqCard);
})();
