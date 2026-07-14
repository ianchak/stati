/**
 * Feature tabs component functionality.
 * Handles tab switching with click, keyboard navigation, and ARIA attributes.
 */

interface TabConfig {
  tabSelector: string;
  contentSelector: string;
  activeClasses: string[];
  inactiveClasses: string[];
}

const PROOF_TRANSITION_MS = 200;

const DEFAULT_CONFIG: TabConfig = {
  tabSelector: '.feature-tab',
  contentSelector: '.feature-content',
  activeClasses: ['active', 'bg-primary-600', 'text-white', 'border-primary-600', 'shadow-soft'],
  inactiveClasses: [
    'bg-white',
    'dark:bg-dark-900',
    'text-gray-700',
    'dark:text-gray-300',
    'hover:bg-gray-100',
    'dark:hover:bg-dark-800',
    'border-gray-300',
    'dark:border-dark-600',
  ],
};

/**
 * Activates a specific tab and shows its associated content.
 */
function activateTab(
  targetTab: string,
  tabs: NodeListOf<HTMLElement>,
  contents: NodeListOf<HTMLElement>,
  config: TabConfig,
  focusTab = false,
): void {
  // Update all tabs to inactive state
  tabs.forEach((t) => {
    t.classList.remove(...config.activeClasses);
    t.classList.add(...config.inactiveClasses);
    t.setAttribute('aria-selected', 'false');
    t.setAttribute('tabindex', '-1');
  });

  // Activate the target tab
  const activeTab = Array.from(tabs).find((tab) => tab.getAttribute('data-tab') === targetTab);
  if (activeTab) {
    activeTab.classList.remove(...config.inactiveClasses);
    activeTab.classList.add(...config.activeClasses);
    activeTab.setAttribute('aria-selected', 'true');
    activeTab.setAttribute('tabindex', '0');

    if (focusTab) {
      activeTab.focus();
    }
  }

  // Update content visibility and animate proof panel transitions.
  contents.forEach((content) => {
    const isTargetContent = content.getAttribute('data-content') === targetTab;
    if (isTargetContent) {
      content.classList.remove('hidden');
      content.classList.remove('active');
      content.setAttribute('aria-hidden', 'false');
      window.requestAnimationFrame(() => {
        content.classList.add('active');
      });
      return;
    }

    content.setAttribute('aria-hidden', 'true');
    if (content.classList.contains('active')) {
      content.classList.remove('active');
      window.setTimeout(() => {
        if (!content.classList.contains('active')) {
          content.classList.add('hidden');
        }
      }, PROOF_TRANSITION_MS);
      return;
    }

    content.classList.add('hidden');
  });
}

/**
 * Initializes the feature tabs functionality.
 * Sets up click handlers and keyboard navigation (arrow keys, Home, End).
 */
export function initTabs(config: Partial<TabConfig> = {}): void {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const tabs = document.querySelectorAll<HTMLElement>(mergedConfig.tabSelector);
  const contents = document.querySelectorAll<HTMLElement>(mergedConfig.contentSelector);

  if (tabs.length === 0) return;

  const tabsArray = Array.from(tabs);

  tabs.forEach((tab, index) => {
    // Click handler
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      if (targetTab) {
        activateTab(targetTab, tabs, contents, mergedConfig);
      }
    });

    // Keyboard navigation handler
    tab.addEventListener('keydown', (e) => {
      let newIndex = -1;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        newIndex = index - 1;
        if (newIndex < 0) newIndex = tabsArray.length - 1;
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        newIndex = index + 1;
        if (newIndex >= tabsArray.length) newIndex = 0;
      } else if (e.key === 'Home') {
        e.preventDefault();
        newIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        newIndex = tabsArray.length - 1;
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const targetTab = tab.getAttribute('data-tab');
        if (targetTab) {
          activateTab(targetTab, tabs, contents, mergedConfig);
        }
        return;
      }

      if (newIndex !== -1) {
        const targetElement = tabsArray[newIndex];
        const targetTab = targetElement?.getAttribute('data-tab');
        if (targetTab) {
          activateTab(targetTab, tabs, contents, mergedConfig, true);
        }
      }
    });
  });
}
