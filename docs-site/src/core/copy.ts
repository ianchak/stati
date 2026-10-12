/**
 * Copy to clipboard.
 *
 * - Buttons with [data-copy] copy their attribute value, or the text of the
 *   element named by [data-copy-target].
 * - Every Markdown code block (.prose pre) gets a copy button.
 * Success and failure are shown on the button and announced politely.
 */

const RESET_MS = 2000;

export function initCopy(): void {
  document.querySelectorAll<HTMLPreElement>('.prose pre').forEach(addCodeBlockButton);

  document.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '[data-copy], [data-copy-target]',
    );
    if (!button) return;

    const targetId = button.dataset.copyTarget;
    const text = targetId
      ? (document.getElementById(targetId)?.textContent ?? '')
      : (button.dataset.copy ?? '');

    const target = targetId ? document.getElementById(targetId) : null;
    void copy(button, text.trim(), target);
  });
}

function addCodeBlockButton(pre: HTMLPreElement, index: number): void {
  const code = pre.querySelector('code');
  if (!code) return;

  code.id ||= `code-block-${index}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-button';
  button.dataset.copyTarget = code.id;
  button.setAttribute('aria-label', 'Copy code');
  button.innerHTML = '<span data-copy-label>Copy</span>';
  pre.appendChild(button);
}

async function copy(
  button: HTMLButtonElement,
  text: string,
  target: HTMLElement | null,
): Promise<void> {
  const label = button.querySelector<HTMLElement>('[data-copy-label]') ?? button;
  const original = label.dataset.original ?? label.textContent ?? 'Copy';
  label.dataset.original = original;

  let ok = true;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    ok = false;
  }

  // Without clipboard access, select the text so the keyboard shortcut works
  if (!ok && target) selectContents(target);

  label.textContent = ok ? 'Copied' : target ? 'Press Ctrl+C' : 'Copy failed';
  button.dataset.copied = String(ok);
  announce(
    ok
      ? 'Copied to clipboard'
      : target
        ? 'Copy failed. The text is selected; press Ctrl+C to copy it.'
        : 'Copy failed. Select the text and copy it manually.',
  );

  window.setTimeout(() => {
    label.textContent = original;
    delete button.dataset.copied;
  }, RESET_MS);
}

function selectContents(element: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function announce(message: string): void {
  let region = document.getElementById('copy-status');
  if (!region) {
    region = document.createElement('p');
    region.id = 'copy-status';
    region.className = 'sr-only';
    region.setAttribute('role', 'status');
    document.body.appendChild(region);
  }
  region.textContent = '';
  window.setTimeout(() => {
    if (region) region.textContent = message;
  }, 50);
}
