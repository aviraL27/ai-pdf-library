import axios from "axios";
import type { Citation } from "../types/index.js";

// ── Config ────────────────────────────────────────────────────────────────────
const OLLAMA_BASE = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const LLM_MODEL = process.env.LLM_MODEL ?? "qwen3:8b";
const NUM_CTX = parseInt(process.env.LLM_CTX ?? "4096", 10);

// ── Prompt builder ────────────────────────────────────────────────────────────
export function buildPrompt(
  query: string,
  citations: Citation[],
  history: { role: "user" | "assistant"; content: string }[]
): string {
  const contextSection = citations
    .map(
      (c, i) =>
        `[Context ${i + 1} — Page ${c.page}]\n${c.snippet}`
    )
    .join("\n\n");

  const historySection =
    history.length > 0
      ? history
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n")
      : "";

  return `You are a helpful assistant that answers questions strictly based on the provided PDF document context.

DOCUMENT CONTEXT:
${contextSection}

${historySection ? `CONVERSATION HISTORY:\n${historySection}\n` : ""}
CURRENT QUESTION: ${query}

Instructions:
- Answer only from the provided context above.
- If the answer is not in the context, say: "I couldn't find that information in this document."
- Always cite the page number(s) your answer comes from (e.g., "According to page 3...").
- Be concise and direct.

Answer:`;
}

// ── Streaming generator — yields token strings ─────────────────────────────
export async function* streamLlmResponse(
  prompt: string
): AsyncGenerator<string> {
  const response = await axios.post(
    `${OLLAMA_BASE}/api/generate`,
    {
      model: LLM_MODEL,
      prompt,
      stream: true,
      options: {
        num_ctx: NUM_CTX,
        temperature: 0.3,
        top_p: 0.9,
      },
    },
    {
      responseType: "stream",
      timeout: 120_000,
    }
  );

  let buffer = "";

  for await (const chunk of response.data) {
    buffer += chunk.toString();

    // Each line in the stream is a JSON object
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep incomplete last line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as {
          response?: string;
          done?: boolean;
        };
        if (parsed.response) {
          yield parsed.response;
        }
        if (parsed.done) return;
      } catch {
        // Ignore malformed lines
      }
    }
  }
}

// ── Non-streaming (for testing) ───────────────────────────────────────────────
export async function generateResponse(prompt: string): Promise<string> {
  let result = "";
  for await (const token of streamLlmResponse(prompt)) {
    result += token;
  }
  return result;
}
