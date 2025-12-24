import 'dotenv/config';
import PromptSync from "prompt-sync";
import fetch from "node-fetch";

// -------------------- CONFIG --------------------
const prompt = PromptSync();
const MAX_ITERATIONS = 3;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// -------------------- USER INPUT --------------------
const userQ = prompt("enter prompt: ");

// -------------------- TOOL DEFINITIONS (JSON) --------------------
const tools = [
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web using Brave Search API",
      parameters: {
        type: "object",
        properties: {
          search_terms: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["search_terms"]
      }
    }
  }
];

// -------------------- TOOL IMPLEMENTATION --------------------
async function search_web({ search_terms }) {
  const query = search_terms.join(" ");

  const params = new URLSearchParams({
    q: query,
    count: "3"
  });

  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${params}`,
    {
      headers: {
        Accept: "application/json",
        "x-subscription-token": process.env.BRAVE_API_KEY
      }
    }
  );

  const json = await res.json();
  return JSON.stringify(json);
}

// -------------------- OPENROUTER RAW CALL --------------------
async function callLLM(messages) {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "CLI Brave Search Agent",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-r1-0528:free",
      messages,
      tools
    })
  });

  const json = await res.json();

  if (!res.ok) {
    console.error("OpenRouter error:", json);
    process.exit(1);
  }

  return json.choices[0].message;
}

// -------------------- AGENT LOOP --------------------
async function main() {
  const messages = [{ role: "user", content: userQ }];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const msg = await callLLM(messages);
    messages.push(msg);

    if (!msg.tool_calls) break;

    for (const call of msg.tool_calls) {
      if (call.function.name !== "search_web") continue;

      const args = JSON.parse(call.function.arguments);
      const toolResult = await search_web(args);

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: toolResult
      });
    }
  }

  console.log("\n--- FINAL ANSWER ---\n");
  console.log(messages[messages.length - 1].content);
}

main().catch(console.error);

OpenRouter key loaded: true
enter prompt: hey
OpenRouterDefaultError: API error occurred: Status 404
Body: {"error":{"message":"No endpoints found that support tool use. To learn more about provider routing, visit: https://openrouter.ai/docs/guides/routing/provider-selection","code":404}}
    at matchFunc (file:///Users/ahmad.mogral/cli/node_modules/@openrouter/sdk/esm/lib/matchers.js:131:28)
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async $do (file:///Users/ahmad.mogral/cli/node_modules/@openrouter/sdk/esm/funcs/chatSend.js:72:22) {
  statusCode: 404,
  body: '{"error":{"message":"No endpoints found that support tool use. To learn more about provider routing, visit: https://openrouter.ai/docs/guides/routing/provider-selection","code":404}}',
  headers: Headers {
    date: 'Wed, 24 Dec 2025 06:57:10 GMT',
    'content-type': 'application/json',
    'transfer-encoding': 'chunked',
    connection: 'keep-alive',
    'content-encoding': 'gzip',
    'access-control-allow-origin': '*',
    vary: 'Accept-Encoding',
    'permissions-policy': 'payment=(self "https://checkout.stripe.com" "https://connect-js.stripe.com" "https://js.stripe.com" "https://*.js.stripe.com" "https://hooks.stripe.com")',
    'referrer-policy': 'no-referrer, strict-origin-when-cross-origin',
    'x-content-type-options': 'nosniff',
    server: 'cloudflare',
    'cf-ray': '9b2e33f69a1d0be8-DXB'
  },
  contentType: 'application/json',
  rawResponse: Response {
    status: 404,
    statusText: 'Not Found',
    headers: Headers {
      date: 'Wed, 24 Dec 2025 06:57:10 GMT',
      'content-type': 'application/json',
      'transfer-encoding': 'chunked',
      connection: 'keep-alive',
      'content-encoding': 'gzip',
      'access-control-allow-origin': '*',
      vary: 'Accept-Encoding',
      'permissions-policy': 'payment=(self "https://checkout.stripe.com" "https://connect-js.stripe.com" "https://js.stripe.com" "https://*.js.stripe.com" "https://hooks.stripe.com")',
      'referrer-policy': 'no-referrer, strict-origin-when-cross-origin',
      'x-content-type-options': 'nosniff',
      server: 'cloudflare',
      'cf-ray': '9b2e33f69a1d0be8-DXB'
    },
    body: ReadableStream { locked: true, state: 'closed', supportsBYOB: true },
    bodyUsed: true,
    ok: false,
    redirected: false,
    type: 'basic',
    url: 'https://openrouter.ai/api/v1/chat/completions'
  }
}
