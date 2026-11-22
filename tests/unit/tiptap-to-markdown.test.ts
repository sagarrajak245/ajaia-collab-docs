import { describe, it, expect } from 'vitest';
import { tiptapToMarkdown } from '@/server/lib/converters/tiptap-to-markdown';

const t = (text: string, marks?: { type: string; attrs?: object }[]) => ({ type: 'text', text, marks });
const p = (...content: object[]) => ({ type: 'paragraph', content });
const doc = (...content: object[]) => ({ type: 'doc', content });

describe('tiptapToMarkdown', () => {
  it('renders headings and paragraphs', () => {
    const md = tiptapToMarkdown(
      doc({ type: 'heading', attrs: { level: 2 }, content: [t('Title')] }, ),
    );
    expect(md.trim()).toBe('## Title');
    expect(tiptapToMarkdown(doc(p(t('a')), p(t('b')))).trim()).toBe('a\n\nb');
  });

  it('renders inline marks; drops underline/color', () => {
    const md = tiptapToMarkdown(
      doc(
        p(
          t('b', [{ type: 'bold' }]),
          t(' '),
          t('i', [{ type: 'italic' }]),
          t(' '),
          t('s', [{ type: 'strike' }]),
          t(' '),
          t('c', [{ type: 'code' }]),
          t(' '),
          t('u', [{ type: 'underline' }]),
          t(' '),
          t('x', [{ type: 'textStyle', attrs: { color: 'red' } }, { type: 'highlight' }]),
        ),
      ),
    );
    expect(md.trim()).toBe('**b** _i_ ~~s~~ `c` u x');
  });

  it('renders nested bullet and ordered lists', () => {
    const li = (txt: string, ...extra: object[]) => ({ type: 'listItem', content: [p(t(txt)), ...extra] });
    const md = tiptapToMarkdown(
      doc(
        { type: 'bulletList', content: [li('a', { type: 'orderedList', content: [li('x'), li('y')] }), li('b')] },
      ),
    );
    expect(md.trim()).toBe('- a\n  1. x\n  2. y\n- b');
  });

  it('renders blockquote, code fence, hr, hardBreak', () => {
    const md = tiptapToMarkdown(
      doc(
        { type: 'blockquote', content: [p(t('q'))] },
        { type: 'codeBlock', attrs: { language: 'ts' }, content: [t('let a = 1;')] },
        { type: 'horizontalRule' },
        p(t('l1'), { type: 'hardBreak' }, t('l2')),
      ),
    );
    expect(md).toContain('> q');
    expect(md).toContain('```ts\nlet a = 1;\n```');
    expect(md).toContain('---');
    expect(md).toContain('l1  \nl2');
  });

  it('renders GFM tables with escaped pipes', () => {
    const cell = (type: string, txt: string) => ({ type, content: [p(t(txt))] });
    const md = tiptapToMarkdown(
      doc({
        type: 'table',
        content: [
          { type: 'tableRow', content: [cell('tableHeader', 'H1'), cell('tableHeader', 'H2')] },
          { type: 'tableRow', content: [cell('tableCell', 'a|b'), cell('tableCell', 'c')] },
        ],
      }),
    );
    expect(md.trim()).toBe('| H1 | H2 |\n| --- | --- |\n| a\\|b | c |');
  });

  it('handles empty/invalid input', () => {
    expect(tiptapToMarkdown(null)).toBe('');
    expect(tiptapToMarkdown({ type: 'doc' })).toBe('');
  });
});
