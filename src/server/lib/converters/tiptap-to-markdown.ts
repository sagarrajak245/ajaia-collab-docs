/**
 * TipTap (ProseMirror) JSON -> Markdown converter.
 *
 * Pure and dependency-free so it is trivially unit-testable.
 *
 * Lossy by design (Markdown has no equivalent):
 *  - underline is emitted as plain text
 *  - text colour (textStyle) and highlight marks are dropped
 * Unknown node types fall back to rendering their children, so content is
 * never silently lost.
 */

export interface TiptapNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: TiptapNode[];
}

/** Wrap text in a mark delimiter, keeping surrounding whitespace outside it. */
function wrap(text: string, delim: string): string {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  if (!m || !m[2]) return text;
  return `${m[1]}${delim}${m[2]}${delim}${m[3]}`;
}

function renderText(node: TiptapNode): string {
  let out = node.text ?? '';
  const types = new Set((node.marks ?? []).map((m) => m.type));
  // Code first: its content must stay literal, so wrap innermost.
  if (types.has('code')) out = wrap(out, '`');
  if (types.has('italic')) out = wrap(out, '_');
  if (types.has('bold')) out = wrap(out, '**');
  if (types.has('strike')) out = wrap(out, '~~');
  return out;
}

/** Render inline children (text, hard breaks) of a block. */
function renderInline(nodes: TiptapNode[] = []): string {
  return nodes
    .map((n) => {
      if (n.type === 'text') return renderText(n);
      if (n.type === 'hardBreak') return '  \n';
      return renderInline(n.content);
    })
    .join('');
}

function indent(text: string, pad: string): string {
  return text
    .split('\n')
    .map((l) => (l ? pad + l : l))
    .join('\n');
}

function renderList(node: TiptapNode, ordered: boolean): string {
  const start = typeof node.attrs?.start === 'number' ? (node.attrs.start as number) : 1;
  return (node.content ?? [])
    .map((item, i) => {
      const marker = ordered ? `${start + i}. ` : '- ';
      // Tight list: nested lists follow their parent paragraph directly.
      const body = renderBlocks(item.content, '\n');
      return marker + indent(body, ' '.repeat(marker.length)).slice(marker.length);
    })
    .join('\n');
}

function renderTable(node: TiptapNode): string {
  const rows = (node.content ?? []).map((row) =>
    (row.content ?? []).map((cell) =>
      // Cells are single-line in GFM: flatten blocks, escape pipes.
      renderBlocks(cell.content, ' ').replace(/\n/g, ' ').replace(/\|/g, '\\|').trim(),
    ),
  );
  if (!rows.length) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const line = (r: string[]) =>
    `| ${Array.from({ length: width }, (_, i) => r[i] ?? '').join(' | ')} |`;
  // GFM requires a header row: the first row is used.
  return [line(rows[0]!), line(Array(width).fill('---')), ...rows.slice(1).map(line)].join('\n');
}

function renderBlock(node: TiptapNode): string {
  switch (node.type) {
    case 'paragraph':
      return renderInline(node.content);
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6);
      return `${'#'.repeat(level)} ${renderInline(node.content)}`;
    }
    case 'bulletList':
      return renderList(node, false);
    case 'orderedList':
      return renderList(node, true);
    case 'blockquote':
      return indent(renderBlocks(node.content), '> ').replace(/^(?! *>)/gm, '> ');
    case 'codeBlock': {
      const lang = typeof node.attrs?.language === 'string' ? node.attrs.language : '';
      const code = (node.content ?? []).map((n) => n.text ?? '').join('');
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }
    case 'horizontalRule':
      return '---';
    case 'table':
      return renderTable(node);
    default:
      // Unknown node: keep its content rather than dropping it.
      return node.content ? renderBlocks(node.content) : (node.text ?? '');
  }
}

/** Render sibling blocks joined by `sep` (blank line by default). */
function renderBlocks(nodes: TiptapNode[] = [], sep = '\n\n'): string {
  return nodes
    .map((n) => renderBlock(n))
    .filter((s) => s !== '')
    .join(sep);
}

/** Convert a TipTap document (JSON) to Markdown. Invalid input yields ''. */
export function tiptapToMarkdown(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return '';
  const md = renderBlocks((doc as TiptapNode).content);
  return md ? md + '\n' : '';
}
