import { describe, it, expect } from 'vitest';
import { safeJsonLd } from '../jsonLd';

describe('safeJsonLd', () => {
  it('escapes characters that could terminate a <script> context', () => {
    const malicious = {
      name: 'Saree </script><script>alert(document.cookie)</script>',
    };
    const out = safeJsonLd(malicious);

    // The literal closing tag must NOT survive in the output.
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<script>');
    // Angle brackets and ampersands are unicode-escaped.
    expect(out).toContain('\\u003c');
    expect(out).toContain('\\u003e');
  });

  it('escapes JS line/paragraph separators U+2028 / U+2029', () => {
    const out = safeJsonLd({ note: 'a\u2028b\u2029c' });
    expect(out).toContain('\\u2028');
    expect(out).toContain('\\u2029');
    expect(out).not.toContain('\u2028');
    expect(out).not.toContain('\u2029');
  });

  it('still produces JSON that parses back to the original data (after unescaping)', () => {
    const data = { '@type': 'Product', name: 'Pure Silk', price: 12345 };
    const parsed = JSON.parse(safeJsonLd(data));
    expect(parsed).toEqual(data);
  });

  it('escapes ampersands to prevent HTML entity ambiguity', () => {
    const out = safeJsonLd({ name: 'Red & Gold' });
    expect(out).toContain('\\u0026');
    expect(out).not.toContain('Red & Gold');
  });
});
