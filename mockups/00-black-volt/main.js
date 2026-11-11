/* The Training Lab — interactions */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- start at the top on refresh ---------- */
  const navEntry = performance.getEntriesByType('navigation')[0];
  if (navEntry && navEntry.type === 'reload') scrollTo({ top: 0, behavior: 'instant' });

  /* ---------- in-page links: smooth scroll without writing #section into the URL ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const id = a.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block: 'start' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------- nav: scrolled state, mobile menu, current link ---------- */
  const nav = $('[data-nav]');
  const toggle = $('.nav__toggle');
  const menu = $('#menu');
  const bar = $('[data-actionbar]');
  const hero = $('.hero');

  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 24);
    if (bar) bar.classList.toggle('is-shown', y > hero.offsetHeight * 0.6 && !nearBook());
  };
  const book = $('#book');
  const nearBook = () => {
    const r = book.getBoundingClientRect();
    return r.top < innerHeight && r.bottom > 0;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });
  matchMedia('(min-width: 1025px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  const links = $$('.nav__links a');
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['training', 'rehab', 'approach', 'coach', 'book'].forEach(id => { const el = document.getElementById(id); if (el) sectionObs.observe(el); });

  /* ---------- reveal on scroll (staggered within a parent) ---------- */
  const revealEls = $$('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('is-in'));
  } else {
    const groups = new Map();
    revealEls.forEach(el => {
      const p = el.parentElement;
      const i = groups.get(p) || 0;
      el.style.setProperty('--d', (i * 0.08).toFixed(2) + 's');
      groups.set(p, i + 1);
    });
    const ro = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); ro.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(el => ro.observe(el));
  }

  /* ---------- ACL stages: highlight the stage in view ---------- */
  const stages = $$('.stage');
  const steps = $$('[data-steps] li');
  const setStage = i => {
    stages.forEach((s, k) => s.classList.toggle('is-active', k === i));
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
  };
  const stageObs = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) setStage(+en.target.dataset.stage); });
  }, { rootMargin: '-40% 0px -45% 0px' });
  stages.forEach(s => stageObs.observe(s));
  setStage(0);

  /* ---------- statement: words light up as it scrolls through ---------- */
  const st = $('[data-words]');
  if (st && !reduce) {
    const wrap = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(st);
    const words = $$('.w', st);
    let ticking = false;
    const paint = () => {
      ticking = false;
      const r = st.getBoundingClientRect();
      const start = innerHeight * 0.85, end = innerHeight * 0.35;
      const p = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height * 0.6)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }

  /* ---------- footer wordmark: fit exactly to the container width ---------- */
  const word = $('.footer__word');
  const fit = () => {
    if (!word) return;
    const box = word.parentElement;
    const w = box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) - parseFloat(getComputedStyle(box).paddingRight);
    word.style.fontSize = '100px';
    const nat = word.getBoundingClientRect().width;
    word.style.fontSize = (100 * w / nat).toFixed(2) + 'px';
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fit);
  addEventListener('resize', fit);

  /* ---------- form: validation, then endpoint or mailto fallback ---------- */
  const form = $('form.form');
  if (form) {
    const status = $('.form__status', form);
    const show = (el, errId, bad) => {
      const err = document.getElementById(errId);
      if (err) err.hidden = !bad;
      if (el) el.setAttribute('aria-invalid', bad ? 'true' : 'false');
    };
    const check = () => {
      const name = form.elements.name, email = form.elements.email;
      const needSel = form.querySelector('input[name="need"]:checked');
      const badName = !name.value.trim();
      const badEmail = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      show(name, 'f-name-err', badName);
      show(email, 'f-email-err', badEmail);
      show(null, 'f-need-err', !needSel);
      return [badName && name, badEmail && email, !needSel && form.querySelector('input[name="need"]')].filter(Boolean);
    };
    ['name', 'email'].forEach(n => form.elements[n].addEventListener('blur', () => { if (form.dataset.tried) check(); }));
    form.addEventListener('change', () => { if (form.dataset.tried) check(); });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      form.dataset.tried = '1';
      const bad = check();
      if (bad.length) { bad[0].focus(); status.className = 'form__status'; status.textContent = ''; return; }
      const data = Object.fromEntries(new FormData(form));
      const btn = form.querySelector('button[type="submit"]');
      const endpoint = form.dataset.endpoint;
      if (endpoint) {
        btn.disabled = true; btn.style.opacity = .6;
        try {
          const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
          if (!res.ok) throw new Error(res.status);
          form.reset(); delete form.dataset.tried;
          status.className = 'form__status is-ok';
          status.textContent = 'Your assessment request is in. We write back by email to set a time.';
        } catch {
          status.className = 'form__status';
          status.textContent = 'That did not send. Try again, or message The Training Lab on Instagram.';
        } finally { btn.disabled = false; btn.style.opacity = ''; }
      } else {
        const to = form.getAttribute('action').replace(/^mailto:/, '');
        const body = `Name: ${data.name}\nEmail: ${data.email}\nCoaching for: ${data.need}\n\n${data.notes || ''}`;
        location.href = `mailto:${to}?subject=${encodeURIComponent('Free assessment request')}&body=${encodeURIComponent(body)}`;
        status.className = 'form__status is-ok';
        status.textContent = 'Your email app has opened with the request. Send it, and we write back to set a time.';
      }
    });
  }
})();
