import { describe, expect, it } from 'vitest';
import { decodeEntities, htmlToSatori, parseStyle, toCamelCase } from '../src/og/html.js';

describe('decodeEntities', () => {
  it('decodes the characters Eta escapes, numeric references and common named ones', () => {
    expect(decodeEntities('Tom &amp; Jerry &lt;3 &quot;hi&quot; &#39;x&#39;')).toBe(
      `Tom & Jerry <3 "hi" 'x'`,
    );
    expect(decodeEntities('&#8212; &#x2014; &mdash; &hellip; &rsquo;')).toBe('— — — … ’');
    expect(decodeEntities('&unknown; &#0; &amp')).toBe('&unknown; &#0; &amp');
  });
});

describe('parseStyle', () => {
  it('converts declarations to camelCase properties', () => {
    expect(parseStyle("display:flex; font-size: 72px ;font-family:'Fira Code'")).toEqual({
      display: 'flex',
      fontSize: '72px',
      fontFamily: "'Fira Code'",
    });
  });

  it('keeps semicolons inside url() and quotes', () => {
    expect(parseStyle('background-image:url(data:image/png;base64,AAA=);color:red')).toEqual({
      backgroundImage: 'url(data:image/png;base64,AAA=)',
      color: 'red',
    });
  });

  it('uses React-style vendor prefixes', () => {
    expect(toCamelCase('-webkit-line-clamp')).toBe('WebkitLineClamp');
    expect(toCamelCase('-ms-transform')).toBe('msTransform');
    expect(toCamelCase('stroke-width')).toBe('strokeWidth');
  });
});

describe('htmlToSatori', () => {
  it('drops whitespace between elements and trims text at the edges', () => {
    const tree = htmlToSatori(`
      <div style="display:flex;flex-direction:column">
        <div style="display:flex">
          Hello &amp; welcome
        </div>
        <div>Second</div>
      </div>
    `);
    expect(tree).toEqual({
      type: 'div',
      props: {
        style: { display: 'flex', flexDirection: 'column' },
        children: [
          { type: 'div', props: { style: { display: 'flex' }, children: 'Hello & welcome' } },
          { type: 'div', props: { children: 'Second' } },
        ],
      },
    });
  });

  it('keeps non-breaking spaces', () => {
    expect(htmlToSatori('<div>a&nbsp;b</div>').props.children).toBe('a b');
  });

  it('handles void elements, numeric sizes and ignores classes', () => {
    expect(
      htmlToSatori(
        '<div class="x"><img src="data:image/png;base64,AA" width="40" height="20"></div>',
      ),
    ).toEqual({
      type: 'div',
      props: {
        children: {
          type: 'img',
          props: { src: 'data:image/png;base64,AA', width: 40, height: 20 },
        },
      },
    });
  });

  it('keeps SVG element and attribute names in the form Satori expects', () => {
    const tree = htmlToSatori(
      '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M1 1" stroke-width="2" fill="none"/></svg>',
    );
    expect(tree).toEqual({
      type: 'svg',
      props: {
        viewBox: '0 0 24 24',
        width: 24,
        height: 24,
        children: { type: 'path', props: { d: 'M1 1', strokeWidth: '2', fill: 'none' } },
      },
    });
  });

  it('shows the <img> of a <picture> and drops its <source> elements', () => {
    expect(
      htmlToSatori(
        '<div><picture><source type="image/avif" srcset="/a.avif 480w"><img src="data:image/png;base64,AA" alt=""></picture></div>',
      ),
    ).toEqual({
      type: 'div',
      props: { children: { type: 'img', props: { src: 'data:image/png;base64,AA', alt: '' } } },
    });
  });

  it('skips comments, scripts and style blocks', () => {
    expect(
      htmlToSatori('<div><!-- note --><style>.a{color:red}</style><script>x()</script>Text</div>'),
    ).toEqual({ type: 'div', props: { children: 'Text' } });
  });

  it('recovers from unclosed and stray closing tags', () => {
    expect(htmlToSatori('<div><span>one</div></p>')).toEqual({
      type: 'div',
      props: { children: { type: 'span', props: { children: 'one' } } },
    });
  });

  it('treats a < that starts no tag as text and keeps split text together', () => {
    expect(htmlToSatori('<div>1 < 2 <!-- note --> &amp; 3</div>')).toEqual({
      type: 'div',
      props: { children: '1 < 2 & 3' },
    });
  });

  it('reads quoted values containing > and unquoted values, and drops declarations', () => {
    expect(
      htmlToSatori('<!DOCTYPE html><img alt="a > b" src=/x.png width=40 data-Kind="logo">'),
    ).toEqual({
      type: 'img',
      props: { alt: 'a > b', src: '/x.png', width: 40, 'data-kind': 'logo' },
    });
  });

  it('stops at a comment or tag that is never closed, as browsers do', () => {
    const title = { type: 'div', props: { children: 'Title' } };
    expect(htmlToSatori('<div>Title</div><!-- unclosed <div>More</div>')).toEqual(title);
    expect(htmlToSatori('<div>Title</div><img src="x.png>')).toEqual(title);
  });

  it('wraps several top-level elements in a full-size flex container', () => {
    expect(htmlToSatori('<div>a</div><div>b</div>')).toEqual({
      type: 'div',
      props: {
        style: { display: 'flex', width: '100%', height: '100%' },
        children: [
          { type: 'div', props: { children: 'a' } },
          { type: 'div', props: { children: 'b' } },
        ],
      },
    });
  });
});
