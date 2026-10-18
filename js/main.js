/* Interaction + motion layer. Patterns and timings follow the live reference
   (see MOTION.md for the measured inventory). */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// `?still` renders every section in its resting state (handy for full-page captures).
const still = new URLSearchParams(location.search).has('still');
const calm = () => reduceMotion.matches || still;
if (still) document.documentElement.classList.add('still');
const desktopUp = window.matchMedia('(min-width: 810px)');

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* ---------- Mock websites: clone templates into each slot ---------- */
function mountMocks() {
  const agency = $('#tpl-agency');
  const blue = $('#tpl-blue');
  $$('[data-mock-agency]').forEach((el) => el.append(agency.content.cloneNode(true)));
  $$('[data-mock-blue]').forEach((el) => el.append(blue.content.cloneNode(true)));
}

/* ---------- Text roll on nav links and buttons ----------
   The label slides up and an identical copy rises from below. The copy is
   aria-hidden so the accessible name stays single. */
function initTextRoll() {
  $$('.btn, .nav__links a, .nav__panel a').forEach((link) => {
    if (link.querySelector('.roll') || link.children.length) return;
    const label = link.textContent.trim();
    link.textContent = '';
    const roll = document.createElement('span');
    roll.className = 'roll';
    const track = document.createElement('span');
    track.className = 'roll__track';
    const a = document.createElement('span');
    a.textContent = label;
    const b = document.createElement('span');
    b.textContent = label;
    b.setAttribute('aria-hidden', 'true');
    track.append(a, b);
    roll.append(track);
    link.append(roll);
  });
}

/* ---------- Header: tucks up on scroll + mobile dropdown with scrim ---------- */
function initHeader() {
  const header = $('[data-header]');
  const toggle = $('[data-menu-toggle]');
  const panel = $('[data-menu-panel]');
  const scrim = $('[data-menu-scrim]');

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 60);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  let hideTimer = 0;
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    panel.classList.toggle('is-open', open);
    clearTimeout(hideTimer);
    if (open) {
      scrim.hidden = false;
      requestAnimationFrame(() => scrim.classList.add('is-open'));
    } else {
      scrim.classList.remove('is-open');
      hideTimer = setTimeout(() => (scrim.hidden = true), calm() ? 0 : 300);
    }
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  scrim.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
  });
  desktopUp.addEventListener('change', () => setOpen(false));
}

/* ---------- Hero avatar: cross-fades between portraits ---------- */
function initAvatarCycle() {
  const host = $('[data-avatar-cycle]');
  const frames = host ? $$('img', host) : [];
  if (frames.length < 2 || calm()) return;
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    frames[i].classList.remove('is-current');
    i = (i + 1) % frames.length;
    frames[i].classList.add('is-current');
  }, 2100);
}

/* ---------- Service cards: fanned deck that spreads as the page scrolls ----------
   Desktop only. The outer cards start stacked behind the middle one, rotated
   ±6°, and slide out over the first ~200px of scroll (smoothed). */
function initFan() {
  const root = $('[data-fan-root]');
  if (!root) return;
  const grid = $('.services__grid', root);
  const cards = $$('[data-fan]', grid);
  const middle = cards.find((c) => c.dataset.fan === '0');
  let current = 1;
  let target = 1;
  let raf = 0;
  let enabled = false;

  const measure = () => {
    cards.forEach((card) => {
      const side = Number(card.dataset.fan);
      if (!side) return;
      // Distance from this card's slot to the middle card's slot.
      card.style.setProperty('--dx', `${middle.offsetLeft - card.offsetLeft}px`);
    });
  };
  const progress = () => clamp(1 - window.scrollY / 200, 0, 1);
  const frame = () => {
    current += (target - current) * 0.14;
    if (Math.abs(target - current) < 0.001) current = target;
    grid.style.setProperty('--fan', current.toFixed(4));
    raf = current === target ? 0 : requestAnimationFrame(frame);
  };
  const onScroll = () => {
    target = progress();
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const setup = () => {
    const want = desktopUp.matches && !calm();
    if (want === enabled) { if (want) measure(); return; }
    enabled = want;
    grid.classList.toggle('is-fanning', want);
    if (want) {
      measure();
      current = target = progress();
      grid.style.setProperty('--fan', current);
      window.addEventListener('scroll', onScroll, { passive: true });
    } else {
      window.removeEventListener('scroll', onScroll);
      grid.style.removeProperty('--fan');
    }
  };
  setup();
  window.addEventListener('resize', setup);
  desktopUp.addEventListener('change', setup);
  reduceMotion.addEventListener('change', setup);
}

/* ---------- Scroll reveals ----------
   Elements play their reveal once when ~120px inside the viewport. */
function initReveals() {
  const items = $$('[data-reveal]');
  if (calm() || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const onEnter = (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  };
  const io = new IntersectionObserver(onEnter, { rootMargin: '0px 0px -120px 0px' });
  // Elements in the last stretch of the page can never travel 120px into the
  // viewport, so they reveal as soon as they appear.
  const ioEdge = new IntersectionObserver(onEnter);
  const docH = document.documentElement.scrollHeight;
  items.forEach((el) => {
    const bottom = el.getBoundingClientRect().bottom + window.scrollY;
    (bottom > docH - 160 ? ioEdge : io).observe(el);
  });
}

/* ---------- Testimonials ----------
   Click an avatar: it grows in place and the quote cross-fades. No autoplay. */
const TESTIMONIALS = [
  {
    name: 'Daniel Foster',
    role: 'Startup Founder',
    quote: '“I’ve worked with many designers before, but this experience was on another level. The attention to detail and thoughtful approach made the process smooth and enjoyable.”',
  },
  {
    name: 'Cory Zamora',
    role: 'Product Manager',
    quote: '“I\'ve been using this product for a month now, and I can honestly say it\'s changed my life. The results are incredible, and I couldn\'t be happier. Highly recommend!”',
  },
  {
    name: 'Natalie Brooks',
    role: 'Marketing Manager',
    quote: '“From the very beginning the collaboration felt effortless. Every idea was carefully refined into something meaningful, and the final result was exactly what we hoped for.”',
  },
];

function initTestimonials() {
  const root = $('[data-testimonials]');
  if (!root) return;
  const view = $('.testimonial__viewport', root);
  const quote = $('[data-quote]', root);
  const name = $('[data-name]', root);
  const role = $('[data-role]', root);
  const people = $$('[data-person]', root);
  // Both references open on the middle avatar; the desktop one shows Cory's
  // quote there and the phone one shows Natalie's.
  if (!desktopUp.matches) [TESTIMONIALS[1], TESTIMONIALS[2]] = [TESTIMONIALS[2], TESTIMONIALS[1]];
  let active = 1;
  let swapTimer = 0;
  people.forEach((btn, i) => btn.setAttribute('aria-label', `${TESTIMONIALS[i].name}, ${TESTIMONIALS[i].role}`));

  const mark = () => people.forEach((btn, i) => {
    btn.setAttribute('aria-selected', String(i === active));
    btn.tabIndex = i === active ? 0 : -1;
  });
  const write = () => {
    const t = TESTIMONIALS[active];
    quote.textContent = t.quote;
    name.textContent = t.name;
    role.textContent = t.role;
    view.classList.remove('is-leaving');
  };
  const show = (index) => {
    index = (index + people.length) % people.length;
    if (index === active) return;
    active = index;
    mark();
    clearTimeout(swapTimer);
    if (calm()) return write();
    view.classList.add('is-leaving');
    swapTimer = setTimeout(write, 380);
  };

  people.forEach((btn, i) => btn.addEventListener('click', () => show(i)));
  root.addEventListener('keydown', (e) => {
    if (!e.target.closest('[data-person]')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      show(active + (e.key === 'ArrowRight' ? 1 : -1));
      people[active].focus();
    }
  });
  mark();
  write();
}

/* ---------- Sticky stacks (selected works + process) ----------
   The cards are position: sticky in CSS (desktop). Here each parked card is
   scaled down with scroll progress through its deck: card i eases from 1 to
   1 − (n − 1 − i) × 0.05 between its own start point and the deck's end. */
class StackScale {
  constructor(deck) {
    this.deck = deck;
    this.cards = $$('.stack__card', deck);
    this.n = this.cards.length;
    this.raf = 0;
    this.active = false;
    this.onScroll = () => { if (!this.raf) this.raf = requestAnimationFrame(() => this.update()); };
  }

  setup() {
    const want = desktopUp.matches && !calm();
    if (want === this.active) { if (want) this.update(); return; }
    this.active = want;
    if (want) {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.update();
    } else {
      window.removeEventListener('scroll', this.onScroll);
      this.cards.forEach((c) => (c.style.transform = ''));
    }
  }

  update() {
    this.raf = 0;
    const vh = window.innerHeight;
    const rect = this.deck.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    // Finish exactly when the last card parks in its sticky slot.
    const last = this.cards[this.n - 1];
    const lastTop = top + rect.height - last.offsetHeight;
    const parkAt = parseFloat(getComputedStyle(last).top) || 0;
    const start = top - vh * 0.35;
    const end = lastTop - parkAt;
    const p = clamp((window.scrollY - start) / Math.max(end - start, 1), 0, 1);
    this.cards.forEach((card, i) => {
      const target = 1 - (this.n - 1 - i) * 0.05;
      const from = i / this.n;
      const t = clamp((p - from) / (1 - from), 0, 1);
      const scale = 1 - t * (1 - target);
      card.style.transform = scale < 0.9999 ? `scale(${scale.toFixed(4)})` : '';
    });
  }
}

function initStacks() {
  const stacks = $$('.stack__deck').map((deck) => new StackScale(deck));
  const setupAll = () => stacks.forEach((s) => s.setup());
  setupAll();
  window.addEventListener('resize', setupAll);
  desktopUp.addEventListener('change', setupAll);
  reduceMotion.addEventListener('change', setupAll);
}

/* ---------- Three.js aura (loaded lazily, only when needed) ---------- */
function initAura() {
  const hosts = $$('[data-aura]');
  if (!hosts.length || !('IntersectionObserver' in window)) return;
  let loading = null;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      loading ??= import('./aura.js');
      loading
        .then((m) => m.createAura(entry.target, { reducedMotion: reduceMotion.matches }))
        .catch(() => { /* static CSS gradient remains as fallback */ });
    });
  }, { rootMargin: '300px 0px' });
  hosts.forEach((h) => io.observe(h));
}

mountMocks();
initTextRoll();
initHeader();
initAvatarCycle();
initFan();
initReveals();
initTestimonials();
initStacks();
initAura();
