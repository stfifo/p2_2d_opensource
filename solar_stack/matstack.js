// 2D 동차좌표 3x3 행렬을 [a, b, c, d, e, f] 로 저장 (canvas 와 같은 순서)
//   | a c e |
//   | b d f |      열 벡터 규약: p' = M · p
//   | 0 0 1 |
const Mat = {
  I: () => [1, 0, 0, 1, 0, 0],
  T: (x, y) => [1, 0, 0, 1, x, y],
  R: (r) => { const c = Math.cos(r), s = Math.sin(r); return [c, s, -s, c, 0, 0]; },
  mul: (m, n) => [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ],
};

const short = (v) => String(+v.toFixed(1));
const degOf = (rad) => (((rad * 180 / Math.PI) % 360) + 360) % 360;

// p5 의 push/pop/translate/rotate 를 감싸서, 호출 내역을 로그로 남긴다.
// 화면에 그리는 코드와 오른쪽 스택 패널이 "같은 호출"에서 나오므로 서로 어긋나지 않는다.
class StackLog {
  constructor() { this.ops = []; }
  reset() { this.ops = []; }
  push(label, color) { push(); this.ops.push({ op: 'push', label, color }); }
  pop() { pop(); this.ops.push({ op: 'pop' }); }
  translate(x, y) { translate(x, y); this.ops.push({ op: 'translate', x, y }); }
  rotate(rad) { rotate(rad); this.ops.push({ op: 'rotate', rad }); }
  draw(label) {
    // 검증용: 실제 canvas 의 변환 행렬을 같이 저장
    const t = drawingContext.getTransform(), d = pixelDensity();
    const real = [t.a, t.b, t.c, t.d, t.e, t.f].map((v) => v / d);
    this.ops.push({ op: 'draw', label, real });
  }
}

// 로그의 0..k 번째 호출까지 실행했을 때의 스택 상태를 재구성한다.
function replay(ops, k) {
  const frames = [{ label: 'Screen', color: '#8a93a6', lines: [], M: Mat.I() }];
  let event = { text: '대기 중', color: '#8a93a6' };
  for (let i = 0; i <= k && i < ops.length; i++) {
    const o = ops[i], top = frames[frames.length - 1];
    if (o.op === 'push') {
      frames.push({ label: o.label, color: o.color, lines: [], M: top.M.slice() });
      event = { text: `push()  "${o.label}" 프레임 생성: 맨 위 행렬을 복사해 스택에 쌓음`, color: o.color };
    } else if (o.op === 'pop') {
      const gone = frames.pop();
      event = { text: `pop()  "${gone.label}" 프레임 제거: 부모 "${frames[frames.length - 1].label}" 의 행렬로 복귀`, color: gone.color };
    } else if (o.op === 'translate') {
      top.M = Mat.mul(top.M, Mat.T(o.x, o.y));
      top.lines.push({ text: `translate(${short(o.x)}, ${short(o.y)})` });
      event = { text: `M = M * T(${short(o.x)}, ${short(o.y)})`, color: top.color };
    } else if (o.op === 'rotate') {
      top.M = Mat.mul(top.M, Mat.R(o.rad));
      top.lines.push({ text: `rotate(${degOf(o.rad).toFixed(1)}°)` });
      event = { text: `M = M * R(${degOf(o.rad).toFixed(1)}°)`, color: top.color };
    } else if (o.op === 'draw') {
      top.lines.push({ text: `draw ${o.label}`, draw: true });
      event = { text: `현재 행렬로 ${o.label} 을(를) 그림 (원점 = 이 좌표계의 중심)`, color: top.color };
    }
  }
  return { frames, event };
}

// 특정 천체(name)의 스택만 남긴 로그를 돌려준다. 조상 프레임(Camera, Sun)은 항상 남긴다.
//   name 이 'Sun'    → Camera, Sun, Sun spin
//   name 이 행성 이름 → Camera, Sun, 그 행성 프레임(토성이면 고리 프레임 포함)
function filterOps(ops, name) {
  const stack = [];
  const keep = () => {
    const top = stack[stack.length - 1];
    if (top === 'Camera' || top === 'Sun') return true;
    return name === 'Sun' ? stack.includes('Sun spin') : stack.includes(name);
  };
  const out = [];
  for (const o of ops) {
    if (o.op === 'push') { stack.push(o.label); if (keep()) out.push(o); }
    else if (o.op === 'pop') { if (keep()) out.push(o); stack.pop(); }
    else if (keep()) out.push(o);
  }
  return out;
}

// 재구성한 행렬이 p5 가 실제로 쓴 행렬과 같은지 최대 오차를 돌려준다. (콘솔에서 verifyStack(L.ops))
function verifyStack(ops) {
  let maxErr = 0;
  ops.forEach((o, i) => {
    if (o.op !== 'draw') return;
    const M = replay(ops, i).frames.at(-1).M;
    M.forEach((v, j) => { maxErr = Math.max(maxErr, Math.abs(v - o.real[j])); });
  });
  return maxErr;
}
