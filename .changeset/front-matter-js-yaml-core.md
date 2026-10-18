---
'@stati/core': major
---

Front matter is read with js-yaml 4 instead of gray-matter, so `npm audit` no longer reports the advisories of gray-matter's js-yaml 3 and sprintf-js. Values follow YAML 1.2: `time: 10:30` is the text `10:30` instead of the number 630, `0755` is 755 instead of 493, and `1_000` is text. Dates, booleans and other values read as before. Front matter that cannot be read stops the build with the file and the line, and suggests quotes for a value that contains a colon. Such a file no longer builds on the next try with its front matter left in the page. Front matter in another language than YAML, such as `---js`, is an error instead of running as JavaScript, and front matter that is a list or a single value is an error instead of breaking the page's render.
