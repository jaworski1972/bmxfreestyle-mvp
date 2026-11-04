(() => {
  // Podpis wykonawcy strony: "Site by Motion House".
  const fixed = document.currentScript && document.currentScript.hasAttribute('data-fixed');
  if (document.querySelector('.site-by') || /\/(oferta|admin|panel)/i.test(location.pathname)) return;
  const href = 'https://www.motionhouse.pl/?utm_source='+encodeURIComponent(location.hostname.replace(/^www\./,''))+'&utm_medium=referral&utm_content=site-by';
  const a = document.createElement('a');
  a.className = 'site-by';
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', 'Site by Motion House Project (otwiera się w nowej karcie)');
  a.innerHTML = '<span>Site by</span><svg viewBox="8 10 112 108" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M64 10a54 54 0 1 1 0 108 54 54 0 0 1 0-108Zm0 28a26 26 0 1 0 0 52 26 26 0 0 0 0-52Z"/><path class="site-by-cut" d="M8 54 65 38 8 61Z"/></svg><b>Motion House</b>';
  const css = document.createElement('style');
  css.textContent = '.site-by{display:inline-flex!important;align-items:center;gap:7px;font-size:12px;font-weight:500;line-height:1.4;letter-spacing:.02em;text-transform:none!important;text-decoration:none!important;background:none!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0 0 0 16px!important;min-height:0!important;width:auto!important;border-radius:0!important;opacity:.6;transition:opacity .15s;color:inherit;white-space:nowrap}.site-by:hover,.site-by:focus-visible{opacity:1}.site-by svg{width:14px;height:14px;flex:none}.site-by b{font-weight:700}.site-by:focus-visible{outline:2px solid currentColor;outline-offset:4px}.site-by-line{text-align:center;padding:18px 16px 28px;margin:0}.site-by-line .site-by{margin:0!important}@media(prefers-reduced-motion:reduce){.site-by{transition:none}}';
  document.head.append(css);
  const footer = document.querySelector('footer');
  let bg;
  const slot = document.querySelector('[data-site-by]');
  if (fixed) {
    const line = document.createElement('p');
    line.className = 'site-by-line';
    line.style.cssText = 'position:fixed;left:16px;bottom:12px;z-index:50;padding:0;margin:0;color:#fff;text-align:left';
    line.append(a);
    document.body.append(line);
  } else if (slot) {
    slot.append(a);
  } else if (footer) {
    ([...footer.children].reverse().find(c => c.tagName !== 'A' && c.querySelector('a')) || footer).append(a);
    bg = getComputedStyle(footer).backgroundColor;
  } else {
    const line = document.createElement('p');
    line.className = 'site-by-line';
    line.append(a);
    const before = null;
    before ? before.before(line) : document.body.append(line);
    bg = getComputedStyle(document.body).backgroundColor;
  }
  let el = a.parentElement;
  bg = 'rgb(255, 255, 255)';
  while (el) { const c = getComputedStyle(el).backgroundColor; if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) { bg = c; break; } el = el.parentElement; }
  a.querySelector('.site-by-cut').setAttribute('fill', bg);
})();
