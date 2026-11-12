// =====================================================================
// 설정값
// =====================================================================
const W = 780;
const H = 760;
const PANEL_W = 500;

const SPEEDS = [1, 2, 5, 10, 20, 50, 100];   // 프레임당 흐르는 일수
const DRIFT = 0.2;                           // 태양의 이동 속도 (px/일)

const SUN_R = 34;
const SUN_SPIN_DAYS = 25;

const STEP_MS = 150;                         // 스택 패널이 한 step 씩 재생되는 간격
const PREWARM_DAYS = 2600;                   // 시작 때 경로가 비어 보이지 않게 미리 계산


// =====================================================================
// 상태
// =====================================================================
let speedIdx = 2;
let running = false;
let day = 0;
let stepClock = 0;

const L = new StackLog();
const sunTrail = { pts: [], last: -Infinity };

let stars = [];
let playBtn;

let view = 'all';   // 오른쪽 스택 패널에 보여줄 천체 ('all' | 'Sun' | 행성 이름)


// =====================================================================
// p5 기본 함수
// =====================================================================
function setup() {
  createCanvas(W + PANEL_W, H).parent('stage');
  randomSeed(11);
  noiseSeed(11);
  textFont('Menlo, Consolas, monospace');

  buildTextures();

  for (let i = 0; i < 260; i++) {
    stars.push({
      x: random(W),
      y: random(H),
      s: random(0.6, 1.9),
      par: random(0.02, 0.12),
    });
  }

  for (let i = 0; i < PREWARM_DAYS; i++) {
    advance(1);
  }

  buildButtons();
}


function draw() {
  if (running) advance(SPEEDS[speedIdx]);
  const sunX = DRIFT * day;

  background(5, 6, 10);
  drawStars();

  // ---- 행렬 스택 구조 (그림과 오른쪽 패널이 같은 호출에서 나옴) ----
  L.reset();

  // Camera
  L.push('Camera', '#9fb0d0');
  L.translate(W / 2 - sunX, H / 2);                 // 태양을 화면 중앙에 두는 카메라

  for (const p of PLANETS) {
    drawFading(p.trail, worldPos(p, sunX), p.rgb, 1.3);
  }
  drawFading(sunTrail.pts, [sunX, 0], [255, 200, 90], 1.8);

  // Sun
  L.push('Sun', SUN_COLOR);
  L.translate(sunX, 0);                             // 태양의 이동: 이것만 바뀌면 자식이 모두 따라감

  drawOrbitGuides();

  // 깊이(z) 순서로 그린다: 태양보다 뒤(z<0) 행성 → 태양 → 앞(z>0) 행성
  const order = PLANETS.map(orbitLocal).sort((u, v) => u.z - v.z);
  let sunDrawn = false;

  for (const o of order) {
    if (!sunDrawn && o.z > 0) {
      drawSun();
      sunDrawn = true;
    }
    drawPlanet(o);
  }
  if (!sunDrawn) drawSun();

  L.pop();   // Sun
  L.pop();   // Camera

  // ---- 화면 좌표계로 돌아와 HUD / 패널 ----
  // 일시정지하면 패널도 그 step 에서 멈춤 (Space 로 한 step 씩 진행)
  if (running) stepClock += deltaTime;

  // 드롭박스로 고른 천체의 스택만
  const vops = view === 'all' ? L.ops : filterOps(L.ops, view);
  const k = Math.floor(stepClock / STEP_MS) % Math.max(1, vops.length);

  drawCursorAxes(vops, k, W);
  drawHud();
  drawStackPanel(W, PANEL_W, H, vops, k, view);
}


// =====================================================================
// 공전 궤도면 기울기
// =====================================================================
const orbitAngle = (p) => p.phase + TWO_PI * day / p.period;

const PLANE_DEG = 60;                                // 궤도면(장축)이 태양 진행 방향(+x)과 이루는 각
const PLANE_RAD = PLANE_DEG * Math.PI / 180;
const VIEW_SQUASH = 0.45;                            // 궤도면을 비스듬히 보는 정도: 평면 안의 y 를 이만큼 압축
const VIEW_DEPTH = Math.sqrt(1 - VIEW_SQUASH ** 2);  // 나머지 성분은 화면 뒤/앞 방향(깊이 z)


// 1단계: 공전 평면 안의 로컬 좌표 (localX, localY) 와 깊이 z (z > 0 이면 관찰자 쪽)
function orbitLocal(p) {
  const a = orbitAngle(p);
  const s = Math.sin(a);

  return {
    p,
    lx: p.dist * Math.cos(a),
    ly: p.dist * s * VIEW_SQUASH,
    z: p.dist * s * VIEW_DEPTH,
  };
}


// 2단계: 2D 회전 행렬 R(60°) 로 공전 평면 전체를 태양 진행 방향 대비 기울인다
//   | cos -sin | | lx |
//   | sin  cos | | ly |
function tiltPlane(lx, ly) {
  const c = Math.cos(PLANE_RAD);
  const s = Math.sin(PLANE_RAD);

  return [
    lx * c - ly * s,
    lx * s + ly * c,
  ];
}


// 행성의 월드 좌표 (태양 위치 + 기울어진 궤도 위의 오프셋)
function worldPos(p, sunX) {
  const { lx, ly } = orbitLocal(p);
  const [ox, oy] = tiltPlane(lx, ly);

  return [sunX + ox, oy];
}


// =====================================================================
// 시간 진행과 경로(trail)
// =====================================================================

// 시간을 sp 일 만큼 진행. 빠른 속도에서도 궤도가 건너뛰지 않게 1일 이하로 쪼개서 계산한다.
function advance(sp) {
  const n = Math.max(1, Math.ceil(sp));
  const dt = sp / n;

  for (let s = 0; s < n; s++) {
    day += dt;
    sampleTrails();
  }
}


function sampleTrails() {
  const sunX = DRIFT * day;
  const minX = sunX - W / 2 - 40;

  // 행성 경로: 주기의 1/90 마다 한 점, 화면 왼쪽 밖으로 나간 점은 제거
  for (const p of PLANETS) {
    if (day - p.last >= p.period / 90) {
      p.last = day;
      p.trail.push(worldPos(p, sunX));
    }
    while (p.trail.length > 2 && p.trail[0][0] < minX) {
      p.trail.shift();
    }
  }

  // 태양 경로: 5일마다 한 점
  if (day - sunTrail.last >= 5) {
    sunTrail.last = day;
    sunTrail.pts.push([sunX, 0]);
  }
  while (sunTrail.pts.length > 2 && sunTrail.pts[0][0] < minX) {
    sunTrail.pts.shift();
  }
}


// =====================================================================
// 그리기 함수
// =====================================================================

// 오래된 쪽일수록 흐려지는 경로 선
function drawFading(pts, cur, rgb, w) {
  const a = pts.concat([cur]);
  const n = a.length;
  if (n < 2) return;

  const K = 6;   // 흐림 단계 수
  noFill();
  strokeWeight(w);

  for (let k = 0; k < K; k++) {
    const i0 = Math.floor((n - 1) * k / K);
    const i1 = Math.floor((n - 1) * (k + 1) / K);

    stroke(rgb[0], rgb[1], rgb[2], 45 + k * 32);
    beginShape();
    for (let i = i0; i <= i1; i++) {
      vertex(a[i][0], a[i][1]);
    }
    endShape();
  }
}


function drawStars() {
  noStroke();

  for (const s of stars) {
    const x = (((s.x - DRIFT * day * s.par) % W) + W) % W;

    fill(255, 255, 255, 110 + s.s * 60);
    circle(x, s.y, s.s);
  }
}


// 기울어진 궤도(타원) 가이드
function drawOrbitGuides() {
  noFill();
  stroke(255, 255, 255, 20);
  strokeWeight(1);

  for (const p of PLANETS) {
    beginShape();
    for (let i = 0; i < 72; i++) {
      const t = TWO_PI * i / 72;
      const [ox, oy] = tiltPlane(
        p.dist * Math.cos(t),
        p.dist * Math.sin(t) * VIEW_SQUASH,
      );
      vertex(ox, oy);
    }
    endShape(CLOSE);
  }
}


function drawSun() {
  L.push('Sun spin', SUN_COLOR);                    // 자전은 pop 되므로 행성에 영향 없음
  L.rotate(TWO_PI * day / SUN_SPIN_DAYS);
  L.draw('Sun');
  drawSunBody(SUN_R);
  L.pop();
}


// 행성 하나: rotate(60°) 로 평면을 기울인 뒤, 평면 안의 로컬 좌표만큼 translate
function drawPlanet({ p, lx, ly, z }) {
  const s = 1 + 0.18 * z / p.dist;                  // 가까울수록(z>0) 크게, 멀수록 작게

  L.push(p.name, p.color);
  L.rotate(PLANE_RAD);
  L.translate(lx, ly);

  // 토성 고리의 뒤쪽 호 (행성보다 먼저)
  if (p.ring) {
    L.push('Saturn ring (back)', p.color);
    L.rotate(-PLANE_RAD + RING_TILT);               // 부모의 기울기 회전을 되돌려 고리 방향 고정
    L.draw('Saturn ring (back)');
    drawRingHalf(p, false, s);
    L.pop();
  }

  // 행성 본체
  L.draw(p.name);
  drawPlanetBody(p, s, lx, ly);

  // 토성 고리의 앞쪽 호 (행성 위에)
  if (p.ring) {
    L.push('Saturn ring (front)', p.color);
    L.rotate(-PLANE_RAD + RING_TILT);
    L.draw('Saturn ring (front)');
    drawRingHalf(p, true, s);
    L.pop();
  }

  L.pop();
}


function drawHud() {
  noStroke();
  textAlign(LEFT, BASELINE);

  // Day, 재생 상태
  textSize(14);
  fill(215, 222, 240);
  text(`Day ${Math.floor(day)}`, 18, H - 62);

  fill(running ? color(120, 230, 150) : color(255, 200, 100));
  text(running ? '▶ 재생 중' : '⏸ 일시정지', 118, H - 62);

  // 속도 단계 막대
  textSize(12);
  fill(160, 170, 195);
  text(`속도 ${SPEEDS[speedIdx]} 일/프레임`, 18, H - 40);

  for (let i = 0; i < SPEEDS.length; i++) {
    fill(i <= speedIdx ? color(120, 170, 255) : color(45, 52, 75));
    rect(140 + i * 16, H - 51, 12, 12, 2);
  }

  // 조작 안내
  fill(175, 185, 210);
  text('[Enter] 재생/정지   [↑↓] 속도   [Space] 정지 중 스택 한 step 진행', 18, H - 18);
}


// =====================================================================
// 조작
// =====================================================================
function toggleRun() {
  running = !running;
  playBtn.html(running ? '⏸ 정지 (Enter)' : '▶ 재생 (Enter)');
}


function setSpeed(i) {
  speedIdx = Math.min(SPEEDS.length - 1, Math.max(0, i));
}


// 일시정지 중에 스택 패널을 정확히 한 step 앞으로 보낸다
function stepOnce() {
  if (running) return;
  stepClock = (Math.floor(stepClock / STEP_MS) + 1) * STEP_MS;
}


function keyPressed() {
  if (keyCode === ENTER) {
    toggleRun();
    return false;
  }
  if (keyCode === UP_ARROW) {
    setSpeed(speedIdx + 1);
    return false;
  }
  if (keyCode === DOWN_ARROW) {
    setSpeed(speedIdx - 1);
    return false;
  }
  if (key === ' ') {
    stepOnce();
    return false;
  }
}


function buildButtons() {
  playBtn = createButton('▶ 재생 (Enter)').parent('ui').mousePressed(toggleRun);
  createButton('▲ 빠르게 (↑)').parent('ui').mousePressed(() => setSpeed(speedIdx + 1));
  createButton('▼ 느리게 (↓)').parent('ui').mousePressed(() => setSpeed(speedIdx - 1));
  createButton('Matrix stack + 1 step (Space)').parent('ui').mousePressed(stepOnce);   // 정지 중에만 동작

  // 버튼을 클릭한 뒤 Space/Enter 가 그 버튼을 또 누르지 않도록 포커스 해제
  window.addEventListener('click', () => {
    if (document.activeElement?.tagName === 'BUTTON') {
      document.activeElement.blur();
    }
  });

  // 스택 패널 우측 상단에 보여줄 천체 선택 드롭박스 (#stage 안에 absolute 로 배치)
  const sel = createSelect().parent('stage').id('view-select');
  sel.option('스택 보기: 전체', 'all');
  sel.option('☀ Sun (태양)', 'Sun');
  PLANETS.forEach((p) => sel.option(`${p.name} (${p.kr})`, p.name));

  sel.changed(() => {
    view = sel.value();
    stepClock = 0;
    sel.elt.blur();
  });
}
