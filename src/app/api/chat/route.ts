import Anthropic from "@anthropic-ai/sdk";
import { getContext } from "@/lib/knowledge";
import { buildSystemPrompt } from "@/lib/systemPrompt";

type ChatMessage = { role: "user" | "assistant"; content: string };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 30;

function isChatMessage(m: unknown): m is ChatMessage {
  if (typeof m !== "object" || m === null) return false;
  const obj = m as Record<string, unknown>;
  return (
    (obj.role === "user" || obj.role === "assistant") &&
    typeof obj.content === "string"
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as { messages?: unknown }).messages) ||
    !(body as { messages: unknown[] }).messages.every(isChatMessage)
  ) {
    return Response.json(
      {
        error:
          "Body must be { messages: [{ role: 'user' | 'assistant', content: string }, ...] }",
      },
      { status: 400 },
    );
  }

  const typedBody = body as { messages: ChatMessage[]; topic?: string };
  const messages = typedBody.messages.slice(-10);
  const topic =
    typeof typedBody.topic === "string" ? typedBody.topic : undefined;
  const lastUserQuery =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const { text: contextText, sources } = await getContext(lastUserQuery, topic);
  const system = buildSystemPrompt(contextText);

  // Abort if Anthropic hasn't responded within 25 seconds
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await client.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system,
        messages,
      },
      { signal: controller.signal },
    );

    clearTimeout(timeout);

    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    return Response.json({ text, sources });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Anthropic.APIError) {
      return Response.json(
        { error: err.message },
        { status: err.status ?? 500 },
      );
    }
    // AbortError from our timeout
    if (err instanceof Error && err.name === "AbortError") {
      return Response.json(
        { error: "Request timed out — please try again." },
        { status: 504 },
      );
    }
    throw err;
  }
}
