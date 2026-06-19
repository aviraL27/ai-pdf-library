import { Router, Request, Response } from "express";
import { createRequire } from "module";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { upload } from "../middleware/multer.js";
import { getDb, dbInsertPdf } from "../db/sqlite.js";
import { chunkText } from "../services/chunker.js";
import { embedChunks } from "../services/embedder.js";
import { storeChunks } from "../services/vectorStore.js";

// pdf-parse is CJS-only — use createRequire to import it in ESM context
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buffer: Buffer, options?: any) => Promise<{
  text: string;
  numpages: number;
  info: Record<string, unknown>;
}>;

export const uploadRouter = Router();

// POST /api/upload
uploadRouter.post(
  "/",
  upload.single("pdf"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No PDF file provided. Use field name 'pdf'." });
      return;
    }

    const file = req.file;
    const pdfId = uuidv4();

    console.log(`[upload] Processing PDF: ${file.originalname} (${file.size} bytes)`);

    try {
      // ── 1. Parse PDF ────────────────────────────────────────────────────────
      const dataBuffer = fs.readFileSync(file.path);

      // Collect per-page text via pagerender callback
      const pageTexts: { pageNumber: number; text: string }[] = [];
      let pageCounter = 0;

      await pdfParse(dataBuffer, {
        pagerender: async (pageData: any) => {
          pageCounter++;
          const currentPage = pageCounter;
          const content = await pageData.getTextContent();
          const text = content.items
            .map((item: any) => item.str ?? "")
            .join(" ");
          pageTexts.push({ pageNumber: currentPage, text });
          return text;
        },
      });

      // Fallback if pagerender didn't fire (some PDFs)
      if (pageTexts.length === 0) {
        const parsed = await pdfParse(dataBuffer);
        pageTexts.push({ pageNumber: 1, text: parsed.text });
        console.warn("[upload] pagerender not fired — using flat text fallback");
      }

      const totalPages = pageTexts.length;
      console.log(`[upload] Extracted ${totalPages} pages`);

      // ── 2. Chunk ─────────────────────────────────────────────────────────────
      const chunks = chunkText(pdfId, pageTexts);
      console.log(`[upload] Created ${chunks.length} chunks`);

      // ── 3. Embed ─────────────────────────────────────────────────────────────
      console.log("[upload] Embedding chunks (this may take a while)...");
      const embedded = await embedChunks(chunks, (done, total) => {
        if (done % 10 === 0 || done === total) {
          console.log(`[upload] Embedded ${done}/${total} chunks`);
        }
      });

      // ── 4. Store in ChromaDB ─────────────────────────────────────────────────
      await storeChunks(pdfId, embedded);
      console.log("[upload] Chunks stored in ChromaDB");

      // ── 5. Persist to SQLite ─────────────────────────────────────────────────
      const pdfRecord = {
        id: pdfId,
        name: file.originalname.replace(/\.pdf$/i, ""),
        originalName: file.originalname,
        filePath: file.path,
        pageCount: totalPages,
        chunkCount: chunks.length,
        fileSize: file.size,
        createdAt: new Date().toISOString(),
      };

      dbInsertPdf(getDb(), pdfRecord);
      console.log(`[upload] Saved to SQLite: ${pdfId}`);

      res.status(201).json({
        id: pdfId,
        name: pdfRecord.name,
        originalName: pdfRecord.originalName,
        pageCount: totalPages,
        chunkCount: chunks.length,
        fileSize: file.size,
        createdAt: pdfRecord.createdAt,
      });
    } catch (err: any) {
      console.error("[upload] Error:", err);

      // Clean up the uploaded file on error
      try {
        fs.unlinkSync(file.path);
      } catch {
        // ignore cleanup errors
      }

      res.status(500).json({
        error: "Failed to process PDF",
        details: err?.message ?? "Unknown error",
      });
    }
  }
);
