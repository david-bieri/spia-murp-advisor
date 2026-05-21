import Anthropic from "@anthropic-ai/sdk";
import { getContext } from "@/lib/knowledge";
import { buildSystemPrompt } from "@/lib/systemPrompt";

type ChatMessage = { role: "user" | "assistant"; content: string };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  const messages = (body as { messages: ChatMessage[] }).messages.slice(-10);
  const lastUserQuery =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const { text: contextText } = await getContext(lastUserQuery);
  const system = buildSystemPrompt(contextText);

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages,
    });

    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    return Response.json({ text });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return Response.json(
        { error: err.message },
        { status: err.status ?? 500 },
      );
    }
    throw err;
  }
}