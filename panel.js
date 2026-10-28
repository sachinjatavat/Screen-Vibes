const $ = (id) => document.getElementById(id);
let s = null;

const PRESETS = [
  { name: 'Neon',    c1: '#00f5ff', c2: '#ff00e5' },
  { name: 'Sunset',  c1: '#ff512f', c2: '#f9d423' },
  { name: 'Ocean',   c1: '#00c6ff', c2: '#0050ff' },
  { name: 'Matrix',  c1: '#00ff41', c2: '#006b1b' },
  { name: 'Purple',  c1: '#8e2de2', c2: '#ff6ec4' },
  { name: 'Fire',    c1: '#ff0000', c2: '#ff9900' },
  { name: 'Aurora',  c1: '#00f2fe', c2: '#4facfe' },
  { name: 'Rainbow', c1: '#ff007f', c2: '#00f5ff', isRainbow: true },
];

function updateColorPickerVisibility() {
  const mode = s.waveColorMode || 'rainbow';
  const rowHead = $('row-wave-head');
  const rowC1 = $('row-wave-c1');
  const rowC2 = $('row-wave-c2');
  const lblC1 = $('label-wave-c1');
  const lblC2 = $('label-wave-c2');

  if (mode === 'rainbow') {
    rowHead.style.display = 'none';
    rowC1.style.display = 'none';
    rowC2.style.display = 'none';
  } else if (mode === 'solid') {
    rowHead.style.display = 'none';
    rowC1.style.display = 'flex';
    rowC2.style.display = 'none';
    lblC1.textContent = 'Solid Wave Color';
  } else if (mode === 'gradient') {
    rowHead.style.display = 'none';
    rowC1.style.display = 'flex';
    rowC2.style.display = 'flex';
    lblC1.textContent = 'Start Color (Head)';
    lblC2.textContent = 'End Color (Trail)';
  } else if (mode === 'head-trail') {
    rowHead.style.display = 'flex';
    rowC1.style.display = 'flex';
    rowC2.style.display = 'flex';
    lblC1.textContent = 'Trail Color 1';
    lblC2.textContent = 'Trail Color 2';
  } else if (mode === 'sync') {
    rowHead.style.display = 'none';
    rowC1.style.display = 'none';
    rowC2.style.display = 'none';
  }
}

function render() {
  if (!s) return;

  // Status indicator
  const isRunning = s.waveEnabled !== false;
  $('status-text').textContent = isRunning ? 'Wave Running' : 'Wave Paused';
  $('status-pill').style.color = isRunning ? '#0284c7' : '#64748b';
  $('status-pill').style.borderColor = isRunning ? '#b0bcd0' : '#cbd5e1';
  const dot = $('status-pill').querySelector('.status-dot');
  if (dot) {
    dot.style.background = isRunning ? '#10b981' : '#94a3b8';
    dot.style.boxShadow = isRunning ? '0 0 8px #10b981' : 'none';
  }

  // Wave controls
  $('waveEnabled').checked = isRunning;
  $('waveSpeed').value = s.waveSpeed || 1.0;
  $('waveSpeedVal').textContent = (s.waveSpeed || 1.0).toFixed(1) + 'x';

  $('waveLength').value = s.waveLength || 0.35;
  $('waveLengthVal').textContent = Math.round((s.waveLength || 0.35) * 100) + '%';

  $('waveGlow').value = s.waveGlow !== undefined ? s.waveGlow : 1.0;
  $('waveGlowVal').textContent = Math.round((s.waveGlow !== undefined ? s.waveGlow : 1.0) * 100) + '%';

  $('waveThickness').value = s.waveThickness || 18;
  $('waveThicknessVal').textContent = Math.round(s.waveThickness || 18) + 'px';

  $('waveColorMode').value = s.waveColorMode || 'rainbow';
  $('waveHeadColor').value = s.waveHeadColor || '#ffffff';
  $('waveColor1').value = s.waveColor1 || s.color1 || '#00f5ff';
  $('waveColor2').value = s.waveColor2 || s.color2 || '#ff00e5';

  // Direction buttons active state: Clockwise, Anticlockwise, Dual Waves
  const dir = s.waveDirection || 'cw';
  $('btn-cw').classList.toggle('active', dir === 'cw');
  $('btn-ccw').classList.toggle('active', dir === 'ccw');
  $('btn-dual').classList.toggle('active', dir === 'dual');

  // Audio controls
  $('mode').value = s.mode || 'bars';
  $('color1').value = s.color1 || '#00f5ff';
  $('color2').value = s.color2 || '#ff00e5';
  $('rainbow').checked = !!s.rainbow;

  $('sensitivity').value = s.sensitivity || 1.3;
  $('sensitivityVal').textContent = (s.sensitivity || 1.3).toFixed(2);

  $('thickness').value = s.thickness || 140;
  $('thicknessVal').textContent = Math.round(s.thickness || 140) + 'px';

  $('smoothing').value = s.smoothing !== undefined ? s.smoothing : 0.7;
  $('smoothingVal').textContent = (s.smoothing !== undefined ? s.smoothing : 0.7).toFixed(2);

  const edges = s.edges || { top: true, bottom: true, left: true, right: true };
  for (const e of ['top', 'bottom', 'left', 'right']) {
    const el = $('edge-' + e);
    if (el) el.checked = !!edges[e];
  }

  // Display mode & Autostart
  if ($('displayMode')) {
    $('displayMode').value = s.displayMode || 'all';
  }
  if ($('autoStart')) {
    $('autoStart').checked = !!s.autoStart;
  }

  updateColorPickerVisibility();
}

const push = () => {
  if (s && window.vibe) window.vibe.set(s);
};

// ==========================================
// Mini Screen Live Visual Preview
// ==========================================
const prevCanvas = $('previewCanvas');
const prevCtx = prevCanvas.getContext('2d');
let previewHeadU1 = 0;   // Wave 1
let previewHeadU2 = 0.5; // Wave 2 (opposite direction)
let prevLastTime = performance.now();

function hex2rgb(h) {
  if (!h || typeof h !== 'string' || h[0] !== '#') return [0, 245, 255];
  let hex = h.slice(1);
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const n = parseInt(hex, 16);
  if (isNaN(n)) return [0, 245, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hsl2rgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

function lerpColor(c1, c2, t) {
  const clampT = Math.max(0, Math.min(1, t));
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * clampT),
    Math.round(c1[1] + (c2[1] - c1[1]) * clampT),
    Math.round(c1[2] + (c2[2] - c1[2]) * clampT),
  ];
}

const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`;

function getPrevPerimeterPoint(u, W, H) {
  const P = 2 * (W + H);
  let sVal = ((u % 1) + 1) % 1 * P;

  if (sVal < W) {
    return { x: Math.max(0, Math.min(W, sVal)), y: 0, edge: 0 };
  } else if (sVal < W + H) {
    return { x: W, y: Math.max(0, Math.min(H, sVal - W)), edge: 1 };
  } else if (sVal < 2 * W + H) {
    return { x: Math.max(0, Math.min(W, 2 * W + H - sVal)), y: H, edge: 2 };
  } else {
    return { x: 0, y: Math.max(0, Math.min(H, P - sVal)), edge: 3 };
  }
}

function getPrevCorner(edgeA, edgeB, W, H) {
  if ((edgeA === 0 && edgeB === 1) || (edgeA === 1 && edgeB === 0)) return { x: W, y: 0 };
  if ((edgeA === 1 && edgeB === 2) || (edgeA === 2 && edgeB === 1)) return { x: W, y: H };
  if ((edgeA === 2 && edgeB === 3) || (edgeA === 3 && edgeB === 2)) return { x: 0, y: H };
  if ((edgeA === 3 && edgeB === 0) || (edgeA === 0 && edgeB === 3)) return { x: 0, y: 0 };
  return null;
}

function getPrevWaveColor(p, u, now, waveIndex = 0) {
  if (!s) return [0, 245, 255];
  const mode = s.waveColorMode || 'rainbow';

  if (mode === 'rainbow') {
    const hueOffset = waveIndex === 1 ? 180 : 0;
    const hue = ((u * 360) + (now * 0.05) + hueOffset) % 360;
    return hsl2rgb(hue < 0 ? hue + 360 : hue, 1.0, 0.55);
  }
  if (mode === 'gradient') {
    const c1 = hex2rgb(s.waveColor1 || s.color1 || '#00f5ff');
    const c2 = hex2rgb(s.waveColor2 || s.color2 || '#ff00e5');
    return waveIndex === 1 ? lerpColor(c2, c1, p) : lerpColor(c1, c2, p);
  }
  if (mode === 'head-trail') {
    const cHead = hex2rgb(s.waveHeadColor || '#ffffff');
    const cTrail1 = hex2rgb(waveIndex === 1 ? (s.waveColor2 || '#ff00e5') : (s.waveColor1 || '#00f5ff'));
    const cTrail2 = hex2rgb(waveIndex === 1 ? (s.waveColor1 || '#00f5ff') : (s.waveColor2 || '#ff00e5'));
    if (p < 0.15) return lerpColor(cHead, cTrail1, p / 0.15);
    return lerpColor(cTrail1, cTrail2, (p - 0.15) / 0.85);
  }
  if (mode === 'solid') {
    if (waveIndex === 1 && s.waveColor2) return hex2rgb(s.waveColor2);
    return hex2rgb(s.waveColor1 || '#00f5ff');
  }
  if (mode === 'sync') {
    if (s.rainbow) {
      const hueOffset = waveIndex === 1 ? 180 : 0;
      const hue = ((u * 360) + (now * 0.05) + hueOffset) % 360;
      return hsl2rgb(hue < 0 ? hue + 360 : hue, 1.0, 0.55);
    }
    const c1 = hex2rgb(s.color1 || '#00f5ff');
    const c2 = hex2rgb(s.color2 || '#ff00e5');
    return waveIndex === 1 ? lerpColor(c2, c1, p) : lerpColor(c1, c2, p);
  }
  return hex2rgb(s.waveColor1 || '#00f5ff');
}

function drawMiniWave(now, headU, dirSign, waveIndex, W, H) {
  const glowMul = s.waveGlow !== undefined ? s.waveGlow : 1.0;
  const trailLen = Math.max(0.1, Math.min(0.85, s.waveLength || 0.35));
  const STEPS = 50;
  const vertices = [];

  for (let i = STEPS; i >= 0; i--) {
    const p = i / STEPS;
    let u = (headU - dirSign * (p * trailLen)) % 1;
    if (u < 0) u += 1;

    const pt = getPrevPerimeterPoint(u, W, H);
    pt.p = p;
    pt.u = u;
    pt.color = getPrevWaveColor(p, u, now, waveIndex);
    pt.alpha = Math.pow(1 - p, 1.6) * glowMul;

    if (vertices.length > 0) {
      const prev = vertices[vertices.length - 1];
      if (prev.edge !== pt.edge) {
        const c = getPrevCorner(prev.edge, pt.edge, W, H);
        if (c) {
          vertices.push({
            x: c.x, y: c.y, edge: pt.edge,
            p: p, u: u, color: pt.color, alpha: pt.alpha,
          });
        }
      }
    }
    vertices.push(pt);
  }

  if (vertices.length < 2) return;

  // Mini glow stroke
  prevCtx.save();
  prevCtx.lineJoin = 'round';
  prevCtx.lineCap = 'round';
  prevCtx.shadowBlur = Math.round(10 * glowMul);

  for (let i = 1; i < vertices.length; i++) {
    const p1 = vertices[i - 1];
    const p2 = vertices[i];
    prevCtx.beginPath();
    prevCtx.moveTo(p1.x, p1.y);
    prevCtx.lineTo(p2.x, p2.y);
    prevCtx.strokeStyle = css(p2.color, p2.alpha * 0.85);
    prevCtx.shadowColor = css(p2.color, p2.alpha);
    prevCtx.lineWidth = 4;
    prevCtx.stroke();
  }
  prevCtx.restore();

  // Mini head flare
  const head = vertices[vertices.length - 1];
  prevCtx.save();
  const rad = 12 * glowMul;
  const hg = prevCtx.createRadialGradient(head.x, head.y, 0, head.x, head.y, rad);
  hg.addColorStop(0, '#ffffff');
  hg.addColorStop(0.3, css(head.color, 0.9));
  hg.addColorStop(1, css(head.color, 0));
  prevCtx.fillStyle = hg;
  prevCtx.beginPath();
  prevCtx.arc(head.x, head.y, rad, 0, Math.PI * 2);
  prevCtx.fill();
  prevCtx.restore();
}

function drawPreview(now) {
  requestAnimationFrame(drawPreview);
  const dt = Math.min((now - prevLastTime) / 1000, 0.1);
  prevLastTime = now;

  const W = prevCanvas.width;
  const H = prevCanvas.height;

  // Clear preview with clay-styled screen background
  prevCtx.fillStyle = '#0a0a14';
  prevCtx.fillRect(0, 0, W, H);

  // Subtle interior grid
  prevCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  prevCtx.lineWidth = 1;
  for (let x = 20; x < W; x += 20) {
    prevCtx.beginPath(); prevCtx.moveTo(x, 0); prevCtx.lineTo(x, H); prevCtx.stroke();
  }
  for (let y = 20; y < H; y += 20) {
    prevCtx.beginPath(); prevCtx.moveTo(0, y); prevCtx.lineTo(W, y); prevCtx.stroke();
  }

  if (!s || s.waveEnabled === false) {
    prevCtx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    prevCtx.font = '11px system-ui, sans-serif';
    prevCtx.textAlign = 'center';
    prevCtx.fillText('Light Wave Disabled', W / 2, H / 2 + 4);
    $('previewBadge').textContent = '○ Disabled';
    return;
  }

  const dir = s.waveDirection || 'cw';
  const speed = (s.waveSpeed || 1.0) * 0.15;

  if (dir === 'dual') {
    // Both waves moving in opposite directions, intersecting & crossing
    previewHeadU1 = (previewHeadU1 + speed * dt) % 1;
    if (previewHeadU1 < 0) previewHeadU1 += 1;

    previewHeadU2 = (previewHeadU2 - speed * dt) % 1;
    if (previewHeadU2 < 0) previewHeadU2 += 1;

    $('previewBadge').textContent = `⇄ DUAL ${(s.waveSpeed || 1.0).toFixed(1)}x`;
    drawMiniWave(now, previewHeadU1, 1, 0, W, H);
    drawMiniWave(now, previewHeadU2, -1, 1, W, H);
  } else if (dir === 'ccw') {
    previewHeadU1 = (previewHeadU1 - speed * dt) % 1;
    if (previewHeadU1 < 0) previewHeadU1 += 1;
    $('previewBadge').textContent = `↺ CCW ${(s.waveSpeed || 1.0).toFixed(1)}x`;
    drawMiniWave(now, previewHeadU1, -1, 0, W, H);
  } else {
    previewHeadU1 = (previewHeadU1 + speed * dt) % 1;
    if (previewHeadU1 < 0) previewHeadU1 += 1;
    $('previewBadge').textContent = `↻ CW ${(s.waveSpeed || 1.0).toFixed(1)}x`;
    drawMiniWave(now, previewHeadU1, 1, 0, W, H);
  }
}
requestAnimationFrame(drawPreview);

// ==========================================
// Initialization and Event Listeners
// ==========================================
(async () => {
  s = await window.vibe.get();
  render();

  if (window.vibe.onChange) {
    window.vibe.onChange((newS) => {
      s = newS;
      render();
    });
  }

  // Populate Presets
  PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.className = 'preset';
    b.textContent = p.name;
    if (p.isRainbow) {
      b.style.background = 'linear-gradient(135deg, #ff0055, #ffaa00, #00ff66, #00f5ff, #aa00ff)';
    } else {
      b.style.background = `linear-gradient(135deg, ${p.c1}, ${p.c2})`;
    }
    b.onclick = () => {
      if (p.isRainbow) {
        s.waveColorMode = 'rainbow';
        s.rainbow = true;
      } else {
        s.color1 = p.c1;
        s.color2 = p.c2;
        s.waveColor1 = p.c1;
        s.waveColor2 = p.c2;
        s.rainbow = false;
        if (s.waveColorMode === 'rainbow') s.waveColorMode = 'gradient';
      }
      render();
      push();
    };
    $('presets').appendChild(b);
  });

  // Direction Buttons: Clockwise, Anticlockwise, and Dual Waves
  $('btn-cw').onclick = () => {
    s.waveDirection = 'cw';
    render();
    push();
  };

  $('btn-ccw').onclick = () => {
    s.waveDirection = 'ccw';
    render();
    push();
  };

  $('btn-dual').onclick = () => {
    s.waveDirection = 'dual';
    render();
    push();
  };

  // Wave Master Toggle
  $('waveEnabled').onchange = (e) => {
    s.waveEnabled = e.target.checked;
    render();
    push();
  };

  // Wave Sliders
  $('waveSpeed').oninput = (e) => {
    s.waveSpeed = parseFloat(e.target.value);
    $('waveSpeedVal').textContent = s.waveSpeed.toFixed(1) + 'x';
    push();
  };

  $('waveLength').oninput = (e) => {
    s.waveLength = parseFloat(e.target.value);
    $('waveLengthVal').textContent = Math.round(s.waveLength * 100) + '%';
    push();
  };

  $('waveGlow').oninput = (e) => {
    s.waveGlow = parseFloat(e.target.value);
    $('waveGlowVal').textContent = Math.round(s.waveGlow * 100) + '%';
    push();
  };

  $('waveThickness').oninput = (e) => {
    s.waveThickness = parseFloat(e.target.value);
    $('waveThicknessVal').textContent = Math.round(s.waveThickness) + 'px';
    push();
  };

  // Wave Colors
  $('waveColorMode').onchange = (e) => {
    s.waveColorMode = e.target.value;
    updateColorPickerVisibility();
    push();
  };

  $('waveHeadColor').oninput = (e) => {
    s.waveHeadColor = e.target.value;
    push();
  };

  $('waveColor1').oninput = (e) => {
    s.waveColor1 = e.target.value;
    push();
  };

  $('waveColor2').oninput = (e) => {
    s.waveColor2 = e.target.value;
    push();
  };

  // Audio Controls
  $('mode').onchange = (e) => {
    s.mode = e.target.value;
    push();
  };

  $('color1').oninput = (e) => {
    s.color1 = e.target.value;
    s.rainbow = false;
    $('rainbow').checked = false;
    push();
  };

  $('color2').oninput = (e) => {
    s.color2 = e.target.value;
    s.rainbow = false;
    $('rainbow').checked = false;
    push();
  };

  $('rainbow').onchange = (e) => {
    s.rainbow = e.target.checked;
    push();
  };

  $('sensitivity').oninput = (e) => {
    s.sensitivity = parseFloat(e.target.value);
    $('sensitivityVal').textContent = s.sensitivity.toFixed(2);
    push();
  };

  $('thickness').oninput = (e) => {
    s.thickness = parseFloat(e.target.value);
    $('thicknessVal').textContent = Math.round(s.thickness) + 'px';
    push();
  };

  $('smoothing').oninput = (e) => {
    s.smoothing = parseFloat(e.target.value);
    $('smoothingVal').textContent = s.smoothing.toFixed(2);
    push();
  };

  for (const e of ['top', 'bottom', 'left', 'right']) {
    $('edge-' + e).onchange = (ev) => {
      if (!s.edges) s.edges = {};
      s.edges[e] = ev.target.checked;
      push();
    };
  }

  // Display Mode
  $('displayMode').onchange = (e) => {
    s.displayMode = e.target.value;
    push();
  };

  // Start with Windows toggle
  if ($('autoStart')) {
    $('autoStart').onchange = (e) => {
      s.autoStart = e.target.checked;
      push();
    };
  }

  // Collapsible Audio section
  $('audio-header').onclick = () => {
    $('audio-header').classList.toggle('collapsed');
  };
})();
