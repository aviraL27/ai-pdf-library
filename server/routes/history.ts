import { Router, Request, Response } from "express";
import { getDb, dbGetHistory, dbClearHistory, dbGetPdfById } from "../db/sqlite.js";
import type { ChatMessage } from "../types/index.js";

export const historyRouter = Router();

// GET /api/history/:pdfId — get chat history for a PDF
historyRouter.get("/:pdfId", (req: Request, res: Response) => {
  const pdfId = req.params.pdfId as string;
  const limit = parseInt((req.query.limit as string) ?? "100", 10);

  try {
    const db = getDb();

    // Verify PDF exists
    const pdf = dbGetPdfById(db, pdfId as string);
    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    const raw = dbGetHistory(db, pdfId, limit) as ChatMessage[];

    // Parse citations JSON string back to objects
    const history = raw.map((msg) => ({
      ...msg,
      citations: msg.citations
        ? JSON.parse(msg.citations as unknown as string)
        : null,
    }));

    res.json({ history });
  } catch (err: any) {
    console.error("[history] GET error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// DELETE /api/history/:pdfId — clear chat history for a PDF
historyRouter.delete("/:pdfId", (req: Request, res: Response) => {
  const pdfId = req.params.pdfId as string;

  try {
    const db = getDb();

    const pdf = dbGetPdfById(db, pdfId as string);
    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    dbClearHistory(db, pdfId);
    console.log(`[history] Cleared history for PDF ${pdfId}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[history] DELETE error:", err);
    res.status(500).json({ error: "Failed to clear history" });
  }
});
