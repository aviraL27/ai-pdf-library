import type { Chunk } from "../types/index.js";

// ── Constants ──────────────────────────────────────────────────────────────────
// Approximate: 1 token ≈ 4 characters (conservative for English text)
const CHARS_PER_TOKEN = 4;
const CHUNK_TOKENS = 500;
const OVERLAP_TOKENS = 50;

const CHUNK_SIZE = CHUNK_TOKENS * CHARS_PER_TOKEN; // ~2000 chars
const OVERLAP_SIZE = OVERLAP_TOKENS * CHARS_PER_TOKEN; // ~200 chars

// ── Types from pdf-parse ───────────────────────────────────────────────────────
interface PageTextItem {
  pageNumber: number;
  text: string;
}

/**
 * Splits extracted PDF text into overlapping chunks tagged with page numbers.
 *
 * pdf-parse returns `data.text` (all pages joined) and `data.numpages`.
 * For page-level attribution, we use the per-page render callback approach:
 * caller should pass `pageTexts` built from the `pagerender` option.
 */
export function chunkText(
  pdfId: string,
  pageTexts: PageTextItem[]
): Chunk[] {
  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  // Build a flat buffer of { char, page } so we can slice with page tracking
  const buffer: { char: string; page: number }[] = [];

  for (const { pageNumber, text } of pageTexts) {
    for (const char of text) {
      buffer.push({ char, page: pageNumber });
    }
  }

  let start = 0;

  while (start < buffer.length) {
    const end = Math.min(start + CHUNK_SIZE, buffer.length);
    const slice = buffer.slice(start, end);

    const text = slice.map((c) => c.char).join("");
    if (text.trim().length === 0) {
      start += CHUNK_SIZE - OVERLAP_SIZE;
      continue;
    }

    // Determine dominant page (most chars belong to which page)
    const pageCounts = new Map<number, number>();
    for (const { page } of slice) {
      pageCounts.set(page, (pageCounts.get(page) ?? 0) + 1);
    }
    const pageNumber = [...pageCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

    chunks.push({
      id: `${pdfId}_chunk_${chunkIndex}`,
      pdfId,
      chunkIndex,
      pageNumber,
      text: text.trim(),
    });

    chunkIndex++;
    start += CHUNK_SIZE - OVERLAP_SIZE;
  }

  return chunks;
}

/**
 * Simple fallback: chunk a flat string (no per-page data).
 * Page will always be 1.
 */
export function chunkFlatText(pdfId: string, text: string): Chunk[] {
  const synthetic: PageTextItem[] = [{ pageNumber: 1, text }];
  return chunkText(pdfId, synthetic);
}
