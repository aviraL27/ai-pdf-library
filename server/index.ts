import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { uploadRouter } from "./routes/upload.js";
import { chatRouter } from "./routes/chat.js";
import { pdfsRouter } from "./routes/pdfs.js";
import { historyRouter } from "./routes/history.js";
import { getDb } from "./db/sqlite.js";
import { checkOllamaHealth } from "./services/embedder.js";
import { checkChromaHealth } from "./services/vectorStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT ?? "3001", 10);

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded PDFs statically (frontend needs this to render them)
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Content-Type", "application/pdf");
    },
  })
);

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api/upload", uploadRouter);
app.use("/api/chat", chatRouter);
app.use("/api/pdfs", pdfsRouter);
app.use("/api/history", historyRouter);

// ── Health endpoint ────────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  const [ollama, chromadb] = await Promise.all([
    checkOllamaHealth(),
    checkChromaHealth(),
  ]);

  let sqlite = false;
  try {
    getDb(); // Will throw if SQLite init fails
    sqlite = true;
  } catch {
    sqlite = false;
  }

  const allOk = ollama && chromadb && sqlite;

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    ollama,
    chromadb,
    sqlite,
    timestamp: new Date().toISOString(),
  });
});

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[server] Unhandled error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
);

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🚀 PDF RAG Server running on http://localhost:${PORT}`);
  console.log(`   API prefix: http://localhost:${PORT}/api`);

  // Startup health checks
  const [ollama, chromadb] = await Promise.all([
    checkOllamaHealth(),
    checkChromaHealth(),
  ]);

  console.log(`\n   Services:`);
  console.log(`   ${ollama ? "✅" : "❌"} Ollama   (${process.env.OLLAMA_HOST ?? "http://localhost:11434"})`);
  console.log(`   ${chromadb ? "✅" : "❌"} ChromaDB (${process.env.CHROMA_HOST ?? "http://localhost:8000"})`);
  console.log(`   ✅ SQLite   (server/db/library.db)`);

  if (!ollama) {
    console.warn("\n   ⚠️  Ollama not reachable. Make sure it's running: ollama serve");
  }
  if (!chromadb) {
    console.warn(
      "\n   ⚠️  ChromaDB not reachable. Start it with:\n" +
      "      pip install chromadb\n" +
      "      chroma run --host localhost --port 8000"
    );
  }

  console.log("\n   Ready to receive requests.\n");

  // Init SQLite eagerly
  getDb();
});
