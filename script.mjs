import 'dotenv/config';
import { OpenRouter } from "@openrouter/sdk";
import PromptSync from "prompt-sync";
import fetch from 'node-fetch';

const prompt = PromptSync();
const count = 3;

// user prompt
const userQ = prompt("enter prompt: ");

// llm api
const openrouter = new OpenRouter({
  apiKey: process.env.API_KEY
});

// tool definition
const tools = [
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search for things on the web",
      parameters: {
        type: "object",
        properties: {
          search_terms: {
            type: "array",
            items: { type: "string" },
            description: "List of search terms"
          }
        },
        required: ["search_terms"]
      }
    }
  }
];

// ---- TOOL IMPLEMENTATION ----
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

  const body = await response.json();
  return JSON.stringify(body);
}

// ---- TOOL MAPPING ----
const TOOL_MAPPING = {
  search_web
};

// ---- LLM CALL ----
async function callLLM(messages) {
  const result = await openrouter.chat.send({
    model: "deepseek/deepseek-r1-0528:free",
    messages,
    tools,
    stream: false
  });

  return result.choices[0].message;
}

// ---- MAIN AGENT LOOP ----
async function main() {
  const messages = [
    { role: "user", content: userQ }
  ];

  for (let i = 0; i < count; i++) {
    const msg = await callLLM(messages);
    messages.push(msg);

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

  console.log(
    messages[messages.length - 1].content
  );
}

main();
