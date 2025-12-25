/**
 * Search UI Controller
 *
 * Handles DOM interactions for search:
 * - Desktop: Sidebar search input with dropdown results
 * - Mobile: Full-screen modal with search input
 * - Debounced input handling
 * - Keyboard navigation (↑↓ navigate, Enter select, Escape close)
 * - Results rendering using Eta templates
 * - Match highlighting
 */

import { search, navigateToResult, isSearchAvailable } from './search-engine.js';
import type { SearchDocument, SearchResult } from './types.js';

const DEBOUNCE_MS = 150;

let selectedIndex = -1;
let currentResults: SearchResult[] = [];
let debounceTimer: number | null = null;
let searchInput: HTMLInputElement | null = null;
let resultsContainerRef: HTMLDivElement | null = null;

// Mobile search state
let mobileModal: HTMLElement | null = null;
let mobileInput: HTMLInputElement | null = null;
let mobileResultsContainer: HTMLDivElement | null = null;

/**
 * Gets a template element by ID and clones its content.
 */
function getTemplate(id: string): DocumentFragment {
  const template = document.getElementById(id) as HTMLTemplateElement | null;
  if (!template) {
    throw new Error(`Template #${id} not found`);
  }
  return template.content.cloneNode(true) as DocumentFragment;
}

/**
 * Initializes the search UI (both desktop and mobile).
 */
export function initSearchUI(): void {
  if (!isSearchAvailable()) {
    console.debug('[Search] Index not available, skipping initialization');
    return;
  }

  initDesktopSearch();
  initMobileSearch();

  // Global "/" shortcut to focus search (desktop) or open modal (mobile)
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !isInputFocused()) {
      e.preventDefault();
      if (window.innerWidth < 1024 && mobileModal) {
        openMobileSearch();
      } else if (searchInput) {
        searchInput.focus();
      }
    }
  });

  console.debug('[Search] UI initialized');
}

/**
 * Initializes desktop sidebar search.
 */
function initDesktopSearch(): void {
  const input = document.querySelector('#sidebar input[type="search"]') as HTMLInputElement | null;
  if (!input) {
    console.debug('[Search] Desktop search input not found in sidebar');
    return;
  }

  searchInput = input;

  // Create results dropdown container from template
  const resultsContainer = createResultsContainer(input);
  resultsContainerRef = resultsContainer;

  // Input handler with debounce
  input.addEventListener('input', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      handleSearch(input.value, resultsContainer, input);
    }, DEBOUNCE_MS);
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    handleKeyNavigation(e, resultsContainer, input);
  });

  // Focus shows results if query exists
  input.addEventListener('focus', () => {
    if (input.value.trim() && currentResults.length > 0) {
      clearSelectionState(resultsContainer);
      resultsContainer.classList.remove('hidden');
    }
  });

  // Click outside closes results
  document.addEventListener('click', (e) => {
    const target = e.target as Node;
    if (!input.contains(target) && !resultsContainer.contains(target)) {
      closeResults(resultsContainer, input);
    }
  });

  // ARIA attributes
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', 'search-results');
}

/**
 * Initializes mobile search modal.
 */
function initMobileSearch(): void {
  mobileModal = document.getElementById('mobile-search-modal');
  mobileInput = document.getElementById('mobile-search-input') as HTMLInputElement | null;
  mobileResultsContainer = document.getElementById(
    'mobile-search-results',
  ) as HTMLDivElement | null;

  if (!mobileModal || !mobileInput || !mobileResultsContainer) {
    console.debug('[Search] Mobile search elements not found');
    return;
  }

  // Mobile search button
  const mobileSearchBtn = document.getElementById('mobile-search-btn');
  if (mobileSearchBtn) {
    mobileSearchBtn.addEventListener('click', openMobileSearch);
  }

  // Close modal handlers
  mobileModal.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeMobileSearch);
  });

  // Input handler with debounce
  mobileInput.addEventListener('input', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      if (mobileInput && mobileResultsContainer) {
        handleMobileSearch(mobileInput.value, mobileResultsContainer);
      }
    }, DEBOUNCE_MS);
  });

  // Keyboard navigation
  mobileInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMobileSearch();
    } else if (mobileResultsContainer && mobileInput) {
      handleKeyNavigation(e, mobileResultsContainer, mobileInput, true);
    }
  });
}

/**
 * Opens the mobile search modal.
 */
function openMobileSearch(): void {
  if (!mobileModal || !mobileInput) return;

  mobileModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Focus input after animation
  setTimeout(() => mobileInput?.focus(), 50);
}

/**
 * Closes the mobile search modal.
 */
function closeMobileSearch(): void {
  if (!mobileModal || !mobileInput || !mobileResultsContainer) return;

  mobileModal.classList.add('hidden');
  document.body.style.overflow = '';
  mobileInput.value = '';
  mobileResultsContainer.innerHTML = '';
  currentResults = [];
  selectedIndex = -1;
}

/**
 * Handles keyboard navigation for search results.
 */
function handleKeyNavigation(
  e: KeyboardEvent,
  container: HTMLDivElement,
  input: HTMLInputElement,
  isMobile = false,
): void {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      navigateResults(1, container);
      break;
    case 'ArrowUp':
      e.preventDefault();
      navigateResults(-1, container);
      break;
    case 'Enter':
      e.preventDefault();
      selectCurrentResult(isMobile);
      break;
    case 'Escape':
      if (!isMobile) {
        e.preventDefault();
        closeResults(container, input);
      }
      break;
  }
}

/**
 * Handles search for mobile modal (results rendered directly, no dropdown).
 */
async function handleMobileSearch(query: string, container: HTMLDivElement): Promise<void> {
  selectedIndex = -1;

  if (!query.trim()) {
    container.innerHTML = '';
    currentResults = [];
    return;
  }

  renderLoading(container);

  try {
    const results = await search(query);
    currentResults = results;

    if (results.length === 0) {
      renderNoResults(container, query);
      return;
    }

    renderMobileResults(container, results, query);
  } catch (error) {
    console.error('[Search] Error:', error);
    renderError(container);
  }
}

/**
 * Renders results for mobile modal (no footer, click closes modal).
 */
function renderMobileResults(
  container: HTMLDivElement,
  results: SearchResult[],
  query: string,
): void {
  const fragment = getTemplate('search-results-template');

  // Set results count
  const countEl = fragment.querySelector('[data-results-count]');
  if (countEl) {
    countEl.textContent = `${results.length} result${results.length === 1 ? '' : 's'} found`;
  }

  // Populate results list
  const list = fragment.querySelector('ul');
  if (list) {
    results.forEach((result, index) => {
      const itemEl = renderResultItem(result.document, query, index);
      list.appendChild(itemEl);
    });
  }

  // Remove footer for mobile (cleaner look)
  const footer = fragment.querySelector('.px-4.py-3.border-t');
  if (footer) {
    footer.remove();
  }

  container.innerHTML = '';
  container.appendChild(fragment);

  // Attach click handlers (close modal on selection)
  container.querySelectorAll('[data-result-index]').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.getAttribute('data-result-index') ?? '0', 10);
      if (currentResults[idx]) {
        navigateToResult(currentResults[idx].document);
        closeMobileSearch();
      }
    });
  });
}

/**
 * Creates the results dropdown container from template.
 */
function createResultsContainer(input: HTMLInputElement): HTMLDivElement {
  const fragment = getTemplate('search-container-template');
  const container = fragment.querySelector('#search-results') as HTMLDivElement;

  // Append to body to avoid overflow issues
  document.body.appendChild(container);

  // Position dropdown below input
  const positionDropdown = () => {
    const rect = input.getBoundingClientRect();
    container.style.top = `${rect.bottom + 8}px`;
    container.style.left = `${rect.left}px`;
  };

  // Update position on scroll and resize
  window.addEventListener('scroll', positionDropdown, true);
  window.addEventListener('resize', positionDropdown);

  // Initial position
  positionDropdown();

  return container;
}

/**
 * Renders loading state into container.
 */
function renderLoading(container: HTMLDivElement): void {
  container.innerHTML = '';
  container.appendChild(getTemplate('search-loading-template'));
}

/**
 * Renders no results state into container.
 */
function renderNoResults(container: HTMLDivElement, query: string): void {
  const fragment = getTemplate('search-no-results-template');
  const queryEl = fragment.querySelector('[data-search-query]');
  if (queryEl) {
    queryEl.textContent = query;
  }
  container.innerHTML = '';
  container.appendChild(fragment);
}

/**
 * Renders error state into container.
 */
function renderError(container: HTMLDivElement): void {
  container.innerHTML = '';
  container.appendChild(getTemplate('search-error-template'));
}

/**
 * Renders results into container.
 */
function renderResults(container: HTMLDivElement, results: SearchResult[], query: string): void {
  const fragment = getTemplate('search-results-template');

  // Set results count
  const countEl = fragment.querySelector('[data-results-count]');
  if (countEl) {
    countEl.textContent = `${results.length} result${results.length === 1 ? '' : 's'} found`;
  }

  // Populate results list
  const list = fragment.querySelector('ul');
  if (list) {
    results.forEach((result, index) => {
      const itemEl = renderResultItem(result.document, query, index);
      list.appendChild(itemEl);
    });
  }

  container.innerHTML = '';
  container.appendChild(fragment);

  // Attach click handlers
  container.querySelectorAll('[data-result-index]').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.getAttribute('data-result-index') ?? '0', 10);
      if (currentResults[idx]) {
        navigateToResult(currentResults[idx].document);
        if (resultsContainerRef && searchInput) {
          closeResults(resultsContainerRef, searchInput);
        }
      }
    });
  });
}

/**
 * Renders a single result item from template.
 */
function renderResultItem(doc: SearchDocument, query: string, index: number): HTMLElement {
  const isSection = doc.level > 1;
  const templateId = isSection ? 'search-section-item-template' : 'search-page-item-template';
  const fragment = getTemplate(templateId);
  const li = fragment.querySelector('li') as HTMLLIElement;

  // Set data attribute for click handling
  li.setAttribute('data-result-index', String(index));

  // Set heading with highlights
  const headingEl = li.querySelector('[data-result-heading]');
  if (headingEl) {
    headingEl.innerHTML = highlightMatches(doc.heading, query);
  }

  // Set breadcrumb
  const breadcrumbEl = li.querySelector('[data-result-breadcrumb]');
  if (breadcrumbEl) {
    breadcrumbEl.textContent = doc.breadcrumb;
  }

  // Set snippet (if content exists)
  const snippetEl = li.querySelector('[data-result-snippet]');
  if (snippetEl) {
    const snippet = createSnippet(doc.content, query, 120);
    if (snippet) {
      snippetEl.innerHTML = snippet;
    } else {
      snippetEl.remove();
    }
  }

  return li;
}

/**
 * Handles search execution and rendering.
 */
async function handleSearch(
  query: string,
  container: HTMLDivElement,
  input: HTMLInputElement,
): Promise<void> {
  selectedIndex = -1;
  input.setAttribute('aria-expanded', 'true');

  if (!query.trim()) {
    container.classList.add('hidden');
    container.innerHTML = '';
    currentResults = [];
    input.setAttribute('aria-expanded', 'false');
    return;
  }

  // Show loading state
  container.classList.remove('hidden');
  renderLoading(container);

  try {
    const results = await search(query);
    currentResults = results;

    if (results.length === 0) {
      renderNoResults(container, query);
      return;
    }

    renderResults(container, results, query);
  } catch (error) {
    console.error('[Search] Error:', error);
    renderError(container);
  }
}

/**
 * Highlights query matches in text.
 */
function highlightMatches(text: string, query: string): string {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  let result = escapeHtml(text);

  for (const word of words) {
    const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
    result = result.replace(
      regex,
      '<mark class="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded px-0.5 font-medium">$1</mark>',
    );
  }

  return result;
}

/**
 * Creates a snippet with context around matches.
 */
function createSnippet(content: string, query: string, maxLength: number): string {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lowerContent = content.toLowerCase();

  let matchIndex = -1;
  for (const word of words) {
    const idx = lowerContent.indexOf(word);
    if (idx !== -1 && (matchIndex === -1 || idx < matchIndex)) {
      matchIndex = idx;
    }
  }

  if (matchIndex === -1) {
    const snippet = content.slice(0, maxLength);
    return escapeHtml(snippet) + (content.length > maxLength ? '...' : '');
  }

  const start = Math.max(0, matchIndex - 30);
  const end = Math.min(content.length, matchIndex + maxLength - 30);
  let snippet = content.slice(start, end);

  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet += '...';

  return highlightMatches(snippet, query);
}

/**
 * Clears the visual selection state from all items.
 */
function clearSelectionState(container: HTMLDivElement): void {
  const items = container.querySelectorAll('.search-result-item');
  items.forEach((item) => {
    item.classList.remove('bg-primary-50', 'dark:bg-primary-900/20');
    item.setAttribute('aria-selected', 'false');
  });
  selectedIndex = -1;
}

/**
 * Navigates through results with keyboard.
 */
function navigateResults(direction: number, container: HTMLDivElement): void {
  if (currentResults.length === 0) return;

  const items = container.querySelectorAll('.search-result-item');
  if (items.length === 0) return;

  // Remove selection from previous item
  if (selectedIndex >= 0 && items[selectedIndex]) {
    items[selectedIndex].classList.remove('bg-primary-50', 'dark:bg-primary-900/20');
    items[selectedIndex].setAttribute('aria-selected', 'false');
  }

  // Calculate new index
  selectedIndex = selectedIndex + direction;
  if (selectedIndex < 0) selectedIndex = 0;
  if (selectedIndex >= items.length) selectedIndex = items.length - 1;

  // Apply selection to new item
  const selectedItem = items[selectedIndex];
  if (selectedItem) {
    selectedItem.classList.add('bg-primary-50', 'dark:bg-primary-900/20');
    selectedItem.setAttribute('aria-selected', 'true');
    selectedItem.scrollIntoView({ block: 'nearest' });
  }
}

/**
 * Selects the currently highlighted result.
 */
function selectCurrentResult(isMobile = false): void {
  if (selectedIndex >= 0 && currentResults[selectedIndex]) {
    navigateToResult(currentResults[selectedIndex].document);
    if (isMobile) {
      closeMobileSearch();
    } else if (resultsContainerRef && searchInput) {
      closeResults(resultsContainerRef, searchInput);
    }
  }
}

/**
 * Closes the results dropdown.
 */
function closeResults(container: HTMLDivElement, input: HTMLInputElement): void {
  container.classList.add('hidden');
  input.setAttribute('aria-expanded', 'false');
  selectedIndex = -1;
}

/**
 * Checks if an input/textarea is focused.
 */
function isInputFocused(): boolean {
  const active = document.activeElement;
  return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
}

/**
 * Escapes HTML special characters.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Escapes regex special characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
