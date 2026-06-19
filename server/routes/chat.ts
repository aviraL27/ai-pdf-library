import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb, dbGetPdfById, dbGetHistory, dbInsertChatMessage } from "../db/sqlite.js";
import { embedText } from "../services/embedder.js";
import { querySimilar } from "../services/vectorStore.js";
import { buildPrompt, streamLlmResponse } from "../services/llm.js";
import type { Citation, ChatMessage } from "../types/index.js";

export const chatRouter = Router();

// POST /api/chat
// Body: { pdfId: string, message: string }
// Response: SSE stream
chatRouter.post("/", async (req: Request, res: Response) => {
  const { pdfId, message } = req.body as {
    pdfId?: string;
    message?: string;
  };

  // ── Validate ───────────────────────────────────────────────────────────────
  if (!pdfId || !message) {
    res.status(400).json({ error: "pdfId and message are required" });
    return;
  }

  const db = getDb();
  const pdf = dbGetPdfById(db, pdfId);
  if (!pdf) {
    res.status(404).json({ error: `PDF with id '${pdfId}' not found` });
    return;
  }

  // ── Set up SSE headers ─────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering if proxied
  res.flushHeaders();

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // ── 1. Persist user message ────────────────────────────────────────────────
    const userMsgId = uuidv4();
    dbInsertChatMessage(db, {
      id: userMsgId,
      pdfId,
      role: "user",
      content: message,
      citations: null,
      createdAt: new Date().toISOString(),
    });

    // ── 2. Load recent history (last 6 turns = 3 user + 3 assistant) ──────────
    const rawHistory = dbGetHistory(db, pdfId, 7) as ChatMessage[];
    // Exclude the user message we just inserted to avoid duplication
    const history = rawHistory
      .filter((m) => m.id !== userMsgId)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    // ── 3. Embed query ─────────────────────────────────────────────────────────
    const queryEmbedding = await embedText(message);

    // ── 4. Vector search ───────────────────────────────────────────────────────
    const citations = await querySimilar(pdfId, queryEmbedding);

    // ── 5. Build prompt ────────────────────────────────────────────────────────
    const prompt = buildPrompt(message, citations, history);

    // ── 6. Stream LLM response ─────────────────────────────────────────────────
    let fullResponse = "";

    for await (const token of streamLlmResponse(prompt)) {
      fullResponse += token;
      sendEvent({ type: "token", token });
    }

    // ── 7. Persist assistant message ───────────────────────────────────────────
    const assistantMsgId = uuidv4();
    dbInsertChatMessage(db, {
      id: assistantMsgId,
      pdfId,
      role: "assistant",
      content: fullResponse,
      citations: JSON.stringify(citations),
      createdAt: new Date().toISOString(),
    });

    // ── 8. Send done event with citations ──────────────────────────────────────
    sendEvent({ type: "done", citations });
    res.end();
  } catch (err: any) {
    console.error("[chat] Error:", err);
    sendEvent({ type: "error", message: err?.message ?? "Unknown error" });
    res.end();
  }
});
