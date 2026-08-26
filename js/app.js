/**
 * Romaji Master — 메인 애플리케이션 로직
 *
 * 이 파일이 하는 일 (한눈에):
 *   1. HTML(index.html)에 있는 요소들을 JS에서 조작할 수 있게 참조를 잡는다
 *   2. 화면(홈 / 연습 / 결과)을 전환한다
 *   3. 사용자 키보드 입력을 받아 로마자 타자 정오답을 판정한다
 *   4. 진행률, 가상 키보드 하이라이트, 결과 통계를 갱신한다
 *
 * 다른 JS 파일과의 관계:
 *   - data.js    → ROMAJI_TABLE, KEYBOARD_ROWS (표·키보드 레이아웃 데이터)
 *   - categories.js → CATEGORIES (연습 카테고리 100문항씩)
 *   - extra-categories.js → 추가 카테고리 (있다면 CATEGORIES에 합쳐짐)
 *
 * 프레임워크(React, Vue 등) 없이 "Vanilla JS"로 작성됨.
 * 전역 변수 state 하나로 앱 상태를 관리하는 단순한 구조.
 */

// =============================================================================
// 1. DOM 참조 — HTML 요소를 JS 변수로 잡아 두는 구역
// =============================================================================
//
// document.getElementById("id") 는 HTML의 id="..." 요소를 찾아 반환한다.
// 반환값은 DOM 노드(객체)이므로, 나중에 .textContent, .classList 등으로 조작 가능.
//
// views / els 는 "객체 리터럴" { key: value, ... } 형태.
// els.yomi 처럼 점 표기법으로 각 요소에 접근한다.

/** 화면(section) 3종 — CSS 클래스 "hidden" 으로 보이기/숨기기 */
const views = {
  home: document.getElementById("home-view"),       // 카테고리 목록
  picker: document.getElementById("picker-view"),   // 노래 등 하위 목록
  practice: document.getElementById("practice-view"), // 타자 연습
  result: document.getElementById("result-view"),     // 결과 통계
};

/** 자주 건드리는 UI 요소 모음 — 매번 getElementById 반복 호출을 피하기 위함 */
const els = {
  homeActions: document.getElementById("home-actions"),         // 홈 상단 버튼 묶음
  practiceActions: document.getElementById("practice-actions"), // 연습 상단 버튼 묶음
  cards: document.getElementById("category-cards"),             // 카테고리 카드 컨테이너
  romajiHome: document.getElementById("romaji-home"),           // 홈에 박혀 있는 로마자 표
  romajiModal: document.getElementById("romaji-modal"),         // 모달 안 로마자 표
  overlay: document.getElementById("table-overlay"),            // 로마자 표 오버레이
  tipsOverlay: document.getElementById("tips-overlay"),         // 입력 규칙 팁 오버레이
  yomi: document.getElementById("yomi"),   // 로마자 요미가타 (예: konnichiha)
  ja: document.getElementById("ja"),       // 일본어 본문 (후리가나 포함 가능)
  ko: document.getElementById("ko"),       // 한국어 뜻
  keyboard: document.getElementById("keyboard"), // 하단 가상 키보드
  categoryLabel: document.getElementById("category-label"),
  progressLabel: document.getElementById("progress-label"), // "3 / 100"
  progressBar: document.getElementById("progress-bar"),     // 진행률 막대 (width % 조절)
  retryWrong: document.getElementById("retry-wrong-btn"),
  retryAll: document.getElementById("retry-all-btn"),
  resultHome: document.getElementById("result-home-btn"),
  resultCopy: document.getElementById("result-copy"), // 결과 설명 문장
  statTotal: document.getElementById("stat-total"),
  statOk: document.getElementById("stat-ok"),
  statMiss: document.getElementById("stat-miss"),
  romaToggle: document.getElementById("roma-toggle"), // ローマ字 표시 ON/OFF
  keyToggle: document.getElementById("key-toggle"),   // 다음 키 주황 하이라이트 ON/OFF
  speed: document.getElementById("speed-label"),      // 문항별 타자 속도
  statSpeed: document.getElementById("stat-speed"),   // 결과 화면 평균 타/분
  resultTitle: document.getElementById("result-title"),
  continueBtn: document.getElementById("continue-btn"),
  proseBody: document.getElementById("prose-body"),
  keyboardWrap: document.getElementById("keyboard-wrap"),
  pickerCards: document.getElementById("picker-cards"),
  pickerTitle: document.getElementById("picker-title"),
  pickerSub: document.getElementById("picker-sub"),
  lyricViewport: document.getElementById("lyric-viewport"),
};

// =============================================================================
// 2. 앱 상태(state) — 연습 진행에 필요한 값을 한 객체에 모음
// =============================================================================
//
// React의 useState 대신, 전역 객체 state를 직접 수정하는 방식.
// state.xxx = ... 로 값을 바꾼 뒤 renderItem() 등으로 화면을 다시 그린다.
//
// 문항(item) 데이터 구조 예시 (categories.js의 I() 함수가 만듦):
//   {
//     ja: "こんにちは",
//     roma: "konnichiha",   // 사용자가 타이핑해야 할 문자열
//     ko: "안녕하세요",
//     ruby: [ { t: "こ", f: "..." }, ... ]  // 선택적 — 후리가나 표시용
//   }

const state = {
  category: null,
  // 현재 선택된 카테고리 객체. categories.js 항목 하나.
  // 예: { icon: "🌅", titleKo: "일상 회화", titleJa: "...", items: [...] }

  queue: [],
  // 이번 연습 세션에서 풀 문항 배열. startCategory()에서 shuffle()로 순서 섞음.

  index: 0,
  // queue 배열에서 "지금 몇 번째 문항인지" (0부터 시작)

  cursor: 0,
  // 현재 문항의 roma 문자열에서 "몇 번째 글자까지 입력했는지"
  // 예: roma="konnichiha", cursor=3 → "kon"까지 입력 완료, 다음은 'n'

  missed: false,
  // 현재 문항에서 한 글자라도 틀렸으면 true.
  // 문항을 끝까지 맞춰도 missed가 true면 "틀린 문항"으로 기록됨.

  missedItems: [],
  // 이번 세션에서 틀렸던 문항 객체들의 배열. 결과 화면 "틀린 것만 재연습"에 사용.

  locked: false,
  // true이면 키 입력 무시. 정답 직후 720ms 동안 애니메이션 재생 중에 사용.

  mode: "all",
  // "all"  → 카테고리 전체 문항 연습
  // "wrong" → missedItems만 골라 재연습

  showRoma: localStorage.getItem("showRoma") !== "false",
  // 로마자 요미가타(yomi 영역) 표시 여부.
  // localStorage: 브라우저에 key-value 저장 (새로고침해도 유지).
  // getItem("showRoma")가 null(처음)이면 !== "false" → true (기본 표시).
  // 사용자가 끄면 "false" 문자열이 저장됨.

  showKeyHint: localStorage.getItem("showKeyHint") !== "false",
  // 가상 키보드에서 "다음에 칠 키" 주황 하이라이트 표시 여부.

  itemStartedAt: null,
  // 현재 문항의 첫 키 입력 시각 (performance.now). 첫 타자 전까지는 null.

  speeds: [],
  // 이번 세션 문항별 { chars, ms, cpm }. 결과 화면 평균 속도 계산에 사용.

  lastSpeed: null,
  // 직전에 완료한 문항의 { cpm, ms }. 다음 문항 화면에도 남겨 둠.

  awaitingContinue: false,
  // 20문항 중간 체크 화면에서 true. Enter / 계속하기 로 이어서 연습.

  pickerParent: null,
  // 하위 곡 목록을 연 부모 카테고리. 연습에서 뒤로 갈 때 사용.
};

/** 가사 모드에서 각 소절 DOM (line, units) */
let proseLineEls = [];

// =============================================================================
// 3. 유틸리티 함수
// =============================================================================

/**
 * Fisher-Yates 셔플 알고리즘
 *
 * 배열 순서를 무작위로 섞되, 원본 배열은 건드리지 않음.
 * [...list] 는 "스프레드 연산자" — list를 펼쳐 새 배열 copy를 만듦.
 *
 * @param {Array} list — 섞을 배열
 * @returns {Array} — 순서가 섞인 새 배열
 */
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    // 구조 분해 할당으로 두 요소 위치 교환: [a, b] = [b, a]
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** 중간 체크 간격 (문항 수) */
const CHECKPOINT_SIZE = 20;

/**
 * CSS 선택자 문자열에 넣을 값 이스케이프
 *
 * querySelector(`[data-key="${value}"]`) 에 value에 특수문자가 있으면
 * 선택자 문법이 깨질 수 있어서 CSS.escape()로 안전하게 변환.
 * 구형 브라우저용 fallback도 포함.
 */
function cssEscape(value) {
  if (window.CSS && CSS.escape) return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

/** 현재 풀고 있는 문항 객체 반환. 없으면 undefined */
function currentItem() {
  return state.queue[state.index];
}

/** 노래 가사: 한 곡만, 현재 소절을 화면 가운데에 둠 */
function isLyricMode() {
  return state.category?.mode === "lyric";
}

/**
 * 타자 속도(타/분) 계산
 *
 * 타/분 = 로마자 글자 수 / 소요 분.
 * 첫 키부터 마지막 정답 키까지 잰다. 오답으로 멈춘 시간도 포함.
 */
function calcCpm(chars, ms) {
  return Math.round((chars * 60000) / Math.max(ms, 1));
}

/**
 * 문항 속도 라벨 갱신
 *
 * @param {{cpm:number, ms:number}|null} speed
 * @param {boolean} fresh — 방금 완료한 문항이면 팝 애니메이션
 */
function renderSpeedLabel(speed, fresh) {
  if (!speed) {
    els.speed.replaceChildren();
    els.speed.classList.remove("is-fresh");
    return;
  }

  const cpmEl = document.createElement("span");
  cpmEl.className = "cpm";
  cpmEl.textContent = String(speed.cpm);
  const rest = document.createTextNode(` 타/분 · ${(speed.ms / 1000).toFixed(1)}초`);
  els.speed.replaceChildren(cpmEl, rest);

  els.speed.classList.remove("is-fresh");
  if (fresh) {
    void els.speed.offsetWidth;
    els.speed.classList.add("is-fresh");
  }
}

// =============================================================================
// 4. 화면 전환 & UI 빌드 (초기 1회 + DOM 생성)
// =============================================================================

/**
 * 화면(section) 전환
 *
 * @param {"home"|"practice"|"result"} name — 보여 줄 화면 이름
 *
 * classList.toggle("hidden", condition):
 *   condition이 true → "hidden" 클래스 추가(숨김)
 *   condition이 false → "hidden" 클래스 제거(표시)
 *
 * Object.entries(views) → [["home", node], ["practice", node], ...]
 */
function showView(name) {
  Object.entries(views).forEach(([key, node]) => {
    node.classList.toggle("hidden", key !== name);
  });
  const practicing = name === "practice";
  // 연습 중일 때는 홈용 버튼 숨기고, 연습용 버튼(홈/표/토글) 표시
  els.homeActions.classList.toggle("hidden", practicing);
  els.practiceActions.classList.toggle("hidden", !practicing);
  document.body.classList.toggle("fit-screen", name === "practice" || name === "result");
}

function leavePractice() {
  if (state.pickerParent) showView("picker");
  else showView("home");
}

/**
 * 로마자 변환표 HTML 테이블 생성
 *
 * data.js의 ROMAJI_TABLE 구조:
 *   [ [ ["あ","a"], ["い","i"], ... ], [ 다음 줄 ... ], ... ]
 *
 * document.createElement("table") 로 DOM 노드를 JS에서 새로 만든 뒤
 * target.replaceChildren(table) 으로 target 안 내용을 통째로 교체.
 *
 * @param {HTMLElement} target — 표를 넣을 부모 요소 (romajiHome 또는 romajiModal)
 */
function buildRomajiTable(target) {
  const table = document.createElement("table");
  table.className = "romaji-table";

  ROMAJI_TABLE.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach(([kana, roma]) => {
      // [kana, roma] 는 배열 구조 분해 — forEach 콜백 인자가 2칸짜리 배열
      const kanaTd = document.createElement("td");
      const romaTd = document.createElement("td");
      if (!kana) {
        // 빈 칸 (표 레이아웃용)
        kanaTd.className = "empty";
        romaTd.className = "empty";
      } else {
        kanaTd.className = "kana";
        romaTd.className = "roma";
        kanaTd.textContent = kana;
        romaTd.textContent = roma;
      }
      tr.append(kanaTd, romaTd); // tr에 td 두 개 한 번에 추가
    });
    table.append(tr);
  });

  target.replaceChildren(table);
}

/**
 * 홈 화면 카테고리 카드 버튼 생성
 *
 * CATEGORIES.map(...) → 카테고리마다 button DOM 하나씩 만든 배열
 * ...CATEGORIES.map(...) → 스프레드로 배열을 펼쳐 replaceChildren 인자로 전달
 *
 * innerHTML: HTML 문자열을 요소 안에 삽입 (여기선 category 데이터로 채움)
 * addEventListener("click", ...): 클릭 시 startCategory 실행
 *   화살표 함수 () => ... 는 this 바인딩 없이 짧게 쓰는 함수 문법
 */
function buildCards() {
  els.cards.replaceChildren(
    ...CATEGORIES.map((category) => {
      const button = document.createElement("button");
      button.className = "card";
      button.type = "button";
      const isPicker = category.kind === "picker";
      const n = isPicker ? category.children.length : category.items.length;
      const countText = isPicker
        ? `${n}곡 · 가사 연습`
        : `${n}문항 랜덤 연습`;
      button.innerHTML = `
        <div class="icon">${category.icon}</div>
        <h3>${category.titleKo}</h3>
        <p>${category.titleJa}</p>
        <span class="count">${countText}</span>
      `;
      button.addEventListener("click", () => {
        if (isPicker) openPicker(category);
        else startCategory(category, "all");
      });
      return button;
    }),
  );
}

function openPicker(category) {
  state.pickerParent = category;
  els.pickerTitle.textContent = category.titleKo;
  els.pickerSub.textContent = category.titleJa;
  els.pickerCards.replaceChildren(
    ...category.children.map((song) => {
      const button = document.createElement("button");
      button.className = "card";
      button.type = "button";
      const artist = song.artist ? `<span class="picker-artist">${song.artist}</span>` : "";
      button.innerHTML = `
        <div class="icon">${song.icon}</div>
        <h3>${song.titleKo}</h3>
        <p>${song.titleJa}</p>
        ${artist}
        <span class="count">${song.items.length}소절 · 가사 연습</span>
      `;
      button.addEventListener("click", () => startCategory(song, "all"));
      return button;
    }),
  );
  showView("picker");
}

/**
 * 하단 가상 키보드 DOM 생성
 *
 * KEYBOARD_ROWS (data.js): 2차원 배열. 각 key 객체 예:
 *   { id: "a", label: "a" }
 *   { id: "shift", label: "Shift", wide: "wide" }
 *   { blank: true }  → 빈 칸
 *
 * node.dataset.key = key.id
 *   → HTML data-key="a" 속성. highlightKey()에서 querySelector로 찾음.
 *
 * Object.assign(document.createElement("div"), { className: "fingers" })
 *   → div 만들고 className을 "fingers"로 설정한 뒤 keyboard에 추가
 */
function buildKeyboard() {
  els.keyboard.replaceChildren(
    ...KEYBOARD_ROWS.map((row) => {
      const line = document.createElement("div");
      line.className = "kb-row";
      row.forEach((key) => {
        const node = document.createElement("div");
        node.className = "key";
        if (key.blank) node.classList.add("blank");
        if (key.wide) node.classList.add(key.wide);
        node.dataset.key = key.id;
        node.textContent = key.label;
        line.append(node);
      });
      return line;
    }),
    Object.assign(document.createElement("div"), { className: "fingers" }),
  );
  els.keyboard.querySelector(".fingers").innerHTML = "<i></i><i></i><i></i><i></i>";
}

// =============================================================================
// 5. 렌더링 — state 값을 읽어 화면 DOM을 갱신
// =============================================================================

/** 로마자(yomi) 영역 표시/숨김 + 토글 버튼 접근성 속성 갱신 */
function applyRomaVisibility() {
  els.yomi.classList.toggle("hidden", !state.showRoma);
  // aria-pressed: 스위치 UI가 켜졌는지 스크린리더에 알림
  els.romaToggle.setAttribute("aria-pressed", String(state.showRoma));
}

/**
 * 일본어 본문(els.ja) 렌더링
 *
 * item.ruby 가 없으면 → item.ja 문자열만 textContent로 표시
 *
 * item.ruby 가 있으면 → HTML <ruby> 요소로 후리가나 표시
 *   ruby 배열 한 요소: { t: "願", f: "ねが" }
 *     t = 본문 글자, f = 후리가나(요미)
 *   categories.js의 I() 함수가 "お|願:ねが|いします" 같은 문자열을 파싱해 만듦
 *
 * replaceChildren(...nodes): 자식 노드를 통째로 바꿈 (text + ruby 요소 섞일 수 있음)
 */
function renderJapanese(item) {
  els.ja.classList.remove("flash-wrong", "flash-ok");

  if (!item.ruby) {
    els.ja.textContent = item.ja;
    return;
  }

  const nodes = item.ruby.map((part) => {
    if (!part.f) {
      // 후리가나 없는 일반 텍스트 조각
      return document.createTextNode(part.t);
    }
    const ruby = document.createElement("ruby");
    ruby.append(part.t);
    const rt = document.createElement("rt");
    rt.textContent = part.f;
    ruby.append(rt);
    return ruby;
  });

  els.ja.replaceChildren(...nodes);
}

/** 가사 하이라이트 단위: 한자 덩어리(후리가나)는 묶고, 가나는 글자 단위 */
function jaUnits(item) {
  if (!item.ruby) return [...item.ja].map((ch) => ({ t: ch }));
  const units = [];
  item.ruby.forEach((part) => {
    if (part.f) units.push(part);
    else units.push(...[...part.t].map((ch) => ({ t: ch })));
  });
  return units;
}

function createProseUnit(part) {
  if (!part.f) {
    const span = document.createElement("span");
    span.className = "prose-unit";
    span.textContent = part.t;
    return span;
  }
  const ruby = document.createElement("ruby");
  ruby.className = "prose-unit";
  ruby.append(part.t);
  const rt = document.createElement("rt");
  rt.textContent = part.f;
  ruby.append(rt);
  return ruby;
}

function applyPracticeLayout() {
  const lyric = isLyricMode();
  views.practice.classList.toggle("lyric-mode", lyric);
  els.keyboardWrap.classList.toggle("hidden", lyric);
  els.proseBody.classList.toggle("hidden", !lyric);
  if (!lyric) els.proseBody.style.transform = "";
}

function applyRomaPreference() {
  if (isLyricMode()) {
    state.showRoma = localStorage.getItem("showRomaProse") === "true";
  } else {
    state.showRoma = localStorage.getItem("showRoma") !== "false";
  }
}

function buildProseBody() {
  proseLineEls = [];
  els.proseBody.style.transform = "";
  const frag = document.createDocumentFragment();
  const bucket = document.createElement("div");
  bucket.className = "prose-verse";
  frag.append(bucket);

  state.queue.forEach((item, qi) => {
    const line = document.createElement("span");
    line.className = "prose-line is-wait";
    line.dataset.index = String(qi);
    const unitEls = jaUnits(item).map((part) => {
      const el = createProseUnit(part);
      line.append(el);
      return el;
    });
    bucket.append(line);
    proseLineEls.push({ line, units: unitEls });
  });

  els.proseBody.replaceChildren(frag);
}

function centerLyricLine() {
  const row = proseLineEls[state.index];
  const viewport = els.lyricViewport;
  if (!row || !viewport) return;
  const viewH = viewport.clientHeight;
  if (viewH < 40) return;
  const lineCenter = row.line.offsetTop + row.line.offsetHeight / 2;
  els.proseBody.style.transform = `translateY(${viewH / 2 - lineCenter}px)`;
}

function scrollCurrentProseLine() {
  if (!isLyricMode()) return;
  centerLyricLine();
}

function updateProseHighlight() {
  const idx = state.index;
  const cursor = state.cursor;
  const item = currentItem();
  const romaLen = item ? item.roma.length : 0;

  proseLineEls.forEach((row, i) => {
    row.line.classList.toggle("is-done", i < idx);
    row.line.classList.toggle("is-current", i === idx);
    row.line.classList.toggle("is-wait", i > idx);
    if (i === idx) row.line.classList.remove("flash-wrong");

    row.units.forEach((el, u) => {
      el.classList.remove("is-done", "is-current");
      if (i < idx) {
        el.classList.add("is-done");
        return;
      }
      if (i !== idx || !romaLen) return;
      const n = row.units.length;
      const doneCount = Math.min(n, Math.floor((cursor / romaLen) * n));
      if (cursor >= romaLen || u < doneCount) {
        el.classList.add("is-done");
      } else if (u === doneCount) {
        el.classList.add("is-current");
      }
    });
  });

  scrollCurrentProseLine(false);
}

/**
 * 가상 키보드에서 "다음에 눌러야 할 키" 하이라이트
 *
 * 1. 모든 .key에서 active 클래스 제거
 * 2. char에 해당하는 data-key 요소 찾아 active 추가
 * char가 빈 문자열이면 전부 끄기만 함 (문항 완료 시)
 */
function highlightKey(char) {
  if (isLyricMode()) return;
  els.keyboard.querySelectorAll(".key").forEach((key) => {
    key.classList.remove("active");
  });
  if (!char || !state.showKeyHint) return;

  const id = char.toLowerCase();
  const target = els.keyboard.querySelector(`[data-key="${cssEscape(id)}"]`);
  if (target) target.classList.add("active");
}

/** 키 힌트 토글 버튼 상태 + 현재 문항의 하이라이트 즉시 반영 */
function applyKeyHint() {
  els.keyToggle.setAttribute("aria-pressed", String(state.showKeyHint));
  const item = currentItem();
  if (!item || views.practice.classList.contains("hidden") || state.locked) {
    highlightKey("");
    return;
  }
  highlightKey(item.roma[state.cursor]);
}

/** 모달(오버레이) 닫기 — hidden 클래스 추가 */
function closeOverlays() {
  els.overlay.classList.add("hidden");
  els.tipsOverlay.classList.add("hidden");
}

/** 로마자 표 또는 팁 오버레이 중 하나라도 열려 있는지 */
function anyOverlayOpen() {
  return !els.overlay.classList.contains("hidden") || !els.tipsOverlay.classList.contains("hidden");
}

/**
 * 현재 문항 전체 UI 갱신 — 연습 화면의 핵심 렌더 함수
 *
 * 하는 일:
 *   1. yomi: roma 문자열을 span으로 쪼개 done/current 스타일 적용
 *   2. ja, ko: 일본어·한국어 표시
 *   3. 진행률 라벨·바, 카테고리 이름
 *   4. 다음 키 하이라이트
 *
 * [...item.roma]: 문자열을 문자 배열로 변환 (유니코드 단위)
 *   "konnichiha" → ['k','o','n','n','i','c','h','i','h','a']
 */
function renderItem() {
  const item = currentItem();
  if (!item) return;

  els.yomi.classList.remove("flash-wrong", "flash-ok");
  els.yomi.replaceChildren(
    ...[...item.roma].map((char, i) => {
      const span = document.createElement("span");
      span.textContent = char;
      if (i < state.cursor) span.className = "done";       // 이미 입력한 글자
      else if (i === state.cursor) span.className = "current"; // 지금 입력할 글자
      return span;
    }),
  );

  if (isLyricMode()) {
    updateProseHighlight();
  } else {
    renderJapanese(item);
  }
  els.ko.textContent = item.ko;
  applyRomaVisibility();

  const total = state.queue.length;
  els.progressLabel.textContent = `${state.index + 1} / ${total}`;
  // 진행 바: 현재 index 기준 (문항 완료 전까지는 index/total)
  els.progressBar.style.width = `${(state.index / total) * 100}%`;
  els.categoryLabel.textContent = isLyricMode()
    ? `${state.category.icon} ${state.category.titleJa} · ${state.category.titleKo}`
    : `${state.category.icon} ${state.category.titleKo} · ${state.category.titleJa}`;
  highlightKey(item.roma[state.cursor]);
}

// =============================================================================
// 6. 연습 흐름 — 시작 / 정오답 / 결과
// =============================================================================

/**
 * 카테고리 연습 세션 시작
 *
 * @param {object} category — CATEGORIES 항목
 * @param {"all"|"wrong"} mode
 * @param {object[]|undefined} sourceItems
 *   - undefined → category.items 전체 사용
 *   - 배열 전달 → 그 배열만 사용 (틀린 것만 재연습)
 */
function startCategory(category, mode, sourceItems) {
  const fromPicker = state.pickerParent?.children?.some((song) => song.id === category.id);
  if (!fromPicker) state.pickerParent = null;
  state.category = category;
  state.mode = mode;
  const source = sourceItems || category.items;
  state.queue = category.keepOrder ? [...source] : shuffle(source);
  state.index = 0;
  state.cursor = 0;
  state.missed = false;
  state.missedItems = [];
  state.locked = false;
  state.itemStartedAt = null;
  state.speeds = [];
  state.lastSpeed = null;
  state.awaitingContinue = false;
  applyRomaPreference();
  applyPracticeLayout();
  if (isLyricMode()) buildProseBody();
  else els.proseBody.replaceChildren();
  showView("practice");
  renderSpeedLabel(null, false);
  renderItem();
  if (isLyricMode()) {
    requestAnimationFrame(() => {
      centerLyricLine();
      requestAnimationFrame(centerLyricLine);
    });
  }
}

/**
 * 오답 시 빨간 flash 애니메이션
 *
 * CSS animation은 같은 class를 다시 붙여도 재생되지 않을 수 있음.
 * 그래서 class 제거 → offsetWidth 읽기(강제 reflow) → class 다시 추가.
 *
 * void target.offsetWidth:
 *   offsetWidth 값은 쓰지 않지만, 읽는 순간 브라우저가 레이아웃을 다시 계산(reflow).
 *
 * showRoma가 false면 yomi 대신 ja(일본어)에 flash — 로마자 숨긴 연습 모드용
 */
function flashWrong() {
  if (isLyricMode()) {
    const line = proseLineEls[state.index]?.line;
    if (!line) return;
    line.classList.remove("flash-wrong");
    void line.offsetWidth;
    line.classList.add("flash-wrong");
    if (state.showRoma) {
      els.yomi.classList.remove("flash-wrong");
      void els.yomi.offsetWidth;
      els.yomi.classList.add("flash-wrong");
    }
    return;
  }
  const target = state.showRoma ? els.yomi : els.ja;
  target.classList.remove("flash-wrong");
  void target.offsetWidth;
  target.classList.add("flash-wrong");
}

/**
 * 한 문항을 끝까지 맞췄을 때
 *
 * 1. locked=true 로 추가 입력 차단
 * 2. flash-ok 클래스로 정답 피드백
 * 3. 이번 문항에서 틀린 적 있으면 missedItems에 push
 * 4. 1000ms 후 다음 문항으로 index++, cursor=0, renderItem()
 *    20문항마다 중간 체크, queue 끝이면 챕터 완료
 */
function completeItem() {
  const item = currentItem();
  const elapsedMs = Math.max(performance.now() - (state.itemStartedAt ?? performance.now()), 1);
  const speed = { chars: item.roma.length, ms: elapsedMs, cpm: calcCpm(item.roma.length, elapsedMs) };
  state.speeds.push(speed);
  state.lastSpeed = speed;
  renderSpeedLabel(speed, true);
  els.progressBar.style.width = `${((state.index + 1) / state.queue.length) * 100}%`;

  if (state.missed) {
    state.missedItems.push(item);
  }

  if (isLyricMode()) {
    updateProseHighlight();
    advanceSession();
    return;
  }

  state.locked = true;
  els.yomi.classList.add("flash-ok");
  els.ja.classList.add("flash-ok");
  highlightKey("");

  window.setTimeout(advanceSession, 1000);
}

function advanceSession() {
  state.index += 1;
  state.cursor = 0;
  state.missed = false;
  state.locked = false;
  state.itemStartedAt = null;

  if (state.index >= state.queue.length) {
    showSummary(true);
    return;
  }
  if (!isLyricMode() && state.index % CHECKPOINT_SIZE === 0) {
    showSummary(false);
    return;
  }
  renderSpeedLabel(state.lastSpeed, false);
  renderItem();
}

/**
 * 결과 / 중간 체크 화면
 *
 * @param {boolean} isFinal — true면 챕터 전체 종료, false면 20문항 세트 완료
 *
 * 중간 체크는 방금 끝난 20문항만 집계한다.
 * 챕터 완료는 세션 전체를 집계한다.
 */
function showSummary(isFinal) {
  const done = state.index;
  const from = isFinal ? 0 : done - CHECKPOINT_SIZE;
  const range = state.queue.slice(from, done);
  const miss = range.filter((item) => state.missedItems.includes(item)).length;
  const ok = range.length - miss;
  const batchSpeeds = state.speeds.slice(from, done);
  const totalChars = batchSpeeds.reduce((sum, row) => sum + row.chars, 0);
  const totalMs = batchSpeeds.reduce((sum, row) => sum + row.ms, 0);
  const avgCpm = totalMs > 0 ? calcCpm(totalChars, totalMs) : 0;
  const remaining = state.queue.length - done;
  const setNow = Math.ceil(done / CHECKPOINT_SIZE);
  const setTotal = Math.ceil(state.queue.length / CHECKPOINT_SIZE);

  els.statTotal.textContent = String(range.length);
  els.statOk.textContent = String(ok);
  els.statMiss.textContent = String(miss);
  els.statSpeed.textContent = String(avgCpm);

  state.awaitingContinue = !isFinal;
  els.continueBtn.classList.toggle("hidden", isFinal);
  els.retryAll.classList.toggle("hidden", !isFinal);
  els.retryWrong.classList.toggle("hidden", !isFinal || miss === 0);

  if (isFinal) {
    els.resultTitle.textContent = "챕터 완료";
    els.resultCopy.textContent =
      miss === 0
        ? "전부 정확하게 쳤습니다. 처음부터 다시 연습할 수 있습니다."
        : `실수가 있었던 문항이 ${miss}개입니다. 틀린 것만 다시 연습할 수 있습니다.`;
  } else {
    els.resultTitle.textContent = "중간 체크";
    const missLine =
      miss === 0
        ? `이번 ${range.length}문항을 정확하게 쳤습니다.`
        : `이번 ${range.length}문항 중 실수가 ${miss}개입니다.`;
    els.resultCopy.textContent = `${missLine} 세트 ${setNow} / ${setTotal} · 남은 문항 ${remaining}개`;
  }

  showView("result");
}

/** 중간 체크 후 다음 문항부터 이어서 연습 */
function continuePractice() {
  if (!state.awaitingContinue) return;
  state.awaitingContinue = false;
  showView("practice");
  renderSpeedLabel(state.lastSpeed, false);
  renderItem();
  if (isLyricMode()) requestAnimationFrame(centerLyricLine);
}

// =============================================================================
// 7. 키보드 입력 처리
// =============================================================================

/**
 * 이 keydown 이벤트를 "타자 입력"으로 볼지 판별
 *
 * false 반환하는 경우 (무시):
 *   - Cmd/Ctrl/Alt 와 함께 누른 단축키
 *   - IME 조합 중 (isComposing, key === "Process")
 *   - Enter, Shift, Arrow 등 길이 1이 아닌 특수키
 *
 * true: event.key.length === 1 인 일반 문자 (a, A, - 등)
 */
function isTypingKey(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (event.key === "Process" || event.isComposing) return false;
  if (event.key.length === 1) return true;
  return false;
}

/**
 * 전역 keydown 핸들러 — window에 등록되어 모든 키 입력을 받음
 *
 * 처리 순서:
 *   1. Escape → 오버레이 닫기 또는 홈으로
 *   2. 연습 화면이 아니거나 locked / 오버레이 열림 → 무시
 *   3. 타자 키가 아니면 무시
 *   4. expected(정답 글자)와 got(입력) 비교
 *      - 맞으면 cursor++, 문장 끝이면 completeItem()
 *      - 틀리면 missed=true, flashWrong()
 *
 * event.preventDefault(): 브라우저 기본 동작(스크롤 등) 막기
 *
 * got = event.key === "_" ? "-" :
 *   일본어 長音(ー)은 데이터에서 하이픈 "-" 로 저장됨.
 *   Shift+_(underscore) 입력을 "-" 로 변환해 매칭.
 *
 * toLowerCase() 비교: 대소문자 구분 없이 정답 처리
 */
function onKeyDown(event) {
  // --- Escape 처리 ---
  if (event.key === "Escape") {
    if (anyOverlayOpen()) {
      closeOverlays();
      return;
    }
    if (!views.practice.classList.contains("hidden")) {
      leavePractice();
      return;
    }
    if (!views.picker.classList.contains("hidden")) {
      showView("home");
    }
    return;
  }

  // 중간 체크 화면에서 Enter → 계속하기
  if (event.key === "Enter" && state.awaitingContinue) {
    event.preventDefault();
    continuePractice();
    return;
  }

  // --- 연습 중이 아니면 타자 판정 안 함 ---
  if (views.practice.classList.contains("hidden") || state.locked) return;
  if (anyOverlayOpen()) return;
  if (!isTypingKey(event)) return;

  event.preventDefault();

  const item = currentItem();
  const expected = item.roma[state.cursor];
  const got = event.key === "_" ? "-" : event.key;

  // 첫 키(정답·오답 모두)에서 문항 타이머 시작
  if (state.itemStartedAt == null) {
    state.itemStartedAt = performance.now();
  }

  if (got.toLowerCase() === expected.toLowerCase()) {
    state.cursor += 1;

    if (state.cursor >= item.roma.length) {
      // 마지막 글자까지 맞춤 → yomi span 전부 done 처리 후 문항 완료
      [...els.yomi.children].forEach((node) => {
        node.className = "done";
      });
      completeItem();
      return;
    }

    renderItem();
    return;
  }

  // 오답 — 문항은 계속 진행 가능하지만 missed 플래그는 켜짐
  state.missed = true;
  flashWrong();
}

// =============================================================================
// 8. 이벤트 리스너 등록 — 버튼 클릭, 키보드
// =============================================================================
//
// addEventListener("click", handler):
//   해당 요소를 클릭하면 handler 함수 실행.
//
// 오버레이 클릭 시 event.target === els.overlay 조건:
//   모달 바깥(반투명 배경)만 클릭했을 때 닫기. 안쪽 표 클릭은 무시.

document.getElementById("home-btn").addEventListener("click", leavePractice);
document.getElementById("result-home-btn").addEventListener("click", leavePractice);
document.getElementById("picker-back-btn").addEventListener("click", () => showView("home"));

document.getElementById("table-btn").addEventListener("click", () => {
  els.overlay.classList.remove("hidden");
});
document.getElementById("close-table-btn").addEventListener("click", closeOverlays);
els.overlay.addEventListener("click", (event) => {
  if (event.target === els.overlay) closeOverlays();
});

document.getElementById("how-btn").addEventListener("click", () => {
  els.overlay.classList.remove("hidden");
});
document.getElementById("tips-btn").addEventListener("click", () => {
  els.tipsOverlay.classList.remove("hidden");
});
document.getElementById("close-tips-btn").addEventListener("click", closeOverlays);
els.tipsOverlay.addEventListener("click", (event) => {
  if (event.target === els.tipsOverlay) closeOverlays();
});

// 결과 화면: 이어서 / 전체 다시 / 틀린 것만
els.continueBtn.addEventListener("click", continuePractice);
els.retryAll.addEventListener("click", () => {
  startCategory(state.category, "all");
});
els.retryWrong.addEventListener("click", () => {
  startCategory(state.category, "wrong", state.missedItems);
});

// ローマ字 표시 토글 + localStorage 저장
els.romaToggle.addEventListener("click", () => {
  state.showRoma = !state.showRoma;
  const key = isLyricMode() ? "showRomaProse" : "showRoma";
  localStorage.setItem(key, String(state.showRoma));
  applyRomaVisibility();
  els.romaToggle.blur(); // 클릭 후 포커스 링 제거
});

els.keyToggle.addEventListener("click", () => {
  state.showKeyHint = !state.showKeyHint;
  localStorage.setItem("showKeyHint", String(state.showKeyHint));
  applyKeyHint();
  els.keyToggle.blur();
});

// 전역 키보드 — 연습 입력의 핵심
window.addEventListener("keydown", onKeyDown);
window.addEventListener("resize", () => {
  if (isLyricMode() && !views.practice.classList.contains("hidden")) centerLyricLine();
});

// =============================================================================
// 9. 앱 초기화 — 스크립트 로드 시 맨 아래에서 1회 실행
// =============================================================================
//
// index.html에서 script 순서:
//   data.js → categories.js → extra-categories.js → app.js
// 그래서 ROMAJI_TABLE, CATEGORIES 등 전역 변수가 이미 존재함.

buildRomajiTable(els.romajiHome);   // 홈 화면 로마자 표
buildRomajiTable(els.romajiModal);  // 모달용 로마자 표
buildCards();                        // 카테고리 카드
buildKeyboard();                     // 가상 키보드
applyRomaVisibility();               // 저장된 로마자 표시 설정 반영
applyKeyHint();                      // 저장된 키 힌트 표시 설정 반영
showView("home");                    // 첫 화면 = 홈
