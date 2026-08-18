const views = {
  home: document.getElementById("home-view"),
  practice: document.getElementById("practice-view"),
  result: document.getElementById("result-view"),
};

const els = {
  homeActions: document.getElementById("home-actions"),
  practiceActions: document.getElementById("practice-actions"),
  cards: document.getElementById("category-cards"),
  romajiHome: document.getElementById("romaji-home"),
  romajiModal: document.getElementById("romaji-modal"),
  overlay: document.getElementById("table-overlay"),
  tipsOverlay: document.getElementById("tips-overlay"),
  yomi: document.getElementById("yomi"),
  ja: document.getElementById("ja"),
  ko: document.getElementById("ko"),
  keyboard: document.getElementById("keyboard"),
  categoryLabel: document.getElementById("category-label"),
  progressLabel: document.getElementById("progress-label"),
  progressBar: document.getElementById("progress-bar"),
  retryWrong: document.getElementById("retry-wrong-btn"),
  retryAll: document.getElementById("retry-all-btn"),
  resultHome: document.getElementById("result-home-btn"),
  resultCopy: document.getElementById("result-copy"),
  statTotal: document.getElementById("stat-total"),
  statOk: document.getElementById("stat-ok"),
  statMiss: document.getElementById("stat-miss"),
  romaToggle: document.getElementById("roma-toggle"),
};

const state = {
  category: null,
  queue: [],
  index: 0,
  cursor: 0,
  missed: false,
  missedItems: [],
  locked: false,
  mode: "all",
  showRoma: localStorage.getItem("showRoma") !== "false",
};

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showView(name) {
  Object.entries(views).forEach(([key, node]) => {
    node.classList.toggle("hidden", key !== name);
  });
  const practicing = name === "practice";
  els.homeActions.classList.toggle("hidden", practicing);
  els.practiceActions.classList.toggle("hidden", !practicing);
}

function buildRomajiTable(target) {
  const table = document.createElement("table");
  table.className = "romaji-table";
  ROMAJI_TABLE.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach(([kana, roma]) => {
      const kanaTd = document.createElement("td");
      const romaTd = document.createElement("td");
      if (!kana) {
        kanaTd.className = "empty";
        romaTd.className = "empty";
      } else {
        kanaTd.className = "kana";
        romaTd.className = "roma";
        kanaTd.textContent = kana;
        romaTd.textContent = roma;
      }
      tr.append(kanaTd, romaTd);
    });
    table.append(tr);
  });
  target.replaceChildren(table);
}

function buildCards() {
  els.cards.replaceChildren(
    ...CATEGORIES.map((category) => {
      const button = document.createElement("button");
      button.className = "card";
      button.type = "button";
      button.innerHTML = `
        <div class="icon">${category.icon}</div>
        <h3>${category.titleKo}</h3>
        <p>${category.titleJa}</p>
        <span class="count">100문항 랜덤 연습</span>
      `;
      button.addEventListener("click", () => startCategory(category, "all"));
      return button;
    }),
  );
}

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

function currentItem() {
  return state.queue[state.index];
}

function applyRomaVisibility() {
  els.yomi.classList.toggle("hidden", !state.showRoma);
  els.romaToggle.setAttribute("aria-pressed", String(state.showRoma));
}

function renderJapanese(item) {
  els.ja.classList.remove("flash-wrong", "flash-ok");
  if (!item.ruby) {
    els.ja.textContent = item.ja;
    return;
  }

  const nodes = item.ruby.map((part) => {
    if (!part.f) {
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

function highlightKey(char) {
  els.keyboard.querySelectorAll(".key").forEach((key) => {
    key.classList.remove("active");
  });
  if (!char) return;
  const id = char.toLowerCase();
  const target = els.keyboard.querySelector(`[data-key="${cssEscape(id)}"]`);
  if (target) target.classList.add("active");
}

function closeOverlays() {
  els.overlay.classList.add("hidden");
  els.tipsOverlay.classList.add("hidden");
}

function anyOverlayOpen() {
  return !els.overlay.classList.contains("hidden") || !els.tipsOverlay.classList.contains("hidden");
}

function cssEscape(value) {
  if (window.CSS && CSS.escape) return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function renderItem() {
  const item = currentItem();
  if (!item) return;

  els.yomi.classList.remove("flash-wrong", "flash-ok");
  els.yomi.replaceChildren(
    ...[...item.roma].map((char, i) => {
      const span = document.createElement("span");
      span.textContent = char;
      if (i < state.cursor) span.className = "done";
      else if (i === state.cursor) span.className = "current";
      return span;
    }),
  );
  renderJapanese(item);
  els.ko.textContent = item.ko;
  applyRomaVisibility();

  const total = state.queue.length;
  els.progressLabel.textContent = `${state.index + 1} / ${total}`;
  els.progressBar.style.width = `${(state.index / total) * 100}%`;
  els.categoryLabel.textContent = `${state.category.icon} ${state.category.titleKo} · ${state.category.titleJa}`;
  highlightKey(item.roma[state.cursor]);
}

function startCategory(category, mode, sourceItems) {
  state.category = category;
  state.mode = mode;
  state.queue = shuffle(sourceItems || category.items);
  state.index = 0;
  state.cursor = 0;
  state.missed = false;
  state.missedItems = [];
  state.locked = false;
  showView("practice");
  renderItem();
}

function flashWrong() {
  const target = state.showRoma ? els.yomi : els.ja;
  target.classList.remove("flash-wrong");
  void target.offsetWidth;
  target.classList.add("flash-wrong");
}

function completeItem() {
  state.locked = true;
  els.yomi.classList.add("flash-ok");
  els.ja.classList.add("flash-ok");
  highlightKey("");
  els.progressBar.style.width = `${((state.index + 1) / state.queue.length) * 100}%`;

  if (state.missed) {
    state.missedItems.push(currentItem());
  }

  window.setTimeout(() => {
    state.index += 1;
    state.cursor = 0;
    state.missed = false;
    state.locked = false;
    if (state.index >= state.queue.length) {
      showResult();
      return;
    }
    renderItem();
  }, 720);
}

function showResult() {
  const total = state.queue.length;
  const miss = state.missedItems.length;
  const ok = total - miss;
  els.statTotal.textContent = String(total);
  els.statOk.textContent = String(ok);
  els.statMiss.textContent = String(miss);
  els.retryWrong.classList.toggle("hidden", miss === 0);
  els.resultCopy.textContent =
    miss === 0
      ? "전부 정확하게 쳤습니다. 처음부터 다시 연습할 수 있습니다."
      : `실수가 있었던 문항이 ${miss}개입니다. 틀린 것만 다시 연습할 수 있습니다.`;
  showView("result");
}

function isTypingKey(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (event.key === "Process" || event.isComposing) return false;
  if (event.key.length === 1) return true;
  return false;
}

function onKeyDown(event) {
  if (event.key === "Escape") {
    if (anyOverlayOpen()) {
      closeOverlays();
      return;
    }
    if (!views.practice.classList.contains("hidden")) {
      showView("home");
    }
    return;
  }
  if (views.practice.classList.contains("hidden") || state.locked) return;
  if (anyOverlayOpen()) return;
  if (!isTypingKey(event)) return;

  event.preventDefault();
  const item = currentItem();
  const expected = item.roma[state.cursor];
  const got = event.key === "_" ? "-" : event.key;

  if (got.toLowerCase() === expected.toLowerCase()) {
    state.cursor += 1;
    if (state.cursor >= item.roma.length) {
      [...els.yomi.children].forEach((node) => {
        node.className = "done";
      });
      completeItem();
      return;
    }
    renderItem();
    return;
  }

  state.missed = true;
  flashWrong();
}

document.getElementById("home-btn").addEventListener("click", () => showView("home"));
document.getElementById("result-home-btn").addEventListener("click", () => showView("home"));
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
els.retryAll.addEventListener("click", () => {
  startCategory(state.category, "all");
});
els.retryWrong.addEventListener("click", () => {
  startCategory(state.category, "wrong", state.missedItems);
});
els.romaToggle.addEventListener("click", () => {
  state.showRoma = !state.showRoma;
  localStorage.setItem("showRoma", String(state.showRoma));
  applyRomaVisibility();
  els.romaToggle.blur();
});

window.addEventListener("keydown", onKeyDown);

buildRomajiTable(els.romajiHome);
buildRomajiTable(els.romajiModal);
buildCards();
buildKeyboard();
applyRomaVisibility();
showView("home");
