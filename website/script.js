/* =============================================
   OAKWELL — Interactive Scripts
   Clean, performant, Apollo-grade.
   ============================================= */

// ── Nav scroll ──
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        nav.style.background = 'rgba(3,7,18,0.92)';
        nav.style.backdropFilter = 'blur(16px)';
        nav.style.borderColor = 'rgba(255,255,255,0.04)';
    } else {
        nav.style.background = 'transparent';
        nav.style.backdropFilter = 'none';
        nav.style.borderColor = 'transparent';
    }
}, { passive: true });

// ── Scroll Reveal ──
const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const parent = entry.target.parentElement;
            const siblings = parent ? Array.from(parent.querySelectorAll('.reveal')) : [];
            const idx = siblings.indexOf(entry.target);
            setTimeout(() => entry.target.classList.add('active'), Math.min((idx >= 0 ? idx : 0) * 50, 300));
            revealObs.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

// ── Animated Counters ──
const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.dataset.target);
            const start = performance.now();
            const duration = 1000;
            function tick(now) {
                const p = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.round(eased * target);
                if (p < 1) requestAnimationFrame(tick);
                else el.textContent = target;
            }
            requestAnimationFrame(tick);
            counterObs.unobserve(el);
        }
    });
}, { threshold: 0.5 });
document.querySelectorAll('[data-target]').forEach(el => counterObs.observe(el));

// ── Feature Tabs ──
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabPanels.forEach(p => {
            if (p.dataset.panel === tab) {
                p.classList.remove('hidden');
                p.classList.add('active');
            } else {
                p.classList.add('hidden');
                p.classList.remove('active');
            }
        });

        // Draw chart if sentinel tab is activated
        if (tab === 'sentinel') {
            setTimeout(drawTruthDecayChart, 100);
        }
    });
});

// ── FAQ Accordion ──
document.querySelectorAll('.faq-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const answer = item.querySelector('.faq-answer');
        const icon = btn.querySelector('.faq-icon');
        const isOpen = !answer.classList.contains('hidden');

        // Close all
        document.querySelectorAll('.faq-answer').forEach(a => a.classList.add('hidden'));
        document.querySelectorAll('.faq-icon').forEach(i => i.classList.remove('rotated'));

        // Toggle current
        if (!isOpen) {
            answer.classList.remove('hidden');
            icon.classList.add('rotated');
        }
    });
});

// ── Terminal Animation ──
const terminalLines = [
    { t: 'prompt', s: '$ oakwell analyze --transcript call_032.txt --competitor hubspot.com' },
    { t: 'blank' },
    { t: 'info', s: '  ▸ Extracting claims from transcript...' },
    { t: 'info', s: '  ▸ Launching stealth browser — Playwright headless...' },
    { t: 'info', s: '  ▸ Capturing visual receipt: hubspot.com/pricing/sales' },
    { t: 'ok', s: '  ✓ Visual receipt captured — proof_hubspot_1709412847.png' },
    { t: 'blank' },
    { t: 'dim', s: '  ── Multimodal Audit ──' },
    { t: 'err', s: '  ✗ DISPROVEN  "Starter plan $20/mo" → Screenshot shows $30/mo' },
    { t: 'err', s: '  ✗ DISPROVEN  "Free CRM includes reporting" → Gated: paid only' },
    { t: 'ok', s: '  ✓ VERIFIED   "Enterprise plan includes SSO"' },
    { t: 'ok', s: '  ✓ VERIFIED   "14-day free trial available"' },
    { t: 'blank' },
    { t: 'warn', s: '  ⚠ 2 Critical Revenue Risks detected' },
    { t: 'info', s: '  ▸ War-gaming strategy as competitor CEO...' },
    { t: 'ok', s: '  ✓ Auto-hardened with kill-shot visual proof' },
    { t: 'blank' },
    { t: 'ok', s: '  Deal Health: 42/100 (Critical Risk)' },
    { t: 'ok', s: '  Slack alert dispatched ✓' },
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
        div.innerHTML = '&nbsp;';
        div.style.opacity = '1';
        div.style.transform = 'none';
        div.style.animation = 'none';
    } else {
        div.innerHTML = `<span style="color:${colors[l.t]}">${l.s}</span>`;
    }
    div.style.animationDelay = `${lineIdx * 0.03}s`;
    terminalEl.appendChild(div);
    terminalEl.scrollTop = terminalEl.scrollHeight;
    lineIdx++;
    setTimeout(addLine, l.t === 'prompt' ? 800 : l.t === 'blank' ? 120 : l.t === 'err' ? 280 : 160);
}

const termObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting && !termStarted) {
            termStarted = true;
            setTimeout(addLine, 500);
            termObs.unobserve(e.target);
        }
    });
}, { threshold: 0.2 });
if (terminalEl) {
    const termParent = terminalEl.closest('div');
    if (termParent) termObs.observe(termParent);
}

// ── Truth Decay Chart ──
function drawTruthDecayChart() {
    const canvas = document.getElementById('truthDecayChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 180 * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = 180;

    const data = [];
    let val = 92;
    for (let i = 0; i < 30; i++) {
        val -= (Math.random() * 3 + 0.5);
        if (val < 55) val = 55 + Math.random() * 5;
        data.push(Math.round(val * 10) / 10);
    }
    data[29] = 61.2;

    const padL = 40, padR = 15, padT = 15, padB = 25;
    const chartW = W - padL - padR, chartH = H - padT - padB;
    const minY = 50, maxY = 100;

    function xPos(i) { return padL + (i / (data.length - 1)) * chartW; }
    function yPos(v) { return padT + (1 - (v - minY) / (maxY - minY)) * chartH; }

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let v = 50; v <= 100; v += 10) {
        const y = yPos(v);
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
        ctx.fillStyle = '#52525b'; ctx.font = '10px JetBrains Mono, monospace'; ctx.textAlign = 'right';
        ctx.fillText(v.toString(), padL - 6, y + 3);
    }

    // X labels
    ctx.fillStyle = '#52525b'; ctx.font = '10px JetBrains Mono, monospace'; ctx.textAlign = 'center';
    for (let i = 0; i < 30; i += 7) { ctx.fillText(`D-${30 - i}`, xPos(i), H - 5); }
    ctx.fillText('Now', xPos(29), H - 5);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    grad.addColorStop(0, 'rgba(239,68,68,0.1)');
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

    // Label
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 11px JetBrains Mono, monospace'; ctx.textAlign = 'left';
    ctx.fillText(`${data[29]}%`, xPos(29) + 10, yPos(data[29]) + 4);
}

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

// ── Smooth scroll ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
        const t = document.querySelector(this.getAttribute('href'));
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
});
