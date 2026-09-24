import { llmsTxt } from "@/mcp/llms-txt";

/**
 * Public (the proxy matcher skips paths with an extension), so it serves
 * static copy only and never touches the database.
 */
export function GET(request: Request) {
  return new Response(llmsTxt(new URL(request.url).origin), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
