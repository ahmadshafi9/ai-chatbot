import 'dotenv/config';
import { OpenRouter } from "@openrouter/sdk";
import PromptSync from "prompt-sync";
import fetch from "node-fetch";

// -------------------- SETUP --------------------
const prompt = PromptSync();
const MAX_ITERATIONS = 3;

// sanity check (IMPORTANT)
console.log(
  "OpenRouter key loaded:",
  process.env.OPENROUTER_API_KEY?.startsWith("sk-or-")
);

// -------------------- USER INPUT --------------------
const userQ = prompt("enter prompt: ");

// -------------------- OPENROUTER CLIENT --------------------
const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "CLI Web Search Agent"
  }
});

// -------------------- TOOL DEFINITIONS --------------------
const tools = [
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web for relevant information",
      parameters: {
        type: "object",
        properties: {
          search_terms: {
            type: "array",
            items: { type: "string" },
            description: "Search queries"
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

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${params}`,
    {
      headers: {
        Accept: "application/json",
        "x-subscription-token": process.env.BRAVE_API_KEY
      }
    }
  );

  const json = await response.json();
  return JSON.stringify(json);
}

// tool lookup table
const TOOL_MAPPING = {
  search_web
};

// -------------------- LLM CALL --------------------
async function callLLM(messages) {
  const response = await openrouter.chat.send({
    model: "deepseek/deepseek-r1-0528:free",
    messages,
    tools,
    stream: false
  });

  return response.choices[0].message;
}

// -------------------- MAIN AGENT LOOP --------------------
async function main() {
  const messages = [
    { role: "user", content: userQ }
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const msg = await callLLM(messages);
    messages.push(msg);

    // no tool call → final answer
    if (!msg.toolCalls) break;

    for (const toolCall of msg.toolCalls) {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);

      const toolResult = await TOOL_MAPPING[toolName](toolArgs);

      messages.push({
        role: "tool",
        toolCallId: toolCall.id,
        content: toolResult
      });
    }
  }

  console.log("\n--- FINAL ANSWER ---\n");
  console.log(messages[messages.length - 1].content);
}

main().catch(console.error);

/* OpenRouter key loaded: true
enter prompt: hey
ChatError: User not found.
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
  statusCode: 401,
  body: '{"error":{"message":"User not found.","code":401}}',
  headers: Headers {
    date: 'Wed, 24 Dec 2025 06:51:35 GMT',
    'content-type': 'application/json',
    'transfer-encoding': 'chunked',
    connection: 'keep-alive',
    'cf-ray': '9b2e2bc85f6e2917-DXB',
    'access-control-allow-origin': '*',
    vary: 'Accept-Encoding',
    'permissions-policy': 'payment=(self "https://checkout.stripe.com" "https://connect-js.stripe.com" "https://js.stripe.com" "https://*.js.stripe.com" "https://hooks.stripe.com")',
    'referrer-policy': 'no-referrer, strict-origin-when-cross-origin',
    'x-content-type-options': 'nosniff',
    server: 'cloudflare'
  },
  contentType: 'application/json',
  rawResponse: Response {
    status: 401,
    statusText: 'Unauthorized',
    headers: Headers {
      date: 'Wed, 24 Dec 2025 06:51:35 GMT',
      'content-type': 'application/json',
      'transfer-encoding': 'chunked',
      connection: 'keep-alive',
      'cf-ray': '9b2e2bc85f6e2917-DXB',
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
    error: { code: 401, message: 'User not found.' },
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
      status: 401,
      statusText: 'Unauthorized',
      headers: Headers {
        date: 'Wed, 24 Dec 2025 06:51:35 GMT',
        'content-type': 'application/json',
        'transfer-encoding': 'chunked',
        connection: 'keep-alive',
        'cf-ray': '9b2e2bc85f6e2917-DXB',
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
    'body$': '{"error":{"message":"User not found.","code":401}}'
  },
  error: { code: 401, message: 'User not found.' }
}
*/
