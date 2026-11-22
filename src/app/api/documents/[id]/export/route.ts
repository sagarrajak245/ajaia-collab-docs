import { z } from 'zod';
import { apiHandler } from '@/server/middleware/api-handler';
import { documentIdParams } from '@/server/validators/document.validator';
import { getContainer } from '@/server/container';
import { tiptapToMarkdown } from '@/server/lib/converters/tiptap-to-markdown';

export const runtime = 'nodejs';

// Only Markdown is produced server-side; PDF is the browser's print dialog.
const exportQuery = z.object({ format: z.enum(['md']).default('md') });

/** ASCII-safe fallback filename (header values must be Latin-1 safe). */
function asciiName(title: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/[\\/:*?"<>|%;,\r\n]+/g, '')
    .trim()
    .slice(0, 80);
  return base || 'document';
}

/** GET /api/documents/:id/export?format=md — download the document as Markdown. */
export const GET = apiHandler(
  { params: documentIdParams, query: exportQuery },
  async ({ user, params }) => {
    // `get` enforces at least view access (throws forbidden / not found otherwise).
    const doc = await getContainer().documentService.get(params.id, user.userId);

    let content: unknown = doc.content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch {
        content = null;
      }
    }

    const title = doc.title?.trim() || 'document';
    const body = `# ${title}\n\n${tiptapToMarkdown(content)}`;
    const utf8Name = encodeURIComponent(`${title.replace(/[\r\n]+/g, ' ')}.md`);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${asciiName(title)}.md"; filename*=UTF-8''${utf8Name}`,
        'Cache-Control': 'private, no-store',
      },
    });
  },
);
