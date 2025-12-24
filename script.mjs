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
enter prompt: s

--- FINAL ANSWER ---

It looks like your message got cut off. Could you let me know what you’re looking for? I’m here to help!
ahmad.mogral@ip-10-72-104-141 cli % node script.mjs
OpenRouter key loaded: true
enter prompt: how much would it cost for 3 days in kerala
ChatError: Provider returned error
    at Object.transform (file:///Users/ahmad.mogral/cli/node_modules/@openrouter/sdk/esm/models/errors/chaterror.js:26:12)
    at inst._zod.parse (file:///Users/ahmad.mogral/cli/node_modules/zod/v4/classic/schemas.js:856:28)
    at handlePipeResult (file:///Users/ahmad.mogral/cli/node_modules/zod/v4/core/schemas.js:1749:22)
    at inst._zod.parse (file:///Users/ahmad.mogral/cli/node_modules/zod/v4/core/schemas.js:1740:16)
    at Module.<anonymous> (file:///Users/ahmad.mogral/cli/node_modules/zod/v4/core/parse.js:6:32)
    at inst.parse (file:///Users/ahmad.mogral/cli/node_modules/zod/v4/classic/schemas.js:36:42)
    at safeParseResponse.request.request (file:///Users/ahmad.mogral/cli/node_modules/@openrouter/sdk/esm/lib/matchers.js:168:74)
    at safeParseResponse (file:///Users/ahmad.mogral/cli/node_modules/@openrouter/sdk/esm/lib/matchers.js:193:19)
    at matchFunc (file:///Users/ahmad.mogral/cli/node_modules/@openrouter/sdk/esm/lib/matchers.js:168:28)
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5) {
  statusCode: 429,
  body: '{"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"openai/gpt-oss-20b:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations","provider_name":"Chutes"}},"user_id":"user_37C8CQywNKwcXbOKEIdZ5xnoENt"}',
  headers: Headers {
    date: 'Wed, 24 Dec 2025 07:08:08 GMT',
    'content-type': 'application/json',
    'transfer-encoding': 'chunked',
    connection: 'keep-alive',
    'cf-ray': '9b2e44009c6df8a8-DXB',
    'access-control-allow-origin': '*',
    vary: 'Accept-Encoding',
    'permissions-policy': 'payment=(self "https://checkout.stripe.com" "https://connect-js.stripe.com" "https://js.stripe.com" "https://*.js.stripe.com" "https://hooks.stripe.com")',
    'referrer-policy': 'no-referrer, strict-origin-when-cross-origin',
    'x-content-type-options': 'nosniff',
    server: 'cloudflare'
  },
  contentType: 'application/json',
  rawResponse: Response {
    status: 429,
    statusText: 'Too Many Requests',
    headers: Headers {
      date: 'Wed, 24 Dec 2025 07:08:08 GMT',
      'content-type': 'application/json',
      'transfer-encoding': 'chunked',
      connection: 'keep-alive',
      'cf-ray': '9b2e44009c6df8a8-DXB',
      'access-control-allow-origin': '*',
      vary: 'Accept-Encoding',
      'permissions-policy': 'payment=(self "https://checkout.stripe.com" "https://connect-js.stripe.com" "https://js.stripe.com" "https://*.js.stripe.com" "https://hooks.stripe.com")',
      'referrer-policy': 'no-referrer, strict-origin-when-cross-origin',
      'x-content-type-options': 'nosniff',
      server: 'cloudflare'
    },
    body: ReadableStream { locked: true, state: 'closed', supportsBYOB: true },
    bodyUsed: true,
    ok: false,
    redirected: false,
    type: 'basic',
    url: 'https://openrouter.ai/api/v1/chat/completions'
  },
  'data$': {
    error: { code: 429, message: 'Provider returned error' },
    'request$': Request {
      method: 'POST',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      headers: Headers {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        authorization: 'Bearer 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',
        cookie: '',
        'user-agent': 'speakeasy-sdk/typescript 0.3.9 2.788.4 1.0.0 @openrouter/sdk'
      },
      destination: '',
      referrer: 'about:client',
      referrerPolicy: '',
      mode: 'cors',
      credentials: 'same-origin',
      cache: 'default',
      redirect: 'follow',
      integrity: '',
      keepalive: false,
      isReloadNavigation: false,
      isHistoryNavigation: false,
      signal: AbortSignal { aborted: false }
    },
    'response$': Response {
      status: 429,
      statusText: 'Too Many Requests',
      headers: Headers {
        date: 'Wed, 24 Dec 2025 07:08:08 GMT',
        'content-type': 'application/json',
        'transfer-encoding': 'chunked',
        connection: 'keep-alive',
        'cf-ray': '9b2e44009c6df8a8-DXB',
        'access-control-allow-origin': '*',
        vary: 'Accept-Encoding',
        'permissions-policy': 'payment=(self "https://checkout.stripe.com" "https://connect-js.stripe.com" "https://js.stripe.com" "https://*.js.stripe.com" "https://hooks.stripe.com")',
        'referrer-policy': 'no-referrer, strict-origin-when-cross-origin',
        'x-content-type-options': 'nosniff',
        server: 'cloudflare'
      },
      body: ReadableStream { locked: true, state: 'closed', supportsBYOB: true },
      bodyUsed: true,
      ok: false,
      redirected: false,
      type: 'basic',
      url: 'https://openrouter.ai/api/v1/chat/completions'
    },
    'body$': '{"error":{"message":"Provider returned error","code":429,"metadata":{"raw":"openai/gpt-oss-20b:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations","provider_name":"Chutes"}},"user_id":"user_37C8CQywNKwcXbOKEIdZ5xnoENt"}'
  },
  error: { code: 429, message: 'Provider returned error' }
}
