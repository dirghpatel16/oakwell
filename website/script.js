/* =============================================
   OAKWELL — Interactive Scripts
   Institutional AGI micro-interactions
   ============================================= */

// ── Cursor Glow ──
const cursorGlow = document.getElementById('cursorGlow');
let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
function animateCursor() {
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    if (cursorGlow) { cursorGlow.style.left = glowX + 'px'; cursorGlow.style.top = glowY + 'px'; }
    requestAnimationFrame(animateCursor);
}
animateCursor();

// ── Nav scroll state ──
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 20) { nav.classList.add('bg-[#030712]/90', 'shadow-[0_1px_0_rgba(255,255,255,0.04)]'); }
    else { nav.classList.remove('bg-[#030712]/90', 'shadow-[0_1px_0_rgba(255,255,255,0.04)]'); }
}, { passive: true });

// ── Scroll Reveal ──
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const parent = entry.target.parentElement;
            const siblings = parent ? Array.from(parent.querySelectorAll('.reveal')) : [];
            const idx = siblings.indexOf(entry.target);
            setTimeout(() => entry.target.classList.add('active'), Math.min((idx >= 0 ? idx : 0) * 60, 400));
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── Animated Counters ──
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.dataset.target);
            const start = performance.now();
            function tick(now) {
                const p = Math.min((now - start) / 1200, 1);
                el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
                if (p < 1) requestAnimationFrame(tick); else el.textContent = target;
            }
            requestAnimationFrame(tick);
            counterObserver.unobserve(el);
        }
    });
}, { threshold: 0.5 });
document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

// ── Terminal Animation ──
const terminalLines = [
    { t: 'prompt', s: '$ oakwell analyze --transcript call_032.txt --competitor hubspot.com' },
    { t: 'blank' },
    { t: 'info', s: '  ▸ Extracting claims from transcript...' },
    { t: 'info', s: '  ▸ Launching stealth browser — Playwright headless...' },
    { t: 'info', s: '  ▸ Capturing visual receipt: hubspot.com/pricing/sales' },
    { t: 'ok', s: '  ✓ Visual receipt captured — proof_hubspot_1709412847.png' },
    { t: 'blank' },
    { t: 'dim', s: '  ── Multimodal Audit: verifying 10 claims against visual proof ──' },
    { t: 'err', s: '  ✗ DISPROVEN  "Starter plan $20/mo" → Receipt shows $30/mo' },
    { t: 'err', s: '  ✗ DISPROVEN  "Free CRM includes reporting" → Gated: paid only' },
    { t: 'ok', s: '  ✓ VERIFIED   "Enterprise plan includes SSO"' },
    { t: 'ok', s: '  ✓ VERIFIED   "14-day free trial available"' },
    { t: 'blank' },
    { t: 'warn', s: '  ⚠ 2 Critical Revenue Risks — Information Asymmetry detected' },
    { t: 'info', s: '  ▸ Scanning Reddit, G2, X, SEC, Glassdoor...' },
    { t: 'info', s: '  ▸ War-gaming strategy as competitor CEO...' },
    { t: 'err', s: '  ✗ REJECTED — Strategy lacks Autonomous Strategic Guardrails' },
    { t: 'ok', s: '  ✓ Auto-hardened with kill-shot visual proof' },
    { t: 'blank' },
    { t: 'dim', s: '  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' },
    { t: 'ok', s: '  Deal Health: 42/100 (Critical Risk)' },
    { t: 'ok', s: '  Verified Revenue Event: margin_protection_active' },
    { t: 'ok', s: '  Proof: proof_hubspot_1709412847.png' },
    { t: 'ok', s: '  Slack alert dispatched ✓' },
    { t: 'dim', s: '  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' },
];
const colors = { ok: '#22c55e', err: '#ef4444', warn: '#f59e0b', info: '#3b82f6', dim: '#3f3f46', prompt: '#22c55e' };
const terminalEl = document.getElementById('terminal');
let lineIdx = 0, termStarted = false;

function addLine() {
    if (!terminalEl || lineIdx >= terminalLines.length) return;
    const l = terminalLines[lineIdx];
    const div = document.createElement('div');
    div.classList.add('terminal-line');
    if (l.t === 'prompt') {
        div.innerHTML = `<span style="color:#22c55e">$</span> <span style="color:#fafafa;font-weight:500">${l.s.slice(2)}</span>`;
    } else if (l.t === 'blank') {
        div.innerHTML = '&nbsp;'; div.style.opacity = '1'; div.style.transform = 'none'; div.style.animation = 'none';
    } else {
        div.innerHTML = `<span style="color:${colors[l.t]}">${l.s}</span>`;
    }
    div.style.animationDelay = `${lineIdx * 0.04}s`;
    terminalEl.appendChild(div);
    terminalEl.scrollTop = terminalEl.scrollHeight;
    lineIdx++;
    setTimeout(addLine, l.t === 'prompt' ? 900 : l.t === 'blank' ? 150 : l.t === 'err' ? 300 : 180);
}

const termObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting && !termStarted) { termStarted = true; setTimeout(addLine, 600); termObs.unobserve(e.target); } });
}, { threshold: 0.2 });
const termCard = document.querySelector('#terminal');
if (termCard) termObs.observe(termCard.closest('div'));

// ── Truth Decay Chart (Canvas) ──
function drawTruthDecayChart() {
    const canvas = document.getElementById('truthDecayChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 260 * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = 260;

    // Data: 30 days of "truth score" declining with some noise
    const data = [];
    let val = 92;
    for (let i = 0; i < 30; i++) {
        val -= (Math.random() * 3 + 0.5);
        if (val < 55) val = 55 + Math.random() * 5;
        data.push(Math.round(val * 10) / 10);
    }
    // Force last point near 61 for "34% decay"
    data[29] = 61.2;

    const padL = 45, padR = 20, padT = 20, padB = 35;
    const chartW = W - padL - padR, chartH = H - padT - padB;
    const minY = 50, maxY = 100;

    function xPos(i) { return padL + (i / (data.length - 1)) * chartW; }
    function yPos(v) { return padT + (1 - (v - minY) / (maxY - minY)) * chartH; }

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let v = 50; v <= 100; v += 10) {
        const y = yPos(v);
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
        ctx.fillStyle = '#52525b'; ctx.font = '10px JetBrains Mono, monospace'; ctx.textAlign = 'right';
        ctx.fillText(v.toString(), padL - 8, y + 3);
    }

    // X axis labels (every 5 days)
    ctx.fillStyle = '#52525b'; ctx.font = '10px JetBrains Mono, monospace'; ctx.textAlign = 'center';
    for (let i = 0; i < 30; i += 5) {
        ctx.fillText(`D-${30 - i}`, xPos(i), H - 8);
    }
    ctx.fillText('Now', xPos(29), H - 8);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    grad.addColorStop(0, 'rgba(239,68,68,0.12)');
    grad.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(data[0]));
    for (let i = 1; i < data.length; i++) {
        const cx = (xPos(i - 1) + xPos(i)) / 2;
        ctx.bezierCurveTo(cx, yPos(data[i - 1]), cx, yPos(data[i]), xPos(i), yPos(data[i]));
    }
    ctx.lineTo(xPos(data.length - 1), padT + chartH);
    ctx.lineTo(xPos(0), padT + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(data[0]));
    for (let i = 1; i < data.length; i++) {
        const cx = (xPos(i - 1) + xPos(i)) / 2;
        ctx.bezierCurveTo(cx, yPos(data[i - 1]), cx, yPos(data[i]), xPos(i), yPos(data[i]));
    }
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    // End dot
    ctx.beginPath();
    ctx.arc(xPos(29), yPos(data[29]), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(xPos(29), yPos(data[29]), 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239,68,68,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label at end
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 12px JetBrains Mono, monospace'; ctx.textAlign = 'left';
    ctx.fillText(`${data[29]}%`, xPos(29) + 14, yPos(data[29]) + 4);
}

const chartObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { drawTruthDecayChart(); chartObs.unobserve(e.target); } });
}, { threshold: 0.3 });
const chartCanvas = document.getElementById('truthDecayChart');
if (chartCanvas) chartObs.observe(chartCanvas);
window.addEventListener('resize', () => { if (chartCanvas && chartCanvas.classList.contains('drawn')) drawTruthDecayChart(); });

// ── Sentinel Countdown ──
const countdownEl = document.getElementById('sentinel-countdown');
if (countdownEl) {
    let secs = 42;
    setInterval(() => {
        secs = secs <= 0 ? 60 : secs - 1;
        const m = String(Math.floor(secs / 60)).padStart(2, '0');
        const s = String(secs % 60).padStart(2, '0');
        countdownEl.textContent = `${m}:${s}`;
    }, 1000);
}

// ── Smooth scroll for anchor links ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
        const t = document.querySelector(this.getAttribute('href'));
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
});
