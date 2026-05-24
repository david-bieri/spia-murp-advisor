import Anthropic from "@anthropic-ai/sdk";
import { getContext } from "@/lib/knowledge";
import { buildSystemPrompt } from "@/lib/systemPrompt";

type ChatMessage = { role: "user" | "assistant"; content: string };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Extend Vercel function timeout — 30s covers cold starts + large contexts.
// Requires Vercel Pro for values > 10s; on Hobby this is ignored but harmless.
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

  try {
    // Stream the response — text appears incrementally, timeout risk eliminated.
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              fullText += chunk.delta.text;
              // Stream each chunk as a JSON line
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: "delta", text: chunk.delta.text }) +
                    "\n",
                ),
              );
            }
          }
          // Send final message with sources
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "done", text: fullText, sources }) + "\n",
            ),
          );
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                error: err instanceof Error ? err.message : "Stream error",
              }) + "\n",
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
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
