/**
 * .docx -> Markdown via mammoth. mammoth's runtime exports convertToMarkdown,
 * but its bundled typings omit it, so we declare the shape we use.
 */
import * as mammoth from "mammoth";
import { InvalidFileContentError } from "@/server/exceptions";

interface MammothMarkdown {
  convertToMarkdown(input: { buffer: Buffer }): Promise<{ value: string }>;
}

export async function docxToMarkdown(bytes: Uint8Array): Promise<string> {
  try {
    const { value } = await (mammoth as unknown as MammothMarkdown).convertToMarkdown({
      buffer: Buffer.from(bytes),
    });
    return value;
  } catch {
    // Corrupt zip / missing parts: surface as a 422, never a 500.
    throw new InvalidFileContentError("The .docx file could not be read");
  }
}
