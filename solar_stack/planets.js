// 크기와 궤도 반경은 한 화면에 담기 위해 축소한 값, 공전 주기(일)는 실제 값
const PLANETS = [
  { name: 'Mercury', kr: '수성',   dist: 58,  r: 5.5, period: 88,    color: '#c8bfb5', tex: 'mercury' },
  { name: 'Venus',   kr: '금성',   dist: 84,  r: 9.5, period: 225,   color: '#e8c987', tex: 'venus',   atmo: '255,210,140' },
  { name: 'Earth',   kr: '지구',   dist: 112, r: 10,  period: 365,   color: '#4fa3ff', tex: 'earth',   atmo: '110,170,255' },
  { name: 'Mars',    kr: '화성',   dist: 140, r: 7,   period: 687,   color: '#e0603a', tex: 'mars',    atmo: '230,140,100' },
  { name: 'Jupiter', kr: '목성',   dist: 187, r: 24,  period: 4333,  color: '#d9a066', tex: 'jupiter' },
  { name: 'Saturn',  kr: '토성',   dist: 240, r: 19,  period: 10759, color: '#e6d08a', tex: 'saturn',  ring: true },
  { name: 'Uranus',  kr: '천왕성', dist: 288, r: 14,  period: 30687, color: '#7fe0e6', tex: 'uranus',  atmo: '130,225,230' },
  { name: 'Neptune', kr: '해왕성', dist: 328, r: 13.5, period: 60190, color: '#5b78ff', tex: 'neptune', atmo: '90,120,255' },
];
const SUN_COLOR = '#ffb347';
const RING_TILT = -0.45; // 토성 고리의 (월드 기준) 기울기

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
PLANETS.forEach((p, i) => {
  p.rgb = hexToRgb(p.color);
  p.phase = 0.3 + i * 0.8;       // 시작 위치가 한 줄로 늘어서지 않게
  p.trail = [];
  p.last = -Infinity;
});

const TEX = {};

function palette(stops, t) {
  const x = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
  const i = Math.min(Math.floor(x), stops.length - 2), f = x - i;
  const a = stops[i], b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// 원형으로 잘린 텍스처 한 장을 p5.Graphics 에 그려서 돌려준다
function makeTex(S, painter) {
  const pg = createGraphics(S, S);
  pg.pixelDensity(1);
  pg.noStroke();
  const ctx = pg.drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  ctx.clip();
  painter(pg, S);
  ctx.restore();
  return pg;
}

function paint(pg, S, step, fn) {
  for (let y = 0; y < S; y += step) {
    for (let x = 0; x < S; x += step) {
      const c = fn(x, y);
      if (!c) continue;
      pg.fill(c[0], c[1], c[2], c[3] === undefined ? 255 : c[3]);
      pg.rect(x, y, step, step);
    }
  }
}

function buildTextures() {
  TEX.sun = makeTex(256, (pg, S) => {
    paint(pg, S, 2, (x, y) => {
      const n = noise(x * 0.045, y * 0.045) * 0.7 + noise(x * 0.13, y * 0.13) * 0.3;
      return palette([[225, 60, 5], [255, 135, 20], [255, 215, 90], [255, 245, 175]], n * 1.4 - 0.15);
    });
    for (let i = 0; i < 6; i++) {
      const sx = random(S * 0.25, S * 0.75), sy = random(S * 0.3, S * 0.7), sr = random(4, 9);
      pg.fill(70, 20, 0, 90); pg.ellipse(sx, sy, sr * 2.2, sr * 1.6);
      pg.fill(30, 5, 0, 170); pg.ellipse(sx, sy, sr * 1.2, sr * 0.9);
    }
  });

  TEX.mercury = makeTex(128, (pg, S) => {
    paint(pg, S, 2, (x, y) => { const v = 105 + noise(x * 0.06, y * 0.06) * 80; return [v, v * 0.97, v * 0.92]; });
    for (let i = 0; i < 16; i++) {
      const cx = random(S), cy = random(S), cr = random(4, 13);
      pg.fill(0, 0, 0, 50); pg.ellipse(cx, cy, cr * 2, cr * 2);
      pg.fill(255, 255, 255, 30); pg.ellipse(cx - cr * 0.2, cy - cr * 0.2, cr * 1.6, cr * 1.6);
      pg.fill(0, 0, 0, 35); pg.ellipse(cx + cr * 0.15, cy + cr * 0.15, cr * 1.3, cr * 1.3);
    }
  });

  TEX.venus = makeTex(128, (pg, S) => {
    paint(pg, S, 2, (x, y) => {
      const t = noise(x * 0.015 + noise(y * 0.03) * 2.5, y * 0.035);
      return palette([[190, 135, 65], [225, 180, 100], [246, 222, 160]], t * 1.5 - 0.1);
    });
  });

  TEX.earth = makeTex(160, (pg, S) => {
    paint(pg, S, 2, (x, y) => {
      const land = noise(x * 0.028, y * 0.028, 3);
      if (land > 0.52) return palette([[48, 118, 50], [95, 130, 60], [150, 125, 75]], noise(x * 0.07, y * 0.07, 8) * 1.4);
      return palette([[12, 45, 120], [28, 90, 185], [45, 120, 205]], noise(x * 0.05, y * 0.05) * 1.3 + (land - 0.4));
    });
    paint(pg, S, 2, (x, y) => {
      const c = noise(x * 0.04, y * 0.09, 9);
      return c > 0.55 ? [255, 255, 255, Math.min(220, (c - 0.55) * 700)] : null;
    });
    paint(pg, S, 2, (x, y) => (Math.abs(y - S / 2) > S * 0.43 ? [245, 250, 255, 235] : null));
  });

  TEX.mars = makeTex(128, (pg, S) => {
    paint(pg, S, 2, (x, y) => {
      const n = noise(x * 0.05, y * 0.05, 5);
      return palette([[105, 50, 32], [176, 86, 50], [205, 125, 80]], n * 1.5 - 0.05);
    });
    paint(pg, S, 2, (x, y) => (y < S * 0.09 || y > S * 0.93 ? [250, 245, 240, 220] : null));
  });

  TEX.jupiter = makeTex(192, (pg, S) => {
    const stops = [[150, 100, 70], [205, 170, 130], [232, 208, 172], [172, 122, 88], [222, 192, 152]];
    paint(pg, S, 2, (x, y) => {
      const v = 0.5 + 0.5 * Math.sin(y * 0.17 + 3 * noise(x * 0.02, y * 0.05));
      return palette(stops, v);
    });
    pg.fill(185, 78, 48, 230); pg.ellipse(S * 0.62, S * 0.64, 34, 20);
    pg.fill(215, 120, 80, 150); pg.ellipse(S * 0.62, S * 0.64, 22, 12);
  });

  TEX.saturn = makeTex(160, (pg, S) => {
    const stops = [[200, 172, 118], [226, 205, 150], [240, 224, 178]];
    paint(pg, S, 2, (x, y) => {
      const v = 0.5 + 0.5 * Math.sin(y * 0.2 + 1.5 * noise(x * 0.02, y * 0.05));
      return palette(stops, v);
    });
  });

  TEX.uranus = makeTex(128, (pg, S) => {
    paint(pg, S, 2, (x, y) => palette([[120, 205, 215], [160, 228, 232]], 0.5 + 0.3 * Math.sin(y * 0.1) + noise(x * 0.03, y * 0.05) * 0.3));
  });

  TEX.neptune = makeTex(128, (pg, S) => {
    paint(pg, S, 2, (x, y) => palette([[28, 52, 160], [52, 92, 220], [90, 130, 240]], noise(x * 0.02, y * 0.07) * 1.4 + 0.2 * Math.sin(y * 0.12)));
    pg.fill(255, 255, 255, 70);
    for (let i = 0; i < 5; i++) pg.ellipse(random(S), random(S), random(14, 30), 3);
  });
}

// 모두 "현재 변환 행렬의 원점이 천체 중심" 이라고 가정하고 그린다.
function drawSunBody(r) {
  const ctx = drawingContext;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 3.6);
  g.addColorStop(0, 'rgba(255,190,80,0.55)');
  g.addColorStop(0.25, 'rgba(255,140,40,0.2)');
  g.addColorStop(1, 'rgba(255,90,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r * 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  image(TEX.sun, -r, -r, 2 * r, 2 * r);
  g = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
  g.addColorStop(0, 'rgba(255,200,80,0)');
  g.addColorStop(1, 'rgba(130,30,0,0.6)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
}

// 행성 좌표계 안에서 태양(부모 원점)의 위치는 -(lx, ly) 이다. (translate(lx, ly) 의 역)
// 그 방향을 밝은 쪽으로 삼으면 명암이 저절로 태양을 향한다. s 는 깊이에 따른 크기 배율.
function drawPlanetBody(p, s = 1, lx = p.dist, ly = 0) {
  const ctx = drawingContext, r = p.r * s;
  const len = Math.hypot(lx, ly) || 1, ux = -lx / len, uy = -ly / len;   // 태양 쪽 단위 벡터
  if (p.atmo) {
    const g = ctx.createRadialGradient(0, 0, r * 0.92, 0, 0, r * 1.45);
    g.addColorStop(0, `rgba(${p.atmo},0.45)`);
    g.addColorStop(1, `rgba(${p.atmo},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2); ctx.fill();
  }
  image(TEX[p.tex], -r, -r, 2 * r, 2 * r);
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
  const g = ctx.createRadialGradient(ux * r * 0.55, uy * r * 0.55, r * 0.15, ux * r * 0.55, uy * r * 0.55, r * 2.1);
  g.addColorStop(0, 'rgba(255,255,255,0.10)');
  g.addColorStop(0.5, 'rgba(0,0,0,0)');
  g.addColorStop(0.78, 'rgba(0,0,0,0.65)');
  g.addColorStop(1, 'rgba(0,0,0,0.93)');
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();
}

// 고리: 행성 뒤쪽 호(back) → 행성 → 앞쪽 호(front) 순서로 그린다.
const RING_BANDS = [[1.3, 1.5, [200, 180, 140, 90]], [1.55, 1.85, [236, 220, 182, 215]], [1.92, 2.05, [190, 170, 130, 150]]];
function drawRingHalf(p, front, s = 1) {
  noFill();
  const R = p.r * s;
  RING_BANDS.forEach(([a, b, c]) => {
    const mid = (a + b) / 2 * R;
    stroke(c[0], c[1], c[2], c[3]);
    strokeWeight((b - a) * R * 0.34);
    arc(0, 0, mid * 2, mid * 2 * 0.34, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
  });
}
