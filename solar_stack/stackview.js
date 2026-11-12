// 오른쪽 패널: 스택을 "중첩된 for 문" 처럼 깊이별 들여쓰기로 보여준다.
const IND = 26;   // 한 단계(탭) 들여쓰기 폭
const LH = 19;    // 줄 높이

function withAlpha(hex, a) { const c = color(hex); c.setAlpha(a); return c; }

function drawStackPanel(px, pw, ph, ops, k, view = 'all') {
  const { frames, event } = replay(ops, k);
  noStroke(); fill(10, 13, 22); rect(px, 0, pw, ph);
  stroke(40, 50, 80); strokeWeight(1); line(px, 0, px, ph);
  noStroke(); textAlign(LEFT, BASELINE);
  fill(225); textSize(15); text('Matrix Stack', px + 20, 32);
  fill(120, 130, 165); textSize(12);
  text(`depth ${frames.length - 1}    step ${Math.min(k + 1, ops.length)}/${ops.length}    보기: ${view === 'all' ? '전체' : view}`, px + 140, 32);

  // 1) 레이아웃: 프레임마다 시작/끝 y 를 정한다
  let y = 70;
  frames.forEach((f, i) => {
    f.x = px + 20 + i * IND;
    f.y0 = y; y += LH;
    y += f.lines.length * LH;
    f.y1 = y;
  });
  const top = frames[frames.length - 1];

  // 2) 맨 위 프레임 강조 + 블록 세로 가이드선 (코드의 { } 블록처럼)
  noStroke(); fill(withAlpha(top.color, 38));
  rect(px + 8, top.y0 - 14, pw - 16, top.y1 - top.y0 + 2, 4);
  frames.forEach((f, i) => {
    if (i === 0) return;
    stroke(withAlpha(f.color, 110)); strokeWeight(2);
    line(f.x - 8, f.y0 - 10, f.x - 8, top.y1 - 8);
  });

  // 3) 글자
  noStroke(); textSize(13);
  frames.forEach((f, i) => {
    fill(f.color);
    text(i === 0 ? 'Screen   (M = I)' : `push()  // ${f.label}`, f.x, f.y0);
    if (f === top && i > 0) { fill(255, 255, 255, 200); textSize(11); text('◀ top', px + pw - 56, f.y0); textSize(13); }
    f.lines.forEach((ln, j) => {
      fill(ln.draw ? color(255, 235, 160) : color(175, 185, 205));
      text(ln.text, f.x + IND, f.y0 + (j + 1) * LH);
    });
  });

  // 4) 방금 일어난 일
  const by = 410;
  noStroke(); fill(withAlpha(event.color, 30)); rect(px + 12, by, pw - 24, 58, 6);
  fill(event.color); textSize(13);
  text(event.text, px + 22, by + 8, pw - 44, 46);

  // 5) 맨 위 행렬 3x3
  const M = top.M, my = 505;
  fill(225); textSize(13); text(`M_top  (${top.label})`, px + 20, my);
  const cols = [px + 84, px + 174, px + 264];
  const rows = [[M[0], M[2], M[4]], [M[1], M[3], M[5]], [0, 0, 1]];
  textSize(15); textAlign(RIGHT, BASELINE);
  rows.forEach((row, r) => row.forEach((v, c) => {
    fill(c === 2 && r < 2 ? color(255, 220, 130) : color(200, 210, 230));
    text(c === 2 ? v.toFixed(1) : v.toFixed(2), cols[c] + 40, my + 30 + r * 24);
  }));
  textAlign(LEFT, BASELINE);
  stroke(120, 130, 165); strokeWeight(1.5); noFill();
  line(px + 28, my + 12, px + 20, my + 12); line(px + 20, my + 12, px + 20, my + 84); line(px + 20, my + 84, px + 28, my + 84);
  line(px + 318, my + 12, px + 326, my + 12); line(px + 326, my + 12, px + 326, my + 84); line(px + 326, my + 84, px + 318, my + 84);
  noStroke(); fill(150, 160, 185); textSize(12);
  text(`이 좌표계의 원점 → 화면 (${M[4].toFixed(1)}, ${M[5].toFixed(1)})`, px + 20, my + 108);

  // 6) 한 줄 요약
  fill(130, 140, 165); textSize(12);
  ['push()  맨 위 행렬을 복사해 쌓음 (부모 좌표계 기억)',
   'pop()   맨 위 행렬을 버림 (부모 좌표계로 복귀)',
   'M_new = M_top · T · R   (오른쪽 연산부터 적용됨)',
   '형제(행성들)는 같은 깊이 → 서로 영향 없음'].forEach((s, i) => text(s, px + 20, 640 + i * 18));
}

// 현재 step 의 좌표계 원점에 x(빨강)/y(초록) 축 화살표를 겹쳐 그린다. (그림 ↔ 스택 연결)
function drawCursorAxes(ops, k, clipW) {
  const { frames } = replay(ops, k);
  if (frames.length < 2) return;
  const f = frames[frames.length - 1], M = f.M, ox = M[4], oy = M[5], len = 36;
  if (ox < 0 || ox > clipW) return;
  const arrow = (dx, dy, c) => {
    stroke(c); strokeWeight(2); line(ox, oy, ox + dx * len, oy + dy * len);
    const a = Math.atan2(dy, dx);
    line(ox + dx * len, oy + dy * len, ox + dx * len - 7 * Math.cos(a - 0.45), oy + dy * len - 7 * Math.sin(a - 0.45));
    line(ox + dx * len, oy + dy * len, ox + dx * len - 7 * Math.cos(a + 0.45), oy + dy * len - 7 * Math.sin(a + 0.45));
  };
  noFill(); stroke(withAlpha(f.color, 200)); strokeWeight(1.5); circle(ox, oy, 14);
  arrow(M[0], M[1], color(255, 90, 90));
  arrow(M[2], M[3], color(90, 230, 120));
  noStroke(); fill(f.color); textSize(12); textAlign(LEFT, BASELINE);
  text(f.label, ox + 10, oy - 12);
}
