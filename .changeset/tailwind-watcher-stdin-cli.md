---
'@stati/cli': patch
---

The Tailwind watcher that `stati dev --tailwind-input` starts keeps running when the dev server has no open stdin, for example in a background or CI shell. Tailwind ends its watcher when its stdin closes, and it shared the dev server's, so it stopped at once and `dist/styles.css` went stale. It now reads a pipe that stays open while the dev server runs, so it still stops with the dev server, even when that process is killed. A watcher that exits on its own, such as Tailwind CSS 4 after an error in the stylesheet at startup, is reported with a hint to restart `stati dev`.
