/* ERROR_404 logo behaviours
   hero    : outline cut-out + spotlight reveal (light kept inside the letters) + "signal overload" glitch bursts every 4–6 s
   nav     : signature draw-on (replays on hover)
   closing : spotlight reveal (cursor torch, wanders when idle)
   Attaches to the React-rendered logos once they mount; marks hosts with data-fx. */
(() => {
  window.__efx = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  let VB, D, SUBS, uid = 0;

  const gradDef = id => `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1414" y2="0"><stop offset=".585" stop-color="#F4F4F8"/><stop offset=".625" stop-color="#FF00E5"/><stop offset=".995" stop-color="#00EFFF"/></linearGradient></defs>`;
  const drawSvg = label => {
    const id = 'efx' + (++uid);
    return `<svg viewBox="${VB}" role="img" aria-label="${label}">${gradDef(id)}<g class="fx-strokes">${SUBS.map(s => `<path d="${s}" stroke="url(#${id})"/>`).join('')}</g><path class="fx-fill" fill="url(#${id})" fill-rule="evenodd" d="${D}"/></svg>`;
  };

  /* ---------- signature draw-on ---------- */
  function draw(host, done) {
    host.classList.remove('filled');
    if (reduce) { host.classList.add('filled'); done && done(); return; }
    const paths = [...host.querySelectorAll('.fx-strokes path')];
    const meas = paths.map(p => ({ p, len: p.getTotalLength(), x: p.getBBox().x }));
    meas.forEach(({ p, len }) => { p.style.transition = 'none'; p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
    host.getBoundingClientRect();
    meas.forEach(({ p, x }) => { p.style.transition = `stroke-dashoffset 1.3s cubic-bezier(.6,0,.2,1) ${((x / 1414) * .9).toFixed(3)}s`; p.style.strokeDashoffset = 0; });
    clearTimeout(host._fxT);
    host._fxT = setTimeout(() => { host.classList.add('filled'); done && setTimeout(done, 900); }, 2000);
  }

  /* ---------- nav ---------- */
  function nav(img) {
    const wrap = img.parentElement;
    wrap.dataset.fx = 'nav';
    const span = document.createElement('span');
    span.className = 'e-fx-nav';
    span.innerHTML = drawSvg('ERROR404');
    wrap.insertBefore(span, img);
    setTimeout(() => draw(span), 300);
    const link = wrap.closest('a') || wrap;
    link.addEventListener('pointerenter', () => { if (span.classList.contains('filled')) draw(span); });
  }

  /* ---------- hero + closing: spotlight ---------- */
  function spotlight(host, kind) {
    host.dataset.fx = kind;
    const id = 'efx' + (++uid);
    const layer = document.createElement('div');
    layer.className = 'e-fx-layer e-fx-spot';
    layer.innerHTML =
      `<span class="e-fx-bloom" aria-hidden="true"></span>` +
      `<svg class="fx-base" viewBox="${VB}" aria-hidden="true"><path fill-rule="evenodd" d="${D}"/></svg>` +
      `<svg class="fx-lit" viewBox="${VB}" role="img" aria-label="ERROR404">${gradDef(id)}<path fill="url(#${id})" fill-rule="evenodd" d="${D}"/></svg>`;
    host.appendChild(layer);
    if (reduce) { layer.classList.add('all-lit'); return; }
    torch(layer);
  }

  /* ---------- torch: follows the pointer (wanders when idle); drives --x/--y/--r ---------- */
  function torch(layer) {
    let tx = 0, ty = 0, x = null, y = null, last = -1e9, visible = false;
    new IntersectionObserver(es => es.forEach(e => visible = e.isIntersecting)).observe(layer);
    const track = (cx, cy) => { const r = layer.getBoundingClientRect(); tx = cx - r.left; ty = cy - r.top; last = performance.now(); };
    window.addEventListener('pointermove', e => visible && track(e.clientX, e.clientY), { passive: true });
    window.addEventListener('touchmove', e => visible && e.touches[0] && track(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    (function loop(t) {
      if (visible && !window.__e404MenuOpen) {
        const r = layer.getBoundingClientRect();
        if (t - last > 1500) { tx = r.width / 2 + Math.sin(t / 1700) * r.width * .42; ty = r.height / 2 + Math.sin(t / 1100) * r.height * .6; }
        x = x === null ? tx : lerp(x, tx, .12); y = y === null ? ty : lerp(y, ty, .12);
        layer.style.setProperty('--x', x.toFixed(1) + 'px'); layer.style.setProperty('--y', y.toFixed(1) + 'px');
        layer.style.setProperty('--r', Math.max(110, r.width * .22).toFixed(0) + 'px');
      }
      requestAnimationFrame(loop);
    })(0);
  }

  /* ---------- hero: outline + glitch bursts ---------- */
  function glitch(host) {
    host.dataset.fx = 'hero';
    const out = cls => `<svg class="${cls}" viewBox="${VB}" aria-hidden="true"><path fill-rule="evenodd" d="${D}"/></svg>`;
    const layer = document.createElement('div');
    const id = 'efx' + (++uid);
    layer.className = 'e-fx-layer e-fx-spot e-fx-glitch';
    layer.innerHTML =
      `<span class="e-fx-bloom" aria-hidden="true"></span>` +
      `<svg class="fx-base" viewBox="${VB}" aria-hidden="true"><path fill-rule="evenodd" d="${D}"/></svg>` +
      `<svg class="fx-lit" viewBox="${VB}" role="img" aria-label="ERROR404">${gradDef(id)}<path fill="url(#${id})" fill-rule="evenodd" d="${D}"/></svg>` +
      out('fx-gm') + out('fx-gc') + out('fx-s1') + out('fx-s2');
    host.appendChild(layer);
    if (reduce) { layer.classList.add('all-lit'); return; }
    torch(layer);
    const section = host.closest('section');
    let visible = false;
    new IntersectionObserver(es => es.forEach(e => visible = e.isIntersecting)).observe(layer);
    const burst = () => {
      if (visible && !window.__e404MenuOpen && !document.hidden) {
        layer.classList.add('burst'); section && section.classList.add('e-burst');
        setTimeout(() => { layer.classList.remove('burst'); section && section.classList.remove('e-burst'); }, 520);
      }
      setTimeout(burst, 4000 + Math.random() * 2000);
    };
    setTimeout(burst, 2600);
  }

  /* ---------- attach when React mounts the logos ---------- */
  function scan() {
    document.querySelectorAll('.e-logo-slam:not([data-fx])').forEach(h => glitch(h));
    document.querySelectorAll('.e-logo-full:not(.e-logo-slam):not([data-fx])').forEach(h => spotlight(h, 'closing'));
    document.querySelectorAll('img.e4-lock-logo').forEach(img => { if (!img.parentElement.dataset.fx) nav(img); });
  }
  fetch('/assets/error404logo.svg').then(r => r.text()).then(src => {
    VB = src.match(/viewBox="([^"]+)"/)[1];
    D = src.match(/ d="([^"]+)"/)[1];
    SUBS = D.match(/M[^M]*/g);
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  }).catch(() => document.documentElement.classList.remove('fx-pending'));
})();
