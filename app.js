// Orderflow Engine delivery portal: loads the texts of the chosen language, renders the evidence tables from
// data/evidence.json, drives the quote panel with answers recorded from the real API
// (data/quotes-co-alpha.json), and shows one section at a time: the one chosen in the table of contents.
(() => {
  const SUPPORTED = ['es', 'en'];
  const STORAGE_KEY = 'orderflow-page.lang';
  const COLA = 'BEV-COLA-350';
  const CHIPS = 'SNK-CHIPS-45';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  root.classList.add('js');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  let lang = initialLanguage();
  let dict = {};
  let quotes = null;
  let evidence = null;
  let colaQty = 40;
  let chipsOn = true;

  function initialLanguage() {
    const fromQuery = new URLSearchParams(location.search).get('lang');
    if (SUPPORTED.includes(fromQuery)) return fromQuery;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.includes(stored)) return stored;
    } catch (e) { /* storage unavailable: use the default */ }
    return 'es';
  }

  function lookup(key) {
    return key.split('.').reduce((node, part) => (node && node[part] !== undefined ? node[part] : undefined), dict);
  }

  function t(key) {
    const value = lookup(key);
    return typeof value === 'string' ? value : '';
  }

  // Escapes the text, then turns `code` and **bold** into markup. Nothing else is interpreted.
  function rich(text) {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  function money(amount) {
    return new Intl.NumberFormat(t('meta.locale') || 'es-419', {
      style: 'currency', currency: quotes ? quotes.currency : 'COP', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0,
    }).format(Number(amount));
  }

  function applyTexts() {
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = rich(t(el.dataset.i18n)); });
    document.querySelectorAll('[data-i18n-list]').forEach((el) => {
      const items = lookup(el.dataset.i18nList);
      el.innerHTML = Array.isArray(items) ? items.map((item) => `<li>${rich(item)}</li>`).join('') : '';
    });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':');
        el.setAttribute(attr, t(key));
      });
    });
    document.querySelectorAll('[data-href-es]').forEach((el) => { el.href = lang === 'es' ? el.dataset.hrefEs : el.dataset.hrefEn; });
    document.querySelectorAll('[data-href-lang]').forEach((el) => { el.href = el.dataset.hrefLang.replace('{lang}', lang); });
    document.querySelectorAll('[data-src-lang]').forEach((el) => { el.src = el.dataset.srcLang.replace('{lang}', lang); });
    document.querySelectorAll('[data-badge]').forEach((el) => { el.innerHTML = `${CHECK}${rich(t('common.solved'))}`; });
    document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    root.lang = lang;
    document.title = t('meta.title');
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', t('meta.description'));
    renderEvidence();
    labelCells();
    renderQuote(false);
    copyNavigation();
    renderPagers();
    showSection(false);
  }

  // Copies each column heading onto its cells, so a phone can show every row as a labelled card.
  function labelCells() {
    document.querySelectorAll('.table').forEach((table) => {
      const heads = [...table.querySelectorAll('thead th')].map((th) => th.textContent);
      table.querySelectorAll('tbody tr').forEach((tr) => {
        [...tr.children].forEach((td, i) => { if (heads[i]) td.dataset.label = heads[i]; });
      });
    });
  }

  function testUrl(repo, path, kind) {
    const base = `${evidence.repoBase}${repo}`;
    if (kind === 'raw') return `${base}/${path}`;
    return `${base}/${kind === 'tree' ? 'tree' : 'blob'}/${evidence.branch}/${path}`;
  }

  function renderEvidence() {
    if (!evidence) return;
    document.querySelectorAll('[data-evidence]').forEach((table) => {
      const section = table.dataset.evidence;
      const rows = evidence.sections[section] || [];
      const head = `<thead><tr><th>${rich(t('common.requirement'))}</th><th>${rich(t('common.verifiedBy'))}</th><th>${rich(t('common.criterion'))}</th><th>${rich(t('common.result'))}</th></tr></thead>`;
      const body = rows.map((row) => {
        const tests = row.tests.map(([repo, name, path, kind]) =>
          `<a class="test-link" href="${testUrl(repo, path, kind)}">${rich(name)}</a>`).join('');
        return `<tr><td>${rich(t(`${section}.ev.${row.key}`))}</td><td>${tests}</td><td>${rich(row.ac)}</td><td><span class="badge">${CHECK}${rich(t('common.passes'))}</span></td></tr>`;
      }).join('');
      table.innerHTML = `${head}<tbody>${body}</tbody>`;
    });
  }

  function productName(sku) {
    for (const quote of Object.values(quotes.quotes)) {
      const line = quote.lines.find((l) => l.sku === sku);
      if (line) return line.name;
    }
    return '';
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderQuote(animate) {
    if (!quotes) return;
    const quote = quotes.quotes[`${colaQty}-${chipsOn ? 10 : 0}`];
    if (!quote) return;
    const cola = quote.lines.find((l) => l.sku === COLA);
    const chips = quotes.quotes['40-10'].lines.find((l) => l.sku === CHIPS);
    setText('cola-name', productName(COLA));
    setText('cola-unit', money(cola.unit));
    setText('chips-name', productName(CHIPS));
    setText('chips-unit', money(chips.unit));
    setText('cola-qty', String(colaQty));
    setText('q-gross', money(quote.gross));
    setText('q-combo', `−${money(quote.combo)}`);
    setText('q-tier', `−${money(quote.tierTotal)}`);
    setText('q-taxes', money(quote.taxes));
    setText('q-total', money(quote.total));
    document.getElementById('row-combo').hidden = quote.combo === 0;
    document.getElementById('row-tier').hidden = quote.tierTotal === 0;
    const gifts = quote.lines.filter((l) => l.gift);
    document.getElementById('row-gift').hidden = gifts.length === 0;
    setText('q-gift-name', gifts.map((g) => `${g.name} × ${g.qty}`).join(', '));
    document.getElementById('cola-less').disabled = colaQty <= 1;
    document.getElementById('cola-more').disabled = colaQty >= 60;
    document.getElementById('chips').setAttribute('aria-checked', String(chipsOn));
    if (animate && !reducedMotion.matches) {
      ['q-total', 'q-taxes', 'q-gross', 'cola-qty'].forEach((id) => {
        document.getElementById(id).animate(
          [{ opacity: 0.55, transform: 'translateY(2px)' }, { opacity: 1, transform: 'none' }],
          { duration: 140, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
        );
      });
    }
  }

  // The phone menu is a copy of the sidebar, so both always list the same sections.
  function copyNavigation() {
    const panel = document.getElementById('mobile-nav');
    panel.innerHTML = document.getElementById('sidebar').innerHTML;
    panel.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { panel.closest('details').open = false; }));
  }

  function wireControls() {
    const step = (delta) => { colaQty = Math.min(60, Math.max(1, colaQty + delta)); renderQuote(true); };
    document.getElementById('cola-less').addEventListener('click', () => step(-1));
    document.getElementById('cola-more').addEventListener('click', () => step(1));
    document.getElementById('chips').addEventListener('click', () => { chipsOn = !chipsOn; renderQuote(true); });
    document.querySelectorAll('.lang button').forEach((button) => button.addEventListener('click', () => {
      if (button.dataset.lang === lang) return;
      lang = button.dataset.lang;
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* not remembered */ }
      loadTexts().then(applyTexts);
    }));
  }

  // The sections in the order of the table of contents.
  function order() {
    return [...document.querySelectorAll('#sidebar a')].map((a) => a.getAttribute('href').slice(1));
  }

  // Shows only the section named in the address (#a1, #documents…); the summary when none is named.
  function showSection(fromNavigation) {
    const ids = order();
    const id = ids.includes(location.hash.slice(1)) ? location.hash.slice(1) : ids[0];
    document.querySelectorAll('.block').forEach((block) => { block.hidden = block.id !== id; });
    document.querySelectorAll('#sidebar a, #mobile-nav a').forEach((a) => {
      const current = a.getAttribute('href') === `#${id}`;
      a.classList.toggle('is-current', current);
      if (current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (!fromNavigation) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
    const section = document.getElementById(id);
    const heading = section.querySelector('h1, h2');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    if (!reducedMotion.matches) {
      section.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
        { duration: 180, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
  }

  // Previous and next links at the foot of each section, named like the table of contents.
  function renderPagers() {
    const ids = order();
    const label = (id) => document.querySelector(`#sidebar a[href="#${id}"]`).textContent;
    ids.forEach((id, i) => {
      const section = document.getElementById(id);
      if (!section) return;
      let pager = section.querySelector(':scope > .pager');
      if (!pager) { pager = document.createElement('nav'); pager.className = 'pager'; section.append(pager); }
      const prev = i > 0 ? `<a class="pager__prev" href="#${ids[i - 1]}"><span>${rich(t('common.previous'))}</span>${rich(label(ids[i - 1]))}</a>` : '<span></span>';
      const next = i < ids.length - 1 ? `<a class="pager__next" href="#${ids[i + 1]}"><span>${rich(t('common.next'))}</span>${rich(label(ids[i + 1]))}</a>` : '<span></span>';
      pager.innerHTML = prev + next;
    });
  }

  function loadTexts() {
    return fetch(`i18n/${lang}.json`).then((r) => r.json()).then((texts) => { dict = texts; });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.OrderflowViewer) window.OrderflowViewer.attach(() => dict);
    wireControls();
    Promise.all([
      loadTexts(),
      fetch('data/evidence.json').then((r) => r.json()).then((d) => { evidence = d; }),
      fetch('data/quotes-co-alpha.json').then((r) => r.json()).then((d) => { quotes = d; }),
    ])
      .then(applyTexts)
      .then(() => window.scrollTo({ top: 0, behavior: 'auto' }))
      .finally(() => { window.addEventListener('hashchange', () => showSection(true)); });
  });
})();
