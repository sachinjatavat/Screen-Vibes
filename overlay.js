const canvas = document.getElementById('c');
const g = canvas.getContext('2d');
let S = null;

let dpr = window.devicePixelRatio || 1;
let W = window.innerWidth;
let H = window.innerHeight;

function resize() {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();

function logDebug(msg) {
  console.log('[Overlay]', msg);
  if (window.vibe && window.vibe.log) {
    try { window.vibe.log(msg); } catch {}
  }
}

window.vibe.get().then((s) => (S = s));
window.vibe.onChange((s) => (S = s));

// ==========================================
// 1. Audio Reactive System (Robust Loopback)
// ==========================================
const BARS = 32;
const bands = new Float32Array(BARS);
let ac = null;
let analyser = null;
let freq = null;
let audioTrack = null;
let maxFreqRecent = 0;
let isStartingAudio = false;

function resumeAudioContext() {
  if (ac && ac.state === 'suspended') {
    ac.resume().then(() => {
      logDebug('AudioContext resumed successfully');
    }).catch((e) => {
      logDebug('AudioContext resume error: ' + e.message);
    });
  }
}

async function startAudio() {
  if (isStartingAudio) return;
  isStartingAudio = true;
  cleanupAudio();

  try {
    logDebug('Requesting loopback system audio capture...');
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

    // Note: Do NOT stop the video track, as some Chromium versions terminate the entire capture session!
    // Disabling video track avoids decoding overhead while keeping capture active.
    const videoTracks = stream.getVideoTracks();
    if (videoTracks && videoTracks.length > 0) {
      videoTracks.forEach((t) => { t.enabled = false; });
    }

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) {
      throw new Error('No audio tracks returned from display media capture');
    }

    audioTrack = audioTracks[0];
    logDebug(`Audio track connected: label="${audioTrack.label}", readyState=${audioTrack.readyState}`);

    audioTrack.onended = () => {
      logDebug('Audio track ended. Reconnecting in 2s...');
      cleanupAudio();
      setTimeout(startAudio, 2000);
    };

    audioTrack.onmute = () => { logDebug('Audio track muted event received'); };
    audioTrack.onunmute = () => { logDebug('Audio track unmuted event received'); };

    ac = new (window.AudioContext || window.webkitAudioContext)();
    ac.onstatechange = () => {
      logDebug(`AudioContext statechange: ${ac.state}`);
      if (ac.state === 'suspended') {
        resumeAudioContext();
      }
    };

    // Immediately resume AudioContext to bypass autoplay policies
    resumeAudioContext();

    const src = ac.createMediaStreamSource(new MediaStream([audioTrack]));
    analyser = ac.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.5;
    src.connect(analyser);
    freq = new Uint8Array(analyser.frequencyBinCount);

    logDebug('Audio pipeline established and active');
  } catch (err) {
    logDebug(`Audio capture setup failed: ${err.message}. Retrying in 3s...`);
    setTimeout(startAudio, 3000);
  } finally {
    isStartingAudio = false;
  }
}

function cleanupAudio() {
  if (audioTrack) {
    try { audioTrack.stop(); } catch {}
    audioTrack = null;
  }
  if (ac) {
    try { ac.close(); } catch {}
    ac = null;
  }
  analyser = null;
  freq = null;
}

startAudio();

// Periodic watchdog: checks track health and auto-resumes AudioContext
setInterval(() => {
  const acState = ac ? ac.state : 'null';
  const trackState = audioTrack ? audioTrack.readyState : 'null';
  const maxVal = maxFreqRecent;
  maxFreqRecent = 0;

  logDebug(`[Audio Status] AC: ${acState} | Track: ${trackState} | MaxFreq: ${maxVal}/255 (${Math.round(maxVal / 255 * 100)}%)`);

  if (ac && ac.state === 'suspended') {
    resumeAudioContext();
  }

  if (!audioTrack || audioTrack.readyState === 'ended') {
    logDebug('Watchdog detected disconnected audio track. Restarting capture...');
    startAudio();
  }
}, 3000);

function updateBands() {
  if (!analyser || !freq || !S) return;
  analyser.getByteFrequencyData(freq);

  const sens = S.sensitivity || 1.3;
  const smooth = S.smoothing !== undefined ? S.smoothing : 0.7;

  for (let i = 0; i < freq.length; i++) {
    if (freq[i] > maxFreqRecent) maxFreqRecent = freq[i];
  }

  for (let k = 0; k < BARS; k++) {
    const a = Math.floor(Math.pow(k / BARS, 2) * 350) + 1;
    const b = Math.floor(Math.pow((k + 1) / BARS, 2) * 350) + 2;
    let sum = 0;
    for (let i = a; i < b; i++) sum += freq[i];
    const normalizedAvg = sum / (b - a) / 255;
    const v = Math.min(1.0, Math.pow(normalizedAvg, 1.1) * sens * 2.2);
    bands[k] = bands[k] * smooth + v * (1 - smooth);
  }
}

// ==========================================
// 2. Color Utilities
// ==========================================
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

function audioColorAt(t) {
  if (S.rainbow) return hsl2rgb((t * 300 + performance.now() / 25) % 360, 1, 0.55);
  const a = hex2rgb(S.color1 || '#00f5ff');
  const b = hex2rgb(S.color2 || '#ff00e5');
  return lerpColor(a, b, t);
}

// Wave color sampler supporting multiple waves
function getWaveColor(p, u, now, waveIndex = 0) {
  const mode = S.waveColorMode || 'rainbow';

  if (mode === 'rainbow') {
    // Wave 2 has 180 deg phase offset so both waves contrast beautifully
    const hueOffset = waveIndex === 1 ? 180 : 0;
    const hue = ((u * 360) + (now * 0.04) + hueOffset) % 360;
    return hsl2rgb(hue < 0 ? hue + 360 : hue, 1.0, 0.55);
  }

  if (mode === 'gradient') {
    const c1 = hex2rgb(S.waveColor1 || S.color1 || '#00f5ff');
    const c2 = hex2rgb(S.waveColor2 || S.color2 || '#ff00e5');
    // Wave 1 blends c1 -> c2; Wave 2 blends c2 -> c1
    return waveIndex === 1 ? lerpColor(c2, c1, p) : lerpColor(c1, c2, p);
  }

  if (mode === 'head-trail') {
    const cHead = hex2rgb(S.waveHeadColor || '#ffffff');
    const cTrail1 = hex2rgb(waveIndex === 1 ? (S.waveColor2 || '#ff00e5') : (S.waveColor1 || '#00f5ff'));
    const cTrail2 = hex2rgb(waveIndex === 1 ? (S.waveColor1 || '#00f5ff') : (S.waveColor2 || '#ff00e5'));
    if (p < 0.15) {
      return lerpColor(cHead, cTrail1, p / 0.15);
    }
    return lerpColor(cTrail1, cTrail2, (p - 0.15) / 0.85);
  }

  if (mode === 'solid') {
    if (waveIndex === 1 && S.waveColor2) {
      return hex2rgb(S.waveColor2);
    }
    return hex2rgb(S.waveColor1 || '#00f5ff');
  }

  if (mode === 'sync') {
    if (S.rainbow) {
      const hueOffset = waveIndex === 1 ? 180 : 0;
      const hue = ((u * 360) + (now * 0.04) + hueOffset) % 360;
      return hsl2rgb(hue < 0 ? hue + 360 : hue, 1.0, 0.55);
    }
    const c1 = hex2rgb(S.color1 || '#00f5ff');
    const c2 = hex2rgb(S.color2 || '#ff00e5');
    return waveIndex === 1 ? lerpColor(c2, c1, p) : lerpColor(c1, c2, p);
  }

  return hex2rgb(S.waveColor1 || '#00f5ff');
}

// ==========================================
// 3. Continuous Perimeter Path & Corners
// ==========================================
function getPerimeterPoint(u, width, height) {
  const P = 2 * (width + height);
  let s = ((u % 1) + 1) % 1 * P;

  if (s < width) {
    return { x: Math.max(0, Math.min(width, s)), y: 0, edge: 0, nx: 0, ny: 1 };
  } else if (s < width + height) {
    return { x: width, y: Math.max(0, Math.min(height, s - width)), edge: 1, nx: -1, ny: 0 };
  } else if (s < 2 * width + height) {
    return { x: Math.max(0, Math.min(width, 2 * width + height - s)), y: height, edge: 2, nx: 0, ny: -1 };
  } else {
    return { x: 0, y: Math.max(0, Math.min(height, P - s)), edge: 3, nx: 1, ny: 0 };
  }
}

function getCornerBetween(edgeA, edgeB, width, height) {
  if ((edgeA === 0 && edgeB === 1) || (edgeA === 1 && edgeB === 0)) return { x: width, y: 0 };
  if ((edgeA === 1 && edgeB === 2) || (edgeA === 2 && edgeB === 1)) return { x: width, y: height };
  if ((edgeA === 2 && edgeB === 3) || (edgeA === 3 && edgeB === 2)) return { x: 0, y: height };
  if ((edgeA === 3 && edgeB === 0) || (edgeA === 0 && edgeB === 3)) return { x: 0, y: 0 };
  return null;
}

// ==========================================
// 4. Continuous Traveling Light Wave Engine
// ==========================================
let currentHeadU1 = 0;   // Wave 1: Circulates Clockwise (+1)
let currentHeadU2 = 0.5; // Wave 2: Circulates Anticlockwise (-1), starts at opposite perimeter
let lastTimestamp = performance.now();

function updateWavePosition(now) {
  const dt = Math.min((now - lastTimestamp) / 1000, 0.1);
  lastTimestamp = now;

  if (!S || S.waveEnabled === false) return;

  const mode = S.waveDirection || 'cw';
  const speed = (S.waveSpeed || 1.0) * 0.12;

  if (mode === 'cw') {
    currentHeadU1 = (currentHeadU1 + speed * dt) % 1;
    if (currentHeadU1 < 0) currentHeadU1 += 1;
  } else if (mode === 'ccw') {
    currentHeadU1 = (currentHeadU1 - speed * dt) % 1;
    if (currentHeadU1 < 0) currentHeadU1 += 1;
  } else if (mode === 'dual') {
    // Wave 1 travels Clockwise (+1)
    currentHeadU1 = (currentHeadU1 + speed * dt) % 1;
    if (currentHeadU1 < 0) currentHeadU1 += 1;

    // Wave 2 travels Anticlockwise (-1)
    currentHeadU2 = (currentHeadU2 - speed * dt) % 1;
    if (currentHeadU2 < 0) currentHeadU2 += 1;
  }
}

function drawInwardDiffusion(vertices, thickness, glowMul) {
  const depth = thickness * 2.2;
  g.save();
  g.globalCompositeOperation = 'lighter'; // Additive blending for rich light wash

  for (let i = 1; i < vertices.length; i++) {
    const p1 = vertices[i - 1];
    const p2 = vertices[i];
    if (p1.isCorner || p2.isCorner || p1.edge !== p2.edge) continue;

    const nx = p2.nx;
    const ny = p2.ny;

    let grad;
    if (p2.edge === 0) {
      grad = g.createLinearGradient(0, 0, 0, depth);
    } else if (p2.edge === 1) {
      grad = g.createLinearGradient(W, 0, W - depth, 0);
    } else if (p2.edge === 2) {
      grad = g.createLinearGradient(0, H, 0, H - depth);
    } else {
      grad = g.createLinearGradient(0, 0, depth, 0);
    }

    const a = p2.alpha * 0.4 * glowMul;
    grad.addColorStop(0, css(p2.color, a));
    grad.addColorStop(0.35, css(p2.color, a * 0.35));
    grad.addColorStop(1, css(p2.color, 0));

    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(p1.x, p1.y);
    g.lineTo(p2.x, p2.y);
    g.lineTo(p2.x + nx * depth, p2.y + ny * depth);
    g.lineTo(p1.x + nx * depth, p1.y + ny * depth);
    g.closePath();
    g.fill();
  }
  g.restore();
}

// Draws a single traveling wave around the perimeter
function drawSingleWave(now, headU, dirSign, waveIndex) {
  const glowMul = S.waveGlow !== undefined ? S.waveGlow : 1.0;
  const thickness = S.waveThickness || 18;
  const trailLen = Math.max(0.05, Math.min(0.85, S.waveLength || 0.35));

  const STEPS = 90;
  const vertices = [];

  for (let i = STEPS; i >= 0; i--) {
    const p = i / STEPS;
    const distBehind = p * trailLen;
    let u = (headU - dirSign * distBehind) % 1;
    if (u < 0) u += 1;

    const pt = getPerimeterPoint(u, W, H);
    pt.p = p;
    pt.u = u;
    pt.color = getWaveColor(p, u, now, waveIndex);
    pt.alpha = Math.pow(1 - p, 1.6) * glowMul;
    pt.thickness = Math.max(2, thickness * (0.35 + 0.65 * (1 - p)));

    if (vertices.length > 0) {
      const prevPt = vertices[vertices.length - 1];
      if (prevPt.edge !== pt.edge) {
        const corner = getCornerBetween(prevPt.edge, pt.edge, W, H);
        if (corner) {
          vertices.push({
            x: corner.x,
            y: corner.y,
            edge: pt.edge,
            nx: pt.nx,
            ny: pt.ny,
            p: p,
            u: u,
            color: pt.color,
            alpha: pt.alpha,
            thickness: pt.thickness,
            isCorner: true,
          });
        }
      }
    }
    vertices.push(pt);
  }

  if (vertices.length < 2) return;

  // Pass 1: Inward diffusion
  drawInwardDiffusion(vertices, thickness, glowMul);

  // Pass 2: Soft ambient glowing ribbon
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.shadowBlur = Math.round(22 * glowMul);

  for (let i = 1; i < vertices.length; i++) {
    const p1 = vertices[i - 1];
    const p2 = vertices[i];
    g.beginPath();
    g.moveTo(p1.x, p1.y);
    g.lineTo(p2.x, p2.y);
    const a = p2.alpha * 0.7;
    g.strokeStyle = css(p2.color, a);
    g.shadowColor = css(p2.color, a);
    g.lineWidth = p2.thickness * 1.6;
    g.stroke();
  }
  g.restore();

  // Pass 3: Crisp neon beam
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.shadowBlur = Math.round(10 * glowMul);

  for (let i = 1; i < vertices.length; i++) {
    const p1 = vertices[i - 1];
    const p2 = vertices[i];
    g.beginPath();
    g.moveTo(p1.x, p1.y);
    g.lineTo(p2.x, p2.y);
    g.strokeStyle = css(p2.color, p2.alpha);
    g.shadowColor = css(p2.color, p2.alpha);
    g.lineWidth = p2.thickness;
    g.stroke();
  }
  g.restore();

  // Pass 4: Bright core filament
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.shadowBlur = 0;

  const filamentStart = Math.floor(vertices.length * 0.72);
  for (let i = filamentStart; i < vertices.length; i++) {
    const p1 = vertices[i - 1];
    const p2 = vertices[i];
    const filamentP = 1 - p2.p;
    g.beginPath();
    g.moveTo(p1.x, p1.y);
    g.lineTo(p2.x, p2.y);
    const filamentColor = lerpColor(p2.color, [255, 255, 255], filamentP * 0.85);
    g.strokeStyle = css(filamentColor, p2.alpha * 0.95);
    g.lineWidth = Math.max(1.5, p2.thickness * 0.35);
    g.stroke();
  }
  g.restore();

  // Pass 5: Luminous radial head beacon
  const headPt = vertices[vertices.length - 1];
  const headRadius = Math.max(25, thickness * 2.8 * glowMul);

  g.save();
  const hg = g.createRadialGradient(headPt.x, headPt.y, 0, headPt.x, headPt.y, headRadius);
  hg.addColorStop(0, 'rgba(255, 255, 255, ' + Math.min(1, 0.95 * glowMul) + ')');
  hg.addColorStop(0.2, css(headPt.color, 0.85 * glowMul));
  hg.addColorStop(0.55, css(headPt.color, 0.35 * glowMul));
  hg.addColorStop(1, css(headPt.color, 0));

  g.fillStyle = hg;
  g.beginPath();
  g.arc(headPt.x, headPt.y, headRadius, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function drawTravelingWave(now) {
  if (!S || S.waveEnabled === false) return;

  const mode = S.waveDirection || 'cw';

  if (mode === 'dual') {
    // Two light waves moving in opposite directions around the edges!
    // They intersect, cross through each other seamlessly, and keep going continuously.
    drawSingleWave(now, currentHeadU1, 1, 0);   // Clockwise wave
    drawSingleWave(now, currentHeadU2, -1, 1);  // Anticlockwise wave
  } else if (mode === 'ccw') {
    drawSingleWave(now, currentHeadU1, -1, 0);  // Single Anticlockwise wave
  } else {
    drawSingleWave(now, currentHeadU1, 1, 0);   // Single Clockwise wave
  }
}

// ==========================================
// 5. Audio Reactive Edge Drawing (Zero on Silence)
// ==========================================
function drawEdge(L) {
  const n = BARS * 2, w = L / n;
  const T = S.thickness || 140;
  const kOf = (i) => (i < BARS ? BARS - 1 - i : i - BARS);

  let avg = 0, bass = 0;
  for (let k = 0; k < BARS; k++) avg += bands[k];
  avg /= BARS;
  for (let k = 0; k < 4; k++) bass += bands[k];
  bass /= 4;

  if (S.mode === 'bars') {
    for (let i = 0; i < n; i++) {
      const k = kOf(i);
      const val = bands[k];
      if (val < 0.008) continue;
      const h = val * T;
      const c = audioColorAt(k / BARS);
      g.shadowBlur = 14;
      g.shadowColor = css(c, 0.9);
      g.fillStyle = css(c, 0.9);
      g.fillRect(i * w + 1, -h, w - 2, h);
    }
    g.shadowBlur = 0;
  } else if (S.mode === 'wave') {
    if (avg < 0.008) return;
    const grad = g.createLinearGradient(0, 0, L, 0);
    grad.addColorStop(0, css(audioColorAt(1), 0.85));
    grad.addColorStop(0.5, css(audioColorAt(0), 0.85));
    grad.addColorStop(1, css(audioColorAt(1), 0.85));
    g.beginPath();
    g.moveTo(0, 0);
    for (let i = 0; i < n; i++) {
      const h = bands[kOf(i)] * T;
      g.lineTo((i + 0.5) * w, -h);
    }
    g.lineTo(L, 0);
    g.closePath();
    g.fillStyle = grad;
    g.shadowBlur = 20;
    g.shadowColor = css(audioColorAt(0.5), 0.8);
    g.fill();
    g.shadowBlur = 0;
  } else if (S.mode === 'glow' || S.mode === 'pulse') {
    if (avg < 0.008 && bass < 0.008) return;
    for (let i = 0; i < n; i++) {
      const k = kOf(i);
      const val = S.mode === 'pulse' ? bass : bands[k];
      if (val < 0.008) continue;
      const depth = S.mode === 'pulse' ? bass * T * 2.0 : T * (0.05 + val * 1.5);
      const c = audioColorAt(k / BARS);
      const grad = g.createLinearGradient(0, 0, 0, -depth);
      grad.addColorStop(0, css(c, 0.85));
      grad.addColorStop(1, css(c, 0));
      g.fillStyle = grad;
      g.fillRect(i * w - 1, -depth, w + 2, depth);
    }
  }
}

// ==========================================
// 6. Main Render Loop
// ==========================================
function frame(now) {
  requestAnimationFrame(frame);
  if (!S) return;

  g.clearRect(0, 0, W, H);

  // Update positions for waves
  updateWavePosition(now);

  // Draw traveling wave(s) (supports dual intersecting waves)
  drawTravelingWave(now);

  // Draw audio reactive visualization if enabled
  if (S.mode && S.mode !== 'none') {
    updateBands();
    const E = S.edges || { top: true, bottom: true, left: true, right: true };
    if (E.bottom) { g.save(); g.translate(0, H); drawEdge(W); g.restore(); }
    if (E.top)    { g.save(); g.translate(W, 0); g.rotate(Math.PI); drawEdge(W); g.restore(); }
    if (E.left)   { g.save(); g.rotate(Math.PI / 2); drawEdge(H); g.restore(); }
    if (E.right)  { g.save(); g.translate(W, H); g.rotate(-Math.PI / 2); drawEdge(H); g.restore(); }
  }
}

requestAnimationFrame(frame);
