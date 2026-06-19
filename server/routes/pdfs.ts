import { Router, Request, Response } from "express";
import fs from "fs";
import { getDb, dbGetAllPdfs, dbGetPdfById, dbDeletePdf } from "../db/sqlite.js";
import { deleteCollection } from "../services/vectorStore.js";
import type { PdfFile } from "../types/index.js";

export const pdfsRouter = Router();

// GET /api/pdfs — list all PDFs
pdfsRouter.get("/", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const pdfs = dbGetAllPdfs(db) as PdfFile[];
    res.json({ pdfs });
  } catch (err: any) {
    console.error("[pdfs] GET error:", err);
    res.status(500).json({ error: "Failed to fetch PDFs" });
  }
});

// GET /api/pdfs/:id — get single PDF metadata
pdfsRouter.get("/:id", (req: Request, res: Response) => {
  try {
    const db = getDb();
    const pdf = dbGetPdfById(db, req.params.id as string) as PdfFile | undefined;
    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }
    res.json({ pdf });
  } catch (err: any) {
    console.error("[pdfs] GET /:id error:", err);
    res.status(500).json({ error: "Failed to fetch PDF" });
  }
});

// DELETE /api/pdfs/:id — delete PDF + its vectors + its file
pdfsRouter.delete("/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const db = getDb();

  try {
    const pdf = dbGetPdfById(db, id) as PdfFile | undefined;
    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    // 1. Delete ChromaDB collection
    await deleteCollection(id);

    // 2. Delete from SQLite (cascades to chat_history)
    dbDeletePdf(db, id);

    // 3. Delete physical file
    try {
      if (fs.existsSync(pdf.filePath)) {
        fs.unlinkSync(pdf.filePath);
      }
    } catch (fileErr) {
      console.warn(`[pdfs] Could not delete file ${pdf.filePath}:`, fileErr);
    }

    console.log(`[pdfs] Deleted PDF ${id}`);
    res.json({ success: true, id });
  } catch (err: any) {
    console.error("[pdfs] DELETE error:", err);
    res.status(500).json({ error: "Failed to delete PDF" });
  }
});
