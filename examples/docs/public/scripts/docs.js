/**
 * Docs template behaviour: theme toggle, mobile navigation, search, the
 * "On this page" highlight, heading links and code copy buttons.
 *
 * Plain JavaScript with no dependencies, loaded as a module from
 * site/_partials/head.eta. Every page reads fine without it; each feature
 * below only enhances markup that is already there.
 */

const root = document.documentElement;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Small SVG icons, matching site/_partials/icon.eta. */
const ICONS = {
  page: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
};

/** @param {keyof typeof ICONS} name @param {number} [size] */
function icon(name, size = 16) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
}

/** @param {string} text */
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/* ---------- Theme ---------- */

function initTheme() {
  const button = document.querySelector('[data-theme-toggle]');
  if (!button) return;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => root.dataset.theme === 'dark' || (!root.dataset.theme && media.matches);
  const sync = () => button.setAttribute('aria-pressed', String(isDark()));

  button.hidden = false;
  sync();
  media.addEventListener('change', sync);

  button.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Storage can be unavailable (private windows); the choice lasts for this page only.
    }
    sync();
  });
}

/* ---------- Mobile navigation drawer ---------- */

function initMenu() {
  const sidebar = document.getElementById('sidebar');
  const openButton = document.querySelector('[data-menu-open]');
  const backdrop = document.querySelector('.sidebar-backdrop');
  if (!sidebar || !openButton) return;

  /** Everything behind the drawer, made inert while it is open. */
  const behind = [...document.querySelectorAll('.site-header, main, .site-footer, .skip-link')];

  const close = () => {
    if (!sidebar.hasAttribute('data-open')) return;
    sidebar.removeAttribute('data-open');
    backdrop?.removeAttribute('data-open');
    backdrop?.setAttribute('hidden', '');
    openButton.setAttribute('aria-expanded', 'false');
    behind.forEach((element) => (element.inert = false));
    root.style.overflow = '';
    openButton.focus();
  };

  const open = () => {
    sidebar.setAttribute('data-open', '');
    backdrop?.removeAttribute('hidden');
    backdrop?.setAttribute('data-open', '');
    openButton.setAttribute('aria-expanded', 'true');
    behind.forEach((element) => (element.inert = true));
    root.style.overflow = 'hidden';
    const current = sidebar.querySelector('[aria-current="page"]');
    current?.scrollIntoView({ block: 'center' });
    sidebar.querySelector('[data-menu-close]')?.focus();
  };

  openButton.addEventListener('click', open);
  document.querySelectorAll('[data-menu-close]').forEach((element) => {
    element.addEventListener('click', close);
  });
  sidebar.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  // Close when the layout grows past the drawer breakpoint
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (event) => {
    if (event.matches && !document.body.classList.contains('page-home')) close();
  });
}

/* ---------- "On this page" highlight ---------- */

function initTocHighlight() {
  const links = [...document.querySelectorAll('[data-toc-link]')];
  if (links.length === 0) return;

  const headings = links
    .map((link) => document.getElementById(link.getAttribute('data-toc-link') ?? ''))
    .filter((heading) => heading !== null);
  if (headings.length === 0) return;

  /** @param {string} id */
  const setActive = (id) => {
    for (const link of links) {
      if (link.getAttribute('data-toc-link') === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  };

  // The active heading is the last one scrolled past the top quarter of the screen.
  const update = () => {
    const line = window.innerHeight * 0.25;
    let active = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= line) active = heading;
      else break;
    }
    const atBottom =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    setActive((atBottom ? headings[headings.length - 1] : active).id);
  };

  let frame = 0;
  window.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}

/* ---------- Heading links ---------- */

function initHeadingAnchors() {
  for (const heading of document.querySelectorAll('.doc .prose h2[id], .doc .prose h3[id]')) {
    const link = document.createElement('a');
    link.className = 'heading-anchor';
    link.href = `#${heading.id}`;
    link.setAttribute('aria-label', `Link to “${heading.textContent?.trim() ?? ''}”`);
    link.innerHTML = icon('hash', 16);
    heading.append(link);
  }
}

/* ---------- Code blocks: language label and copy button ---------- */

const LANGUAGE_NAMES = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  bash: 'Terminal',
  sh: 'Terminal',
  shell: 'Terminal',
  md: 'Markdown',
  markdown: 'Markdown',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  text: 'Text',
  plain: 'Text',
  eta: 'Eta',
};

function initCodeBlocks() {
  for (const pre of document.querySelectorAll('.prose pre')) {
    if (pre.parentElement?.classList.contains('code-frame')) continue;
    const code = pre.querySelector('code');
    const match = /language-([\w-]+)/.exec(`${pre.className} ${code?.className ?? ''}`);
    const lang = match?.[1] ?? 'text';

    const wrapper = document.createElement('div');
    wrapper.className = 'code-frame';
    const header = document.createElement('div');
    header.className = 'code-header';
    const label = document.createElement('span');
    label.textContent = LANGUAGE_NAMES[lang] ?? lang;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-button';
    button.innerHTML = `${icon('copy', 14)}<span>Copy</span>`;
    header.append(label, button);

    pre.before(wrapper);
    wrapper.append(header, pre);

    button.addEventListener('click', async () => {
      const text = (code ?? pre).textContent ?? '';
      try {
        await navigator.clipboard.writeText(text.replace(/\n$/, ''));
        button.setAttribute('data-copied', '');
        button.innerHTML = `${icon('check', 14)}<span>Copied</span>`;
      } catch {
        button.innerHTML = `${icon('copy', 14)}<span>Press Ctrl C</span>`;
        const range = document.createRange();
        range.selectNodeContents(code ?? pre);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      window.setTimeout(() => {
        button.removeAttribute('data-copied');
        button.innerHTML = `${icon('copy', 14)}<span>Copy</span>`;
      }, 2000);
    });
  }
}

/* ---------- Search ---------- */

/**
 * @typedef {object} SearchDocument
 * @property {string} id
 * @property {string} url
 * @property {string} anchor
 * @property {string} title
 * @property {string} heading
 * @property {number} level
 * @property {string} content
 * @property {string} breadcrumb
 *
 * @typedef {SearchDocument & { _title: string, _heading: string, _content: string }} IndexedDocument
 */

/**
 * Lowercase, without accents, so "Résumé" matches "resume". Folds one
 * character at a time and keeps the length unchanged, so match positions
 * line up with the original text when highlighting.
 * @param {string} text
 */
function normalize(text) {
  let out = '';
  for (const char of text) {
    const folded = char.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const lower = char.toLowerCase();
    out += folded.length === char.length ? folded : lower.length === char.length ? lower : char;
  }
  return out;
}

/**
 * 2 when the term starts a word in the text, 1 when it only appears inside a
 * word, 0 when it is missing.
 * @param {string} text @param {string} term
 */
function matchKind(text, term) {
  let index = text.indexOf(term);
  if (index === -1) return 0;
  while (index !== -1) {
    if (index === 0 || !/[a-z0-9]/.test(text[index - 1] ?? '')) return 2;
    index = text.indexOf(term, index + 1);
  }
  return 1;
}

/**
 * How well a document matches the query terms, or 0 when a term is missing.
 * Title matches outrank heading matches, which outrank body text; matches at
 * the start of a word outrank matches inside one.
 *
 * @param {IndexedDocument} doc
 * @param {string[]} terms
 * @param {string} phrase
 */
function score(doc, terms, phrase) {
  let total = 0;
  for (const term of terms) {
    const best = Math.max(
      [0, 6, 10][matchKind(doc._title, term)],
      [0, 4, 8][matchKind(doc._heading, term)],
      [0, 1, 2][matchKind(doc._content, term)],
    );
    if (best === 0) return 0;
    total += best;
  }
  if (terms.length > 1 && (doc._heading.includes(phrase) || doc._title.includes(phrase)))
    total += 10;
  // Prefer the page entry over its sections when they match equally well
  if (doc.level === 1) total += 0.5;
  return total;
}

/**
 * A short piece of text around the first match, with matches marked.
 * @param {string} content @param {string[]} terms
 */
function snippet(content, terms) {
  const text = content.replace(/\s+/g, ' ').trim();
  const lower = normalize(text);
  let start = 0;
  for (const term of terms) {
    const index = lower.indexOf(term);
    if (index !== -1) {
      start = Math.max(0, index - 40);
      break;
    }
  }
  let piece = text.slice(start, start + 160);
  if (start > 0) piece = `…${piece.replace(/^\S*\s/, '')}`;
  if (start + 160 < text.length) piece = `${piece.replace(/\s\S*$/, '')}…`;
  return highlight(piece, terms);
}

/** @param {string} text @param {string[]} terms */
function highlight(text, terms) {
  const lower = normalize(text);
  /** @type {[number, number][]} */
  const ranges = [];
  for (const term of terms) {
    let from = 0;
    let index;
    while (term && (index = lower.indexOf(term, from)) !== -1) {
      ranges.push([index, index + term.length]);
      from = index + term.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let html = '';
  let cursor = 0;
  for (const [from, to] of ranges) {
    if (from < cursor) continue;
    html += `${escapeHtml(text.slice(cursor, from))}<mark>${escapeHtml(text.slice(from, to))}</mark>`;
    cursor = to;
  }
  return html + escapeHtml(text.slice(cursor));
}

function initSearch() {
  const dialog = /** @type {HTMLDialogElement | null} */ (document.getElementById('search-dialog'));
  const indexUrl = document
    .querySelector('meta[name="stati:search-index"]')
    ?.getAttribute('content');
  const triggers = document.querySelectorAll('[data-search-open]');
  if (!dialog || !indexUrl || typeof dialog.showModal !== 'function') return;

  const input = /** @type {HTMLInputElement} */ (dialog.querySelector('#search-input'));
  const list = /** @type {HTMLUListElement} */ (dialog.querySelector('#search-results'));
  const message = /** @type {HTMLElement} */ (dialog.querySelector('[data-search-message]'));
  const status = /** @type {HTMLElement} */ (dialog.querySelector('[data-search-status]'));

  /** Section titles by URL, from the sidebar (see site/_partials/search.eta). */
  /** @type {{ url: string, title: string }[]} */
  let sections = [];
  try {
    sections = JSON.parse(dialog.querySelector('[data-search-sections]')?.textContent ?? '[]');
  } catch {
    sections = [];
  }
  /** @param {SearchDocument} doc */
  const groupLabel = (doc) => {
    const section = sections.find((s) => doc.url === s.url || doc.url.startsWith(`${s.url}/`));
    if (!section) return doc.title;
    return doc.url === section.url ? section.title : `${section.title} › ${doc.title}`;
  };

  /** The base path of a site served from a folder, from the index; result URLs start with it. */
  let basePath = '';
  /** @type {Promise<IndexedDocument[]> | null} */
  let loading = null;
  /** @type {HTMLAnchorElement[]} */
  let options = [];
  let active = -1;
  /** @type {Element | null} */
  let returnFocus = null;

  triggers.forEach((trigger) => {
    trigger.hidden = false;
    trigger.addEventListener('click', () => open());
  });
  document.querySelectorAll('[data-search-keys]').forEach((keys) => {
    keys.textContent = isMac ? '⌘ K' : 'Ctrl K';
  });

  const load = () => {
    loading ??= fetch(indexUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        basePath = data.basePath ?? '';
        return /** @type {SearchDocument[]} */ (data.documents ?? []).map((doc) => ({
          ...doc,
          _title: normalize(doc.title ?? ''),
          _heading: normalize(doc.heading ?? ''),
          _content: normalize(doc.content ?? ''),
        }));
      })
      .catch((error) => {
        loading = null;
        throw error;
      });
    return loading;
  };

  const open = () => {
    if (dialog.open) return;
    returnFocus = document.activeElement;
    dialog.showModal();
    root.style.overflow = 'hidden';
    input.select();
    load().catch(() => {});
  };

  dialog.addEventListener('close', () => {
    root.style.overflow = '';
    if (returnFocus instanceof HTMLElement) returnFocus.focus();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelector('[data-search-close]')?.addEventListener('click', () => dialog.close());

  document.addEventListener('keydown', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    const typing = target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
    if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (dialog.open) dialog.close();
      else open();
    } else if (event.key === '/' && !typing && !dialog.open) {
      event.preventDefault();
      open();
    }
  });

  /** @param {string} text */
  const showMessage = (text) => {
    message.textContent = text;
    message.hidden = false;
    list.hidden = true;
    list.innerHTML = '';
    options = [];
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };

  /** @param {number} index */
  const setActive = (index) => {
    options.forEach((option, i) => {
      option.parentElement?.setAttribute('aria-selected', String(i === index));
    });
    active = index;
    const option = options[index];
    if (option?.parentElement) {
      input.setAttribute('aria-activedescendant', option.parentElement.id);
      option.parentElement.scrollIntoView({ block: 'nearest' });
    }
  };

  let query = '';
  const run = async () => {
    const value = input.value.trim();
    query = value;
    if (!value) {
      showMessage('Search every page and heading.');
      status.textContent = '';
      return;
    }

    let docs;
    try {
      if (!loading) showMessage('Loading the search index…');
      docs = await load();
    } catch {
      showMessage('Search is unavailable right now. Check your connection and try again.');
      return;
    }
    if (query !== value) return; // A newer query is already running

    const phrase = normalize(value);
    const terms = phrase.split(/\s+/).filter(Boolean);
    const matches = docs
      .map((doc) => ({ doc, score: score(doc, terms, phrase) }))
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    if (matches.length === 0) {
      showMessage(`No results for “${value}”. Try fewer or different words.`);
      status.textContent = 'No results.';
      return;
    }

    // Group results under their page, best page first
    /** @type {Map<string, typeof matches>} */
    const groups = new Map();
    for (const match of matches) {
      const group = groups.get(match.doc.url) ?? [];
      group.push(match);
      groups.set(match.doc.url, group);
    }

    let html = '';
    let n = 0;
    for (const group of groups.values()) {
      const label = groupLabel(group[0].doc);
      html += `<li class="search-group" role="presentation">${escapeHtml(label)}</li>`;
      for (const { doc } of group.slice(0, 4)) {
        const href = `${basePath}${doc.anchor ? `${doc.url}#${doc.anchor}` : doc.url}`;
        const title = doc.level === 1 ? doc.title : doc.heading;
        html += `<li class="search-result" role="option" id="search-option-${n}" aria-selected="false">
          <a href="${escapeHtml(href)}" tabindex="-1">${icon(doc.level === 1 ? 'page' : 'hash', 16)}
            <span class="search-result-text">
              <span class="search-result-title">${highlight(title, terms)}</span>
              ${doc.content ? `<span class="search-result-snippet">${snippet(doc.content, terms)}</span>` : ''}
            </span>
          </a>
        </li>`;
        n += 1;
      }
    }

    list.innerHTML = html;
    list.hidden = false;
    message.hidden = true;
    input.setAttribute('aria-expanded', 'true');
    options = [...list.querySelectorAll('.search-result a')];
    setActive(0);
    status.textContent = `${options.length} ${options.length === 1 ? 'result' : 'results'}.`;
  };

  let timer = 0;
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 80);
  });

  input.addEventListener('keydown', (event) => {
    if (options.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((active + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((active - 1 + options.length) % options.length);
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      options[active].click();
    }
  });

  list.addEventListener('mousemove', (event) => {
    const option = /** @type {HTMLElement} */ (event.target).closest('.search-result a');
    const index = option ? options.indexOf(/** @type {HTMLAnchorElement} */ (option)) : -1;
    if (index !== -1 && index !== active) setActive(index);
  });

  // Following a result on the current page only scrolls, so close the dialog.
  list.addEventListener('click', (event) => {
    if (/** @type {HTMLElement} */ (event.target).closest('a')) dialog.close();
  });
}

initTheme();
initMenu();
initHeadingAnchors();
initCodeBlocks();
initTocHighlight();
initSearch();
