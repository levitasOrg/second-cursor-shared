/** L1 ingress: every page-derived string is hostile until proven boring.
 *
 *  The threat channel is the PAGE, not the user's question — an element name
 *  is attacker-controlled on any site that renders user content. The snapshot
 *  already travels inside <untrusted> tags, so the job here is to stop a name
 *  from (a) hiding characters the user cannot see but the model can, and
 *  (b) forging structure that breaks out of that block. */

/** Zero-width space/joiners and the bidi overrides, plus BOM, word joiner and
 *  soft hyphen — invisible on screen, present in the token stream. Written as
 *  escapes rather than literals so the class is reviewable in a diff and no
 *  editor, copy-paste or normalisation pass can silently mangle it:
 *    U+00AD          soft hyphen
 *    U+200B-U+200F   ZWSP, ZWNJ, ZWJ, LRM, RLM
 *    U+202A-U+202E   bidi embedding / override controls
 *    U+2060-U+2064   word joiner and invisible operators
 *    U+FEFF          byte-order mark */
/** Soft hyphen · zero-width + directional marks · bidi overrides · bidi
 *  ISOLATES · word joiner and invisible operators · BOM · and the Unicode Tags
 *  block. Tags (U+E0000-E007F) encode arbitrary ASCII invisibly and are the
 *  best-known channel for text aimed at a model rather than a reader, so they
 *  matter more here than the zero-width characters everyone remembers. The `u`
 *  flag is required for the astral tag range.
 *
 *  Added for web-lens-A finding 5 (2026-08 OWASP-currency audit) — the
 *  variation-selector byte channel ("sneaky bits", exploited in the wild by
 *  the os-info-checker-es6 npm malware) plus the invisible filler stragglers:
 *    U+034F          combining grapheme joiner
 *    U+115F-U+1160   Hangul choseong / jungseong fillers
 *    U+180E          Mongolian vowel separator (not \s in modern engines)
 *    U+3164          Hangul filler
 *    U+FE00-U+FE0F   variation selectors 1-16 (16 code points = bytes 0-15)
 *    U+E0100-E01EF   variation selectors supplement (240 more = bytes 16-255)
 *  Together the two VS ranges encode arbitrary BYTES invisibly. Trade-off,
 *  accepted deliberately: stripping U+FE0F degrades an emoji sequence like
 *  U+2764 U+FE0F to text presentation, but the base character survives — fine
 *  for an LLM payload, and no filter can tell a heart's VS16 from a
 *  smuggler's. */
const INVISIBLE =
  // biome-ignore lint/suspicious/noMisleadingCharacterClass: matching combining marks (VS, U+034F) INDIVIDUALLY is the point - each is stripped as its own code point, never as part of a grapheme.
  /[\u00AD\u034F\u115F\u1160\u180E\u200B-\u200F\u202A-\u202E\u2066-\u2069\u2060-\u2064\u3164\uFE00-\uFE0F\uFEFF\u{E0000}-\u{E007F}\u{E0100}-\u{E01EF}]/u;
/** Anything angle-bracketed: real markup, and forged delimiters like
 *  `</untrusted>` that would otherwise end the data block early. */
const MARKUP = /<[^>]*>/;

/** Global twins for stripping. `String.replace` resets `lastIndex`, so these
 *  are safe to share; `RegExp.test` does not, which is why the predicate below
 *  uses the non-global originals. Both are derived from one source, so the
 *  stripper and the detector cannot drift apart. */
const INVISIBLE_G = new RegExp(INVISIBLE.source, "gu");
const MARKUP_G = new RegExp(MARKUP.source, "g");
const WHITESPACE_G = /\s+/g;

export const SANITIZE_MAX_NAME = 100;

export function sanitizeText(s: string, max: number = SANITIZE_MAX_NAME): string {
  return s
    .replace(INVISIBLE_G, "")
    .replace(MARKUP_G, "")
    .replace(WHITESPACE_G, " ")
    .trim()
    .slice(0, max);
}

/** Did this string carry anything worth auditing? Callers log the flag; they
 *  do not block on it — a stripped name is safe, and blocking would break
 *  every page that legitimately contains a `<` in a label. */
export function hadSuspiciousChars(s: string): boolean {
  return INVISIBLE.test(s) || MARKUP.test(s);
}

/** The hostname a link points at, or a marker, or nothing.
 *
 *  L2's cross-origin rule needs an AUTHORITATIVE destination. A model-supplied
 *  `href` on a step is advisory at best — an attacker-steered model simply
 *  omits it — so the destination has to come from the page itself, captured
 *  alongside the element.
 *
 *  Hostname only, never the path or query: the privacy invariant forbids full
 *  URLs (paths carry record ids, queries carry tokens) and the security rule
 *  does not need them. A relative link is same-origin by definition and
 *  returns undefined, so ordinary in-app navigation carries no extra data.
 *  Non-navigational schemes return a marker rather than a host, because
 *  `javascript:` and `data:` are execution, not destination. */
export function destHost(href: string): string | undefined {
  if (!href) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^https?:/i.test(href)) return "!scheme";
  if (!/^https?:/i.test(href)) return undefined;   // relative → same origin
  try {
    return new URL(href).hostname || undefined;
  } catch {
    return undefined;
  }
}
