// Floating viewer: every link that leaves the page opens in a dialog over it instead of navigating away.
// PDFs show in a frame, screenshots as an image, source files from GitHub as numbered code, Markdown files rendered,
// and anything that cannot be shown inside (a deck, a folder, a list of pull requests) as a card with its own button.
// Ctrl, Cmd, Shift or the middle button still open the link the usual way.
(() => {
  const RAW_BASE = 'https://raw.githubusercontent.com/';
  const CODE_EXTENSIONS = ['java', 'ts', 'mjs', 'js', 'sh', 'json', 'yaml', 'yml', 'py', 'ps1'];
  let texts = () => ({});
  let lastFocus = null;

  function label(key) {
    return (texts().viewer || {})[key] || '';
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // GitHub heading anchors: lower case, punctuation dropped (accents kept), spaces turned into hyphens.
  function slug(text) {
    return text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
  }

  function inline(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  }

  // A small Markdown renderer for the repositories' READMEs and ADRs: headings, paragraphs, lists, tables,
  // fenced code, block quotes and inline code, bold and links. Front matter is skipped.
  function markdown(source) {
    const lines = source.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^```/.test(line)) {
        const code = [];
        i += 1;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i += 1; }
        out.push(`<pre class="viewer-code viewer-code--plain"><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        i += 1;
        continue;
      }
      const heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        const level = Math.min(heading[1].length + 1, 6);
        out.push(`<h${level} id="md-${slug(heading[2])}">${inline(heading[2])}</h${level}>`);
        i += 1;
        continue;
      }
      if (/^\|/.test(line)) {
        const rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i += 1; }
        const cells = (row) => row.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const head = cells(rows[0]);
        const body = rows.slice(2).map(cells);
        out.push(`<div class="table-wrap"><table class="table"><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }
      if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
        const ordered = /^\s*\d+\./.test(line);
        const items = [];
        while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
          i += 1;
        }
        const tag = ordered ? 'ol' : 'ul';
        out.push(`<${tag}>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</${tag}>`);
        continue;
      }
      if (/^>\s?/.test(line)) {
        const quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, '')); i += 1; }
        out.push(`<blockquote class="quote-block"><p>${inline(quote.join(' '))}</p></blockquote>`);
        continue;
      }
      if (line.trim() === '') { i += 1; continue; }
      const paragraph = [];
      while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|```|\||>|\s*([-*]|\d+\.)\s)/.test(lines[i])) {
        paragraph.push(lines[i]);
        i += 1;
      }
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    }
    return out.join('\n');
  }

  function numberedCode(source) {
    const rows = source.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
    return `<pre class="viewer-code"><code>${rows.map((row) => `<span class="viewer-line">${escapeHtml(row) || ' '}</span>`).join('')}</code></pre>`;
  }

  // https://github.com/<owner>/<repo>/blob/<branch>/<path>#anchor → its parts, or null for any other GitHub page.
  function githubFile(url) {
    const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/([^#?]+)(?:#(.*))?$/.exec(url);
    if (!match) return null;
    return { owner: match[1], repo: match[2], branch: match[3], path: decodeURIComponent(match[4]), anchor: match[5] ? decodeURIComponent(match[5]) : '' };
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'viewer';
  dialog.innerHTML = `
    <div class="viewer__bar">
      <p class="viewer__title"></p>
      <div class="viewer__actions">
        <a class="viewer__action viewer__download" data-direct download></a>
        <a class="viewer__action viewer__open" data-direct target="_blank" rel="noopener"></a>
        <button type="button" class="viewer__close"><span aria-hidden="true">×</span></button>
      </div>
    </div>
    <div class="viewer__body"></div>`;
  const title = dialog.querySelector('.viewer__title');
  const body = dialog.querySelector('.viewer__body');
  const openLink = dialog.querySelector('.viewer__open');
  const download = dialog.querySelector('.viewer__download');
  const close = dialog.querySelector('.viewer__close');

  function show(heading, href, canDownload) {
    title.textContent = heading;
    openLink.href = href;
    openLink.textContent = label('newTab');
    openLink.hidden = false;
    download.hidden = !canDownload;
    if (canDownload) { download.href = href; download.textContent = label('download'); }
    close.setAttribute('aria-label', label('close'));
    if (!dialog.open) {
      lastFocus = document.activeElement;
      dialog.showModal();
      document.documentElement.classList.add('viewer-open');
    }
    body.scrollTop = 0;
  }

  // A card carries the only action of the dialog, so the bar's own buttons hide while it shows.
  function card(text, href, action = 'open') {
    openLink.hidden = true;
    download.hidden = true;
    const attributes = action === 'download' ? 'download' : 'target="_blank" rel="noopener"';
    const name = label(action === 'download' ? 'download' : 'newTab');
    body.innerHTML = `<div class="viewer-card"><p>${escapeHtml(text)}</p><p class="viewer-card__url">${escapeHtml(href)}</p><a class="button" data-direct ${attributes} href="${escapeHtml(href)}">${escapeHtml(name)}</a></div>`;
  }

  async function openGithubFile(file, href, heading) {
    show(heading, href, false);
    body.innerHTML = `<p class="viewer-status">${escapeHtml(label('loading'))}</p>`;
    const raw = `${RAW_BASE}${file.owner}/${file.repo}/${file.branch}/${file.path}`;
    try {
      const response = await fetch(raw);
      if (!response.ok) throw new Error(String(response.status));
      const source = await response.text();
      const extension = file.path.split('.').pop().toLowerCase();
      if (extension === 'md') {
        body.innerHTML = `<article class="viewer-doc">${markdown(source)}</article>`;
        body.querySelectorAll('.viewer-doc a[href]').forEach((a) => {
          const target = a.getAttribute('href');
          if (target.startsWith('#')) { a.setAttribute('href', `#md-${slug(decodeURIComponent(target.slice(1)).replace(/-/g, ' '))}`); a.dataset.local = 'true'; return; }
          if (!/^https?:/.test(target)) a.setAttribute('href', new URL(target, href.split('#')[0]).href);
        });
        if (file.anchor) {
          const anchor = body.querySelector(`#md-${CSS.escape(file.anchor)}`);
          if (anchor) anchor.scrollIntoView({ block: 'start' });
        }
      } else if (CODE_EXTENSIONS.includes(extension) || !file.path.includes('.')) {
        body.innerHTML = numberedCode(source);
      } else {
        card(label('noPreview'), href);
      }
    } catch (error) {
      card(label('unavailable'), href);
    }
  }

  // The dialog title: the image's description, the document row and its language column, or the link text.
  function headingFor(anchor) {
    const image = anchor.querySelector('img');
    if (image && image.alt) return image.alt;
    const cell = anchor.closest('td');
    if (anchor.classList.contains('file') && cell) {
      const table = cell.closest('table');
      const column = table.querySelectorAll('thead th')[cell.cellIndex];
      return `${cell.parentElement.cells[0].textContent.trim()} · ${column ? column.textContent.trim() : ''}`;
    }
    return (anchor.textContent || '').trim() || anchor.href;
  }

  function openLinkInViewer(anchor) {
    const href = anchor.href;
    const heading = headingFor(anchor);
    const path = new URL(href, location.href).pathname.toLowerCase();
    const sameSite = new URL(href, location.href).origin === location.origin;
    if (sameSite && path.endsWith('.pdf')) {
      show(heading, href, true);
      body.innerHTML = `<iframe class="viewer-frame" src="${escapeHtml(href)}" title="${escapeHtml(heading)}"></iframe>`;
      return;
    }
    if (sameSite && /\.(png|jpe?g|svg|webp)$/.test(path)) {
      show(heading, href, true);
      body.innerHTML = `<div class="viewer-image"><img src="${escapeHtml(href)}" alt="${escapeHtml(heading)}"></div>`;
      return;
    }
    if (sameSite && path.endsWith('.pptx')) {
      show(heading, href, true);
      card(label('deck'), href, 'download');
      return;
    }
    const file = githubFile(href);
    if (file) { openGithubFile(file, href, heading); return; }
    show(heading, href, false);
    card(label('external'), href);
  }

  function closeViewer() {
    if (!dialog.open) return;
    dialog.close();
  }

  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    document.documentElement.classList.remove('viewer-open');
    body.innerHTML = '';
    if (lastFocus) lastFocus.focus();
  });
  close.addEventListener('click', closeViewer);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) { closeViewer(); return; }
    // Opening the link in a new tab ends the visit to the dialog, so it is gone when the reader comes back.
    if (event.target.closest('a[data-direct][target="_blank"]')) setTimeout(closeViewer, 0);
  });

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');
    if (!anchor || anchor.hasAttribute('data-direct')) return;
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const raw = anchor.getAttribute('href');
    if (anchor.dataset.local === 'true') {
      event.preventDefault();
      const target = body.querySelector(raw);
      if (target) target.scrollIntoView({ block: 'start' });
      return;
    }
    if (raw.startsWith('#') || raw.startsWith('mailto:')) return;
    event.preventDefault();
    openLinkInViewer(anchor);
  });

  window.OrderflowViewer = {
    attach(getTexts) {
      texts = getTexts;
      document.body.append(dialog);
    },
  };
})();
