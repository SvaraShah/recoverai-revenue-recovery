import Groq from "groq-sdk";

// ─── Configuration ───────────────────────────────────────

const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const GROQ_TIMEOUT_MS = 30_000;
const GROQ_MAX_RETRIES = 1;
const GROQ_RETRY_DELAY_MS = 1_500;
const GROQ_MAX_TOKENS = 2048;
const GROQ_TEMPERATURE = 0.3; // Low temperature for structured, consistent output

// ─── Singleton Client ────────────────────────────────────

let groqClient: Groq | null = null;
let availabilityLogged = false;

/**
 * Returns true if the GROQ_API_KEY environment variable is set and non-empty.
 * Never exposes the actual key value.
 */
export function isGroqAvailable(): boolean {
  const key = process.env.GROQ_API_KEY;
  return typeof key === "string" && key.trim().length > 0;
}

function getGroqClient(): Groq {
  if (!groqClient) {
    const rawKey = process.env.GROQ_API_KEY;
    if (!rawKey || rawKey.trim().length === 0) {
      throw new Error("GROQ_API_KEY is not configured");
    }
    const apiKey = rawKey.trim();
    groqClient = new Groq({
      apiKey,
      timeout: GROQ_TIMEOUT_MS,
    });
  }
  return groqClient;
}

/** Log availability exactly once at startup */
export function logGroqStatus(): void {
  if (availabilityLogged) return;
  availabilityLogged = true;

  if (isGroqAvailable()) {
    console.log(`🤖 AI Engine: Groq (${GROQ_MODEL})`);
  } else {
    console.log("⚠️  AI Engine: Mock/Deterministic (GROQ_API_KEY not set)");
  }
}

// ─── Groq Call Helper ────────────────────────────────────

export interface GroqCallOptions {
  /** System prompt describing the AI's role and output format */
  systemPrompt: string;
  /** User prompt with the actual data/question */
  userPrompt: string;
  /** Optional override for temperature (default: 0.3) */
  temperature?: number;
}

/**
 * Calls the Groq API and parses the response as JSON.
 *
 * Features:
 * - Structured JSON output with response_format
 * - 30s timeout
 * - 1 retry on rate-limit (429) with backoff
 * - Never logs the API key
 * - Returns parsed JSON object or throws
 *
 * @throws Error on all failures (caller should handle fallback)
 */
export async function callGroq<T>(options: GroqCallOptions): Promise<T> {
  const client = getGroqClient();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= GROQ_MAX_RETRIES; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.userPrompt },
        ],
        temperature: options.temperature ?? GROQ_TEMPERATURE,
        max_tokens: GROQ_MAX_TOKENS,
        response_format: { type: "json_object" },
      });

      const content = completion.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Groq returned empty response content");
      }

      // Parse JSON response — sanitize markdown backticks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      }
      const parsed = JSON.parse(cleanContent) as T;
      return parsed;
    } catch (err: any) {
      lastError = err;

      // Rate limit — retry after delay
      if (err?.status === 429 && attempt < GROQ_MAX_RETRIES) {
        console.warn(
          `⚡ Groq rate limited (attempt ${attempt + 1}/${GROQ_MAX_RETRIES + 1}), retrying in ${GROQ_RETRY_DELAY_MS}ms...`
        );
        await sleep(GROQ_RETRY_DELAY_MS);
        continue;
      }

      // Log error without exposing sensitive data
      const errorMessage =
        err instanceof Error ? err.message : "Unknown Groq error";
      console.error(`❌ Groq API error: ${errorMessage}`);
      break;
    }
  }

  throw lastError || new Error("Groq call failed after all attempts");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { GROQ_MODEL };
