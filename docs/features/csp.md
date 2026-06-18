# Content Security Policy (CSP)

Selkit is designed to run under a **strict** Content Security Policy. It needs
**no `'unsafe-eval'`** and **no `'unsafe-inline'`** — the following policy is
enough:

```
default-src 'self'; script-src 'self'; style-src 'self';
```

(Adjust `'self'` to wherever your app actually serves its scripts and styles —
e.g. a CDN or nonce/hash for your own bundle.)

## Why it works

| CSP concern | Selkit | Needs a relaxation? |
| --- | --- | --- |
| `script-src` | No `eval` / `new Function` anywhere | No `'unsafe-eval'` |
| `style-src` | All dynamic styling goes through the CSSOM (`element.style.*`), never markup `style="…"` attributes or `<style>` blocks | No `'unsafe-inline'` |
| Trusted Types | Option text is set via `textContent`; custom markup is appended as DOM `Node`s. No `innerHTML` / `insertAdjacentHTML` | Compatible with `require-trusted-types-for 'script'` |
| Runtime stylesheet injection | None — no `<style>` creation, `insertRule`, or `adoptedStyleSheets` | — |

The key point about `style-src`: it gates **inline styles parsed from markup**
(the HTML `style="…"` attribute and `<style>` elements), **not** style
properties set through the CSSOM. Selkit positions dropdowns and applies layout
by assigning to `element.style` in JavaScript, so a strict `style-src 'self'`
does **not** break it. The Vue (`:style`) and React (`style={}`) adapters apply
their styles the same way, through the CSSOM.

## Themes are normal stylesheets

`@selkit/themes` ships plain `.css` files (`base.css`, `bs5.css`). Bundle or
serve them like any other stylesheet so they fall under `style-src 'self'`
(or your nonce/hash). They are CSS-variable driven and contain no inline scripts.

## `@selkit/floating`

The optional [`@selkit/floating`](/features/positioning) positioner wraps
`@floating-ui/dom`, which also computes and applies positions through the CSSOM
and uses no `eval`. It runs under the same strict policy — no extra directives
needed.
