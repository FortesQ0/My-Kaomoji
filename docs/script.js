/* My Kaomoji — сайт.
   Одна сквозная механика: нажал на каомодзи, он скопировался, вспыхнули искры, появился тост.
   Всё интерактивное на странице пользуется ею. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (list) => list[Math.floor(Math.random() * list.length)];
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const icon = (symbol, className = 'ic') => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    const use = document.createElementNS(SVG_NS, 'use');
    svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    use.setAttribute('href', '#' + symbol);
    svg.appendChild(use);
    return svg;
  };

  /* Каомодзи из самого сайта и README: на них опираются звёзды и режим «другой» */
  const POOL = [
    '(˶ᵔ ᵕ ᵔ˶)', '(｡♥‿♥｡)', '٩(ˊᗜˋ*)و', '(っ˘ω˘ς )', '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', '(˶˃ ᵕ ˂˶)',
    '(๑˃ᴗ˂)ﻭ', '(≧◡≦)', '(✿◠‿◠)', 'ヽ(・∀・)ﾉ', '(♡˙︶˙♡)', '(⌐■_■)', 'ヽ(>∀<☆)ノ',
    '( ˶ˆᗜˆ˵ )', '૮ ˶ᵔ ᵕ ᵔ˶ ა', '(づ｡◕‿‿◕｡)づ', '≽^•⩊•^≼', '(｡•̀ᴗ-)✧', '꒰ᐢ. .ᐢ꒱', '(,,> ᴗ <,,)'
  ];

  /* ---------- русская типографика: короткие слова не повисают в конце строки ---------- */
  (function bindShortWords() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const re = /(^|\s)(в|во|к|ко|с|со|у|о|об|от|до|за|на|по|из|изо|под|над|при|про|для|без|не|ни|и|а|но)(\s+)(?=\S)/giu;
    nodes.forEach((node) => {
      if (node.parentElement && node.parentElement.closest('script,style,svg,input,textarea,[data-copy],[data-pick],[data-pk],.stage__face,.drift')) return;
      node.nodeValue = node.nodeValue.replace(re, '$1$2 ');
    });
  })();

  /* ---------- избранное (общее для доски и чата) ---------- */
  let favs = new Set();
  try { favs = new Set(JSON.parse(localStorage.getItem('mk-favs') || '[]')); } catch (e) { /* без хранилища тоже работает */ }
  const saveFavs = () => { try { localStorage.setItem('mk-favs', JSON.stringify([...favs])); } catch (e) { /* ignore */ } };

  /* ---------- тост ---------- */
  const toast = $('#toast');
  const toastFace = $('#toastFace');
  const toastText = $('#toastText');
  let toastTimer;
  function showToast(text, face = '') {
    toastFace.textContent = face;
    toastText.textContent = text;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 1900);
  }

  /* ---------- копирование ---------- */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.className = 'sprite';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  /* ---------- искры ---------- */
  function burst(origin, { face } = {}) {
    if (reduce || !origin) return;
    const r = origin.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const count = 8;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'fx';
      const size = 10 + Math.random() * 12;
      p.style.width = p.style.height = size + 'px';
      p.appendChild(icon(i % 3 === 0 ? 'i-heart' : 'i-sparkle'));
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      document.body.appendChild(p);
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const dist = 44 + Math.random() * 56;
      p.animate([
        { transform: 'translate(0,0) scale(.3) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + Math.cos(angle) * dist + 'px,' + Math.sin(angle) * dist + 'px) scale(1) rotate(' + (Math.random() * 120 - 60) + 'deg)', opacity: 0 }
      ], { duration: 900, easing: EASE, fill: 'forwards' }).onfinish = () => p.remove();
    }
    if (face) {
      const f = document.createElement('span');
      f.className = 'fxface';
      f.textContent = face;
      document.body.appendChild(f);
      const w = f.offsetWidth;
      f.style.left = cx - w / 2 + 'px';
      f.style.top = cy - 20 + 'px';
      f.animate([
        { transform: 'translateY(0) scale(.8)', opacity: 0 },
        { transform: 'translateY(-34px) scale(1)', opacity: 1, offset: .25 },
        { transform: 'translateY(-84px) scale(1)', opacity: 0 }
      ], { duration: 1500, easing: EASE, fill: 'forwards' }).onfinish = () => f.remove();
    }
  }

  async function copyFace(face, origin, extra = {}) {
    const ok = await copyText(face);
    showToast(ok ? 'Скопировано' : 'Не удалось скопировать', face);
    burst(origin, extra);
  }

  /* общий обработчик: всё с data-copy копируется */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-copy]');
    if (t) copyFace(t.dataset.copy, t);
    const star = e.target.closest('[data-star]');
    if (star) {
      const f = rand(POOL);
      copyFace(f, star, { face: f });
    }
  });

  /* ---------- шапка ---------- */
  const topbar = $('#topbar');
  const onScroll = () => topbar.classList.toggle('is-scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- появление: строго сверху вниз ----------
     Элементы, ставшие видимыми одновременно, собираются в пачку и появляются по очереди:
     в первом блоке — по явному порядку (data-o), дальше — по положению на странице
     (сверху вниз, в одной строке слева направо). Шаг между элементами — 100 мс. */
  const STEP = 100;      /* пауза между соседними элементами */
  const MAX_DELAY = 1200; /* общая лесенка не длиннее этого */
  const DURATION = 1100; /* должна совпадать с transition в styles.css */
  const risers = $$('.rise');
  const settle = (el, delay) => {
    /* после появления вернуть элемент в обычное состояние, чтобы hover работал без задержки */
    const done = () => { el.classList.remove('rise', 'is-in'); el.style.removeProperty('--d'); };
    if (reduce) { done(); return; }
    setTimeout(done, delay + DURATION + 80);
  };
  let pending = [];
  let flushTimer = 0;
  let lastStart = 0; /* момент старта последнего запланированного элемента: новые встают в очередь после него */
  function flush() {
    flushTimer = 0;
    const batch = pending.map((el) => {
      const r = el.getBoundingClientRect();
      return { el, o: el.dataset.o === undefined ? null : Number(el.dataset.o), top: r.top, left: r.left };
    });
    pending = [];
    batch.sort((a, b) => {
      if (a.o !== null && b.o !== null) return a.o - b.o;
      if (Math.abs(a.top - b.top) > 24) return a.top - b.top;
      return a.left - b.left;
    });
    const now = performance.now();
    const base = reduce ? 0 : Math.min(Math.max(0, lastStart + STEP - now), 600);
    batch.forEach((item, i) => {
      const delay = reduce ? 0 : Math.min(base + i * STEP, MAX_DELAY);
      item.el.style.setProperty('--d', delay + 'ms');
      item.el.classList.add('is-in');
      lastStart = now + delay;
      settle(item.el, delay);
    });
  }
  const queue = (el) => {
    pending.push(el);
    if (!flushTimer) flushTimer = setTimeout(flush, 60);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        queue(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    risers.forEach((el) => io.observe(el));
  } else {
    risers.forEach((el) => { el.classList.add('is-in'); settle(el, 0); });
  }

  /* ---------- доска настроений в hero ---------- */
  const MOODS = {
    love: {
      face: '(˶ᵔ ᵕ ᵔ˶)', caption: 'мягкий вайб, большие эмоции',
      picks: [['(｡♥‿♥｡)', 'нежность'], ['٩(ˊᗜˋ*)و', 'ура!'], ['(っ˘ω˘ς)', 'уют']],
      pool: ['(˶ᵔ ᵕ ᵔ˶)', '(｡♥‿♥｡)', '(♡˙︶˙♡)', '(˶˃ ᵕ ˂˶)', '(っ˘ω˘ς)', '٩(ˊᗜˋ*)و']
    },
    joy: {
      face: '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', caption: 'громко и от души',
      picks: [['(≧◡≦)', 'ярко'], ['ヽ(>∀<☆)ノ', 'праздник'], ['(๑˃ᴗ˂)ﻭ', 'ура!']],
      pool: ['(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', '(≧◡≦)', 'ヽ(>∀<☆)ノ', '(๑˃ᴗ˂)ﻭ', '٩(ˊᗜˋ*)و', '(✿◠‿◠)']
    },
    calm: {
      face: '(－ω－) zzZ', caption: 'тихий вайб, без спешки',
      picks: [['꒰ᐢ. .ᐢ꒱', 'тишина'], ['(￣o￣) . z Z', 'сон'], ['૮ ˶ᵔ ᵕ ᵔ˶ ა', 'уют']],
      pool: ['(－ω－) zzZ', '꒰ᐢ. .ᐢ꒱', '(￣o￣) . z Z', '૮ ˶ᵔ ᵕ ᵔ˶ ა', '(っ˘ω˘ς )']
    }
  };
  const ORDER = ['love', 'joy', 'calm'];
  const ICONS = ['i-heart', 'i-sparkle', 'i-cloud'];

  const stageFace = $('#stageFace');
  const stageText = $('#stageText');
  const stageCaption = $('#stageCaption');
  const favBtn = $('#favBtn');
  const picksEl = $('#picks');
  const moodBtns = $$('.mood');
  let mood = 'love';
  let current = MOODS.love.face;

  function syncFav() {
    const on = favs.has(current);
    favBtn.classList.toggle('is-on', on);
    favBtn.setAttribute('aria-pressed', String(on));
    favBtn.setAttribute('aria-label', on ? 'Убрать из избранного' : 'В избранное');
    syncPicker();
  }

  function setFace(face, caption) {
    current = face;
    stageText.textContent = face;
    stageFace.dataset.copy = face;
    if (caption) stageCaption.textContent = caption;
    stageText.classList.remove('is-swap');
    void stageText.offsetWidth;
    if (!reduce) stageText.classList.add('is-swap');
    const picks = $$('.pick', picksEl);
    if (picks.some((p) => p.dataset.pick === face)) {
      picks.forEach((p) => p.classList.toggle('is-feat', p.dataset.pick === face));
    }
    syncFav();
  }

  function renderPicks() {
    picksEl.textContent = '';
    MOODS[mood].picks.forEach(([face, word], i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick' + (i === 1 ? ' is-feat' : '');
      b.dataset.pick = face;
      b.append(icon(ICONS[i]));
      const strong = document.createElement('strong');
      const small = document.createElement('small');
      b.append(strong, small);
      strong.textContent = face;
      small.textContent = word;
      picksEl.appendChild(b);
    });
  }

  function setMood(key, silent) {
    mood = key;
    moodBtns.forEach((b) => {
      const on = b.dataset.mood === key;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    renderPicks();
    setFace(MOODS[key].face, MOODS[key].caption);
    if (!silent) burst($('.mood.is-on'));
  }

  moodBtns.forEach((b) => b.addEventListener('click', () => setMood(b.dataset.mood)));

  picksEl.addEventListener('click', (e) => {
    const pick = e.target.closest('.pick');
    if (!pick) return;
    setFace(pick.dataset.pick);
    copyFace(pick.dataset.pick, pick);
  });

  $('#shuffleBtn').addEventListener('click', (e) => {
    const options = MOODS[mood].pool.filter((f) => f !== current);
    const next = rand(options);
    setFace(next);
    copyFace(next, e.currentTarget);
  });


  favBtn.addEventListener('click', () => {
    if (favs.has(current)) { favs.delete(current); showToast('Убрано из избранного', current); }
    else { favs.add(current); showToast('В избранном', current); burst(favBtn); }
    saveFavs();
    syncFav();
  });

  /* ---------- карточки возможностей ---------- */
  $$('.feature').forEach((card) => {
    card.addEventListener('click', () => {
      card.classList.remove('is-pop');
      void card.offsetWidth;
      card.classList.add('is-pop');
      copyFace(card.dataset.face, $('.feature__idx', card));
    });
  });

  /* ---------- чат: готовые плашки с каомодзи вместо поля ввода ---------- */
  const stage = $('#chatStage');
  const picker = $('#picker');
  const sticker = $('#sticker');
  const steps = $$('.step');
  let selected = '٩(ˊᗜˋ*)و';

  function syncPicker() {
    $$('.pk', picker).forEach((pk, i) => {
      pk.style.setProperty('--i', i);
      pk.classList.toggle('is-sel', pk.dataset.pk === selected);
      pk.classList.toggle('is-fav', favs.has(pk.dataset.pk));
    });
  }

  function markStep(n) {
    steps.forEach((s) => s.classList.toggle('is-on', s.dataset.step === String(n)));
  }

  function bubbleCount() { return $$('.bubble', stage).length; }

  function addBubble({ text, face, out }) {
    const b = document.createElement('div');
    b.className = 'bubble ' + (out ? 'bubble--out' : 'bubble--in') + ' is-new';
    if (out) {
      const react = document.createElement('button');
      react.type = 'button';
      react.className = 'react';
      react.setAttribute('aria-pressed', 'false');
      react.setAttribute('aria-label', 'Реакция');
      react.appendChild(icon('i-spark'));
      b.appendChild(react);
      if (text) {
        const t = document.createElement('span');
        t.className = 'bubble__text';
        t.textContent = text;
        b.appendChild(t);
      }
    } else {
      const n = document.createElement('span');
      n.className = 'bubble__name';
      n.textContent = 'mika';
      b.appendChild(n);
    }
    if (face) {
      const f = document.createElement('button');
      f.type = 'button';
      f.className = 'bubble__face';
      f.dataset.copy = face;
      f.textContent = face;
      b.appendChild(f);
    }
    if (out) {
      const d = new Date();
      const time = document.createElement('span');
      time.className = 'bubble__time';
      const label = document.createElement('span');
      label.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      time.append(label, document.createTextNode('\u00a0'), icon('i-check2', 'ic ic--line'));
      b.appendChild(time);
    }
    stage.insertBefore(b, sticker);
    while (bubbleCount() > 6) $('.bubble', stage).remove();
    return b;
  }

  function sendFace(face) {
    selected = face;
    syncPicker();
    const mine = addBubble({ face, out: true });
    copyFace(face, mine);
    setTimeout(() => addBubble({ face: rand(POOL), out: false }), 900);
  }

  picker.addEventListener('click', (e) => {
    const pk = e.target.closest('.pk');
    if (!pk) return;
    markStep(3);
    sendFace(pk.dataset.pk);
  });

  stage.addEventListener('click', (e) => {
    const react = e.target.closest('.react');
    if (react) {
      const on = react.classList.toggle('is-on');
      react.setAttribute('aria-pressed', String(on));
      if (on) burst(react);
    }
  });

  sticker.addEventListener('click', () => {
    const on = sticker.classList.toggle('is-on');
    sticker.setAttribute('aria-pressed', String(on));
    const incoming = $$('.bubble--in', stage).pop();
    if (!incoming) return;
    const old = $('.liked', incoming);
    if (old) old.remove();
    if (on) {
      const heart = document.createElement('span');
      heart.className = 'liked';
      heart.appendChild(icon('i-heart'));
      incoming.appendChild(heart);
      burst(sticker);
    }
  });

  /* шаги «как пользоваться» управляют чатом */
  steps.forEach((step) => {
    step.addEventListener('click', () => {
      const n = step.dataset.step;
      markStep(n);
      if (n === '1') {
        picker.classList.remove('is-hint');
        void picker.offsetWidth;
        picker.classList.add('is-hint');
        picker.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      } else if (n === '2') {
        if (favs.has(selected)) { favs.delete(selected); showToast('Убрано из избранного', selected); }
        else { favs.add(selected); showToast('В избранном', selected); burst(step); }
        saveFavs();
        syncFav();
        syncPicker();
      } else {
        sendFace(selected);
      }
    });
  });

  /* стартовое состояние */
  setMood('love', true);
  syncPicker();
})();

/* ---------- стопка карточек: следующий блок плавно заходит поверх предыдущего ---------- */
(() => {
  'use strict';
  const items = Array.from(document.querySelectorAll('.stack'));
  if (items.length < 2) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DWELL = 0.42;
  let ticking = false;
  const stuck = new Map();

  function viewH() { return document.documentElement.clientHeight || window.innerHeight; }

  function layout() {
    const vh = viewH();
    items.forEach((el, i) => {
      const h = el.offsetHeight;
      const last = i === items.length - 1;
      const dwell = last ? 0 : Math.round(vh * DWELL);
      const top = Math.min(0, vh - h - dwell);
      el.style.top = top + 'px';
      const gapEl = el.nextElementSibling && el.nextElementSibling.classList.contains('gap') ? el.nextElementSibling : null;
      if (gapEl) {
        const gh = Math.max(vh - (h + top), 0);
        gapEl.style.height = gh + 'px';
        gapEl.style.top = (h + top) + 'px';
        gapEl.style.setProperty('--k', Math.max(0.55, Math.min(1.2, (gh - 84) / 270)).toFixed(3));
      }
      stuck.set(el, h + top);
    });
    update();
  }

  function update() {
    ticking = false;
    if (reduce) return;
    const vh = viewH();
    items.forEach((el, i) => {
      const next = items[i + 1];
      if (!next) return;
      const bottom = stuck.get(el) || vh;
      const nextTop = next.getBoundingClientRect().top;
      const p = Math.max(0, Math.min(1, (bottom - nextTop) / bottom));
      el.style.setProperty('--p', p.toFixed(3));
      el.style.transformOrigin = '50% ' + (vh / 2 - (parseFloat(el.style.top) || 0)) + 'px';
    });
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);
  window.addEventListener('load', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  if (window.ResizeObserver) { const ro = new ResizeObserver(layout); items.forEach((el) => ro.observe(el)); }
  layout();
})();


/* ---------- шаги: бегунок следует за прокруткой без инерционного «раскачивания» ---------- */
(() => {
  'use strict';
  const steps = document.querySelector('.steps');
  if (!steps) return;
  const items = Array.from(steps.querySelectorAll('li:not(.steps__track)'));
  if (!items.length) return;
  let centers = [];
  let target = 0;
  let raf = 0;

  function measure() {
    centers = items.map((li) => {
      const n = li.querySelector('.step__n');
      return li.offsetTop + n.offsetTop + n.offsetHeight / 2;
    });
    steps.style.setProperty('--ty', centers[0] + 'px');
    steps.style.setProperty('--th', (centers[centers.length - 1] - centers[0]) + 'px');
    readTarget();
    paint();
  }

  function readTarget() {
    if (!centers.length) return;
    const vh = document.documentElement.clientHeight || window.innerHeight;
    const anchor = vh * 0.58 - steps.getBoundingClientRect().top;
    target = anchor;                      /* без обрезки: по нему же решаем, какие шаги уже «пройдены» */
  }

  function paint() {
    const y0 = centers[0];
    const y1 = centers[centers.length - 1];
    const fill = Math.max(0, Math.min(y1 - y0, target - y0));
    steps.style.setProperty('--fill', fill.toFixed(1) + 'px');
    steps.style.setProperty('--progress', (y1 === y0 ? 0 : fill / (y1 - y0)).toFixed(4));
    items.forEach((li, i) => {
      const btn = li.querySelector('.step');
      if (btn) btn.classList.toggle('is-reached', target >= centers[i] - 2);
    });
  }

  function tick() {
    raf = 0;
    readTarget();
    paint();
  }

  function onScroll() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if (window.ResizeObserver) new ResizeObserver(measure).observe(steps);
  measure();
})();
