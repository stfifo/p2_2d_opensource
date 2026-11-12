# Solar Stack: 행렬 스택으로 보는 태양계 공전
**PNU 컴퓨터 그래픽스 Project 2 (오픈소스 활용)**

p5.js 로 태양계(태양 + 수금지화목토천해)를 그리고, 화면 오른쪽에 **`push` / `pop` / `translate` / `rotate` 로 변환 행렬 스택이 쌓이고 빠지는 과정**을 코드 들여쓰기 모양으로 보여주는 미니 프로젝트입니다.

## 실행 방법

빌드나 설치 없이 실행 가능합니다. `solar_stack/index.html` 을 브라우저로 열면 됩니다. (p5.js 를 CDN 에서 불러오므로 인터넷 연결이 필요합니다.)

```bash
# 또는 로컬 서버로 실행
cd solar_stack
python3 -m http.server 8765   # http://localhost:8765
```

## 조작

| 키 / UI | 동작 |
|---|---|
| `Enter` | 재생 / 일시정지 |
| `↑` / `↓` | 속도 조절 (7단계: 1, 2, 5, 10, 20, 50, 100 일/초) |
| `Space` (또는 버튼) | 일시정지 중 스택 패널을 한 step 진행 |
| 패널 오른쪽 위 드롭박스 | 특정 천체(Sun, 각 행성)의 스택만 보기 |

일시정지하면 오른쪽 스택 패널도 그 step 에서 멈춥니다.

## 원리 설명
- 자식 천체의 위치 = 부모 행렬 * 자기 행렬 → 태양의 `translate` 하나만 바뀌면 모든 행성이 같이 움직임
- 계산 순서 : `M_new = M_top * T * R` (오른쪽 연산부터 적용됨)
- 예시: 지구의 최종 행렬이 만들어지는 순서

	```
	M_earth = T(camera) * T(sunX, 0) * R(60°) * T(localX, localY)
	```
	- `T(camera)` : 카메라
	- T(sunX, 0) : 태양 이동
	- R(60°) : 평면 기울기 (행성들의 공전 궤도면과 태양의 진행 방향의 사이 각도)
	- T(localX, localY) : 평면 안의 공전 좌표


| 호출 | 의미 |
|---|---|
| `push()` | 맨 위 행렬을 복사해 스택에 쌓음 (부모 좌표계 기억) |
| `translate` / `rotate` | 맨 위 행렬에 오른쪽으로 곱함 (`M = M * T`, `M = M * R`) |
| `pop()` | 맨 위 행렬을 버림 (부모 좌표계로 복귀) |

- 태양의 `translate(sunX, 0)` 하나만 바뀌면 그 아래 `push` 된 행성 8개가 모두 같이 움직입니다.
- 행성들은 Sun 의 같은 깊이 자식(형제)이라 서로 영향을 주지 않습니다.
- 한 프레임은 58 step 이며, 오른쪽 패널은 그중 현재 step 까지 재구성한 스택을 보여줍니다.

## 구성

```
solar_stack/
├── index.html     p5.js(CDN) 로드, 레이아웃
├── sketch.js      setup/draw, 시간 진행, 경로(trail), 기울기, 조작
├── matstack.js    Mat, StackLog, replay, filterOps, verifyStack
├── planets.js     행성 데이터, 텍스처 생성, 행성/고리 그리기
└── stackview.js   오른쪽 스택 패널, 현재 좌표계 축 화살표
reference/         원본 과제 (PyOpenGL)
PLAN.md            기획 문서
```

## 사용한 오픈소스와 라이선스

- [p5.js](https://github.com/processing/p5.js) 1.11.3, LGPL-2.1. 수정 없이 CDN(cdnjs) 으로 불러옵니다.
