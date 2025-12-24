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
