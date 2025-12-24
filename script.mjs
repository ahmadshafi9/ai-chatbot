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
