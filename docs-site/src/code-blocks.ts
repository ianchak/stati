/**
 * Code block copy button functionality.
 * Adds a copy button to all code blocks for easy code copying.
 */

/** Duration in milliseconds to show the "Copied!" state */
const COPY_TIMEOUT_MS = 2000;

/**
 * Creates a copy button element.
 */
function createCopyButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className =
    'copy-button absolute top-2 right-2 p-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity';
  button.setAttribute('aria-label', 'Copy code');
  button.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  `;
  return button;
}

/**
 * Copies text to clipboard and updates button state.
 */
async function copyToClipboard(text: string, button: HTMLButtonElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    button.classList.add('copied');
    button.setAttribute('aria-label', 'Copied!');

    // Show checkmark icon
    button.innerHTML = `
      <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    `;

    setTimeout(() => {
      button.classList.remove('copied');
      button.setAttribute('aria-label', 'Copy code');
      // Restore copy icon
      button.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      `;
    }, COPY_TIMEOUT_MS);
  } catch (err) {
    console.error('Failed to copy:', err);

    // Show error feedback to user
    button.setAttribute('aria-label', 'Failed to copy');
    button.innerHTML = `
      <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;

    setTimeout(() => {
      button.setAttribute('aria-label', 'Copy code');
      // Restore copy icon
      button.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      `;
    }, COPY_TIMEOUT_MS);
  }
}

/**
 * Initializes copy buttons for all code blocks.
 * Adds a copy button to each pre element with a language class.
 */
export function initCodeBlocks(): void {
  const codeBlocks = document.querySelectorAll<HTMLPreElement>('pre[class*="language-"]');

  codeBlocks.forEach((pre) => {
    // Skip if copy button already exists (prevents duplicates on re-initialization)
    if (pre.querySelector('.copy-button')) {
      return;
    }

    // Make the pre element a positioned container for the button
    pre.classList.add('relative', 'group');

    const button = createCopyButton();
    const code = pre.querySelector('code');

    button.addEventListener('click', () => {
      if (code?.textContent) {
        copyToClipboard(code.textContent, button);
      }
    });

    pre.appendChild(button);
  });
}
