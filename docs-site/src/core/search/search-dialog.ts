/**
 * Search dialog
 *
 * One search experience for every page and screen size, built on the native
 * <dialog> element (focus containment, Escape to close, inert background).
 *
 * - Opens from any [data-search-open] trigger, "/" or Ctrl/Cmd+K
 * - Combobox input with aria-activedescendant over a listbox of results
 * - Idle, loading, results, no-results and error states, announced politely
 */

import { search, isSearchAvailable } from './search-engine.js';
import type { SearchDocument, SearchResult } from './types.js';

const DEBOUNCE_MS = 120;
const SNIPPET_LENGTH = 140;

interface DialogElements {
  dialog: HTMLDialogElement;
  input: HTMLInputElement;
  list: HTMLUListElement;
  status: HTMLElement;
  idle: HTMLElement;
  message: HTMLElement;
}

let elements: DialogElements | null = null;
let results: SearchResult[] = [];
let activeIndex = -1;
let debounceTimer: number | undefined;
let lastTrigger: HTMLElement | null = null;
let requestId = 0;

/**
 * Initializes the search dialog if the page has a search index.
 */
export function initSearchDialog(): void {
  const dialog = document.getElementById('search-dialog') as HTMLDialogElement | null;
  const triggers = document.querySelectorAll<HTMLElement>('[data-search-open]');

  if (!dialog || !isSearchAvailable()) {
    triggers.forEach((trigger) => (trigger.hidden = true));
    return;
  }

  const input = dialog.querySelector<HTMLInputElement>('#search-input');
  const list = dialog.querySelector<HTMLUListElement>('#search-results');
  const status = dialog.querySelector<HTMLElement>('#search-status');
  const idle = dialog.querySelector<HTMLElement>('[data-search-idle]');
  const message = dialog.querySelector<HTMLElement>('[data-search-message]');
  if (!input || !list || !status || !idle || !message) return;

  elements = { dialog, input, list, status, idle, message };

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => openDialog(trigger));
  });

  dialog.querySelectorAll('[data-search-close]').forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });

  // Clicking the backdrop (the dialog box itself, outside its panel) closes it
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    lastTrigger?.focus();
  });

  input.addEventListener('input', () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => runSearch(input.value), DEBOUNCE_MS);
  });

  input.addEventListener('keydown', handleInputKeys);

  list.addEventListener('click', (event) => {
    const option = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-index]');
    if (option) dialog.close();
  });

  document.addEventListener('keydown', (event) => {
    if (dialog.open) return;
    const isShortcut =
      (event.key === '/' && !isTyping()) ||
      (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey));
    if (isShortcut) {
      event.preventDefault();
      openDialog(null);
    }
  });
}

function openDialog(trigger: HTMLElement | null): void {
  if (!elements) return;
  lastTrigger = trigger ?? (document.activeElement as HTMLElement | null);
  document.documentElement.style.overflow = 'hidden';
  elements.dialog.showModal();
  elements.input.focus();
  elements.input.select();
}

function handleInputKeys(event: KeyboardEvent): void {
  if (!elements) return;

  switch (event.key) {
    // A search input clears itself on the first Escape; close instead, as the hint says
    case 'Escape':
      event.preventDefault();
      elements.dialog.close();
      break;
    case 'ArrowDown':
      event.preventDefault();
      setActive(Math.min(activeIndex + 1, results.length - 1));
      break;
    case 'ArrowUp':
      event.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
      break;
    case 'Enter': {
      const index = activeIndex >= 0 ? activeIndex : 0;
      const option = elements.list.querySelector<HTMLAnchorElement>(`a[data-index="${index}"]`);
      if (option) {
        event.preventDefault();
        elements.dialog.close();
        window.location.href = option.href;
      }
      break;
    }
  }
}

async function runSearch(query: string): Promise<void> {
  if (!elements) return;
  const { input, list, idle, message, status } = elements;
  const trimmed = query.trim();
  const thisRequest = ++requestId;

  results = [];
  setActive(-1);

  if (!trimmed) {
    list.replaceChildren();
    message.hidden = true;
    idle.hidden = false;
    input.setAttribute('aria-expanded', 'false');
    status.textContent = '';
    return;
  }

  idle.hidden = true;
  showMessage('search-loading-template');

  try {
    const found = await search(trimmed);
    if (thisRequest !== requestId) return;

    results = found;

    if (found.length === 0) {
      list.replaceChildren();
      showMessage('search-empty-template', trimmed);
      input.setAttribute('aria-expanded', 'false');
      status.textContent = `No results for ${trimmed}`;
      return;
    }

    message.hidden = true;
    list.replaceChildren(
      ...found.map((result, index) => renderOption(result.document, trimmed, index)),
    );
    input.setAttribute('aria-expanded', 'true');
    status.textContent = `${found.length} result${found.length === 1 ? '' : 's'}`;
  } catch (error) {
    if (thisRequest !== requestId) return;
    console.error('[Search]', error);
    list.replaceChildren();
    showMessage('search-error-template');
    status.textContent = 'Search could not load';
  }
}

function showMessage(templateId: string, query = ''): void {
  if (!elements) return;
  const template = document.getElementById(templateId) as HTMLTemplateElement | null;
  if (!template) return;
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  fragment.querySelectorAll('[data-search-query]').forEach((el) => (el.textContent = query));
  elements.message.replaceChildren(fragment);
  elements.message.hidden = false;
}

function renderOption(doc: SearchDocument, query: string, index: number): HTMLLIElement {
  const template = document.getElementById('search-result-template') as HTMLTemplateElement;
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const li = fragment.querySelector('li') as HTMLLIElement;
  const link = li.querySelector('a') as HTMLAnchorElement;

  link.href = doc.anchor ? `${doc.url}#${doc.anchor}` : doc.url;
  link.id = `search-option-${index}`;
  link.dataset.index = String(index);
  link.addEventListener('mousemove', () => setActive(index, false));

  const heading = li.querySelector('[data-result-heading]');
  if (heading) heading.innerHTML = highlight(doc.heading || doc.title, query);

  const breadcrumb = li.querySelector('[data-result-breadcrumb]');
  if (breadcrumb) breadcrumb.textContent = toSentenceCase(doc.breadcrumb);

  const snippet = li.querySelector('[data-result-snippet]');
  if (snippet) {
    const text = createSnippet(cleanText(doc.content), query);
    if (text) snippet.innerHTML = text;
    else snippet.remove();
  }

  return li;
}

function setActive(index: number, scroll = true): void {
  if (!elements) return;
  const options = elements.list.querySelectorAll<HTMLAnchorElement>('a[data-index]');
  options.forEach((option) => option.setAttribute('aria-selected', 'false'));
  activeIndex = index;

  const active = index >= 0 ? options[index] : undefined;
  if (active) {
    active.setAttribute('aria-selected', 'true');
    elements.input.setAttribute('aria-activedescendant', active.id);
    if (scroll) active.scrollIntoView({ block: 'nearest' });
  } else {
    elements.input.removeAttribute('aria-activedescendant');
  }
}

/**
 * Puts section crumbs in the sidebar's sentence case ("Getting Started" becomes
 * "Getting started"). Acronyms and the page title, the last crumb, are kept.
 */
function toSentenceCase(breadcrumb: string): string {
  const crumbs = breadcrumb.split(' > ');
  return crumbs
    .map((crumb, i) =>
      i === crumbs.length - 1
        ? crumb
        : crumb.replace(
            /(?!^)\b([A-Z])([a-z]+)\b/g,
            (_, first: string, rest: string) => first.toLowerCase() + rest,
          ),
    )
    .join(' > ');
}

/** Strips Markdown table pipes, rules and heading marks from indexed text. */
function cleanText(text: string): string {
  return text
    .replace(/\|?\s*:?-{3,}:?\s*/g, ' ')
    .replace(/\s*\|\s*/g, ' · ')
    .replace(/(^|\s)#{1,6}\s/g, ' ')
    .replace(/`/g, '')
    .replace(/(\s*·)+/g, ' ·')
    .replace(/^\s*·\s*|\s*·\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function createSnippet(content: string, query: string): string {
  if (!content) return '';
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = content.toLowerCase();
  const hits = words.map((word) => lower.indexOf(word)).filter((i) => i >= 0);
  const first = hits.length ? Math.min(...hits) : 0;

  const start = Math.max(0, first - 40);
  const end = Math.min(content.length, start + SNIPPET_LENGTH);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = `…${snippet}`;
  if (end < content.length) snippet = `${snippet}…`;

  return highlight(snippet, query);
}

function highlight(text: string, query: string): string {
  let html = escapeHtml(text);
  for (const word of query.split(/\s+/).filter(Boolean)) {
    html = html.replace(
      new RegExp(`(${escapeRegex(escapeHtml(word))})`, 'gi'),
      '<mark class="search-mark">$1</mark>',
    );
  }
  return html;
}

function isTyping(): boolean {
  const active = document.activeElement as HTMLElement | null;
  return (
    !!active &&
    (active.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName))
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
