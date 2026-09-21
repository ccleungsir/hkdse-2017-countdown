(function () {
  const data = window.HKDSE_2017;
  const math = window.HKDSECountdown;
  const TZ = data.timezone;
  const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"];
  const CATEGORY_LABEL = {
    all: { zh: "全部", en: "All" },
    core: { zh: "核心科目", en: "Core" },
    science: { zh: "理科", en: "Science" },
    humanities: { zh: "人文", en: "Humanities" },
    applied: { zh: "應用學習／科技", en: "Applied" },
    arts: { zh: "藝術／體育", en: "Arts / PE" },
    reserve: { zh: "後備", en: "Reserve" },
  };

  const els = {
    clock: document.getElementById("hkt-clock"),
    grid: document.getElementById("exam-grid"),
    search: document.getElementById("subject-search"),
    filters: document.getElementById("filters"),
    countTotal: document.getElementById("stat-total"),
    countFinished: document.getElementById("stat-finished"),
    countVisible: document.getElementById("stat-visible"),
    empty: document.getElementById("empty-state"),
  };

  const sessions = data.sessions.map((session) => ({
    ...session,
    targetMs: Date.parse(session.start),
    searchText: [
      session.subjectZh,
      session.subjectEn,
      session.paperZh,
      session.paperEn,
      session.period,
      session.category,
      session.note || "",
    ]
      .join(" ")
      .toLowerCase(),
  }));

  const state = {
    query: "",
    category: "all",
    cards: [],
  };

  function hktParts(date) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const get = (type) => parts.find((part) => part.type === type)?.value || "";
    return {
      year: get("year"),
      month: get("month"),
      day: get("day"),
      hour: get("hour"),
      minute: get("minute"),
      second: get("second"),
    };
  }

  function weekdayZh(date) {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      weekday: "short",
    }).format(date);
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return WEEKDAY_ZH[map[weekday]];
  }

  function formatHktClock(nowMs) {
    const p = hktParts(new Date(nowMs));
    return `${p.year}年${Number(p.month)}月${Number(p.day)}日 ${p.hour}:${p.minute}:${p.second}`;
  }

  function formatExamWhen(iso) {
    const date = new Date(iso);
    const p = hktParts(date);
    return {
      zh: `${p.year}年${Number(p.month)}月${Number(p.day)}日（星期${weekdayZh(date)}） ${p.hour}:${p.minute}`,
      en: `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} HKT`,
    };
  }

  function matches(session) {
    if (state.category !== "all" && session.category !== state.category) {
      return false;
    }
    if (!state.query) return true;
    return session.searchText.includes(state.query);
  }

  function renderFilters() {
    const cats = ["all", "core", "science", "humanities", "applied", "arts", "reserve"];
    els.filters.innerHTML = cats
      .map((key) => {
        const label = CATEGORY_LABEL[key];
        const pressed = state.category === key;
        return `<button type="button" class="filter" data-category="${key}" aria-pressed="${pressed}">${label.zh}<span class="filter-en"> · ${label.en}</span></button>`;
      })
      .join("");
  }

  function cardHtml(session) {
    const when = formatExamWhen(session.start);
    const note =
      session.note === "note2"
        ? `<p class="timer-caption">註 2：考試日期於報名截止後才作最後確定。 / Note 2: date finalised after registration.</p>`
        : session.note === "listening"
          ? `<p class="timer-caption">聆聽卷按附件一上午場處理，預設 08:30。 / Listening paper treated as AM 08:30.</p>`
          : session.note === "reserve"
            ? `<p class="timer-caption">後備日，附件一未編排正式筆試。 / Reserve day on Annex 1.</p>`
            : "";

    return `
      <article class="card" data-id="${session.id}" data-start="${session.start}" data-category="${session.category}">
        <div class="card-top">
          <span class="badge badge-done" data-status>已完結 / Finished</span>
          <span class="period">${session.period} · ${session.start}</span>
        </div>
        <div>
          <h3>${session.subjectZh}</h3>
          <p class="en">${session.subjectEn}</p>
        </div>
        <div class="meta">
          <span>${session.paperZh} / ${session.paperEn}</span>
          <span>${when.zh}</span>
        </div>
        <p class="timer-caption" data-caption>距離開考</p>
        <div class="timer" aria-live="off">
          <div class="unit"><b data-d>0</b><span>日 Days</span></div>
          <div class="unit"><b data-h>00</b><span>時 Hours</span></div>
          <div class="unit"><b data-m>00</b><span>分 Minutes</span></div>
          <div class="unit"><b data-s>00</b><span>秒 Seconds</span></div>
        </div>
        ${note}
      </article>
    `;
  }

  function renderCards() {
    const visible = sessions.filter(matches);
    els.grid.innerHTML = visible.map(cardHtml).join("");
    els.empty.hidden = visible.length > 0;
    state.cards = Array.from(els.grid.querySelectorAll(".card")).map((node) => ({
      node,
      targetMs: Date.parse(node.dataset.start),
      status: node.querySelector("[data-status]"),
      caption: node.querySelector("[data-caption]"),
      d: node.querySelector("[data-d]"),
      h: node.querySelector("[data-h]"),
      m: node.querySelector("[data-m]"),
      s: node.querySelector("[data-s]"),
    }));
    els.countVisible.textContent = String(visible.length);
    paint(Date.now());
  }

  function paint(nowMs) {
    els.clock.textContent = formatHktClock(nowMs);
    els.clock.setAttribute("datetime", new Date(nowMs).toISOString());
    let finished = 0;
    for (const session of sessions) {
      if (nowMs >= session.targetMs) finished += 1;
    }
    els.countTotal.textContent = String(sessions.length);
    els.countFinished.textContent = String(finished);

    for (const card of state.cards) {
      const snap = math.measure(card.targetMs, nowMs);
      const shown = math.formatParts(snap);
      card.d.textContent = shown.days;
      card.h.textContent = shown.hours;
      card.m.textContent = shown.minutes;
      card.s.textContent = shown.seconds;
      card.node.classList.toggle("is-finished", snap.finished);
      if (snap.finished) {
        card.status.className = "badge badge-done";
        card.status.textContent = "已完結 / Finished";
        card.caption.textContent = "開考後已經過 / Elapsed since start";
      } else {
        card.status.className = "badge badge-live";
        card.status.textContent = "倒數中 / Counting down";
        card.caption.textContent = "距離開考 / Time remaining";
      }
    }
  }

  let lastSecond = -1;
  function loop() {
    // rAF supplies a relative DOMHighResTimeStamp; always recompute from Date.now().
    const nowMs = Date.now();
    const second = Math.floor(nowMs / 1000);
    if (second !== lastSecond) {
      lastSecond = second;
      paint(nowMs);
    }
    requestAnimationFrame(loop);
  }

  els.search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderCards();
  });

  els.filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    renderFilters();
    renderCards();
  });

  renderFilters();
  renderCards();
  requestAnimationFrame(loop);
})();
