---
'create-stati': patch
---

The bundled Stati agent skill describes TypeScript bundle `include`/`exclude` patterns correctly: they match page URLs such as `/docs/guide`, not output files such as `/docs/guide.html`, and `/docs/**` does not match the `/docs` page. Its smoke test now checks that a repeat build reuses every cached page.
