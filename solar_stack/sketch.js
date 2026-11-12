const W = 780, H = 760, PANEL_W = 500;
const SPEEDS = [1, 2, 5, 10, 20, 50, 100];   // 프레임당 흐르는 일수
const DRIFT = 0.2;                           // 태양의 이동 속도 (px/일)
const SUN_R = 34, SUN_SPIN_DAYS = 25;
const STEP_MS = 150;                         // 스택 패널이 한 step 씩 재생되는 간격
const PREWARM_DAYS = 2600;                   // 시작 때 경로가 비어 보이지 않게 미리 계산

let speedIdx = 2, running = false, day = 0, stepClock = 0;
const L = new StackLog();
const sunTrail = { pts: [], last: -Infinity };
let stars = [], playBtn;

function setup() {
  createCanvas(W + PANEL_W, H).parent('stage');
  randomSeed(11); noiseSeed(11);
  textFont('Menlo, Consolas, monospace');
  buildTextures();
  for (let i = 0; i < 260; i++) stars.push({ x: random(W), y: random(H), s: random(0.6, 1.9), par: random(0.02, 0.12) });
  for (let i = 0; i < PREWARM_DAYS; i++) advance(1);
  buildButtons();
}

const orbitAngle = (p) => p.phase + TWO_PI * day / p.period;

// 시간을 sp 일 만큼 진행. 빠른 속도에서도 궤도가 건너뛰지 않게 1일 이하로 쪼개서 계산한다.
function advance(sp) {
  const n = Math.max(1, Math.ceil(sp)), dt = sp / n;
  for (let s = 0; s < n; s++) { day += dt; sampleTrails(); }
}

function sampleTrails() {
  const sunX = DRIFT * day;
  const minX = sunX - W / 2 - 40;
  for (const p of PLANETS) {
    if (day - p.last >= p.period / 90) {
      p.last = day;
      const a = orbitAngle(p);
      p.trail.push([sunX + p.dist * Math.cos(a), p.dist * Math.sin(a)]);
    }
    while (p.trail.length > 2 && p.trail[0][0] < minX) p.trail.shift();
  }
  if (day - sunTrail.last >= 5) { sunTrail.last = day; sunTrail.pts.push([sunX, 0]); }
  while (sunTrail.pts.length > 2 && sunTrail.pts[0][0] < minX) sunTrail.pts.shift();
}

// 오래된 쪽일수록 흐려지는 경로 선
function drawFading(pts, cur, rgb, w) {
  const a = pts.concat([cur]), n = a.length;
  if (n < 2) return;
  const K = 6;
  noFill(); strokeWeight(w);
  for (let k = 0; k < K; k++) {
    const i0 = Math.floor((n - 1) * k / K), i1 = Math.floor((n - 1) * (k + 1) / K);
    stroke(rgb[0], rgb[1], rgb[2], 45 + k * 32);
    beginShape();
    for (let i = i0; i <= i1; i++) vertex(a[i][0], a[i][1]);
    endShape();
  }
}

function drawStars() {
  noStroke();
  for (const s of stars) {
    const x = (((s.x - DRIFT * day * s.par) % W) + W) % W;
    fill(255, 255, 255, 110 + s.s * 60); circle(x, s.y, s.s);
  }
}

function draw() {
  if (running) advance(SPEEDS[speedIdx]);
  const sunX = DRIFT * day;

  background(5, 6, 10);
  drawStars();

  // ---- 행렬 스택 구조 (그림과 오른쪽 패널이 같은 호출에서 나옴) ----
  L.reset();
  L.push('Camera', '#9fb0d0');
  L.translate(W / 2 - sunX, H / 2);                 // 태양을 화면 중앙에 두는 카메라
  for (const p of PLANETS) {
    const a = orbitAngle(p);
    drawFading(p.trail, [sunX + p.dist * Math.cos(a), p.dist * Math.sin(a)], p.rgb, 1.3);
  }
  drawFading(sunTrail.pts, [sunX, 0], [255, 200, 90], 1.8);

  L.push('Sun', SUN_COLOR);
  L.translate(sunX, 0);                             // 태양의 이동: 이것만 바뀌면 자식이 모두 따라감
  noFill(); stroke(255, 255, 255, 20); strokeWeight(1);
  for (const p of PLANETS) circle(0, 0, p.dist * 2);

  L.push('Sun spin', SUN_COLOR);                    // 자전은 pop 되므로 행성에 영향 없음
  L.rotate(TWO_PI * day / SUN_SPIN_DAYS);
  L.draw('Sun');
  drawSunBody(SUN_R);
  L.pop();

  for (const p of PLANETS) {                        // 같은 깊이의 형제들
    const a = orbitAngle(p);
    L.push(p.name, p.color);
    L.rotate(a);
    L.translate(p.dist, 0);
    if (p.ring) {
      L.push('Saturn ring (back)', p.color);
      L.rotate(-a + RING_TILT);                     // 부모의 공전 회전을 되돌려 고리 방향 고정
      L.draw('Saturn ring (back)');
      drawRingHalf(p, false);
      L.pop();
    }
    L.draw(p.name);
    drawPlanetBody(p);
    if (p.ring) {
      L.push('Saturn ring (front)', p.color);
      L.rotate(-a + RING_TILT);
      L.draw('Saturn ring (front)');
      drawRingHalf(p, true);
      L.pop();
    }
    L.pop();
  }
  L.pop();   // Sun
  L.pop();   // Camera

  // ---- 화면 좌표계로 돌아와 HUD / 패널 ----
  stepClock += deltaTime;
  const k = Math.floor(stepClock / STEP_MS) % Math.max(1, L.ops.length);
  drawCursorAxes(L.ops, k, W);
  drawHud();
  drawStackPanel(W, PANEL_W, H, L.ops, k);
}

function drawHud() {
  noStroke(); textAlign(LEFT, BASELINE); textSize(14);
  fill(215, 222, 240); text(`Day ${Math.floor(day)}`, 18, H - 62);
  fill(running ? color(120, 230, 150) : color(255, 200, 100));
  text(running ? '▶ 재생 중' : '⏸ 일시정지', 118, H - 62);
  fill(160, 170, 195); textSize(12);
  text(`속도 ${SPEEDS[speedIdx]} 일/프레임`, 18, H - 40);
  for (let i = 0; i < SPEEDS.length; i++) {
    fill(i <= speedIdx ? color(120, 170, 255) : color(45, 52, 75));
    rect(140 + i * 16, H - 51, 12, 12, 2);
  }
  fill(110, 120, 145);
  text('[Enter] 재생/정지   [↑] 빠르게   [↓] 느리게   ·  크기·거리는 축소, 공전 주기는 실제 값', 18, H - 18);
}

function toggleRun() { running = !running; playBtn.html(running ? '⏸ 정지 (Enter)' : '▶ 재생 (Enter)'); }
function setSpeed(i) { speedIdx = Math.min(SPEEDS.length - 1, Math.max(0, i)); }

function keyPressed() {
  if (keyCode === ENTER) { toggleRun(); return false; }
  if (keyCode === UP_ARROW) { setSpeed(speedIdx + 1); return false; }
  if (keyCode === DOWN_ARROW) { setSpeed(speedIdx - 1); return false; }
}

function buildButtons() {
  playBtn = createButton('▶ 재생 (Enter)').parent('ui').mousePressed(toggleRun);
  createButton('▲ 빠르게 (↑)').parent('ui').mousePressed(() => setSpeed(speedIdx + 1));
  createButton('▼ 느리게 (↓)').parent('ui').mousePressed(() => setSpeed(speedIdx - 1));
}
