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
      p.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#' + (i % 3 === 0 ? 'i-heart' : 'i-sparkle') + '"/></svg>';
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

  /* ---------- появление: лесенка 50 мс, смысловые группы 100 мс ---------- */
  $$('[data-stagger]').forEach((group) => {
    $$('.rise', group).forEach((el, i) => { el.dataset.d = String(i * 50); });
  });
  const risers = $$('.rise');
  risers.forEach((el) => {
    if (el.dataset.d) el.style.setProperty('--d', reduce ? '0ms' : el.dataset.d + 'ms');
  });
  const settle = (el) => {
    /* после появления вернуть элемент в обычное состояние, чтобы hover работал без задержки */
    const done = () => { el.classList.remove('rise', 'is-in'); el.style.removeProperty('--d'); };
    if (reduce) { done(); return; }
    const total = (parseInt(el.dataset.d || '0', 10)) + 960;
    setTimeout(done, total);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
        settle(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    risers.forEach((el) => io.observe(el));
  } else {
    risers.forEach((el) => { el.classList.add('is-in'); settle(el); });
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
      b.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#' + ICONS[i] + '"/></svg><strong></strong><small></small>';
      $('strong', b).textContent = face;
      $('small', b).textContent = word;
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

  $('#nextMood').addEventListener('click', () => {
    setMood(ORDER[(ORDER.indexOf(mood) + 1) % ORDER.length]);
  });

  favBtn.addEventListener('click', () => {
    if (favs.has(current)) { favs.delete(current); showToast('Убрано из избранного', current); }
    else { favs.add(current); showToast('В избранном', current); burst(favBtn); }
    saveFavs();
    syncFav();
  });

  /* ---------- карточки возможностей ---------- */
  $$('.feature').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.chip')) return;
      const open = !card.classList.contains('is-open');
      card.classList.toggle('is-open', open);
      $('.feature__idx', card).setAttribute('aria-expanded', String(open));
      if (open) copyFace(card.dataset.face, $('.feature__idx', card));
    });
  });

  /* ---------- чат ---------- */
  const stage = $('#chatStage');
  const picker = $('#picker');
  const faceBtn = $('#faceBtn');
  const form = $('#composer');
  const input = $('#composerInput');
  const sticker = $('#sticker');
  const steps = $$('.step');
  let selected = '٩(ˊᗜˋ*)و';

  function syncPicker() {
    $$('.pk', picker).forEach((pk) => {
      pk.classList.toggle('is-sel', pk.dataset.pk === selected);
      pk.classList.toggle('is-fav', favs.has(pk.dataset.pk));
    });
  }

  function setPicker(open) {
    picker.hidden = !open;
    faceBtn.setAttribute('aria-expanded', String(open));
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
      react.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-spark"/></svg>';
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
      time.innerHTML = '<span></span>&nbsp;<svg class="ic ic--line" aria-hidden="true"><use href="#i-check2"/></svg>';
      $('span', time).textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      b.appendChild(time);
    }
    stage.insertBefore(b, sticker);
    while (bubbleCount() > 6) $('.bubble', stage).remove();
    return b;
  }

  function send(fromStep) {
    let text = input.value.trim();
    let face = '';
    if (selected && text.includes(selected)) {
      face = selected;
      text = text.replace(selected, '').replace(/\s+/g, ' ').trim();
    } else if (!text || fromStep) {
      face = selected;
    }
    if (!text && !face) {
      form.classList.remove('is-shake');
      void form.offsetWidth;
      form.classList.add('is-shake');
      input.focus();
      return;
    }
    const mine = addBubble({ text, face, out: true });
    input.value = '';
    setPicker(false);
    if (face) copyFace(face, mine);
    setTimeout(() => addBubble({ face: rand(POOL), out: false }), 900);
  }

  faceBtn.addEventListener('click', () => { setPicker(picker.hidden); markStep(1); });

  picker.addEventListener('click', (e) => {
    const pk = e.target.closest('.pk');
    if (!pk) return;
    selected = pk.dataset.pk;
    input.value = (input.value.trim() + ' ' + selected).trim();
    syncPicker();
    input.focus();
    burst(pk);
  });

  form.addEventListener('submit', (e) => { e.preventDefault(); markStep(3); send(false); });

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
      heart.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-heart"/></svg>';
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
        setPicker(true);
        picker.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      } else if (n === '2') {
        if (favs.has(selected)) { favs.delete(selected); showToast('Убрано из избранного', selected); }
        else { favs.add(selected); showToast('В избранном', selected); burst(step); }
        saveFavs();
        setPicker(true);
        syncFav();
      } else {
        send(true);
      }
    });
  });

  /* стартовое состояние */
  setMood('love', true);
  syncPicker();
})();

/* ---------- Макап телефона: экран настоящего приложения, кликабельный мини-демо ----------
   Нажатие на каомодзи копирует его (общий обработчик data-copy выше), сердце добавляет в избранное,
   чипы и нижнее меню переключают подборки, кубик выдаёт случайный каомодзи (data-star). */
(() => {
  'use strict';
  const phone = document.getElementById('phone');
  if (!phone) return;
  const hitsEl = document.getElementById('apHits');
  const recEl = document.getElementById('apRecent');
  const chips = [...phone.querySelectorAll('.ap-chip')];
  const navs = [...phone.querySelectorAll('.ap-nb')];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CHIP_KEYS = ['all', 'solo', 'group', 'special'];

  const SETS = {
    all: ['(•ө•)', '＼(´∀｀)／', '*♪٩(ˊᗜˋ )و♬*', '————(°∀°)————!'],
    solo: ['(˶ᵔ ᵕ ᵔ˶)', '( ˶ˆᗜˆ˵ )', '(｡•̀ᴗ-)✧', '(≧◡≦)'],
    group: ['(づ｡◕‿‿◕｡)づ', 'ヽ(・∀・)ﾉ', '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', '٩(ˊᗜˋ*)و'],
    special: ['(⌐■_■)', 'ヽ(>∀<☆)ノ', '≽^•⩊•^≼', '(๑˃ᴗ˂)ﻭ'],
    fav: ['(｡♥‿♥｡)', '(♡˙︶˙♡)', '૮ ˶ᵔ ᵕ ᵔ˶ ა', '(˶˃ ᵕ ˂˶)'],
    sad: ['(╥﹏╥)', '(｡•́︿•̀｡)', '(╥_╥)', '(；︵；)'],
    calm: ['(っ˘ω˘ς )', '(－ω－) zzZ', '(˘⌣˘)', '(´-ω-`)'],
    angry: ['(╬ Ò﹏Ó)', '(｀Д´)', 'ヽ(`Д´)ﾉ', '(҂`з´)'],
    joy: ['(≧◡≦)', '٩(◕‿◕｡)۶', '＼(^o^)／', '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧']
  };
  let recent = ['@ˆ▽ˆ@', '(*^‿^)ﾉ~♪', '(••)ゞ', '٩(××)۶'];
  const favs = new Set(SETS.fav);

  function row(face, i) {
    const r = document.createElement('div');
    r.className = 'ap-row';
    r.style.setProperty('--i', i);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ap-face'; b.dataset.copy = face; b.textContent = face;
    const h = document.createElement('button');
    h.type = 'button'; h.className = 'ap-heart'; h.dataset.fav = face;
    h.setAttribute('aria-label', 'В избранное');
    h.setAttribute('aria-pressed', favs.has(face) ? 'true' : 'false');
    h.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-heart"/></svg>';
    r.append(b, h);
    return r;
  }
  function fill(el, list, animate = true) {
    el.replaceChildren(...list.map(row));
    el.classList.remove('is-swap');
    if (animate && !reduce) { void el.offsetWidth; el.classList.add('is-swap'); }
  }
  function listFor(key) {
    if (key !== 'fav') return SETS[key];
    return favs.size ? [...favs].slice(-4).reverse() : SETS.fav;
  }
  function select(key) {
    fill(hitsEl, listFor(key));
    chips.forEach((c) => { const on = c.dataset.set === key; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on); });
    navs.forEach((n) => {
      const on = n.dataset.set === key || (n.dataset.set === 'all' && CHIP_KEYS.includes(key));
      n.classList.toggle('is-on', on); n.setAttribute('aria-pressed', on);
    });
  }

  phone.addEventListener('click', (e) => {
    const heart = e.target.closest('.ap-heart');
    if (heart) {
      const f = heart.dataset.fav;
      if (favs.has(f)) favs.delete(f); else favs.add(f);
      heart.setAttribute('aria-pressed', favs.has(f) ? 'true' : 'false');
      return;
    }
    const face = e.target.closest('.ap-face');
    if (face) {
      const f = face.dataset.copy;
      /* пересобираем «Недавние» чуть позже, чтобы не убрать из DOM кнопку до того, как отработает копирование */
      setTimeout(() => { recent = [f, ...recent.filter((x) => x !== f)].slice(0, 4); fill(recEl, recent); }, 160);
      return;
    }
    const dice = e.target.closest('.ap-dice');
    if (dice) {
      if (!reduce) dice.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(300deg) scale(1.14)' }, { transform: 'rotate(360deg)' }], { duration: 620, easing: 'cubic-bezier(.22, 1, .36, 1)' });
      return;
    }
    const sel = e.target.closest('[data-set]');
    if (sel) select(sel.dataset.set);
  });
})();
