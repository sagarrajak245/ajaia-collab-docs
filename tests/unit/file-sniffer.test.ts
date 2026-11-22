import { describe, expect, it } from "vitest";
import { UPLOAD_MAX_BYTES } from "@/server/constants/upload";
import { InvalidFileContentError, PayloadTooLargeError, UnsupportedFileTypeError } from "@/server/exceptions";
import { detectFileKind } from "@/server/lib/file-sniffer";

const enc = (s: string) => new TextEncoder().encode(s);
const zipWith = (marker: string) => new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...enc(`xx${marker}xx`)]);

describe("detectFileKind", () => {
  it("accepts plain text and markdown", () => {
    expect(detectFileKind(enc("hello"), "txt")).toBe("txt");
    expect(detectFileKind(enc("# Title"), "md")).toBe("md");
  });

  it("accepts a docx-shaped zip", () => {
    expect(detectFileKind(zipWith("word/document.xml"), "docx")).toBe("docx");
  });

  it("rejects unsupported extensions with 415", () => {
    expect(() => detectFileKind(enc("x"), "exe")).toThrow(UnsupportedFileTypeError);
  });

  it("rejects empty files with 422", () => {
    expect(() => detectFileKind(new Uint8Array(), "txt")).toThrow(InvalidFileContentError);
  });

  it("rejects oversized files with 413", () => {
    expect(() => detectFileKind(new Uint8Array(UPLOAD_MAX_BYTES + 1).fill(65), "txt")).toThrow(PayloadTooLargeError);
  });

  it("rejects a zip without word/document.xml posing as docx", () => {
    expect(() => detectFileKind(zipWith("other.xml"), "docx")).toThrow(InvalidFileContentError);
  });

  it("rejects non-zip bytes posing as docx", () => {
    expect(() => detectFileKind(enc("plain text"), "docx")).toThrow(InvalidFileContentError);
  });

  it("rejects binaries posing as txt/md (zip, pdf, png, NUL, bad UTF-8)", () => {
    expect(() => detectFileKind(zipWith("word/document.xml"), "txt")).toThrow(InvalidFileContentError);
    expect(() => detectFileKind(enc("%PDF-1.7 abc"), "md")).toThrow(InvalidFileContentError);
    expect(() => detectFileKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]), "txt")).toThrow(InvalidFileContentError);
    expect(() => detectFileKind(new Uint8Array([0x61, 0x00, 0x62]), "txt")).toThrow(InvalidFileContentError);
    expect(() => detectFileKind(new Uint8Array([0xff, 0xfe, 0xfd]), "txt")).toThrow(InvalidFileContentError);
  });
});
