/**
 * Safely serialize a structured-data (JSON-LD) object for embedding inside an
 * inline <script type="application/ld+json"> tag via dangerouslySetInnerHTML.
 *
 * WHY THIS EXISTS
 *   JSON.stringify() does NOT escape `<`, `>` or `&`, so any string that ends up
 *   in the object (e.g. an admin-entered product name or category description
 *   fetched from the API) could contain `</script><script>...</script>` and
 *   break out of the JSON-LD block, producing stored/reflected XSS. Escaping the
 *   characters that can terminate a script context — plus the JS line separators
 *   U+2028/U+2029 — neutralises that without affecting how search engines parse
 *   the JSON-LD.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
