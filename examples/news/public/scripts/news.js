/**
 * Search for the news template: the dialog in site/partials/search.eta, opened by the
 * Search button in the section tabs, "/" or Ctrl/Cmd+K.
 *
 * Plain JavaScript with no dependencies, loaded as a module from site/partials/head.eta.
 * Stati writes the search index at build time and names it in a meta tag; this script
 * loads it on first use. Without JavaScript the Search button stays hidden and every
 * page works as it is.
 */

const root = document.documentElement;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * @typedef {object} SearchDocument
 * @property {string} id
 * @property {string} url
 * @property {string} anchor
 * @property {string} title
 * @property {string} heading
 * @property {number} level
 * @property {string} content
 *
 * @typedef {SearchDocument & { _title: string, _heading: string, _content: string }} IndexedDocument
 */

/** @param {string} text */
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * Lowercase, without accents, so "Résumé" matches "resume". Folds one character at a
 * time and keeps the length unchanged, so match positions line up with the original
 * text when highlighting.
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
 * 2 when the term starts a word in the text, 1 when it only appears inside a word,
 * 0 when it is missing.
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
 * How well a document matches the query terms, or 0 when a term is missing. Headline
 * matches outrank heading matches, which outrank the text.
 * @param {IndexedDocument} doc @param {string[]} terms @param {string} phrase
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
  if (terms.length > 1 && (doc._title.includes(phrase) || doc._heading.includes(phrase)))
    total += 10;
  if (doc.level === 1) total += 0.5;
  return total;
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

/** A short piece of text around the first match, with matches marked. @param {string} content @param {string[]} terms */
function snippet(content, terms) {
  const text = content.replace(/\s+/g, ' ').trim();
  const lower = normalize(text);
  let start = 0;
  for (const term of terms) {
    const index = lower.indexOf(term);
    if (index !== -1) {
      start = Math.max(0, index - 50);
      break;
    }
  }
  let piece = text.slice(start, start + 170);
  if (start > 0) piece = `…${piece.replace(/^\S*\s/, '')}`;
  if (start + 170 < text.length) piece = `${piece.replace(/\s\S*$/, '')}…`;
  return highlight(piece, terms);
}

function initSearch() {
  const dialog = /** @type {HTMLDialogElement | null} */ (document.getElementById('search-dialog'));
  const indexPath = document
    .querySelector('meta[name="stati:search-index"]')
    ?.getAttribute('content');
  if (!dialog || !indexPath || typeof dialog.showModal !== 'function') return;

  // Index URLs are paths from the site root; the meta tag's path carries the base path of
  // a site served from a folder, such as /news-site/search-index-1a2b3c4d.json
  const indexUrl = indexPath;
  const basePath = indexPath.replace(/[?#].*$/, '').replace(/\/[^/]*$/, '');
  /** @param {string} path */
  const siteUrl = (path) => `${basePath}${path}`;

  const input = /** @type {HTMLInputElement} */ (dialog.querySelector('#search-input'));
  const list = /** @type {HTMLUListElement} */ (dialog.querySelector('#search-results'));
  const message = /** @type {HTMLElement} */ (dialog.querySelector('[data-search-message]'));
  const status = /** @type {HTMLElement} */ (dialog.querySelector('[data-search-status]'));
  const idleMessage = message.textContent ?? '';

  /** @type {{ url: string, title: string }[]} */
  let sections = [];
  try {
    sections = JSON.parse(dialog.querySelector('[data-search-sections]')?.textContent ?? '[]');
  } catch {
    sections = [];
  }
  /** @param {string} url */
  const sectionOf = (url) =>
    sections.find((section) => url.startsWith(`${section.url}/`))?.title ?? '';

  /** @type {Promise<IndexedDocument[]> | null} */
  let loading = null;
  /** @type {HTMLAnchorElement[]} */
  let options = [];
  let active = -1;
  /** @type {Element | null} */
  let returnFocus = null;

  document.querySelectorAll('[data-search-open]').forEach((trigger) => {
    /** @type {HTMLElement} */ (trigger).hidden = false;
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
      .then((data) =>
        /** @type {SearchDocument[]} */ (data.documents ?? []).map((doc) => ({
          ...doc,
          _title: normalize(doc.title ?? ''),
          _heading: normalize(doc.heading ?? ''),
          _content: normalize(doc.content ?? ''),
        })),
      )
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
    options.forEach((option, i) =>
      option.parentElement?.setAttribute('aria-selected', String(i === index)),
    );
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
      showMessage(idleMessage);
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

    // One result per story: its best-matching part
    /** @type {Map<string, { doc: IndexedDocument, score: number }>} */
    const best = new Map();
    for (const doc of docs) {
      const points = score(doc, terms, phrase);
      if (points > (best.get(doc.url)?.score ?? 0)) best.set(doc.url, { doc, score: points });
    }
    const matches = [...best.values()].sort((a, b) => b.score - a.score).slice(0, 20);

    if (matches.length === 0) {
      showMessage(`No stories match “${value}”. Try fewer or different words.`);
      status.textContent = 'No results.';
      return;
    }

    list.innerHTML = matches
      .map(({ doc }, n) => {
        const href = siteUrl(doc.anchor ? `${doc.url}#${doc.anchor}` : doc.url);
        const section = sectionOf(doc.url);
        const text = doc.level === 1 ? doc.content : `${doc.heading}: ${doc.content}`;
        return `<li class="search-result" role="option" id="search-option-${n}" aria-selected="false">
          <a href="${escapeHtml(href)}" tabindex="-1">
            <span class="search-result-title">${highlight(doc.title, terms)}</span>
            ${text ? `<span class="search-result-snippet">${snippet(text, terms)}</span>` : ''}
            ${section ? `<span class="search-result-section">${escapeHtml(section)}</span>` : ''}
          </a>
        </li>`;
      })
      .join('');
    list.hidden = false;
    message.hidden = true;
    input.setAttribute('aria-expanded', 'true');
    options = [...list.querySelectorAll('.search-result a')];
    setActive(0);
    status.textContent = `${options.length} ${options.length === 1 ? 'story' : 'stories'}.`;
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

  list.addEventListener('click', (event) => {
    if (/** @type {HTMLElement} */ (event.target).closest('a')) dialog.close();
  });
}

initSearch();
