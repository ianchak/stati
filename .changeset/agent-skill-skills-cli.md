---
'create-stati': minor
---

`--agent-skill` installs the Stati agent skill with the `skills` CLI (`npx skills add ianchak/stati --skill stati`) instead of copying the one bundled in the package. It writes `skills-lock.json`, so `npx skills update stati -p` keeps the skill current, and create-stati prints that command after installing. Installing the skill now needs `git` and network access; when it fails, the site is still created and create-stati prints the command to add the skill later. The `.github/skills` choice is gone: `--agent-skill=github` still works but installs to `.agents/skills/stati`, which Copilot reads.
